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
  const collectionPending = admin && ["awaiting_payment", "expired", "accepted_refund"].includes(p?.status) && p.paymentDeadline && p.priceDifference > 0 && !p.collection;
  const canRecordIncident = admin && ["paid", "completed", "no_show"].includes(b.status) && +new Date(b.tour_schedules?.start_date) <= Date.now();
  const reviews = (b.payments || []).filter((payment: any) => payment.status === "review");
  if (!refunds.length && !m.cancellationHistory?.length && !collectionPending && !canRecordIncident && !m.incidents?.length && !reviews.length && !(admin && p)) return null;
  const execute = async (action: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await action(); setEditId(null); setTransaction(""); if (onUpdated) await onUpdated(); else window.location.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không xử lý được giao dịch."); } finally { setBusy(false); }
  };
  return <section className="my-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
    <h3 className="font-bold">Thu và hoàn tiền</h3>
    {admin && p && <div className="space-y-1 rounded-xl bg-blue-50 p-3 text-xs">
      <p className="font-semibold">Đề xuất: {({ pending_customer: "Chờ khách chọn", awaiting_payment: "Chờ nộp bổ sung", accepted_reschedule: "Đã đổi lịch", accepted_refund: "Đã chọn hoàn tiền", expired: "Đề xuất hết hạn", contact_support: "Đề xuất cũ cần liên hệ lại" } as Record<string, string>)[p.status] || p.status}</p>
      <p>{p.reason}</p>
      {p.newScheduleStart && <p>Lịch mới: {new Date(p.newScheduleStart).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · Giá {formatVND(p.newTotal)} · {p.priceDifference >= 0 ? "Thu thêm" : "Hoàn lại"} {formatVND(Math.abs(p.priceDifference))}</p>}
      {p.companyBankInfo && <p>Tài khoản công ty: {p.companyBankInfo.bankName} · {p.companyBankInfo.bankAccountNumber} · {p.companyBankInfo.bankAccountName}</p>}
    </div>}
    {!!reviews.length && <p className="rounded-lg bg-amber-50 p-3 text-amber-900">Có giao dịch đang đối soát. Các thao tác tài chính được tạm khóa cho đến khi công ty xác minh.</p>}
    {admin && reviews.map((payment: any) => <form key={payment.payment_id} className="space-y-2 rounded-lg border border-amber-200 p-3" onSubmit={e => {
      e.preventDefault(); void execute(() => reconcileBookingPayment(b.booking_id, { paymentId: payment.payment_id, reason: reconcileReason }));
    }}>
      <p>Giao dịch #{payment.payment_id}: {formatVND(payment.amount)} · {payment.transaction_code || payment.provider_reference}</p>
      <label className="block">Căn cứ xác minh thực nhận<input required maxLength={2000} value={reconcileReason} onChange={e => setReconcileReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="flex gap-2 text-xs"><input required type="checkbox" />Đã xác minh công ty nhận tiền; khoản này được hoàn lại, không tự mở lại booking.</label>
      <button disabled={busy} className="rounded-lg bg-blue-700 px-3 py-2 text-white disabled:opacity-50">Ghi nhận thực thu và tạo khoản hoàn</button>
    </form>)}
    <p>Đã thu {formatVND(funds.collected)} · Đã hoàn {formatVND(funds.refunded)} · Còn phải hoàn {formatVND(refunds.filter(r => r.status !== "completed").reduce((sum, r) => sum + r.amount, 0))}</p>
    {collectionPending && <form className="space-y-2 rounded-xl bg-amber-50 p-3" onSubmit={e => {
      e.preventDefault(); void execute(() => confirmBookingCollection(b.booking_id, { proposalId: p.id, amount: p.priceDifference, transactionCode: transaction }));
    }}>
      <p className="font-semibold">Xác nhận thực nhận khoản bổ sung {formatVND(p.priceDifference)}</p>
      <p>{p.companyBankInfo?.bankName} · {p.companyBankInfo?.bankAccountNumber} · {p.companyBankInfo?.bankAccountName}</p>
      <p>Nội dung: {p.transferContent}. Hạn: {new Date(p.paymentDeadline).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      <label className="block">Mã giao dịch ngân hàng<input required maxLength={100} value={transaction} onChange={e => setTransaction(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="flex gap-2 text-xs"><input type="checkbox" required />Tôi đã kiểm tra tài khoản công ty nhận đủ số tiền này.</label>
      <button disabled={busy} className="rounded-lg bg-blue-700 px-3 py-2 text-white disabled:opacity-50">{p.status === "expired" || +new Date(p.paymentDeadline) <= Date.now() ? "Ghi nhận tiền về trễ để hoàn lại" : "Xác nhận đã nhận tiền và đổi lịch"}</button>
    </form>}
    {refunds.map(refund => <div key={refund.id} className="space-y-2 rounded-xl border border-blue-100 p-3">
      <p className="font-semibold">{refund.reason === "service_adjustment" ? "Hoàn dịch vụ do sự cố" : refund.reason === "reschedule" ? "Hoàn chênh lệch đổi lịch" : refund.reason === "partial_cancellation" ? "Hoàn do hủy một phần" : "Hoàn do hủy booking"}: {formatVND(refund.amount)}</p>
      <p>{refund.status === "completed" ? "Đã chuyển tiền" : refund.status === "processing" ? "Công ty đang chuyển khoản — thông tin nhận tiền đã chốt" : "Chờ chuyển tiền"}{refund.transactionCode ? ` · Mã giao dịch: ${refund.transactionCode}` : ""}</p>
      {refund.bank ? <p>Tài khoản nhận: {refund.bank.bankName} · <span className="select-all">{refund.bank.bankAccountNumber}</span> · {refund.bank.bankAccountName}</p> : <p className="text-amber-800">Chưa có tài khoản nhận tiền. Khách cần bổ sung trước khi công ty chuyển khoản.</p>}
      {!admin && refund.status === "pending" && editId !== refund.id && <button className="font-semibold text-blue-700" onClick={() => { setEditId(refund.id); setRecipient(refund.bank || emptyBookingBank); }}>Nhập / sửa tài khoản nhận tiền</button>}
      {!admin && editId === refund.id && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void execute(() => updateBookingRefundBank(b.booking_id, { ...recipient, refundId: refund.id })); }}>
        <BookingBankFields label="Tài khoản cá nhân nhận tiền hoàn" value={recipient} onChange={setRecipient} disabled={busy} />
        <button disabled={busy} className="rounded-lg bg-blue-700 px-3 py-2 text-white">Lưu tài khoản nhận tiền</button>
      </form>}
      {admin && refund.status === "pending" && refund.bank && <button type="button" disabled={busy} className="rounded-lg bg-blue-700 px-3 py-2 text-white disabled:opacity-50" onClick={() => void execute(() => beginBookingRefund(b.booking_id, { refundId: refund.id }))}>Chốt tài khoản và bắt đầu chuyển tiền</button>}
      {admin && refund.status === "processing" && refund.bank && <form className="space-y-2" onSubmit={e => { e.preventDefault(); void execute(() => confirmRefundTransfer(b.booking_id, { refundId: refund.id, amount: refund.amount, transactionCode: transaction })); }}>
        <label className="block">Mã giao dịch đã chuyển hoàn<input required maxLength={100} value={transaction} onChange={e => setTransaction(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        <label className="flex gap-2 text-xs"><input type="checkbox" required />Đã chuyển đúng số tiền và đúng tài khoản ở trên.</label>
        <button disabled={busy} className="rounded-lg bg-emerald-700 px-3 py-2 text-white disabled:opacity-50">Xác nhận đã hoàn {formatVND(refund.amount)}</button>
      </form>}
      {admin && refund.status === "processing" && <form className="space-y-2 border-t pt-2" onSubmit={e => { e.preventDefault(); void execute(() => beginBookingRefund(b.booking_id, { refundId: refund.id, release: true, note: reconcileReason })); }}>
        <label className="block text-xs">Lý do chưa chuyển được / chuyển khoản thất bại<input required value={reconcileReason} maxLength={2000} onChange={e => setReconcileReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        <label className="flex gap-2 text-xs"><input type="checkbox" required />Tôi đã xác minh tiền chưa được chuyển thành công.</label>
        <button disabled={busy} className="text-sm font-semibold text-blue-700">Mở lại khoản hoàn để xử lý lại</button>
      </form>}
    </div>)}
    {m.cancellationHistory?.map((entry: any, i: number) => <div key={i} className="rounded-xl bg-slate-50 p-3 text-xs">
      <p className="font-semibold">{entry.partial ? "Lịch sử hủy một phần" : "Lịch sử hủy booking"}</p>
      <p>{entry.travelers?.map((t: any) => t.full_name).join(", ")}</p>
      <p>Phần dịch vụ hủy: {formatVND(entry.portionAmount)} · Phí hủy: {formatVND(entry.penalty)} · Tiền hoàn: {formatVND(entry.refundAmount)}</p>
    </div>)}
    {m.incidents?.map((incident: any) => <p key={incident.reference} className="rounded-lg bg-slate-50 p-2 text-xs">{incident.kind === "no_show" ? "Khách không tham gia" : "Điều chỉnh dịch vụ"}: {incident.reason} · Hồ sơ {incident.reference} · Hoàn {formatVND(incident.amount)}</p>)}
    {canRecordIncident && <button type="button" onClick={() => setIncidentOpen(v => !v)} className="font-semibold text-blue-700">Ghi nhận bỏ chuyến / sự cố dịch vụ</button>}
    {incidentOpen && canRecordIncident && <form className="space-y-2 rounded-xl border p-3" onSubmit={e => {
      e.preventDefault(); void execute(() => recordBookingIncident(b.booking_id, { kind: incidentKind, reason: incidentReason, reference: incidentReference, amount: incidentKind === "no_show" ? 0 : Number(incidentAmount) }));
    }}>
      <label className="block">Loại sự việc<select className="mt-1 w-full rounded-lg border p-2" value={incidentKind} onChange={e => setIncidentKind(e.target.value)}><option value="service_adjustment">Hoàn dịch vụ không cung cấp / sự cố hành trình</option><option value="no_show">Toàn bộ khách không tham gia chuyến</option></select></label>
      <label className="block">Mã hồ sơ sự việc<input required maxLength={100} value={incidentReference} onChange={e => setIncidentReference(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      <label className="block">Diễn biến và căn cứ xử lý<textarea required minLength={3} maxLength={2000} value={incidentReason} onChange={e => setIncidentReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
      {incidentKind === "service_adjustment" && <label className="block">Tiền hoàn được duyệt (đ)<input required type="number" min={1} step={1} value={incidentAmount} onChange={e => setIncidentAmount(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>}
      <p className="text-xs text-slate-500">Khoản hoàn dịch vụ không hủy booking. Khách bổ sung tài khoản nhận tiền trong phần khoản hoàn.</p>
      <button disabled={busy} className="rounded-lg bg-blue-700 px-3 py-2 text-white disabled:opacity-50">Lưu hồ sơ xử lý</button>
    </form>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
