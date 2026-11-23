import { BookingWorkflow } from "./booking-workflow";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { MailService } from "../../infrastructure/mail/mail.service";
import { buildBookingListWhere } from "./helpers";
import type { AdminBookingFilters } from "shared";
import { BookingsService } from "./bookings.service";
import { Prisma } from "@prisma/client";
import { sqlSearchText } from "../../common/search";
@Injectable()
export class BookingsAdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
        private readonly bookingsService: BookingsService,
    ) { }
    adminBookingInclude = {
        users: {
            select: {
                full_name: true,
                phone: true,
                accounts: {
                    select: {
                        email: true,
                    },
                },
            },
        },
        tour_schedules: {
            include: {
                departure_location: true,
                tours: {
                    include: {
                        tour_images: { where: { is_cover: 1 }, take: 1 },
                        departure_locations: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        },
        booking_travelers: true,
        payments: true,
        vouchers: true,
    };
    ensureStaffAccess(isStaff: any) {
        if (!isStaff) {
            throw new ForbiddenException('Bạn không có quyền truy cập.');
        }
    }
    async findAdminBookingOrThrow(bookingId: any) {
        const booking = await this.prisma.bookings.findUnique({
            where: { booking_id: bookingId },
            include: this.adminBookingInclude,
        });
        if (!booking) {
            throw new NotFoundException('Không tìm thấy booking.');
        }
        return booking;
    }
    async findBookingForCancelActionOrThrow(bookingId: any) {
        const booking = await this.prisma.bookings.findUnique({
            where: { booking_id: bookingId },
            include: {
                payments: {
                    where: { status: { in: ['completed', 'review'] } },
                    orderBy: { payment_id: 'desc' },
                    take: 1,
                },
                tour_schedules: {
                    include: {
                        tours: {
                            select: { name: true },
                        },
                    },
                },
            },
        });
        if (!booking) {
            throw new NotFoundException('Không tìm thấy booking.');
        }
        return booking;
    }
    async getAdminBookingDetail(bookingId: any, isStaff: any) {
        this.ensureStaffAccess(isStaff);
        return this.findAdminBookingOrThrow(bookingId);
    }
    private async buildAdminBookingWhere(filters: AdminBookingFilters) {
        const where = buildBookingListWhere({ ...filters, search: undefined });
        if (filters.search?.trim()) {
            const search = filters.search.trim();
            const numeric = search.replace(/^#?(?:BK)?0*/i, "");
            const bookingId = /^\d+$/.test(numeric) && Number(numeric) <= 2147483647 ? Number(numeric) : -1;
            const matched = await this.prisma.$queryRaw<{ booking_id: number }[]>(Prisma.sql`
                SELECT b.booking_id FROM bookings b
                LEFT JOIN users u ON u.user_id = b.user_id
                LEFT JOIN tour_schedules s ON s.tour_schedule_id = b.tour_schedule_id
                LEFT JOIN tours t ON t.tour_id = s.tour_id
                WHERE ${sqlSearchText(Prisma.sql`concat_ws(' ', b.contact_name, b.contact_phone, b.contact_email, u.full_name, t.name, t.code, s.code)`, search)}
                   OR b.booking_id = ${bookingId}
            `);
            where.booking_id = { in: matched.map(item => item.booking_id) };
        }
        return where;
    }
    async listAdminBookings(isStaff: any, page: number = 1, limit: number = 10, filters: AdminBookingFilters = {}) {
        this.ensureStaffAccess(isStaff);
        await this.bookingsService.cancelExpiredPendingBookings();
        if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Phân trang không hợp lệ.');
        const where = await this.buildAdminBookingWhere(filters);
        const skip = (page - 1) * limit;
        const [items, total, groups] = await Promise.all([
            this.prisma.bookings.findMany({
                where,
                skip,
                take: limit,
                include: {
                    users: {
                        select: {
                            full_name: true,
                        },
                    },
                    tour_schedules: {
                        include: {
                            tours: {
                                select: {
                                    name: true,
                                    code: true,
                                    tour_id: true,
                                    tour_images: { orderBy: { sort_order: 'asc' }, take: 1, select: { image_url: true } },
                                },
                            },
                        },
                    },
                    payments: true,
                },
                orderBy: [{ created_at: 'desc' }, { booking_id: 'desc' }],
            }),
            this.prisma.bookings.count({ where }),
            this.prisma.bookings.groupBy({ by: ['status'], _count: { _all: true } }),
        ]);
        const count = (status: string) => groups.find(group => group.status === status)?._count._all ?? 0;
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            stats: { total: groups.reduce((sum, group) => sum + group._count._all, 0), paid: count('paid'), pending: count('pending'), cancelled: count('cancelled'), cancelRequested: count('cancel_requested') },
        };
    }
    async listAdminBookingTours(isStaff: any, page = 1, limit = 10, filters: AdminBookingFilters = {}) {
        this.ensureStaffAccess(isStaff);
        await this.bookingsService.cancelExpiredPendingBookings();
        if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Phân trang không hợp lệ.');
        const where = await this.buildAdminBookingWhere(filters);
        const tourWhere: Prisma.toursWhereInput = { tour_schedules: { some: { bookings: { some: where } } } };
        const [tours, total, statuses] = await Promise.all([
            this.prisma.tours.findMany({
                where: tourWhere,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: [{ name: 'asc' }, { tour_id: 'asc' }],
                select: {
                    tour_id: true, name: true, code: true, summary: true, tour_type: true,
                    duration_days: true, duration_nights: true, base_price: true, status: true,
                    tour_images: { orderBy: [{ is_cover: 'desc' }, { sort_order: 'asc' }], take: 1, select: { image_url: true } },
                    tour_schedules: {
                        where: { bookings: { some: where } },
                        select: { _count: { select: { bookings: { where } } } },
                    },
                },
            }),
            this.prisma.tours.count({ where: tourWhere }),
            this.prisma.bookings.groupBy({ by: ['status'], _count: { _all: true } }),
        ]);
        const count = (status: string) => statuses.find(group => group.status === status)?._count._all ?? 0;
        // Count outstanding requests for the whole tour, even when the list is filtered to another status or departure.
        const cancellationCounts = tours.length ? await this.prisma.$queryRaw<{ tour_id: number; count: number }[]>(Prisma.sql`
            SELECT s.tour_id, COUNT(*)::int AS count
            FROM bookings b
            JOIN tour_schedules s ON s.tour_schedule_id = b.tour_schedule_id
            WHERE b.status = 'cancel_requested'
              AND s.tour_id IN (${Prisma.join(tours.map(tour => tour.tour_id))})
            GROUP BY s.tour_id
        `) : [];
        const cancellationsByTour = new Map(cancellationCounts.map(row => [row.tour_id, row.count]));
        return {
            items: tours.map(({ tour_schedules, ...tour }) => ({
                tour: { ...tour, base_price: Number(tour.base_price) },
                booking_count: tour_schedules.reduce((sum, schedule) => sum + schedule._count.bookings, 0),
                cancel_requested_count: cancellationsByTour.get(tour.tour_id) ?? 0,
            })),
            total, page, limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            stats: { total: statuses.reduce((sum, group) => sum + group._count._all, 0), paid: count('paid'), pending: count('pending'), cancelled: count('cancelled'), cancelRequested: count('cancel_requested') },
        };
    }
    async approveCancel(id: number, isStaff: boolean, note?: string, amount?: number, actorId?: number) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).approveCancel(id, note, amount, actorId);
    }
    async rejectCancel(id: number, isStaff: boolean, note?: string) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).rejectCancel(id, note);
    }
    async cancelPendingBooking(id: number, isStaff: boolean, reason?: string) {
        this.ensureStaffAccess(isStaff);
        const b = await this.prisma.bookings.findUniqueOrThrow({ where: { booking_id: id } });
        if (b.status !== 'pending') throw new BadRequestException('Chỉ hủy giữ chỗ chưa thanh toán.');
        return new BookingWorkflow(this.prisma, this.mailService).requestCancel(id, b.user_id, { reason });
    }
    async adminCancelBooking(id: number, isStaff: boolean, reason?: string, refundAmount?: number, note?: string, cancelType = 'customer_request', resolutionOption = 'full_refund', newScheduleId?: number, allowedOptions?: string[], waiveDifference?: boolean, details: any = {}) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).cancelByAdmin(id, { ...details, reason, refundAmount, note, cancelType, resolutionOption, newScheduleId, allowedOptions, waiveDifference });
    }
    async confirmRefundTransfer(id: number, isStaff: boolean, transactionCode?: string, note?: string, amount?: number, refundId?: string, actorId?: number) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).confirmRefund(id, { transactionCode, note, amount, refundId, actorId });
    }
    async confirmCollection(id: number, isStaff: boolean, dto: any) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).confirmCollection(id, dto);
    }
    async cancelDeparture(id: number, isStaff: boolean, reason: string) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).cancelDeparture(id, reason);
    }
    async recordIncident(id: number, isStaff: boolean, dto: any) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).recordIncident(id, dto);
    }
    async reconcileReview(id: number, isStaff: boolean, dto: any) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).reconcileReview(id, dto);
    }
    async beginRefundTransfer(id: number, isStaff: boolean, dto: any) {
        this.ensureStaffAccess(isStaff);
        return new BookingWorkflow(this.prisma, this.mailService).beginRefundTransfer(id, dto);
    }
}
