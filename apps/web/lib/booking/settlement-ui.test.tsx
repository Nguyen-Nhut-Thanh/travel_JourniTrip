import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookingBankFields, emptyBookingBank } from "../../components/booking/BookingBankFields";
import { BookingSettlementPanel } from "../../components/booking/BookingSettlementPanel";
import { UserBookingResolutionProposalCard } from "../../components/booking/view_booking/UserBookingResolutionProposalCard";
import { getBookingPaymentStatus } from "./client/status";

Object.assign(globalThis, { React });
const recipient = { bankName: "Vietcombank", bankAccountNumber: "0123456789", bankAccountName: "NGUYEN VAN A" };
const booking: any = { booking_id: 1, status: "paid", total_amount: 10000000, cancellation_meta: {}, payments: [{ amount: 10000000, status: "completed" }] };

test("recipient form exposes all three required bank fields and preserves account numbers as text", () => {
  const html = renderToStaticMarkup(React.createElement(BookingBankFields, { value: emptyBookingBank, onChange: () => {}, label: "Tài khoản nhận tiền" }));
  assert.match(html, /Ngân hàng/); assert.match(html, /Số tài khoản/); assert.match(html, /Tên chủ tài khoản/);
  assert.match(html, /inputMode="numeric"/); assert.ok((html.match(/required=""/g) || []).length >= 3);
});
test("customer sees a VNPay top-up button and deadline without company bank details", () => {
  const html = renderToStaticMarkup(React.createElement(UserBookingResolutionProposalCard, { booking: { ...booking, status: "cancel_proposed", cancellation_meta: { resolutionProposal: {
    id: "P1", version: 2, status: "awaiting_payment", priceDifference: 2000000, companyBankInfo: recipient, transferContent: "BK1-P1", paymentDeadline: "2027-01-01T00:00:00Z",
  } } } }));
  assert.match(html, /Thanh toán bổ sung 2\.000\.000.*qua VNPay/); assert.match(html, /Hạn giữ chỗ/);
  assert.doesNotMatch(html, /0123456789|NGUYEN VAN A|BK1-P1|Số tài khoản công ty/);
  assert.doesNotMatch(html, /phương án khác/);
});

test("new VNPay proposals do not offer manual admin confirmation of supplemental money", () => {
  const html = renderToStaticMarkup(React.createElement(BookingSettlementPanel, { admin: true, booking: { ...booking, status: "cancel_proposed", cancellation_meta: { resolutionProposal: {
    id: "P1", status: "awaiting_payment", paymentMethod: "vnpay", priceDifference: 2000000, paymentDeadline: "2027-01-01T00:00:00Z", companyBankInfo: recipient,
  } } } }));
  assert.match(html, /Khách nộp bổ sung qua VNPay/);
  assert.doesNotMatch(html, /Xác nhận thực nhận khoản bổ sung|0123456789|Mã giao dịch ngân hàng/);
});
test("admin refund action uses the approved refund amount and freezes recipient before transfer", () => {
  const html = renderToStaticMarkup(React.createElement(BookingSettlementPanel, { admin: true, booking: { ...booking, cancellation_meta: { refunds: [{ id: "R1", amount: 2000000, status: "pending", reason: "reschedule", bank: recipient }] } } }));
  assert.match(html, /Hoàn chênh lệch đổi lịch: 2\.000\.000/); assert.match(html, /Chốt tài khoản và bắt đầu chuyển tiền/);
  assert.doesNotMatch(html, /Xác nhận đã hoàn 10\.000\.000/);
});
test("customer cannot edit recipient while admin is transferring; partial refunds keep payment status paid", () => {
  const html = renderToStaticMarkup(React.createElement(BookingSettlementPanel, { booking: { ...booking, cancellation_meta: { refunds: [{ id: "R1", amount: 2000000, status: "processing", reason: "reschedule", bank: recipient }] } } }));
  assert.doesNotMatch(html, /Nhập \/ sửa/); assert.match(html, /thông tin nhận tiền đã chốt/);
  assert.deepEqual(getBookingPaymentStatus({ status: "paid", payments: [{ status: "completed" }, { status: "refunded" }] }), { paymentStatus: "paid", paymentStatusText: "Đã hoàn một phần" });
});
