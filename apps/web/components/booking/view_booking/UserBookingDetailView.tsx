"use client";

import { withdrawBookingCancellation } from "@/lib/booking/client/api";
import { BookingCrewCard } from "@/components/booking/view_booking/UserBookingCrewCard";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { BookingCancelModal } from "@/components/booking/cancel_request/UserBookingCancelModal";
import { BookingCancelledBanner } from "@/components/booking/view_booking/UserBookingCancelledBanner";
import { BookingReceiptModal } from "@/components/booking/view_booking/UserBookingReceiptModal";
import { UserBookingResolutionProposalCard } from "@/components/booking/view_booking/UserBookingResolutionProposalCard";
import { BookingSettlementPanel } from "@/components/booking/BookingSettlementPanel";
import { PaymentCountdownCard } from "@/components/booking/create_booking/UserPaymentCountdownCard";
import { formatVND } from "@/lib/utils/currency";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  MapPin,
  Plane,
  ReceiptText,
  Ticket,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { parseBookingNote, type BookingDetail } from "shared";

const money = (value: number | string | null | undefined) => formatVND(Number(value) || 0);

function date(value?: string | null, withTime = false) {
  if (!value || Number.isNaN(new Date(value).getTime())) return "Chưa cập nhật";
  return new Date(value).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function bookingStatus(
  value: string,
  schedule?: { start_date?: string | null; end_date?: string | null } | null,
  meta?: any,
) {
  const status = value.toLowerCase();
  if (status === "no_show") return { label: "Không tham gia", tone: "warning" };
  if (["cancelled", "canceled", "đã hủy"].includes(status)) return { label: "Đã hủy", tone: "cancelled" };
  if (status === "cancel_requested") return { label: "Đang yêu cầu hủy", tone: "pending" };
  if (status === "cancel_proposed") {
    if (meta?.resolutionProposal?.status === "contact_support") {
      return { label: "Yêu cầu đổi phương án", tone: "warning" };
    }
    return { label: "Đề xuất hủy/đổi lịch", tone: "warning" };
  }
  if (status === "refund_pending") return { label: "Chờ chuyển tiền hoàn", tone: "warning" };
  if (["completed", "đã hoàn thành"].includes(status)) return { label: "Đã hoàn thành", tone: "success" };
  if (status === "paid") return { label: "Đã thanh toán", tone: "success" };
  if (status === "pending") return { label: "Chờ thanh toán", tone: "pending" };
  return { label: value || "Chưa cập nhật", tone: "pending" };
}

function Status({
  value,
  schedule,
  meta,
}: {
  value: string;
  schedule?: { start_date?: string | null; end_date?: string | null } | null;
  meta?: any;
}) {
  const status = bookingStatus(value, schedule, meta);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[650] border whitespace-nowrap ${
        status.tone === "cancelled"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : status.tone === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : status.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status.tone === "cancelled"
            ? "bg-rose-500"
            : status.tone === "warning"
              ? "bg-amber-500"
              : status.tone === "success"
                ? "bg-emerald-500"
                : "bg-blue-500"
        }`}
      />
      {status.label}
    </span>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-[#edf2fb]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
        {icon}
      </div>
      <div>
        <h2 className="text-[16px] font-[750] leading-[1.5] text-[#0b1747]">
          {title}
        </h2>
        <p className="text-[12px] leading-[1.5] text-[#7387aa]">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-[#edf2fb] bg-slate-50/70 p-3 min-w-0 ${
        wide ? "col-span-full" : ""
      }`}
    >
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </dt>
      <dd className="text-[13px] font-bold leading-[1.5] text-[#0b1747] break-words">
        {children || "Chưa cập nhật"}
      </dd>
    </div>
  );
}

export function BookingDetailView({ booking: b }: { booking: BookingDetail }) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const parsedNote = parseBookingNote(b.note, b);
  const isPast = b.tour_schedules?.start_date
    ? new Date(b.tour_schedules.start_date).getTime() <= Date.now()
    : false;
  const canCancel =
    (b.status === "pending" || (b.status === "paid" && !isPast)) &&
    (b.status as string) !== "cancel_proposed" &&
    (b.status as string) !== "refund_pending";

  const tour = b.tour_schedules?.tours;
  const name = tour?.name || `Đơn đặt tour #${b.booking_id}`;
  const tourSummary = tour?.summary?.trim() || (tour?.description ? tour.description.replace(/<[^>]*>/g, "").trim() : "");
  const origAdultPrice = Number(b.membership_snapshot?.originalAdultPrice) || Number(b.adult_unit_price) || 0;
  const origChildPrice = Number(b.membership_snapshot?.originalChildPrice) || Number(b.child_unit_price) || 0;
  const promoDiscount = Number(b.membership_snapshot?.promoDiscount) || 0;
  const promoTitle = b.membership_snapshot?.promoTitle || (b.membership_snapshot?.promoType === "flash_deal" ? "Flash Deal" : (b.membership_snapshot?.promoType === "schedule_promotion" ? "Ưu đãi đợt" : null));
  const promoGift = b.membership_snapshot?.promoGift || null;
  const memberDiscount = (Number(b.membership_snapshot?.tourDiscount) || 0) + (Number(b.membership_snapshot?.serviceDiscount) || 0);
  const voucherDiscount = Number(b.membership_snapshot?.voucherDiscount) || 0;
  const pointsDiscount = Number(b.membership_snapshot?.pointsDiscount) || 0;

  const rows = [
    {
      label: "Người lớn",
      quantity: b.adult_count,
      price: Number(b.adult_unit_price) || 0,
      origPrice: origAdultPrice > Number(b.adult_unit_price) ? origAdultPrice : null,
    },
    {
      label: "Trẻ em",
      quantity: b.child_count,
      price: Number(b.child_unit_price) || 0,
      origPrice: origChildPrice > Number(b.child_unit_price) ? origChildPrice : null,
    },
    {
      label: "Em bé",
      quantity: b.infant_count,
      price: Number(b.infant_unit_price) || 0,
      origPrice: null,
    },
  ];
  const tickets = rows.reduce((sum, row) => sum + row.quantity * row.price, 0);
  const discount = Number(b.discount_amount) || 0;
  const totalDiscount = promoDiscount + discount;
  const services = Number(b.services_total) || 0;
  const surcharge = Math.max(0, Math.round((Number(b.total_amount) + discount - tickets - services) * 100) / 100);
  const subtotalOriginal = tickets + promoDiscount + services + surcharge;
  const extras = Array.isArray(b.additional_services) ? b.additional_services : [];
  const payments = [...(b.payments || [])].sort((a, z) => new Date(z.created_at).getTime() - new Date(a.created_at).getTime());
  const payment = payments.find(item => ["success", "paid", "completed"].includes(item.status.toLowerCase())) || payments[0];
  const paymentStatus = payment ? ({ success: "Đã thanh toán", paid: "Đã thanh toán", completed: "Đã thanh toán", pending: "Chờ thanh toán", failed: "Thất bại", refunded: "Đã hoàn tiền", review: "Cần đối soát" }[payment.status.toLowerCase()] || payment.status) : "Chưa có giao dịch";
  const method = payment ? ({ vnpay: "VNPay", momo: "MoMo", bank: "Chuyển khoản", bank_transfer: "Chuyển khoản" }[payment.method.toLowerCase()] || payment.method) : "Chưa cập nhật";

  return (
    <div className="bg-blue-50 min-h-screen text-[#07123e]">
      {/* Page Header */}
      <header className="border-b border-[#e1edfc] bg-white pt-4 pb-5 shadow-xs">
        <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Đường dẫn" className="flex items-center gap-1.5 text-[12px] text-[#7387aa] mb-3 flex-wrap">
            <Link href="/" className="hover:text-[#075bff] flex items-center gap-1">
              <Home size={14} />
              <span>Trang chủ</span>
            </Link>
            <ChevronRight size={13} className="text-slate-400" />
            <Link href="/account/bookings" className="hover:text-[#075bff]">
              Lịch sử đặt tour
            </Link>
            <ChevronRight size={13} className="text-slate-400" />
            <span className="font-semibold text-[#0b1747]">Chi tiết booking</span>
          </nav>

          {/* Title and Controls */}
          <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex items-start gap-3 min-w-0">
              <Link
                href="/account/bookings"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d6e7fb] bg-white text-[#075bff] hover:bg-blue-50 transition-colors shadow-xs"
                aria-label="Quay lại lịch sử đặt tour"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
                  <span>Chi tiết booking</span>
                  <span>•</span>
                  <span className="text-[#075bff] font-bold">#BK{String(b.booking_id).padStart(6, "0")}</span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-[20px] sm:text-[24px] font-extrabold leading-[1.25] tracking-[-0.6px] text-[#07123e]">
                    {name}
                  </h1>
                  <Status value={b.status} schedule={b.tour_schedules} meta={b.cancellation_meta} />
                  {isPast && b.status === "paid" && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      Đã qua ngày khởi hành
                    </span>
                  )}
                </div>
                {tourSummary && (
                  <p className="mt-1 text-[12px] leading-[1.5] text-[#7387aa] max-w-3xl line-clamp-2">
                    {tourSummary}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start shrink-0 flex-wrap">
              {["paid", "completed"].includes(b.status) && (
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-[#075bff] bg-[#075bff] px-3.5 py-2 text-[12px] font-[650] text-white hover:bg-[#064ddd] shadow-xs transition-colors cursor-pointer"
                >
                  <FileText size={15} />
                  <span>Xem biên lai thanh toán</span>
                </button>
              )}
              {b.status === "cancelled" && (
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-rose-200 bg-white px-3.5 py-2 text-[12px] font-[650] text-rose-700 hover:bg-rose-50 shadow-xs transition-colors cursor-pointer"
                >
                  <FileText size={15} />
                  <span>Xem biên nhận hoàn tiền</span>
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-[12px] border border-rose-200 bg-white px-3.5 py-2 text-[12px] font-[650] text-rose-600 hover:bg-rose-50 shadow-xs transition-colors cursor-pointer"
                >
                  <XCircle size={15} />
                  <span>Yêu cầu hủy tour</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="mx-auto w-full max-w-[1440px] px-4 py-3 sm:px-6 lg:px-8 md:pb-8 space-y-3">
        {/* Cancel Requested Alert */}
        {b.status === "cancel_requested" && (
          <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 space-y-2.5 text-sm text-amber-950 shadow-sm">
            <h3 className="font-bold text-amber-900">Yêu cầu hủy đang chờ xử lý</h3>
            <p className="text-[13px] text-amber-900 leading-[1.5]">
              Phí hủy được chốt theo thời điểm bạn gửi yêu cầu. Việc chuyến đã khởi hành không tự động biến yêu cầu đang chờ thành bị từ chối.
            </p>
            <button
              disabled={withdrawBusy}
              className="rounded-[12px] border border-amber-300 bg-white px-3.5 py-2 text-xs font-[650] text-amber-900 hover:bg-amber-100 disabled:opacity-50 transition-colors shadow-2xs"
              onClick={async () => {
                setWithdrawBusy(true);
                setWithdrawError("");
                try {
                  await withdrawBookingCancellation(b.booking_id);
                  window.location.reload();
                } catch (error) {
                  setWithdrawError(error instanceof Error ? error.message : "Không rút được yêu cầu.");
                  setWithdrawBusy(false);
                }
              }}
            >
              {withdrawBusy ? "Đang xử lý..." : "Rút yêu cầu hủy, tiếp tục booking"}
            </button>
            {withdrawError && <p role="alert" className="text-red-700 text-xs">{withdrawError}</p>}
          </div>
        )}

        {/* Admin Rejection Notice */}
        {b.status !== "cancel_requested" && !(b.cancellation_meta as any)?.cancelRequest?.withdrawn && parsedNote.adminRejection && (
          <div className="rounded-[14px] border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-sm">
            <strong className="font-bold">Yêu cầu hủy chưa được chấp thuận: </strong>
            <span>{parsedNote.adminRejection.note || "Vui lòng liên hệ tư vấn viên để được giải thích."}</span>
          </div>
        )}

        {/* Resolution Proposal or Cancelled Banner */}
        {(b.cancellation_meta as any)?.resolutionProposal ? (
          <UserBookingResolutionProposalCard booking={b} />
        ) : b.status === "cancelled" ? (
          <BookingCancelledBanner
            parsedNote={parsedNote}
            tourId={tour?.tour_id}
            onViewRefundSlip={() => setReceiptModalOpen(true)}
          />
        ) : null}

        {/* Settlement Panel */}
        <BookingSettlementPanel booking={b} />

        {/* 2-Column Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1.35fr)_minmax(0,_1fr)] gap-3 items-start">
          {/* Cột trái: Thông tin tour, Đội ngũ phụ trách, Người đặt tour */}
          <div className="flex flex-col gap-3 min-w-0">
            {/* Card 1: Thông tin tour */}
            <section className="rounded-[14px] border border-[#e1edfc] bg-white p-4 shadow-sm space-y-3 min-w-0" aria-label="Thông tin tour">
              <SectionTitle
                icon={<Ticket size={20} />}
                title="Thông tin tour"
                description="Các thông tin cơ bản của tour bạn đã đặt."
              />
              <div className="flex gap-3.5 flex-col sm:flex-row">
                <ImageWithFallback
                  src={tour?.tour_images?.[0]?.image_url || ""}
                  alt={name}
                  className="w-full sm:w-36 h-36 object-cover rounded-xl shrink-0 border border-[#edf2fb]"
                />
                <div className="flex-1 min-w-0">
                  <dl>
                    <Field label="Tên tour">
                      {tour ? (
                        <Link href={`/tours/${tour.tour_id}`} className="hover:text-[#075bff] transition-colors">
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                    </Field>
                  </dl>
                </div>
              </div>

              {/* 4 Info Fields */}
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { icon: Plane, label: "Mã tour", value: tour?.code || "Chưa cập nhật" },
                  { icon: CalendarDays, label: "Ngày khởi hành", value: date(b.tour_schedules?.start_date) },
                  { icon: Clock3, label: "Thời gian", value: tour ? `${tour.duration_days}N${tour.duration_nights}Đ` : "Chưa cập nhật" },
                  { icon: MapPin, label: "Điểm khởi hành", value: b.departure_name || b.tour_schedules?.departure_location?.name || "Chưa cập nhật" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2.5 rounded-xl border border-[#edf2fb] bg-slate-50/70 p-2.5 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#075bff]">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="text-[12px] font-bold leading-[1.5] text-[#0b1747] truncate">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              {/* Pickup Point Information */}
              {b.pickup_snapshot && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { icon: MapPin, label: "Địa điểm đón", value: b.pickup_snapshot.address ? `${b.pickup_snapshot.name} — ${b.pickup_snapshot.address}` : b.pickup_snapshot.name },
                    { icon: Clock3, label: "Thời gian đón", value: date(b.pickup_snapshot.pickup_at, true) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2.5 rounded-xl border border-[#edf2fb] bg-slate-50/70 p-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#075bff]">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                        <dd className="text-[12px] font-bold leading-[1.5] text-[#0b1747] break-words">{value}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              )}
            </section>

            {/* Card 2: Người phụ trách chuyến đi */}
            <BookingCrewCard booking={b} />

            {/* Card 3: Đếm ngược thanh toán (nếu pending) */}
            {b.status === "pending" && <PaymentCountdownCard booking={b} payments={payments} />}

            {/* Card 4: Thông tin người đặt tour */}
            <section className="rounded-[14px] border border-[#e1edfc] bg-white p-4 shadow-sm space-y-3 min-w-0" aria-label="Thông tin người đặt tour">
              <SectionTitle
                icon={<UserRound size={20} />}
                title="Thông tin người đặt tour"
                description="Người đại diện đặt tour, các thông tin liên hệ được sử dụng để xác nhận và gửi thông báo."
              />
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Field label="Họ và tên">{b.contact_name}</Field>
                <Field label="Số điện thoại">{b.contact_phone}</Field>
                <Field label="Email" wide>{b.contact_email}</Field>
                <Field label="Ghi chú" wide>
                  <span className="font-normal whitespace-pre-line text-slate-700">
                    {parsedNote.customerNote || "Không có ghi chú."}
                  </span>
                </Field>
              </dl>
            </section>
          </div>

          {/* Cột phải: Danh sách hành khách & Chi tiết hóa đơn */}
          <div className="flex flex-col gap-3 min-w-0">
            {/* Card 5: Danh sách hành khách */}
            <section className="rounded-[14px] border border-[#e1edfc] bg-white p-4 shadow-sm space-y-3 min-w-0" aria-label="Danh sách hành khách">
              <SectionTitle
                icon={<UsersRound size={20} />}
                title="Danh sách hành khách"
                description="Thông tin hành khách đi cùng trong booking này."
              />
              <div className="rounded-xl border border-[#edf2fb] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap text-[13px]">
                    <thead>
                      <tr className="border-b border-[#edf2fb] bg-slate-50/75 text-[12px] font-[650] text-[#7387aa]">
                        <th className="px-4 py-3">Họ tên</th>
                        <th className="px-4 py-3">Ngày sinh</th>
                        <th className="px-4 py-3">Giới tính</th>
                        <th className="px-4 py-3">Giấy tờ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2fb]">
                      {b.booking_travelers?.length ? (
                        b.booking_travelers.map((traveler) => (
                          <tr key={traveler.traveler_id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <strong className="font-bold text-[#0b1747]">{traveler.full_name}</strong>
                              <span className="block text-[11px] text-slate-500 mt-0.5">
                                {{ adult: "Người lớn", child: "Trẻ em", infant: "Em bé" }[traveler.traveler_type.toLowerCase()] || traveler.traveler_type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{date(traveler.dob)}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {{ male: "Nam", female: "Nữ", other: "Khác" }[traveler.gender.toLowerCase()] || traveler.gender || "—"}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">{traveler.id_number || "Chưa cập nhật"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center text-slate-400 py-6">
                            Chưa có thông tin hành khách.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Card 6: Chi tiết hóa đơn */}
            <section className="rounded-[14px] border border-[#e1edfc] bg-white p-4 shadow-sm space-y-3 min-w-0" aria-label="Chi tiết hóa đơn">
              <SectionTitle
                icon={<ReceiptText size={20} />}
                title="Chi tiết hóa đơn"
                description="Các khoản chi phí trong booking (vé, phụ thu, dịch vụ kèm theo)."
              />
              <div className="rounded-xl border border-[#edf2fb] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left whitespace-nowrap text-[13px]">
                    <thead>
                      <tr className="border-b border-[#edf2fb] bg-slate-50/75 text-[12px] font-[650] text-[#7387aa]">
                        <th className="px-4 py-3">Hạng mục</th>
                        <th className="px-4 py-3 text-center">Số lượng</th>
                        <th className="px-4 py-3 text-right">Đơn giá</th>
                        <th className="px-4 py-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edf2fb]">
                      {rows.map((row) => (
                        <tr key={row.label} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#0b1747]">{row.label}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{row.quantity}</td>
                          <td className="px-4 py-3 text-right">
                            {row.origPrice && (
                              <span className="block text-[10px] text-slate-400 line-through font-normal">
                                {money(row.origPrice)}
                              </span>
                            )}
                            <span className="text-slate-700">{money(row.price)}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#0b1747]">{money(row.quantity * row.price)}</td>
                        </tr>
                      ))}
                      {extras.map((item, index) => (
                        <tr key={`${item.id}-${index}`} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#0b1747]">{item.name}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{money(item.unit_price)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#0b1747]">{money(item.amount)}</td>
                        </tr>
                      ))}
                      {services > 0 && !extras.length && (
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#0b1747]">Dịch vụ bổ sung</td>
                          <td className="px-4 py-3 text-center text-slate-600">1</td>
                          <td className="px-4 py-3 text-right text-slate-700">{money(services)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#0b1747]">{money(services)}</td>
                        </tr>
                      )}
                      {surcharge > 0 && (
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 font-medium text-[#0b1747]">Phụ thu phòng / khác</td>
                          <td className="px-4 py-3 text-center text-slate-600">1</td>
                          <td className="px-4 py-3 text-right text-slate-700">{money(surcharge)}</td>
                          <td className="px-4 py-3 text-right font-bold text-[#0b1747]">{money(surcharge)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sub-Blocks: Ưu đãi & Chi tiết thanh toán */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {/* Khối Ưu đãi / Giảm giá */}
                <div className="rounded-xl border border-blue-100/80 bg-blue-50/40 p-4 flex flex-col justify-between space-y-3">
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      Ưu đãi & Giảm giá
                    </dt>
                    <dd className="text-[12px] leading-[1.6]">
                      {totalDiscount > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-extrabold text-emerald-600">
                            Tiết kiệm {money(totalDiscount)}
                          </div>
                          <div className="space-y-1.5 text-[11px] text-[#466286]">
                            {promoDiscount > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block rounded-md bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-bold border border-rose-200">
                                  {promoTitle || "Ưu đãi"}
                                </span>
                                <span className="font-semibold text-rose-600">−{money(promoDiscount)}</span>
                              </div>
                            )}
                            {memberDiscount > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block rounded-md bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold border border-amber-200">
                                  Hạng {b.membership_snapshot?.name || "thành viên"}
                                </span>
                                <span className="font-semibold text-amber-700">−{money(memberDiscount)}</span>
                              </div>
                            )}
                            {voucherDiscount > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block rounded-md bg-blue-100 text-blue-700 px-2 py-0.5 text-[10px] font-bold border border-blue-200">
                                  Voucher
                                </span>
                                <span className="font-semibold text-blue-600">−{money(voucherDiscount)}</span>
                              </div>
                            )}
                            {promoGift && (
                              <div className="text-[11px] text-amber-900 font-semibold bg-amber-50/90 rounded-lg px-2 py-1 inline-block border border-amber-200/80 mt-1">
                                🎁 Quà tặng: {promoGift}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">Không áp dụng giảm giá</span>
                      )}
                    </dd>
                  </div>

                  <div className="border-t border-blue-100/70 pt-2.5">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-0.5">
                      Mã Voucher
                    </dt>
                    <dd className="text-[12px] font-bold text-[#0b1747]">
                      {b.vouchers?.code ? (
                        <span className="font-mono text-[#075bff]">{b.vouchers.code}</span>
                      ) : (
                        <span className="font-normal text-slate-400">Không sử dụng</span>
                      )}
                    </dd>
                  </div>
                </div>

                {/* Khối Thanh toán & Trạng thái */}
                <div className="rounded-xl border border-[#edf2fb] bg-slate-50/60 p-4 space-y-2.5">
                  <dl className="space-y-1.5 text-[12px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <dt>Tạm tính (giá gốc)</dt>
                      <dd className="font-semibold text-[#0b1747]">{money(subtotalOriginal)}</dd>
                    </div>
                    {promoDiscount > 0 && (
                      <div className="flex items-center justify-between text-rose-600">
                        <dt>{promoTitle || "Ưu đãi / Flash Deal"}</dt>
                        <dd className="font-semibold">− {money(promoDiscount)}</dd>
                      </div>
                    )}
                    {memberDiscount > 0 && (
                      <div className="flex items-center justify-between text-amber-700">
                        <dt>Ưu đãi hạng {b.membership_snapshot?.name || "thành viên"}</dt>
                        <dd className="font-semibold">− {money(memberDiscount)}</dd>
                      </div>
                    )}
                    {voucherDiscount > 0 && (
                      <div className="flex items-center justify-between text-blue-700">
                        <dt>Voucher ({b.vouchers?.code || "giảm giá"})</dt>
                        <dd className="font-semibold">− {money(voucherDiscount)}</dd>
                      </div>
                    )}
                    {pointsDiscount > 0 && <div className="flex items-center justify-between text-blue-700"><dt>Điểm thành viên ({b.membership_snapshot?.pointsUsed} điểm)</dt><dd className="font-semibold">− {money(pointsDiscount)}</dd></div>}
                    {totalDiscount > 0 && !promoDiscount && !memberDiscount && !voucherDiscount && !pointsDiscount && (
                      <div className="flex items-center justify-between text-[#607ca3]">
                        <dt>Giảm giá</dt>
                        <dd className="font-semibold">− {money(totalDiscount)}</dd>
                      </div>
                    )}
                  </dl>

                  {/* Tổng tiền thanh toán */}
                  <div className="border-y border-[#edf2fb] py-2.5 my-2 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Giá lúc thanh toán
                    </span>
                    <strong className="text-xl font-extrabold leading-6 tracking-tight text-[#075bff]">
                      {money(b.total_amount)}
                    </strong>
                  </div>

                  {/* Metadata giao dịch */}
                  <dl className="space-y-1.5 text-[11px] text-slate-500" data-booking-payment-details="">
                    <div className="flex items-center justify-between">
                      <dt>Trạng thái đơn</dt>
                      <dd><Status value={b.status} schedule={b.tour_schedules} meta={b.cancellation_meta} /></dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Ngày đặt đơn</dt>
                      <dd className="font-medium text-slate-700">{date(b.created_at, true)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Mã giao dịch</dt>
                      <dd className="font-mono font-medium text-slate-700">{payment?.transaction_code || "Chưa có"}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Phương thức</dt>
                      <dd className="font-medium text-slate-700">{method}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt>Thanh toán</dt>
                      <dd className="font-semibold text-slate-900">{paymentStatus}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Popup Modal Hủy Tour / Yêu Cầu Hủy */}
      <BookingCancelModal
        open={cancelModalOpen}
        booking={b}
        onClose={() => setCancelModalOpen(false)}
        onSuccess={() => {
          setCancelModalOpen(false);
          window.location.reload();
        }}
      />

      {/* Popup Modal Xem & In Biên lai / Biên nhận hoàn tiền */}
      <BookingReceiptModal
        open={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        booking={b}
      />
    </div>
  );
}
