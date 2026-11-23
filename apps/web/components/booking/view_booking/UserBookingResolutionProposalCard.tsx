"use client";
import { useState } from "react";
import { resolveBookingProposal } from "@/lib/booking/client/api";
import { BookingBankFields, emptyBookingBank } from "@/components/booking/BookingBankFields";
import { formatVND } from "@/lib/utils/currency";
import type { BookingDetail } from "shared";
export interface UserBookingResolutionProposalCardProps { booking: BookingDetail; onSuccess?: () => void; }
export function UserBookingResolutionProposalCard({ booking, onSuccess }: UserBookingResolutionProposalCardProps) {
  const [choice, setChoice] = useState<"full_refund" | "reschedule">("full_refund");
  const [recipient, setRecipient] = useState(emptyBookingBank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const p = (booking.cancellation_meta as any)?.resolutionProposal;
  if (!p) return null;
  const date = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const canChoose = booking.status === "cancel_proposed" && ["pending_customer", "awaiting_payment", "expired", "contact_support"].includes(p.status);
  const expired = p.status === "expired" || (p.expiresAt && +new Date(p.expiresAt) <= Date.now());
  const canReschedule = p.version === 2 && p.status === "pending_customer" && !expired && p.allowedOptions?.includes("reschedule");
  const needsBank = !canReschedule || choice === "full_refund" || Number(p.priceDifference) < 0;
  return <section className="mx-auto my-4 w-[93%] space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
    <h2 className="font-bold">Phương án giải quyết chuyến đi</h2><p>{p.reason}</p>{p.adminNote && <p>{p.adminNote}</p>}
    {p.status === "awaiting_payment" && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="font-bold">Chờ thanh toán bổ sung: {formatVND(p.priceDifference)}</p>
      <p>Ngân hàng: <strong>{p.companyBankInfo?.bankName}</strong></p>
      <p>Số tài khoản công ty: <strong className="select-all">{p.companyBankInfo?.bankAccountNumber}</strong></p>
      <p>Chủ tài khoản: <strong>{p.companyBankInfo?.bankAccountName}</strong></p>
      <p>Nội dung chuyển khoản: <strong className="select-all">{p.transferContent}</strong></p>
      <p>Hạn giữ chỗ: {date(p.paymentDeadline)}. Sau khi chuyển khoản, liên hệ tư vấn viên để đối chiếu. Lịch mới chỉ được xác nhận sau khi công ty kiểm tra tiền thực nhận.</p>
      {+new Date(p.paymentDeadline) <= Date.now() && <p className="font-semibold text-red-700">Đã hết hạn. Không chuyển tiền theo đề xuất này; liên hệ đối soát nếu bạn đã chuyển.</p>}
    </div>}
    {p.status === "accepted_reschedule" && <p className="font-semibold text-emerald-700">Đã xác nhận lịch mới. Khoản hoàn chênh lệch (nếu có) được theo dõi bên dưới.</p>}
    {p.status === "accepted_refund" && <p>Đã chọn hoàn tiền. Theo dõi khoản hoàn và tài khoản nhận tiền bên dưới.</p>}
    {canChoose && <form className="space-y-3" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError("");
      try {
        await resolveBookingProposal(booking.booking_id, { decision: canReschedule ? choice : "full_refund", proposalId: p.id || "legacy-" + booking.booking_id, ...(needsBank ? recipient : {}) });
        if (onSuccess) onSuccess(); else window.location.reload();
      } catch (e) { setError(e instanceof Error ? e.message : "Không xử lý được yêu cầu."); } finally { setBusy(false); }
    }}>
      <label className="flex gap-2"><input type="radio" name="resolution" checked={choice === "full_refund" || !canReschedule} onChange={() => setChoice("full_refund")} />Hoàn tiền để tự đặt lại</label>
      {canReschedule && <label className="flex gap-2"><input type="radio" name="resolution" checked={choice === "reschedule"} onChange={() => setChoice("reschedule")} />Đồng ý đổi lịch cùng tour</label>}
      {canReschedule && <div className="rounded-xl bg-white p-3">
        <p>Lịch đề xuất: {date(p.newScheduleStart)} – {date(p.newScheduleEnd)}</p>
        <p>Giá mới đã thỏa thuận: <strong>{formatVND(p.newTotal)}</strong></p>
        <p>{p.priceDifference > 0 ? "Khách nộp thêm: " : p.priceDifference < 0 ? "Công ty hoàn lại: " : "Không phát sinh chênh lệch: "}<strong>{formatVND(Math.abs(p.priceDifference))}</strong></p>
        {p.pickup && <p>Điểm đón: {p.pickup.name} — {p.pickup.address}</p>}
        <p className="mt-1 text-xs text-slate-500">Sau khi đổi thành công, chính sách hủy áp dụng theo ngày khởi hành mới.</p>
      </div>}
      {expired && <p className="text-amber-800">Đề xuất đổi lịch đã hết hạn. Bạn có thể nhận hoàn tiền hoặc liên hệ nhận lịch mới.</p>}
      {needsBank && <BookingBankFields label="Tài khoản của bạn để nhận tiền hoàn" value={recipient} onChange={setRecipient} disabled={busy} />}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <button disabled={busy} className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Đang xử lý…" : "Xác nhận lựa chọn"}</button>
    </form>}
  </section>;
}
