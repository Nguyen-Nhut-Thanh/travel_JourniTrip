"use client";

import { useState } from "react";
import { createReschedulePaymentUrl, resolveBookingProposal } from "@/lib/booking/client/api";
import { BookingBankFields, emptyBookingBank } from "@/components/booking/BookingBankFields";
import { formatVND } from "@/lib/utils/currency";
import type { BookingDetail } from "shared";
import { BookingPaymentButton } from "@/components/booking/create_booking/UserBookingPaymentButton";

export interface UserBookingResolutionProposalCardProps {
  booking: BookingDetail;
  onSuccess?: () => void;
}

export function UserBookingResolutionProposalCard({ booking, onSuccess }: UserBookingResolutionProposalCardProps) {
  const [choice, setChoice] = useState<"full_refund" | "reschedule">("full_refund");
  const [recipient, setRecipient] = useState(emptyBookingBank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [localProposal, setLocalProposal] = useState<any>(null);
  const p = localProposal || (booking.cancellation_meta as any)?.resolutionProposal;
  if (!p) return null;

  const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const canChoose = booking.status === "cancel_proposed" && ["pending_customer", "awaiting_payment", "expired", "contact_support"].includes(p.status);
  const expired = p.status === "expired" || (p.expiresAt && +new Date(p.expiresAt) <= Date.now());
  const canReschedule = p.version === 2 && p.status === "pending_customer" && !expired && p.allowedOptions?.includes("reschedule");
  const needsBank = !canReschedule || choice === "full_refund" || Number(p.priceDifference) < 0;

  return (
    <section className="w-full space-y-3 rounded-[14px] border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800 shadow-sm">
      <h2 className="text-[16px] font-[750] leading-[1.5] text-[#0b1747]">
        Phương án giải quyết chuyến đi
      </h2>
      <p className="text-[13px] text-slate-700">{p.reason}</p>
      {p.adminNote && <p className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-blue-100">{p.adminNote}</p>}

      {p.status === "awaiting_payment" && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="font-bold text-amber-950">Chờ thanh toán bổ sung: {formatVND(p.priceDifference)}</p>
          <p className="text-xs text-amber-900">
            Hạn giữ chỗ: {date(p.paymentDeadline)}. Chỉ thanh toán phần chênh lệch qua VNPay. Lịch mới được xác nhận tự động sau khi thanh toán hợp lệ.
          </p>
          {+new Date(p.paymentDeadline) > Date.now() ? (
            <BookingPaymentButton
              bookingId={booking.booking_id}
              rescheduleProposalId={p.id}
              label={`Thanh toán bổ sung ${formatVND(p.priceDifference)} qua VNPay`}
            />
          ) : (
            <p className="font-semibold text-rose-700 text-xs">
              Đã hết hạn giữ chỗ. Vui lòng liên hệ để nhận đề xuất mới. Khoản tiền về trễ (nếu có) được ghi nhận để hoàn lại.
            </p>
          )}
        </div>
      )}

      {p.status === "accepted_reschedule" && (
        <p className="font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs">
          Đã xác nhận lịch mới. Khoản hoàn chênh lệch (nếu có) được theo dõi bên dưới.
        </p>
      )}

      {p.status === "accepted_refund" && (
        <p className="font-semibold text-blue-800 bg-white p-2.5 rounded-lg border border-blue-100 text-xs">
          Đã chọn hoàn tiền. Theo dõi khoản hoàn và tài khoản nhận tiền bên dưới.
        </p>
      )}

      {canChoose && (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const decision = canReschedule ? choice : "full_refund";
              const result = await resolveBookingProposal(booking.booking_id, {
                decision,
                proposalId: p.id || "legacy-" + booking.booking_id,
                ...(needsBank ? recipient : {}),
              });
              if (decision === "reschedule" && p.priceDifference > 0) {
                if (result.cancellation_meta?.resolutionProposal) {
                  setLocalProposal(result.cancellation_meta.resolutionProposal);
                }
                const payment = await createReschedulePaymentUrl(booking.booking_id, p.id);
                if (!payment.paymentUrl) {
                  throw new Error("Đã ghi nhận đổi lịch; vui lòng bấm thanh toán bổ sung để mở lại VNPay.");
                }
                window.location.assign(payment.paymentUrl);
                return;
              }
              if (onSuccess) onSuccess();
              else window.location.reload();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Không xử lý được yêu cầu.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px] font-medium text-slate-800 cursor-pointer">
              <input
                type="radio"
                name="resolution"
                checked={choice === "full_refund" || !canReschedule}
                onChange={() => setChoice("full_refund")}
                className="text-[#075bff]"
              />
              Hoàn tiền để tự đặt lại
            </label>
            {canReschedule && (
              <label className="flex items-center gap-2 text-[13px] font-medium text-slate-800 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  checked={choice === "reschedule"}
                  onChange={() => setChoice("reschedule")}
                  className="text-[#075bff]"
                />
                Đồng ý đổi lịch cùng tour
              </label>
            )}
          </div>

          {canReschedule && (
            <div className="rounded-xl border border-blue-100 bg-white p-3 space-y-1 text-xs">
              <p>Lịch đề xuất: <strong className="font-semibold text-[#0b1747]">{date(p.newScheduleStart)} – {date(p.newScheduleEnd)}</strong></p>
              <p>Tiền thanh toán mới sau ưu đãi và điểm: <strong className="font-bold text-[#075bff]">{formatVND(p.newTotal)}</strong></p>
              {Number(p.pointsReturned) > 0 && <p className="text-blue-700">Hoàn {Number(p.pointsReturned).toLocaleString('vi-VN')} điểm khi đổi lịch thành công để giữ giới hạn dùng điểm 30% theo giá mới.</p>}
              <p>
                {p.priceDifference > 0 ? "Khách nộp thêm: " : p.priceDifference < 0 ? "Công ty hoàn lại: " : "Không phát sinh chênh lệch: "}
                <strong className="font-bold">{formatVND(Math.abs(p.priceDifference))}</strong>
              </p>
              {p.pickup && <p className="text-slate-600">Điểm đón: {p.pickup.name} — {p.pickup.address}</p>}
              <p className="mt-1 text-[11px] text-slate-500">Sau khi đổi thành công, chính sách hủy áp dụng theo ngày khởi hành mới.</p>
            </div>
          )}

          {expired && (
            <p className="text-amber-800 text-xs">
              Đề xuất đổi lịch đã hết hạn. Bạn có thể nhận hoàn tiền hoặc liên hệ nhận lịch mới.
            </p>
          )}

          {needsBank && (
            <BookingBankFields
              label="Tài khoản của bạn để nhận tiền hoàn"
              value={recipient}
              onChange={setRecipient}
              disabled={busy}
            />
          )}

          {error && <p role="alert" className="text-rose-700 text-xs">{error}</p>}

          <button
            disabled={busy}
            className="rounded-[12px] bg-[#075bff] hover:bg-[#064ddd] px-4 py-2 text-xs font-[650] text-white shadow-xs transition-colors disabled:opacity-50"
          >
            {busy ? "Đang xử lý…" : "Xác nhận lựa chọn"}
          </button>
        </form>
      )}
    </section>
  );
}
