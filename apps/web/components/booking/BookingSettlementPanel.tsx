"use client";

import { useState } from "react";
import { bookingFunds, bookingRefunds, type BookingRefund } from "shared";
import { BookingBankFields, emptyBookingBank } from "./BookingBankFields";
import { updateBookingRefundBank } from "@/lib/booking/client/api";
import { beginBookingRefund, confirmBookingCollection, confirmRefundTransfer, recordBookingIncident, reconcileBookingPayment } from "@/lib/booking/admin/api";
import { formatVND } from "@/lib/utils/currency";

export function BookingSettlementPanel({ booking: b, admin = false, onUpdated }: { booking: any; admin?: boolean; onUpdated?: () => void | Promise<void> }) {
  const [recipient, setRecipient] = useState(emptyBookingBank);
  const [editId, setEditId] = useState<string | null>(null);
  const [transaction, setTransaction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentKind, setIncidentKind] = useState("service_adjustment");
  const [incidentReason, setIncidentReason] = useState("");
  const [incidentAmount, setIncidentAmount] = useState("");
  const [incidentReference, setIncidentReference] = useState("");
  const [reconcileReason, setReconcileReason] = useState("");
  const m = b.cancellation_meta || {}, p = m.resolutionProposal;
  const refunds: BookingRefund[] = bookingRefunds(b);
  const funds = bookingFunds(b.payments || []);
  const collectionPending = admin && p?.paymentMethod !== "vnpay" && p?.companyBankInfo && ["awaiting_payment", "expired", "accepted_refund"].includes(p?.status) && p.paymentDeadline && p.priceDifference > 0 && !p.collection;
  const canRecordIncident = admin && ["paid", "completed", "no_show"].includes(b.status) && +new Date(b.tour_schedules?.start_date) <= Date.now();
  const reviews = (b.payments || []).filter((payment: any) => payment.status === "review");
  if (!refunds.length && !m.cancellationHistory?.length && !collectionPending && !canRecordIncident && !m.incidents?.length && !reviews.length && !(admin && p)) return null;

  const execute = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); setEditId(null); setTransaction(""); if (onUpdated) await onUpdated(); else window.location.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không xử lý được giao dịch."); } finally { setBusy(false); }
  };

  return (
    <section className="w-full space-y-3 rounded-[14px] border border-[#e1edfc] bg-white p-4 shadow-sm text-sm text-slate-800">
      <h3 className="text-[16px] font-[750] leading-[1.5] text-[#0b1747]">
        Thu và hoàn tiền
      </h3>

      {admin && p && (
        <div className="space-y-1 rounded-xl bg-blue-50 p-3 text-xs border border-blue-100">
          <p className="font-semibold text-blue-900">
            Đề xuất: {({ pending_customer: "Chờ khách chọn", awaiting_payment: "Chờ nộp bổ sung", accepted_reschedule: "Đã đổi lịch", accepted_refund: "Đã chọn hoàn tiền", expired: "Đề xuất hết hạn", contact_support: "Đề xuất cũ cần liên hệ lại" } as Record<string, string>)[p.status] || p.status}
          </p>
          <p>{p.reason}</p>
          {p.paymentMethod === "vnpay" && p.priceDifference > 0 && <p>Khách nộp bổ sung qua VNPay. Hệ thống tự động đối chiếu và xác nhận lịch mới khi thanh toán hợp lệ.</p>}
          {p.newScheduleStart && <p>Lịch mới: {new Date(p.newScheduleStart).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Giá {formatVND(p.newTotal)} · {p.priceDifference >= 0 ? "Thu thêm" : "Hoàn lại"} {formatVND(Math.abs(p.priceDifference))}</p>}
          {p.paymentMethod !== "vnpay" && p.companyBankInfo && <p>Tài khoản công ty: {p.companyBankInfo.bankName} · {p.companyBankInfo.bankAccountNumber} · {p.companyBankInfo.bankAccountName}</p>}
        </div>
      )}

      {!!reviews.length && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 border border-amber-200">
          Có giao dịch đang đối soát. Các thao tác tài chính được tạm khóa cho đến khi công ty xác minh.
        </p>
      )}

      {admin && reviews.map((payment: any) => (
        <form key={payment.payment_id} className="space-y-2 rounded-xl border border-amber-200 p-3 bg-amber-50/50" onSubmit={e => {
          e.preventDefault(); void execute(() => reconcileBookingPayment(b.booking_id, { paymentId: payment.payment_id, reason: reconcileReason }));
        }}>
          <p className="font-semibold text-xs">Giao dịch #{payment.payment_id}: {formatVND(payment.amount)} · {payment.transaction_code || payment.provider_reference}</p>
          <label className="block text-xs font-medium">Căn cứ xác minh thực nhận<input required maxLength={2000} value={reconcileReason} onChange={e => setReconcileReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white" /></label>
          <label className="flex gap-2 text-xs items-center"><input required type="checkbox" />Đã xác minh công ty nhận tiền; khoản này được hoàn lại, không tự mở lại booking.</label>
          <button disabled={busy} className="rounded-[12px] bg-[#075bff] px-3.5 py-2 text-xs font-[650] text-white hover:bg-[#064ddd] disabled:opacity-50">Ghi nhận thực thu và tạo khoản hoàn</button>
        </form>
      ))}

      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-[#edf2fb]">
        Đã thu <strong className="text-slate-900">{formatVND(funds.collected)}</strong> · Đã hoàn <strong className="text-slate-900">{formatVND(funds.refunded)}</strong> · Còn phải hoàn <strong className="text-rose-600">{formatVND(refunds.filter(r => r.status !== "completed").reduce((sum, r) => sum + r.amount, 0))}</strong>
      </p>

      {collectionPending && (
        <form className="space-y-2 rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs" onSubmit={e => {
          e.preventDefault(); void execute(() => confirmBookingCollection(b.booking_id, { proposalId: p.id, amount: p.priceDifference, transactionCode: transaction }));
        }}>
          <p className="font-semibold text-amber-950">Xác nhận thực nhận khoản bổ sung {formatVND(p.priceDifference)}</p>
          <p>{p.companyBankInfo?.bankName} · {p.companyBankInfo?.bankAccountNumber} · {p.companyBankInfo?.bankAccountName}</p>
          <p>Nội dung: {p.transferContent}. Hạn: {new Date(p.paymentDeadline).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
          <label className="block">Mã giao dịch ngân hàng<input required maxLength={100} value={transaction} onChange={e => setTransaction(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white" /></label>
          <label className="flex gap-2 text-xs items-center"><input type="checkbox" required />Tôi đã kiểm tra tài khoản công ty nhận đủ số tiền này.</label>
          <button disabled={busy} className="rounded-[12px] bg-[#075bff] px-3.5 py-2 text-xs font-[650] text-white hover:bg-[#064ddd] disabled:opacity-50">{p.status === "expired" || +new Date(p.paymentDeadline) <= Date.now() ? "Ghi nhận tiền về trễ để hoàn lại" : "Xác nhận đã nhận tiền và đổi lịch"}</button>
        </form>
      )}

      {refunds.map(refund => (
        <div key={refund.id} className="space-y-2 rounded-xl border border-[#edf2fb] bg-slate-50/70 p-3.5 text-xs">
          <p className="font-bold text-[#0b1747] text-[13px]">{refund.reason === "service_adjustment" ? "Hoàn dịch vụ do sự cố" : refund.reason === "reschedule" ? "Hoàn chênh lệch đổi lịch" : refund.reason === "partial_cancellation" ? "Hoàn do hủy một phần" : "Hoàn do hủy booking"}: {formatVND(refund.amount)}</p>
          <p className="text-slate-600">{refund.status === "completed" ? "Đã chuyển tiền" : refund.status === "processing" ? "Công ty đang chuyển khoản — thông tin nhận tiền đã chốt" : "Chờ chuyển tiền"}{refund.transactionCode ? ` · Mã giao dịch: ${refund.transactionCode}` : ""}</p>
          {refund.bank ? <p className="text-slate-700">Tài khoản nhận: <strong className="font-semibold">{refund.bank.bankName}</strong> · <span className="select-all font-mono font-bold text-[#075bff]">{refund.bank.bankAccountNumber}</span> · <span className="uppercase">{refund.bank.bankAccountName}</span></p> : <p className="text-amber-800 font-medium">Chưa có tài khoản nhận tiền. Khách cần bổ sung trước khi công ty chuyển khoản.</p>}
          {!admin && refund.status === "pending" && editId !== refund.id && <button className="font-semibold text-[#075bff] hover:underline" onClick={() => { setEditId(refund.id); setRecipient(refund.bank || emptyBookingBank); }}>Nhập / sửa tài khoản nhận tiền</button>}
          {!admin && editId === refund.id && (
            <form className="space-y-2 pt-2 border-t border-slate-200" onSubmit={e => { e.preventDefault(); void execute(() => updateBookingRefundBank(b.booking_id, { ...recipient, refundId: refund.id })); }}>
              <BookingBankFields label="Tài khoản cá nhân nhận tiền hoàn" value={recipient} onChange={setRecipient} disabled={busy} />
              <button disabled={busy} className="rounded-[12px] bg-[#075bff] px-3.5 py-2 text-xs font-[650] text-white hover:bg-[#064ddd]">Lưu tài khoản nhận tiền</button>
            </form>
          )}
          {admin && refund.status === "pending" && refund.bank && <button type="button" disabled={busy} className="rounded-[12px] bg-[#075bff] px-3.5 py-2 text-xs font-[650] text-white disabled:opacity-50" onClick={() => void execute(() => beginBookingRefund(b.booking_id, { refundId: refund.id }))}>Chốt tài khoản và bắt đầu chuyển tiền</button>}
          {admin && refund.status === "processing" && refund.bank && (
            <form className="space-y-2 pt-2 border-t border-slate-200" onSubmit={e => { e.preventDefault(); void execute(() => confirmRefundTransfer(b.booking_id, { refundId: refund.id, amount: refund.amount, transactionCode: transaction })); }}>
              <label className="block">Mã giao dịch đã chuyển hoàn<input required maxLength={100} value={transaction} onChange={e => setTransaction(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white" /></label>
              <label className="flex gap-2 text-xs items-center"><input type="checkbox" required />Đã chuyển đúng số tiền và đúng tài khoản ở trên.</label>
              <button disabled={busy} className="rounded-[12px] bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-[650] text-white disabled:opacity-50">Xác nhận đã hoàn {formatVND(refund.amount)}</button>
            </form>
          )}
          {admin && refund.status === "processing" && (
            <form className="space-y-2 border-t pt-2" onSubmit={e => { e.preventDefault(); void execute(() => beginBookingRefund(b.booking_id, { refundId: refund.id, release: true, note: reconcileReason })); }}>
              <label className="block text-xs">Lý do chưa chuyển được / chuyển khoản thất bại<input required value={reconcileReason} maxLength={2000} onChange={e => setReconcileReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white" /></label>
              <label className="flex gap-2 text-xs items-center"><input type="checkbox" required />Tôi đã xác minh tiền chưa được chuyển thành công.</label>
              <button disabled={busy} className="text-xs font-semibold text-[#075bff] hover:underline">Mở lại khoản hoàn để xử lý lại</button>
            </form>
          )}
        </div>
      ))}

      {m.cancellationHistory?.map((entry: any, i: number) => (
        <div key={i} className="rounded-xl bg-slate-50 p-3 text-xs border border-[#edf2fb]">
          <p className="font-semibold text-slate-800">{entry.partial ? "Lịch sử hủy một phần" : "Lịch sử hủy booking"}</p>
          <p className="text-slate-600">{entry.travelers?.map((t: any) => t.full_name).join(", ")}</p>
          <p>Phần dịch vụ hủy: {formatVND(entry.portionAmount)} · Phí hủy: {formatVND(entry.penalty)} · Tiền hoàn: <strong className="text-emerald-700">{formatVND(entry.refundAmount)}</strong></p>
        </div>
      ))}

      {m.incidents?.map((incident: any) => (
        <p key={incident.reference} className="rounded-xl bg-slate-50 p-2.5 text-xs border border-[#edf2fb]">
          <strong className="text-slate-800">{incident.kind === "no_show" ? "Khách không tham gia" : "Điều chỉnh dịch vụ"}:</strong> {incident.reason} · Hồ sơ {incident.reference} · Hoàn <strong className="text-emerald-700">{formatVND(incident.amount)}</strong>
        </p>
      ))}

      {canRecordIncident && (
        <button type="button" onClick={() => setIncidentOpen(v => !v)} className="text-xs font-semibold text-[#075bff] hover:underline">
          Ghi nhận bỏ chuyến / sự cố dịch vụ
        </button>
      )}

      {incidentOpen && canRecordIncident && (
        <form className="space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50/50 text-xs" onSubmit={e => {
          e.preventDefault(); void execute(() => recordBookingIncident(b.booking_id, { kind: incidentKind, reason: incidentReason, reference: incidentReference, amount: incidentKind === "no_show" ? 0 : Number(incidentAmount) }));
        }}>
          <label className="block">Loại sự việc<select className="mt-1 w-full rounded-lg border p-2 bg-white" value={incidentKind} onChange={e => setIncidentKind(e.target.value)}><option value="service_adjustment">Hoàn dịch vụ không cung cấp / sự cố hành trình</option><option value="no_show">Toàn bộ khách không tham gia chuyến</option></select></label>
          <label className="block">Mã hồ sơ sự việc<input required maxLength={100} value={incidentReference} onChange={e => setIncidentReference(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white" /></label>
          <label className="block">Diễn biến và căn cứ xử lý<textarea required minLength={3} maxLength={2000} value={incidentReason} onChange={e => setIncidentReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white" /></label>
          {incidentKind === "service_adjustment" && <label className="block">Tiền hoàn được duyệt (đ)<input required type="number" min={1} step={1} value={incidentAmount} onChange={e => setIncidentAmount(e.target.value)} className="mt-1 w-full rounded-lg border p-2 bg-white" /></label>}
          <p className="text-[11px] text-slate-500">Khoản hoàn dịch vụ không hủy booking. Khách bổ sung tài khoản nhận tiền trong phần khoản hoàn.</p>
          <button disabled={busy} className="rounded-[12px] bg-[#075bff] px-3.5 py-2 text-xs font-[650] text-white hover:bg-[#064ddd] disabled:opacity-50">Lưu hồ sơ xử lý</button>
        </form>
      )}

      {error && <p role="alert" className="text-rose-700 text-xs">{error}</p>}
    </section>
  );
}
