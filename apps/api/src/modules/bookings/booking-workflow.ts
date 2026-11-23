import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { bookingFunds, bookingRefunds, calculateCancellationEstimate, cancellationPortion, normalizeBookingBank, type BookingRefund } from "shared";
import type { PrismaService } from "../../infrastructure/database/prisma.service";
import { calculateBookingTourPrice } from "./helpers/booking-tour-price";
import { sendBookingNotification } from "./helpers/booking-notifications";
import type { MailService } from "../../infrastructure/mail/mail.service";

function fail(message: string): never { throw new BadRequestException(message); }
const money = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) return fail("Số tiền phải là số nguyên không âm.");
  return amount;
};
const bank = (value: any) => { try { return normalizeBookingBank(value); } catch (error) { return fail((error as Error).message); } };
const metaOf = (b: any): any => ({ ...(b.cancellation_meta || {}) });
const refundsOf = (m: any): BookingRefund[] => m.refunds || [];
const pendingRefunds = (m: any) => refundsOf(m).filter(r => r.status !== "completed").reduce((sum, r) => sum + r.amount, 0);

/** Every money/seat mutation serializes on the same booking lock as payment callbacks. */
export class BookingWorkflow {
  constructor(private readonly prisma: PrismaService, private readonly mail?: MailService) {}

  private async transaction(id: number, type: Parameters<typeof sendBookingNotification>[1]["type"], action: (tx: any) => Promise<any>) {
    const result = await this.prisma.$transaction(action);
    // Notifications must never roll back a successful financial operation or make a retry look necessary.
    try {
      const b = await this.prisma.bookings.findUnique({ where: { booking_id: id }, include: { tour_schedules: { include: { tours: true } } } });
      if (b) {
        const m = b.cancellation_meta as any, p = m?.resolutionProposal;
        if (type === "cancel_requested" && result.status === "cancelled") type = "customer_cancelled_pending";
        if (type === "rescheduled_confirmed") {
          if (p?.status === "awaiting_payment") type = "topup_pending";
          else if (p?.status === "expired") type = "topup_late";
          else if (p?.status === "accepted_refund") type = p.collection ? "topup_late" : "cancel_approved";
        }
        const lastRefund = refundsOf(m).filter(r => type === "refund_transferred" ? r.status === "completed" : r.status === "pending").at(-1);
        const details = { bookingId: id, tourName: b.tour_schedules.tours.name, reason: String(m?.reason || p?.reason || ""), refundAmount: lastRefund?.amount };
        await sendBookingNotification(this.prisma, { ...details, type, userId: b.user_id });
        if (this.mail && b.contact_email) {
          const contact = { ...details, email: b.contact_email, contactName: b.contact_name };
          if (type === "cancel_requested") {
            await this.mail.sendCancelRequestEmail(contact);
            await this.mail.sendCancelRequestAdminNotification({ ...contact, contactEmail: b.contact_email, contactPhone: b.contact_phone });
          }
          if (type === "cancel_proposed") await this.mail.sendCancelProposedEmail({ ...contact, optionsText: "Thỏa thuận đổi lịch cùng tour hoặc hoàn tiền để tự đặt lại" });
          if (type === "cancel_approved") await this.mail.sendCancelApprovedEmail(contact);
          if (type === "cancel_rejected") await this.mail.sendCancelRejectedEmail(contact);
          if (type === "rescheduled_confirmed") await this.mail.sendRescheduleConfirmedEmail({ ...contact, newStartDate: b.tour_schedules.start_date, newEndDate: b.tour_schedules.end_date, priceDifference: p.priceDifference });
          if (type === "refund_transferred" && lastRefund) await this.mail.sendRefundTransferredEmail({ ...contact, refundAmount: lastRefund.amount, bankName: lastRefund.bank?.bankName, accountNumber: lastRefund.bank?.bankAccountNumber, transactionCode: lastRefund.transactionCode });
        }
      }
    } catch { /* The operation is committed; pending tasks remain visible in booking details. */ }
    return result;
  }

  private async booking(tx: any, id: number, userId?: number, allowReview = false) {
    await tx.$queryRaw`SELECT booking_id FROM bookings WHERE booking_id = ${id} FOR UPDATE`;
    const b = await tx.bookings.findUnique({ where: { booking_id: id }, include: {
      payments: true, booking_travelers: { orderBy: { traveler_id: "asc" } },
      tour_schedules: { include: { tours: true } },
    } });
    if (!b || (userId !== undefined && b.user_id !== userId)) throw new NotFoundException("Không tìm thấy booking.");
    b.cancellation_meta = { ...(b.cancellation_meta || {}), refunds: bookingRefunds(b) };
    if (!allowReview && b.payments.some((p: any) => p.status === "review")) fail("Booking có giao dịch cần đối soát. Vui lòng xử lý đối soát trước.");
    return b;
  }

  private async seats(tx: any, ids: number[]) {
    const sorted = [...new Set(ids)].sort((a, b) => a - b);
    await tx.$queryRaw`SELECT tour_schedule_id FROM tour_schedules WHERE tour_schedule_id IN (${Prisma.join(sorted)}) ORDER BY tour_schedule_id FOR UPDATE`;
  }

  private guests(b: any) { return b.adult_count + b.child_count + b.infant_count; }
  private async release(tx: any, b: any, count = this.guests(b)) {
    const changed = await tx.tour_schedules.updateMany({ where: { tour_schedule_id: b.tour_schedule_id, booked_count: { gte: count } }, data: { booked_count: { decrement: count } } });
    if (changed.count !== 1) fail("Số chỗ đang không khớp. Cần đối soát trước khi tiếp tục.");
  }
  private async restoreBenefits(tx: any, b: any, m: any) {
    if (m.benefitsReleased) return;
    if (b.voucher_id) await tx.vouchers.updateMany({ where: { voucher_id: b.voucher_id, used_count: { gt: 0 } }, data: { used_count: { decrement: 1 } } });
    if (b.membership_snapshot?.promoType === "schedule_promotion") await tx.schedule_promotions.updateMany({ where: { tour_schedule_id: b.tour_schedule_id, used_slots: { gte: b.adult_count + b.child_count } }, data: { used_slots: { decrement: b.adult_count + b.child_count } } });
    m.benefitsReleased = true;
  }
  private addRefund(b: any, m: any, amount: number, reason: BookingRefund["reason"], recipient?: any) {
    const available = bookingFunds(b.payments).available - pendingRefunds(m);
    if (amount > available) fail("Số tiền hoàn vượt quá tiền thực thu còn có thể hoàn.");
    if (!amount) return;
    m.refunds = [...refundsOf(m), { id: randomUUID(), amount, reason, status: "pending", createdAt: new Date().toISOString(), ...(recipient ? { bank: bank(recipient) } : {}) }];
  }
  private async save(tx: any, b: any, m: any, data: any = {}) {
    return tx.bookings.update({ where: { booking_id: b.booking_id }, data: { ...data, cancellation_meta: m } });
  }

  async requestCancel(id: number, userId: number, dto: any) {
    return this.transaction(id, "cancel_requested", async tx => {
      const b = await this.booking(tx, id, userId), m = metaOf(b);
      if (!["pending", "paid"].includes(b.status) || pendingRefunds(m)) fail("Booking đang có yêu cầu khác hoặc không còn được hủy.");
      if (b.tour_schedules.start_date <= new Date()) fail("Chuyến đi đã khởi hành.");
      const reason = String(dto?.reason || "Khách yêu cầu hủy").trim().slice(0, 2000);
      const funds = bookingFunds(b.payments);
      if (!funds.available && b.status === "pending") {
        if (dto?.travelerIds?.length) fail("Đơn chưa thanh toán: vui lòng hủy toàn bộ và đặt lại số khách phù hợp.");
        await this.seats(tx, [b.tour_schedule_id]);
        await this.release(tx, b);
        await this.restoreBenefits(tx, b, m);
        await tx.payments.updateMany({ where: { booking_id: id, status: "pending" }, data: { status: "expired" } });
        Object.assign(m, { type: "customer_cancelled_pending", title: "Khách đã hủy đơn chưa thanh toán", reason, seatsReleased: true, cancelledAt: new Date().toISOString() });
        return { ...await this.save(tx, b, m, { status: "cancelled" }), cancellation_type: "instant_cancelled" };
      }
      if (!funds.available) fail("Chưa xác nhận được tiền thanh toán.");
      let portion: ReturnType<typeof cancellationPortion>;
      try { portion = cancellationPortion(b, dto?.travelerIds); } catch (error) { return fail((error as Error).message); }
      const estimate = calculateCancellationEstimate({ startDate: b.tour_schedules.start_date, totalAmount: portion.amount, isPaid: true, tiers: m.policyTiers });
      const recipient = estimate.refundAmount > 0 ? bank(dto) : undefined;
      const now = new Date().toISOString();
      m.cancelRequest = { reason, requestedAt: now, requestedAtISO: now, originalStatus: b.status,
        partial: portion.partial, travelerIds: portion.partial ? portion.travelers.map(t => t.traveler_id) : undefined,
        portionAmount: portion.amount, numericRefundAmount: Math.min(funds.available, estimate.refundAmount), penaltyAmount: `${estimate.penaltyAmount}đ`,
        refundEstimated: `${estimate.refundAmount}đ`, tierPenalty: `${estimate.tier.penaltyPercent}%`, totalPaid: `${funds.available}đ`,
        ...(recipient || {}) };
      Object.assign(m, { type: "customer_cancel_request", reason, title: portion.partial ? "Yêu cầu hủy một phần" : "Yêu cầu hủy toàn bộ" });
      return { ...await this.save(tx, b, m, { status: "cancel_requested" }), estimate, cancellation_type: "cancel_requested" };
    });
  }

  async withdrawCancel(id: number, userId: number) {
    return this.transaction(id, "cancel_withdrawn", async tx => {
      const b = await this.booking(tx, id, userId), m = metaOf(b);
      if (b.status !== "cancel_requested") fail("Yêu cầu đã được xử lý, không thể rút lại.");
      m.withdrawals = [...(m.withdrawals || []), { request: m.cancelRequest, at: new Date().toISOString(), userId }];
      m.cancelRequest = { ...m.cancelRequest, withdrawn: true };
      return this.save(tx, b, m, { status: bookingFunds(b.payments).available ? "paid" : "pending" });
    });
  }

  async approveCancel(id: number, note?: string, amount?: number, actorId?: number) {
    return this.transaction(id, "cancel_approved", async tx => {
      const b = await this.booking(tx, id), m = metaOf(b), request = m.cancelRequest;
      if (b.status !== "cancel_requested" || !request) fail("Yêu cầu hủy đã được xử lý hoặc không tồn tại.");
      const portion = cancellationPortion(b, request.travelerIds);
      const legacyDate = String(request.requestedAt || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      const legacyTime = String(request.requestedAt || "").match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      const requestedAt = new Date(request.requestedAtISO || (legacyDate ? `${legacyDate[3]}-${legacyDate[2].padStart(2, "0")}-${legacyDate[1].padStart(2, "0")}T${(legacyTime?.[1] || "0").padStart(2, "0")}:${legacyTime?.[2] || "00"}:${legacyTime?.[3] || "00"}+07:00` : request.requestedAt));
      if (!Number.isFinite(+requestedAt) || requestedAt >= b.tour_schedules.start_date) fail("Thời điểm yêu cầu hủy không hợp lệ; cần đối soát.");
      const estimate = calculateCancellationEstimate({ startDate: b.tour_schedules.start_date, totalAmount: portion.amount, isPaid: true, now: requestedAt, tiers: m.policyTiers });
      const quotedRefund = Number.isSafeInteger(request.numericRefundAmount) ? request.numericRefundAmount : estimate.refundAmount;
      const refund = amount === undefined ? quotedRefund : money(amount);
      if (refund > portion.amount) fail("Tiền hoàn vượt phần dịch vụ hủy.");
      if (refund !== quotedRefund && !note?.trim()) fail("Cần ghi lý do khi duyệt khác báo giá hủy đã tiếp nhận.");
      await this.seats(tx, [b.tour_schedule_id]);
      await this.release(tx, b, portion.partial ? portion.travelers.length : this.guests(b));
      this.addRefund(b, m, refund, portion.partial ? "partial_cancellation" : "cancellation", refund && request.bankName && request.bankAccountNumber && request.bankAccountName ? request : undefined);
      const history = { ...request, approvedAt: new Date().toISOString(), refundAmount: refund, penalty: portion.amount - refund, travelers: portion.travelers, note };
      m.cancellationHistory = [...(m.cancellationHistory || []), history];
      m.cancelRequest = { ...request, processed: true };
      m.adminApproval = { approvedAt: history.approvedAt, refundAmount: `${refund}đ`, note, actorId };
      m.refundAmount = `${refund}đ`;
      m.type = "customer_request_approved";
      if (portion.partial) {
        // Keep the canceled travelers in the immutable history; active manifests use only remaining rows.
        await tx.booking_travelers.deleteMany({ where: { booking_id: id, traveler_id: { in: request.travelerIds } } });
        m.retainedCancellationFees = money(m.retainedCancellationFees || 0) + portion.amount - refund;
        const counts = { adult_count: 0, child_count: 0, infant_count: 0 };
        for (const t of portion.remaining) counts[`${t.traveler_type.toLowerCase()}_count` as keyof typeof counts]++;
        if (b.membership_snapshot?.promoType === "schedule_promotion") {
          const released = portion.travelers.filter(t => t.traveler_type.toLowerCase() !== "infant").length;
          await tx.schedule_promotions.updateMany({ where: { tour_schedule_id: b.tour_schedule_id, used_slots: { gte: released } }, data: { used_slots: { decrement: released } } });
        }
        // Preserve shared room/service charges; the customer sees this rule before confirming.
        const remainingGross = portion.remaining.reduce((sum, t) => sum + Number(b[`${t.traveler_type.toLowerCase()}_unit_price`]), 0);
        const oldGross = b.booking_travelers.reduce((sum: number, t: any) => sum + Number(b[`${t.traveler_type.toLowerCase()}_unit_price`]), 0);
        const allocatedDiscount = oldGross - remainingGross - portion.amount;
        return this.save(tx, b, m, { status: "paid", ...counts, total_amount: Number(b.total_amount) - portion.amount, discount_amount: Math.max(0, Number(b.discount_amount) - allocatedDiscount) });
      }
      await this.restoreBenefits(tx, b, m);
      m.seatsReleased = true;
      return this.save(tx, b, m, { status: pendingRefunds(m) ? "refund_pending" : "cancelled" });
    });
  }

  async rejectCancel(id: number, note?: string) {
    if (!note?.trim()) fail("Vui lòng nêu lý do từ chối.");
    return this.transaction(id, "cancel_rejected", async tx => {
      const b = await this.booking(tx, id), m = metaOf(b);
      if (b.status !== "cancel_requested") fail("Yêu cầu đã được xử lý.");
      m.adminRejection = { note: note!.trim(), rejectedAt: new Date().toISOString() };
      return this.save(tx, b, m, { status: bookingFunds(b.payments).available ? "paid" : "pending" });
    });
  }

  async propose(id: number, dto: any) {
    return this.transaction(id, "cancel_proposed", async tx => {
      const b = await this.booking(tx, id), m = metaOf(b);
      if (!["paid", "cancel_requested", "cancel_proposed"].includes(b.status) || pendingRefunds(m)) fail("Booking phải đã thanh toán và không có khoản hoàn đang xử lý.");
      if (b.tour_schedules.start_date <= new Date()) fail("Chuyến đã khởi hành; cần xử lý sự cố riêng.");
      if (m.resolutionProposal?.status === "awaiting_payment") fail("Khách đang chuyển tiền. Cần hết hạn đề xuất trước khi tạo lại.");
      const options = dto.allowedOptions || [dto.resolutionOption || "full_refund"];
      if (!Array.isArray(options) || options.some((s: any) => !["full_refund", "reschedule"].includes(s))) fail("Phương án không hợp lệ.");
      const proposal: any = { id: randomUUID(), version: 2, proposedAt: new Date().toISOString(), expiresAt: new Date(Math.min(Date.now() + 48 * 3600000, +b.tour_schedules.start_date)).toISOString(), reason: String(dto.reason || "Công ty thay đổi kế hoạch khởi hành").slice(0, 2000), adminNote: String(dto.note || "").slice(0, 2000), allowedOptions: ["full_refund"], status: "pending_customer" };
      if (options.includes("reschedule")) {
        if (!Number.isSafeInteger(dto.newScheduleId) || dto.newScheduleId === b.tour_schedule_id) fail("Vui lòng chọn đợt khởi hành khác của cùng tour.");
        await this.seats(tx, [b.tour_schedule_id, dto.newScheduleId]);
        const schedule = await tx.tour_schedules.findUnique({ where: { tour_schedule_id: dto.newScheduleId }, include: { tours: true, tour_schedule_prices: true, flash_deals: { where: { status: 1, start_date: { lte: new Date() }, end_date: { gte: new Date() } } }, schedule_promotions: true, pickup_points: true } });
        this.validateSchedule(b, schedule);
        if (!schedule) return fail("Không tìm thấy lịch mới.");
        const pricing = calculateBookingTourPrice(schedule, { adults: b.adult_count, children: b.child_count, infants: b.infant_count });
        if (pricing.hasPriceEstimate) fail("Lịch mới chưa đủ giá chính thức cho trẻ em/em bé. Vui lòng cấu hình giá trước.");
        const singleCount = b.room_selection?.single_room_count ?? (b.room_selection?.type === "single" ? b.adult_count + b.child_count : 0);
        const surcharge = Number(schedule.single_room_surcharge || 0) * singleCount;
        const fees = money(m.retainedCancellationFees || 0);
        const available = bookingFunds(b.payments).available - fees;
        // Preserve the agreed discount; don't silently reclaim the customer's old voucher.
        const quoted = Math.max(0, Math.round(pricing.subtotal + surcharge + Number(b.services_total) - Number(b.discount_amount)));
        const newTotal = dto.waiveDifference && quoted > available ? available : quoted;
        const difference = newTotal - available;
        const selectedPickup = schedule.pickup_points.find((p: any) => p.pickup_point_id === dto.pickupPointId);
        if (schedule.pickup_points.length && !selectedPickup) fail("Cần chọn điểm đón của lịch mới.");
        Object.assign(proposal, { allowedOptions: ["full_refund", "reschedule"], suggestedScheduleId: schedule.tour_schedule_id, newScheduleId: schedule.tour_schedule_id,
          suggestedScheduleStartDate: schedule.start_date.toISOString(), suggestedScheduleEndDate: schedule.end_date.toISOString(),
          newScheduleStart: schedule.start_date.toISOString(), newScheduleEnd: schedule.end_date.toISOString(),
          newTotal, priceDifference: difference, waiveDifference: Boolean(dto.waiveDifference),
          newPromotion: pricing.activeSchedulePromo ? { count: b.adult_count + b.child_count } : null,
          newMembershipSnapshot: { ...(b.membership_snapshot || {}), promoType: pricing.appliedPromoType, promoDiscount: pricing.promoDiscount, promoTitle: pricing.appliedPromoTitle, promoGift: pricing.appliedGiftDescription, originalAdultPrice: pricing.baseAdultPrice, originalChildPrice: pricing.baseChildPrice },
          newPricing: { adult_unit_price: pricing.adultPrice, child_unit_price: pricing.childPrice, infant_unit_price: pricing.infantPrice, room_selection: { ...b.room_selection, surcharge, single_room_count: singleCount }, discount_amount: Number(b.discount_amount) + Math.max(0, quoted - newTotal) },
          pickup: selectedPickup ? { id: selectedPickup.pickup_point_id, name: selectedPickup.name, address: selectedPickup.address, pickup_at: selectedPickup.pickup_at.toISOString(), note: selectedPickup.note } : null,
          ...(difference > 0 ? { companyBankInfo: bank(dto.companyBankInfo), transferContent: `BK${id}-${Date.now()}` } : {}) });
      }
      if (m.resolutionProposal) m.proposalHistory = [...(m.proposalHistory || []), m.resolutionProposal];
      proposal.proposedBy = dto.actorId;
      m.resolutionProposal = proposal;
      return this.save(tx, b, m, { status: "cancel_proposed" });
    });
  }

  private validateSchedule(b: any, schedule: any) {
    if (!schedule || schedule.tour_id !== b.tour_schedules.tour_id || schedule.status !== 1 || schedule.tours.status !== 1) fail("Chỉ được đổi sang lịch đang mở của cùng tour.");
    if (+schedule.start_date - Date.now() < (schedule.tours.cut_off_hours ?? 24) * 3600000) fail("Lịch mới đã vào thời gian chốt nhận khách.");
    if (schedule.quota - schedule.booked_count < this.guests(b)) fail("Lịch mới không còn đủ chỗ.");
    const travelerIds = b.booking_travelers.map((t: any) => t.id_number).filter(Boolean);
    return travelerIds;
  }

  private async checkConflict(tx: any, b: any, schedule: any) {
    const ids = b.booking_travelers.map((t: any) => t.id_number).filter(Boolean);
    if (!ids.length) return;
    const conflict = await tx.booking_travelers.findFirst({ where: { id_number: { in: ids }, bookings: { booking_id: { not: b.booking_id }, status: { in: ["paid", "pending", "cancel_requested", "cancel_proposed"] }, tour_schedules: { start_date: { lte: schedule.end_date }, end_date: { gte: schedule.start_date } } } } });
    if (conflict) fail("Hành khách có chuyến đi trùng thời gian với lịch mới.");
  }

  private async move(tx: any, b: any, m: any, reserved: boolean) {
    const p = m.resolutionProposal;
    const schedule = await tx.tour_schedules.findUnique({ where: { tour_schedule_id: p.newScheduleId }, include: { tours: true } });
    if (reserved) {
      if (!schedule || schedule.status !== 1 || schedule.tours.status !== 1 || schedule.tour_id !== b.tour_schedules.tour_id || +schedule.start_date - Date.now() < (schedule.tours.cut_off_hours ?? 24) * 3600000) fail("Lịch mới không còn nhận khách. Vui lòng liên hệ để hoàn tiền.");
    } else this.validateSchedule(b, schedule);
    await this.checkConflict(tx, b, schedule);
    await this.release(tx, b);
    if (!reserved) await tx.tour_schedules.update({ where: { tour_schedule_id: p.newScheduleId }, data: { booked_count: { increment: this.guests(b) } } });
    if (b.membership_snapshot?.promoType === "schedule_promotion") await tx.schedule_promotions.updateMany({ where: { tour_schedule_id: b.tour_schedule_id, used_slots: { gte: b.adult_count + b.child_count } }, data: { used_slots: { decrement: b.adult_count + b.child_count } } });
    m.reschedule = { oldScheduleId: b.tour_schedule_id, newScheduleId: p.newScheduleId, rescheduledAt: new Date().toISOString() };
    p.status = "accepted_reschedule";
    p.completedAt = new Date().toISOString();
    if (p.priceDifference < 0) this.addRefund(b, m, -p.priceDifference, "reschedule", p.customerBankInfo);
    return this.save(tx, b, m, { status: "paid", tour_schedule_id: p.newScheduleId, total_amount: p.newTotal, ...p.newPricing,
      pickup_point_id: p.pickup?.id ?? null, pickup_snapshot: p.pickup ? { name: p.pickup.name, address: p.pickup.address, pickup_at: p.pickup.pickup_at, note: p.pickup.note } : Prisma.DbNull,
      departure_name: null, membership_snapshot: p.newMembershipSnapshot });
  }

  private async reservePromotion(tx: any, p: any) {
    if (!p.newPromotion || p.promoReserved) return;
    const promo = await tx.schedule_promotions.findUnique({ where: { tour_schedule_id: p.newScheduleId } });
    if (!promo || !promo.is_active || promo.start_date > new Date() || promo.end_date < new Date()) fail("Ưu đãi lịch mới đã hết hiệu lực. Cần gửi báo giá mới để khách xác nhận.");
    const changed = await tx.schedule_promotions.updateMany({ where: { tour_schedule_id: p.newScheduleId, ...(promo.max_slots == null ? {} : { used_slots: { lte: promo.max_slots - p.newPromotion.count } }) }, data: { used_slots: { increment: p.newPromotion.count } } });
    if (changed.count !== 1) fail("Ưu đãi của lịch mới đã hết lượt. Cần gửi báo giá mới.");
    p.promoReserved = true;
  }

  private async releasePromotion(tx: any, p: any) {
    if (!p.promoReserved || !p.newPromotion) return;
    await tx.schedule_promotions.updateMany({ where: { tour_schedule_id: p.newScheduleId, used_slots: { gte: p.newPromotion.count } }, data: { used_slots: { decrement: p.newPromotion.count } } });
    p.promoReserved = false;
  }

  async resolve(id: number, userId: number, dto: any) {
    return this.transaction(id, "rescheduled_confirmed", async tx => {
      const b = await this.booking(tx, id, userId), m = metaOf(b), p = m.resolutionProposal;
      if (b.status !== "cancel_proposed" || !p || !["pending_customer", "awaiting_payment", "expired", "contact_support"].includes(p.status)) fail("Đề xuất đã được xử lý hoặc không còn hiệu lực.");
      p.id ||= `legacy-${id}`;
      if (!dto.proposalId || dto.proposalId !== p.id) fail("Đề xuất đã thay đổi. Vui lòng tải lại booking.");
      if (dto.decision === "full_refund") {
        await this.seats(tx, p.status === "awaiting_payment" ? [b.tour_schedule_id, p.newScheduleId] : [b.tour_schedule_id]);
        if (p.status === "awaiting_payment") { await this.release(tx, { ...b, tour_schedule_id: p.newScheduleId }); await this.releasePromotion(tx, p); }
        const amount = Math.max(0, bookingFunds(b.payments).available - pendingRefunds(m) - money(m.retainedCancellationFees || 0));
        this.addRefund(b, m, amount, "cancellation", amount ? dto : undefined);
        await this.release(tx, b);
        await this.restoreBenefits(tx, b, m);
        Object.assign(p, { status: "accepted_refund", refundAmount: amount, customerBankInfo: amount ? bank(dto) : undefined, customerDecision: { selectedOption: "full_refund", decidedAt: new Date().toISOString(), userId } });
        m.seatsReleased = true;
        return this.save(tx, b, m, { status: pendingRefunds(m) ? "refund_pending" : "cancelled" });
      }
      if (dto.decision !== "reschedule" || !p.allowedOptions.includes("reschedule")) fail("Chỉ hỗ trợ đổi lịch cùng tour hoặc hoàn tiền.");
      if (p.version !== 2 || p.status === "expired" || +new Date(p.expiresAt) <= Date.now()) fail("Đề xuất đổi lịch đã hết hạn. Vui lòng yêu cầu đề xuất mới hoặc chọn hoàn tiền.");
      await this.seats(tx, [b.tour_schedule_id, p.newScheduleId]);
      const schedule = await tx.tour_schedules.findUnique({ where: { tour_schedule_id: p.newScheduleId }, include: { tours: true } });
      this.validateSchedule(b, schedule);
      if (!schedule) return fail("Không tìm thấy lịch mới.");
      await this.checkConflict(tx, b, schedule);
      await this.reservePromotion(tx, p);
      p.customerDecision = { selectedOption: "reschedule", decidedAt: new Date().toISOString() };
      if (p.priceDifference < 0) p.customerBankInfo = bank(dto);
      if (p.priceDifference > 0) {
        bank(p.companyBankInfo);
        p.status = "awaiting_payment";
        p.paymentDeadline = new Date(Math.min(Date.now() + 30 * 60000, +new Date(p.expiresAt), +schedule.start_date - (schedule.tours.cut_off_hours ?? 24) * 3600000)).toISOString();
        if (+new Date(p.paymentDeadline) <= Date.now()) fail("Không còn đủ thời gian giữ chỗ chuyển khoản.");
        await tx.tour_schedules.update({ where: { tour_schedule_id: p.newScheduleId }, data: { booked_count: { increment: this.guests(b) } } });
        return this.save(tx, b, m);
      }
      return this.move(tx, b, m, false);
    });
  }

  async confirmCollection(id: number, dto: any) {
    if (!String(dto.transactionCode || "").trim() || String(dto.transactionCode).trim().length > 100) fail("Cần mã giao dịch chuyển khoản hợp lệ (tối đa 100 ký tự).");
    return this.transaction(id, "rescheduled_confirmed", async tx => {
      const b = await this.booking(tx, id), m = metaOf(b), p = m.resolutionProposal;
      if (!["awaiting_payment", "expired", "accepted_refund"].includes(p?.status) || !p.paymentDeadline || p.id !== dto.proposalId || p.collection) fail("Không có khoản nộp thêm đang chờ xác nhận.");
      if (money(dto.amount) !== p.priceDifference) fail("Số tiền thực nhận phải khớp khoản bổ sung.");
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.transactionCode.trim()}, 0))`;
      if (await tx.payments.findFirst({ where: { method: "bank", transaction_code: dto.transactionCode.trim() } })) fail("Mã giao dịch đã được ghi nhận.");
      await this.seats(tx, [b.tour_schedule_id, p.newScheduleId]);
      const payment = await tx.payments.create({ data: { booking_id: id, amount: p.priceDifference, method: "bank", status: "completed", transaction_code: dto.transactionCode.trim(), provider_reference: `TOPUP:${p.id}`, paid_at: new Date() } });
      p.collection = { amount: p.priceDifference, transactionCode: dto.transactionCode.trim(), receivedAt: new Date().toISOString(), confirmedBy: dto.actorId };
      if (["expired", "accepted_refund"].includes(p.status) || +new Date(p.paymentDeadline) <= Date.now()) {
        if (p.status === "awaiting_payment") { await this.release(tx, { ...b, tour_schedule_id: p.newScheduleId }); await this.releasePromotion(tx, p); }
        if (p.status !== "accepted_refund") p.status = "expired";
        this.addRefund({ ...b, payments: [...b.payments, payment] }, m, p.priceDifference, "reschedule");
        return this.save(tx, b, m, { status: b.status === "cancelled" ? "refund_pending" : b.status });
      }
      return this.move(tx, b, m, true);
    });
  }

  async expireHolds() {
    const candidates = await this.prisma.bookings.findMany({ where: { status: "cancel_proposed" }, select: { booking_id: true, cancellation_meta: true }, take: 500 });
    for (const candidate of candidates) {
      const p = (candidate.cancellation_meta as any)?.resolutionProposal;
      if (p?.status !== "awaiting_payment" || +new Date(p.paymentDeadline) > Date.now()) continue;
      await this.prisma.$transaction(async tx => {
        const b = await this.booking(tx, candidate.booking_id, undefined, true), m = metaOf(b), current = m.resolutionProposal;
        if (current?.status !== "awaiting_payment" || +new Date(current.paymentDeadline) > Date.now()) return;
        await this.seats(tx, [current.newScheduleId]);
        await this.release(tx, { ...b, tour_schedule_id: current.newScheduleId });
        await this.releasePromotion(tx, current);
        current.status = "expired";
        await this.save(tx, b, m);
      });
    }
  }

  async updateRefundBank(id: number, userId: number, dto: any) {
    const recipient = bank(dto);
    return this.prisma.$transaction(async tx => {
      const b = await this.booking(tx, id, userId), m = metaOf(b);
      const refund = refundsOf(m).find(r => r.id === dto.refundId && r.status === "pending");
      if (!refund) fail("Không có khoản hoàn đang chờ.");
      refund!.bank = recipient;
      return this.save(tx, b, m);
    });
  }

  async confirmRefund(id: number, dto: any) {
    if (!String(dto.transactionCode || "").trim() || String(dto.transactionCode).trim().length > 100) fail("Cần mã giao dịch chuyển tiền hoàn hợp lệ (tối đa 100 ký tự).");
    return this.transaction(id, "refund_transferred", async tx => {
      const b = await this.booking(tx, id), m = metaOf(b);
      const refund = refundsOf(m).find(r => r.id === dto.refundId && r.status === "processing");
      if (!refund) fail("Khoản hoàn không tồn tại hoặc đã được xử lý. Không tự hoàn theo tổng booking.");
      bank(refund!.bank);
      if (money(dto.amount) !== refund!.amount || refund!.amount > bookingFunds(b.payments).available) fail("Số tiền không khớp khoản hoàn đã duyệt.");
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.transactionCode.trim()}, 0))`;
      if (await tx.payments.findFirst({ where: { method: "bank", transaction_code: dto.transactionCode.trim() } })) fail("Mã giao dịch đã được ghi nhận.");
      await tx.payments.create({ data: { booking_id: id, amount: refund!.amount, method: "bank", status: "refunded", transaction_code: dto.transactionCode.trim(), provider_reference: `REFUND:${refund!.id}` } });
      Object.assign(refund!, { status: "completed", transactionCode: dto.transactionCode.trim(), transferredAt: new Date().toISOString(), note: String(dto.note || "").slice(0, 2000), confirmedBy: dto.actorId });
      if (m.resolutionProposal?.status === "accepted_refund") m.resolutionProposal.refundTransfer = { ...refund, transferredAt: refund!.transferredAt };
      return this.save(tx, b, m, { status: b.status === "refund_pending" && !pendingRefunds(m) ? "cancelled" : b.status });
    });
  }

  async cancelByAdmin(id: number, dto: any) {
    if (dto.cancelType === "operator_fault") return this.propose(id, dto);
    const b = await this.prisma.bookings.findUnique({ where: { booking_id: id } });
    if (!b) throw new NotFoundException("Không tìm thấy booking.");
    if (b.status === "pending") return this.requestCancel(id, b.user_id, { reason: dto.reason });
    if (b.status !== "cancel_requested") {
      // Use the same policy and bank validation as customer requests, rather than bypassing cancellation safeguards.
      await this.requestCancel(id, b.user_id, dto);
    }
    return this.approveCancel(id, dto.note, dto.refundAmount, dto.actorId);
  }

  async beginRefundTransfer(id: number, dto: any) {
    return this.prisma.$transaction(async tx => {
      const b = await this.booking(tx, id), m = metaOf(b);
      const refund = refundsOf(m).find(r => r.id === dto.refundId);
      if (!refund) fail("Không tìm thấy khoản hoàn.");
      if (dto.release === true) {
        if (refund!.status !== "processing" || !String(dto.note || "").trim()) fail("Cần lý do giao dịch chưa thực hiện / thất bại để mở lại khoản hoàn.");
        m.refundAttempts = [...(m.refundAttempts || []), { refundId: refund!.id, reason: String(dto.note).slice(0, 2000), at: new Date().toISOString(), actorId: dto.actorId }];
        refund!.status = "pending";
      } else {
        if (refund!.status !== "pending") fail("Khoản hoàn đã được nhận xử lý hoặc hoàn tất.");
        bank(refund!.bank);
        refund!.status = "processing";
        Object.assign(refund!, { processingAt: new Date().toISOString(), processedBy: dto.actorId });
      }
      return this.save(tx, b, m);
    });
  }

  async cancelDeparture(scheduleId: number, reason: string) {
    if (!reason?.trim()) fail("Cần nhập lý do ngừng chuyến.");
    const result = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT booking_id FROM bookings WHERE tour_schedule_id = ${scheduleId} ORDER BY booking_id FOR UPDATE`;
      await this.seats(tx, [scheduleId]);
      const schedule = await tx.tour_schedules.findUnique({ where: { tour_schedule_id: scheduleId }, include: { tours: true } });
      if (!schedule || schedule.start_date <= new Date()) fail("Chỉ xử lý ngừng chuyến chưa khởi hành.");
      const bookings = await tx.bookings.findMany({ where: { tour_schedule_id: scheduleId, status: { in: ["pending", "paid", "cancel_requested", "cancel_proposed"] } }, include: { payments: true, booking_travelers: true } });
      if (bookings.some(b => (b.cancellation_meta as any)?.resolutionProposal?.status === "awaiting_payment")) fail("Chuyến có khách đang nộp thêm tiền đổi lịch. Hãy xử lý hoặc hết hạn đề xuất đó trước.");
      await tx.tour_schedules.update({ where: { tour_schedule_id: scheduleId }, data: { status: 0 } });
      for (const b of bookings) {
        const m = metaOf(b);
        if (["cancel_proposed"].includes(b.status) && m.departureCancelled) continue;
        m.departureCancelled = { scheduleId, reason: reason.trim(), at: new Date().toISOString() };
        if (b.status === "pending" && !bookingFunds(b.payments).available && !b.payments.some(p => p.status === "review")) {
          await this.release(tx, b); await this.restoreBenefits(tx, b, m); m.seatsReleased = true;
          await tx.payments.updateMany({ where: { booking_id: b.booking_id, status: "pending" }, data: { status: "expired" } });
          await this.save(tx, b, m, { status: "cancelled" });
        } else {
          if (m.resolutionProposal) m.proposalHistory = [...(m.proposalHistory || []), m.resolutionProposal];
          m.resolutionProposal = { id: randomUUID(), version: 2, proposedAt: new Date().toISOString(), status: "pending_customer", reason: reason.trim(), allowedOptions: ["full_refund"] };
          await this.save(tx, b, m, { status: "cancel_proposed" });
        }
      }
      return { affected: bookings.length, bookingIds: bookings.map(b => b.booking_id), tourName: schedule!.tours.name };
    }, { timeout: 30000 });
    for (const id of result.bookingIds) {
      try {
        const b = await this.prisma.bookings.findUniqueOrThrow({ where: { booking_id: id } });
        await sendBookingNotification(this.prisma, { type: "cancel_proposed", userId: b.user_id, bookingId: id, tourName: result.tourName, reason });
        if (this.mail && b.status === "cancel_proposed" && b.contact_email) await this.mail.sendCancelProposedEmail({ email: b.contact_email, contactName: b.contact_name, bookingId: id, tourName: result.tourName, reason, optionsText: "Nhận hoàn tiền để tự đặt lại hoặc liên hệ thỏa thuận lịch mới cùng tour" });
      } catch { /* Each affected booking retains its visible proposal. */ }
    }
    return result;
  }

  async recordIncident(id: number, dto: any) {
    return this.transaction(id, "service_adjusted", async tx => {
      const b = await this.booking(tx, id), m = metaOf(b);
      if (!["paid", "completed", "no_show"].includes(b.status) || b.tour_schedules.start_date > new Date()) fail("Chỉ ghi nhận sự cố/bỏ chuyến cho booking đã thanh toán và đã đến giờ đi.");
      const reason = String(dto.reason || "").trim();
      if (reason.length < 3 || reason.length > 2000 || !["no_show", "service_adjustment"].includes(dto.kind)) fail("Cần chọn loại sự cố và mô tả hợp lệ.");
      if (m.incidents?.some((i: any) => i.reference === dto.reference)) fail("Sự cố này đã được ghi nhận.");
      if (!dto.reference || String(dto.reference).length > 100) fail("Cần mã hồ sơ sự cố riêng để tránh ghi nhận lặp.");
      const amount = dto.kind === "no_show" ? 0 : money(dto.amount);
      if (dto.kind === "service_adjustment" && !amount) fail("Khoản hoàn dịch vụ phải lớn hơn 0.");
      this.addRefund(b, m, amount, "service_adjustment");
      m.incidents = [...(m.incidents || []), { kind: dto.kind, reason, amount, reference: dto.reference, at: new Date().toISOString() }];
      return this.save(tx, b, m, { status: dto.kind === "no_show" ? "no_show" : b.status });
    });
  }

  async reconcileReview(id: number, dto: any) {
    return this.transaction(id, "service_adjusted", async tx => {
      const b = await this.booking(tx, id, undefined, true), m = metaOf(b);
      const payment = b.payments.find((p: any) => p.payment_id === dto.paymentId && p.status === "review");
      if (!payment || !String(dto.reason || "").trim()) fail("Cần chọn giao dịch đang đối soát và ghi căn cứ đã nhận tiền.");
      await tx.payments.update({ where: { payment_id: payment.payment_id }, data: { status: "completed" } });
      const fundsBooking = { ...b, payments: b.payments.map((p: any) => p.payment_id === payment.payment_id ? { ...p, status: "completed" } : p) };
      this.addRefund(fundsBooking, m, money(payment.amount), "service_adjustment");
      m.reconciliations = [...(m.reconciliations || []), { paymentId: payment.payment_id, amount: Number(payment.amount), reason: String(dto.reason).slice(0, 2000), at: new Date().toISOString(), actorId: dto.actorId }];
      let status = b.status;
      if (b.status === "pending" || (b.status === "cancel_requested" && !bookingFunds(b.payments).available)) {
        await this.seats(tx, [b.tour_schedule_id]); await this.release(tx, b); await this.restoreBenefits(tx, b, m); m.seatsReleased = true; status = "refund_pending";
      } else if (b.status === "cancelled") status = "refund_pending";
      return this.save(tx, b, m, { status });
    });
  }
}
