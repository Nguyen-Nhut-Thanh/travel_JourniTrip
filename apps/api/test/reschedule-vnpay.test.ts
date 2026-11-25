import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { PaymentService } from "../src/modules/payment/payment.service";
import { formatVnpayDate, signedVnpayQuery } from "../src/modules/payment/vnpay";
import { bookingFixture } from "./booking-workflow.fixture";

const config = { merchant: "TESTMERCHANT", secret: "local-test-secret-only", gateway: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html", returnUrl: "http://localhost:4000/payment/vnpay-return", minutes: 15 };
const recipient = { bankName: "Vietcombank", bankAccountNumber: "0123456789", bankAccountName: "NGUYEN VAN A" };

function fixture() {
  const f = bookingFixture();
  const matches = (row: any, where: any): boolean => Object.entries(where || {}).every(([key, value]: [string, any]) => {
    if (key === "bookings") return !value.user_id || value.user_id === f.state().booking.user_id;
    if (value && typeof value === "object" && "gt" in value) return +new Date(row[key]) > +value.gt;
    return row[key] === value;
  });
  const view = (row: any, withBooking = false): any => row ? { ...row, amount: new Prisma.Decimal(row.amount), ...(withBooking ? { bookings: f.booking() } : {}) } : null;
  const wrap = (tx: any) => ({ ...tx,
    bookings: { ...tx.bookings,
      findFirst: async ({ where }: any) => where.user_id === f.state().booking.user_id ? f.booking() : null,
      findUnique: async () => ({ ...f.booking(), payments: f.state().payments.map((p: any) => view(p)) }),
      findUniqueOrThrow: async () => ({ ...f.booking(), payments: f.state().payments.map((p: any) => view(p)) }),
    },
    payments: { ...tx.payments,
      findUnique: async ({ where, include }: any) => view(f.state().payments.find((p: any) => matches(p, where)), !!include?.bookings),
      findUniqueOrThrow: async ({ where, include }: any) => {
        const result = view(f.state().payments.find((p: any) => matches(p, where)), !!include?.bookings);
        if (!result) throw new Error("Payment missing");
        if (result.bookings) result.bookings.payments = f.state().payments.map((p: any) => view(p));
        return result;
      },
      findFirst: async ({ where, include }: any) => view(f.state().payments.find((p: any) => matches(p, where)), !!include?.bookings),
      create: async (args: any) => view(await tx.payments.create(args)),
      update: async (args: any) => view(await tx.payments.update(args)),
    },
  });
  const prisma = { ...wrap(f.prisma), users: { findUnique: async ({ where }: any) => ({ user_id: where.account_id === 70 ? 7 : 8 }) },
    $transaction: (action: any) => f.prisma.$transaction((tx: any) => action(wrap(tx))),
  };
  const emails: any[] = [];
  const mail: any = { sendRescheduleConfirmedEmail: async (value: any) => { emails.push(value); }, sendBookingPaidEmail: async () => {} };
  const service = new PaymentService(prisma as any, mail);
  (service as any).config = () => config;
  const propose = async () => {
    await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2 });
    const p = f.state().booking.cancellation_meta.resolutionProposal;
    await f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" });
    return f.state().booking.cancellation_meta.resolutionProposal;
  };
  const receipt = (reference: string, changes: Record<string, string> = {}) => {
    const fields = { vnp_TmnCode: config.merchant, vnp_TxnRef: reference, vnp_Amount: "200000000", vnp_ResponseCode: "00", vnp_TransactionStatus: "00", vnp_TransactionNo: "123456", vnp_PayDate: formatVnpayDate(new Date()), ...changes };
    return { ...fields, vnp_SecureHash: signedVnpayQuery(fields, config.secret).signature };
  };
  return { ...f, service, propose, receipt, emails };
}

test("VNPay URL charges only the supplement, reuses live attempts, and is bound to owner and proposal", async () => {
  const f = fixture(), p = await f.propose();
  await assert.rejects(f.service.createReschedulePaymentUrl(1, p.id, 71));
  await assert.rejects(f.service.createReschedulePaymentUrl(1, "stale", 70));
  const first = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  const second = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  assert.equal(first.reference, second.reference);
  const query = new URL(first.paymentUrl).searchParams;
  assert.equal(query.get("vnp_Amount"), "200000000");
  assert.match(query.get("vnp_OrderInfo")!, /bo sung doi lich/);
  assert.ok(+new Date(first.expiresAt) <= +new Date(p.paymentDeadline));
  assert.equal(f.state().payments.length, 2);
  assert.equal(f.state().booking.tour_schedule_id, 1);
});

test("verified top-up IPN automatically changes schedule once and acknowledges duplicates", async () => {
  const f = fixture(), p = await f.propose(), attempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  assert.equal((await f.service.verifyIpn(f.receipt(attempt.reference))).RspCode, "00");
  assert.equal(f.state().booking.tour_schedule_id, 2);
  assert.equal(f.state().booking.total_amount, 8000000);
  assert.equal(f.state().schedules[0].booked_count, 0);
  assert.equal(f.state().schedules[1].booked_count, 2);
  assert.equal((await f.service.verifyIpn(f.receipt(attempt.reference))).RspCode, "02");
  assert.equal(f.state().payments.filter((x: any) => x.status === "completed").length, 2);
  assert.equal(f.emails.length, 1);
  const status = await f.service.getPaymentStatus(attempt.reference, 70);
  assert.equal(status.purpose, "reschedule"); assert.equal(status.status, "success"); assert.equal(status.resolution, "applied");
});

test("return and IPN can arrive in either order without a second collection or schedule move", async () => {
  const f = fixture(), p = await f.propose(), attempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  const target = new URL(await f.service.handleReturn(f.receipt(attempt.reference)));
  assert.equal(target.searchParams.get("reference"), attempt.reference);
  assert.equal((await f.service.verifyIpn(f.receipt(attempt.reference))).RspCode, "02");
  assert.equal(f.state().schedules[1].booked_count, 2); assert.equal(f.state().payments.length, 2);
});

test("bad checksum and a signed incorrect amount never settle a top-up", async () => {
  const f = fixture(), p = await f.propose(), attempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  assert.equal((await f.service.verifyIpn({ ...f.receipt(attempt.reference), vnp_SecureHash: "0".repeat(128) })).RspCode, "97");
  assert.equal((await f.service.verifyIpn(f.receipt(attempt.reference, { vnp_Amount: "800000000" }))).RspCode, "04");
  assert.equal(f.state().booking.tour_schedule_id, 1); assert.equal(f.state().payments[1].status, "pending");
});

test("canceling payment keeps the old trip and allows another VNPay attempt during the hold", async () => {
  const f = fixture(), p = await f.propose(), first = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  await f.service.verifyIpn(f.receipt(first.reference, { vnp_ResponseCode: "24", vnp_TransactionStatus: "02", vnp_TransactionNo: "0" }));
  assert.equal(f.state().booking.tour_schedule_id, 1);
  const status = await f.service.getPaymentStatus(first.reference, 70);
  assert.equal(status.status, "cancelled"); assert.equal(status.canRetry, true); assert.equal(status.proposalId, p.id);
  const second = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  assert.notEqual(first.reference, second.reference);
  await f.service.verifyIpn(f.receipt(second.reference));
  assert.equal(f.state().booking.tour_schedule_id, 2);
});

test("money arriving after hold release is refunded instead of reviving the proposed schedule", async () => {
  const f = fixture(), p = await f.propose(), attempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  f.state().booking.cancellation_meta.resolutionProposal.paymentDeadline = new Date(Date.now() - 1000).toISOString();
  await f.workflow.expireHolds();
  await f.service.verifyIpn(f.receipt(attempt.reference));
  assert.equal(f.state().booking.tour_schedule_id, 1); assert.equal(f.state().schedules[1].booked_count, 0);
  const refund = f.state().booking.cancellation_meta.refunds[0];
  assert.equal(refund.amount, 2000000); assert.equal(refund.paymentReference, attempt.reference);
  const status = await f.service.getPaymentStatus(attempt.reference, 70);
  assert.equal(status.resolution, "refund_pending"); assert.equal(status.canRetry, false);
});

test("a receipt after customer chose refund adds only the supplemental refund, without releasing seats twice", async () => {
  const f = fixture(), p = await f.propose(), attempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  await f.workflow.resolve(1, 7, { ...recipient, proposalId: p.id, decision: "full_refund" });
  await f.service.verifyIpn(f.receipt(attempt.reference));
  assert.equal(f.state().booking.status, "refund_pending"); assert.equal(f.state().booking.tour_schedule_id, 1);
  assert.equal(f.state().schedules[0].booked_count, 0); assert.equal(f.state().schedules[1].booked_count, 0);
  assert.equal(f.state().booking.cancellation_meta.refunds.reduce((sum: number, r: any) => sum + r.amount, 0), 8000000);
});

test("a second successful payment refunds only the duplicate amount while retaining the confirmed trip", async () => {
  const f = fixture(), p = await f.propose(), first = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  f.state().payments[1].status = "failed";
  const second = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  await f.service.verifyIpn(f.receipt(first.reference));
  await f.service.verifyIpn(f.receipt(second.reference, { vnp_TransactionNo: "654321" }));
  assert.equal(f.state().booking.tour_schedule_id, 2); assert.equal(f.state().schedules[1].booked_count, 2);
  assert.equal(f.state().booking.cancellation_meta.refunds.length, 1);
  assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 2000000);
  assert.equal((await f.service.getPaymentStatus(first.reference, 70)).status, "success");
  assert.equal((await f.service.getPaymentStatus(second.reference, 70)).resolution, "refund_pending");
});

test("a receipt for a superseded proposal never applies a different proposal", async () => {
  const f = fixture(), p = await f.propose(), attempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  f.state().booking.cancellation_meta.resolutionProposal.paymentDeadline = new Date(Date.now() - 1000).toISOString();
  await f.workflow.expireHolds();
  await f.workflow.propose(1, { allowedOptions: ["full_refund"] });
  const latest = f.state().booking.cancellation_meta.resolutionProposal.id;
  await f.service.verifyIpn(f.receipt(attempt.reference));
  assert.equal(f.state().booking.cancellation_meta.resolutionProposal.id, latest);
  assert.equal(f.state().booking.cancellation_meta.resolutionProposal.status, "pending_customer");
  assert.equal(f.state().booking.tour_schedule_id, 1);
  assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 2000000);
});

test("an unavailable destination is refunded, and VNPay proposals cannot be confirmed manually", async () => {
  const f = fixture(), p = await f.propose(), attempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  await assert.rejects(f.workflow.confirmCollection(1, { proposalId: p.id, amount: 2000000, transactionCode: "MANUAL" }));
  f.state().schedules[1].status = 0;
  await f.service.verifyIpn(f.receipt(attempt.reference));
  assert.equal(f.state().booking.tour_schedule_id, 1); assert.equal(f.state().schedules[1].booked_count, 0);
  assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 2000000);
});

test("accepting a supplemental proposal twice cannot hold extra seats or extend the deadline", async () => {
  const f = fixture(), p = await f.propose();
  const deadline = p.paymentDeadline;
  await f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" });
  assert.equal(f.state().schedules[1].booked_count, 2);
  assert.equal(f.state().booking.cancellation_meta.resolutionProposal.paymentDeadline, deadline);
});

test("a late receipt on an old gateway attempt does not destroy a still-valid hold for retry", async () => {
  const f = fixture(), p = await f.propose(), oldAttempt = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  f.state().payments[1].expires_at = new Date(Date.now() - 2000);
  const retry = await f.service.createReschedulePaymentUrl(1, p.id, 70);
  await f.service.verifyIpn(f.receipt(oldAttempt.reference));
  assert.equal(f.state().booking.cancellation_meta.resolutionProposal.status, "awaiting_payment");
  assert.equal(f.state().schedules[1].booked_count, 2);
  await f.service.verifyIpn(f.receipt(retry.reference, { vnp_TransactionNo: "888888" }));
  assert.equal(f.state().booking.tour_schedule_id, 2);
  assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 2000000);
});

test("normal booking payments still charge the whole booking and settle through the original flow", async () => {
  const f = fixture(); f.state().booking.status = "pending"; f.state().booking.created_at = new Date(); f.state().payments = [];
  const attempt = await f.service.createPaymentUrl(1, 70);
  assert.match(attempt.reference, /^B/);
  assert.equal(new URL(attempt.paymentUrl).searchParams.get("vnp_Amount"), "600000000");
  await f.service.verifyIpn(f.receipt(attempt.reference, { vnp_Amount: "600000000" }));
  assert.equal(f.state().booking.status, "paid");
  assert.equal(f.state().booking.tour_schedule_id, 1);
});

function pointCheckout() {
  const f = fixture(); f.state().booking.status = 'pending'; f.state().booking.created_at = new Date(); f.state().payments = [];
  f.state().booking.total_amount = 5900000;
  f.state().booking.membership_snapshot = { pointsUsed: 100, pointsDiscount: 100000 };
  f.state().points.push({ user_id: 7, kind: 'adjust', points: 1000, reserved: 0, event_key: 'seed' });
  return f;
}
test('VNPay charges cash after points and commits the hold once across return and IPN', async () => {
  const f = pointCheckout(), attempt = await f.service.createPaymentUrl(1,70);
  assert.equal(new URL(attempt.paymentUrl).searchParams.get('vnp_Amount'), '590000000');
  assert.equal(f.state().points.reduce((s: number,e: any) => s + e.reserved, 0), 100);
  const receipt = f.receipt(attempt.reference, { vnp_Amount: '590000000' });
  await Promise.all([f.service.verifyIpn(receipt), f.service.handleReturn(receipt)]);
  assert.equal(f.state().booking.status,'paid');
  assert.equal(f.state().points.filter((e: any) => e.kind === 'spend').length,1);
  assert.equal(f.state().points.reduce((s: number,e: any) => s + e.points, 0),900);
  assert.equal(f.state().points.reduce((s: number,e: any) => s + e.reserved, 0),0);
});
test('VNPay cancellation frees points, retry reacquires them, and an old successful receipt goes to review', async () => {
  const f = pointCheckout(), first = await f.service.createPaymentUrl(1,70);
  await f.service.verifyIpn(f.receipt(first.reference,{ vnp_Amount:'590000000',vnp_ResponseCode:'24',vnp_TransactionStatus:'02',vnp_TransactionNo:'0' }));
  assert.equal(f.state().points.reduce((s: number,e: any) => s + e.reserved, 0),0);
  // A later contradictory success must preserve the money for review, never spend unheld points.
  await f.service.verifyIpn(f.receipt(first.reference,{ vnp_Amount:'590000000' }));
  assert.equal(f.state().payments[0].status,'review');
  assert.equal(f.state().booking.status,'pending');
  assert.equal(f.state().points.filter((e: any) => e.kind === 'spend').length,0);
  const retryFixture = pointCheckout(), failed = await retryFixture.service.createPaymentUrl(1,70);
  await retryFixture.service.verifyIpn(retryFixture.receipt(failed.reference,{ vnp_Amount:'590000000',vnp_ResponseCode:'24',vnp_TransactionStatus:'02',vnp_TransactionNo:'0' }));
  const retry = await retryFixture.service.createPaymentUrl(1,70);
  assert.notEqual(retry.reference,failed.reference);
  await retryFixture.service.verifyIpn(retryFixture.receipt(retry.reference,{ vnp_Amount:'590000000' }));
  assert.equal(retryFixture.state().booking.status,'paid');
  assert.equal(retryFixture.state().points.filter((e: any) => e.kind === 'spend').length,1);
});
