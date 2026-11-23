import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { allocateBookingAmount, bookingFunds, bookingRefunds, calculateCancellationEstimate, cancellationPortion, DEFAULT_CANCELLATION_TIERS, normalizeBookingBank } from "shared";
import { BookingWorkflow } from "../src/modules/bookings/booking-workflow";

const recipient = { bankName: "Vietcombank", bankAccountNumber: "0123456789", bankAccountName: "NGUYEN VAN A" };
const future = (days: number) => new Date(Date.now() + days * 86400000);

function fixture(count = 2, total = count * 3000000) {
  let state: any = {
    booking: { booking_id: 1, user_id: 7, status: "paid", tour_schedule_id: 1, adult_count: count, child_count: 0, infant_count: 0,
      adult_unit_price: 3000000, child_unit_price: 0, infant_unit_price: 0, total_amount: total, services_total: 0, discount_amount: count * 3000000 - total,
      cancellation_meta: {}, room_selection: { type: "shared" }, membership_snapshot: {},
      booking_travelers: Array.from({ length: count }, (_, i) => ({ traveler_id: i + 1, traveler_type: "ADULT", full_name: `Khách ${i + 1}` })) },
    schedules: [
      { tour_schedule_id: 1, tour_id: 9, status: 1, start_date: future(10), end_date: future(11), booked_count: count, quota: 20, tours: { status: 1, cut_off_hours: 24, name: "Tour A" } },
      { tour_schedule_id: 2, tour_id: 9, status: 1, start_date: future(20), end_date: future(21), booked_count: 0, quota: 20, price: 4000000, single_room_surcharge: 0,
        tour_schedule_prices: [{ passenger_type: "child", price: 0 }, { passenger_type: "infant", price: 0 }], pickup_points: [], tours: { status: 1, cut_off_hours: 24, name: "Tour A" } },
    ], payments: [{ payment_id: 1, status: "completed", amount: total, booking_id: 1 }], locks: [] as string[],
  };
  const hydrated = () => structuredClone({ ...state.booking, payments: state.payments, tour_schedules: state.schedules.find((s: any) => s.tour_schedule_id === state.booking.tour_schedule_id) });
  const apply = (row: any, data: any) => { for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === "object" && "increment" in value ? row[key] + (value as any).increment : value && typeof value === "object" && "decrement" in value ? row[key] - (value as any).decrement : structuredClone(value); return row; };
  const tx: any = {
    $queryRaw: async (strings: any) => { state.locks.push(String(strings)); return []; },
    bookings: {
      findUnique: async () => hydrated(),
      findMany: async (query: any) => query.where?.tour_schedule_id ? [hydrated()] : [{ booking_id: 1, cancellation_meta: structuredClone(state.booking.cancellation_meta) }],
      update: async ({ data }: any) => { apply(state.booking, data); return hydrated(); },
    },
    tour_schedules: {
      findUnique: async ({ where }: any) => structuredClone(state.schedules.find((s: any) => s.tour_schedule_id === where.tour_schedule_id) || null),
      update: async ({ where, data }: any) => apply(state.schedules.find((s: any) => s.tour_schedule_id === where.tour_schedule_id), data),
      updateMany: async ({ where, data }: any) => { const row = state.schedules.find((s: any) => s.tour_schedule_id === where.tour_schedule_id && s.booked_count >= (where.booked_count?.gte || 0)); if (!row) return { count: 0 }; apply(row, data); return { count: 1 }; },
    },
    booking_travelers: { findFirst: async () => null, deleteMany: async ({ where }: any) => { state.booking.booking_travelers = state.booking.booking_travelers.filter((t: any) => !where.traveler_id.in.includes(t.traveler_id)); } },
    payments: {
      update: async ({ where, data }: any) => apply(state.payments.find((p: any) => p.payment_id === where.payment_id), data),
      findFirst: async ({ where }: any) => state.payments.find((p: any) => p.method === where.method && p.transaction_code === where.transaction_code),
      create: async ({ data }: any) => { if (state.payments.some((p: any) => p.provider_reference && p.provider_reference === data.provider_reference)) throw new Error("duplicate reference"); const row = { ...data, payment_id: state.payments.length + 1 }; state.payments.push(row); return row; },
      updateMany: async () => ({ count: 0 }),
    },
    vouchers: { updateMany: async () => ({ count: 1 }) }, schedule_promotions: { updateMany: async () => ({ count: 1 }) },
    membership_notifications: { upsert: async () => ({}) },
  };
  let queue = Promise.resolve();
  const prisma: any = { ...tx, $transaction: (fn: any) => {
    const result = queue.then(async () => { const before = structuredClone(state); try { return await fn(tx); } catch (error) { state = before; throw error; } });
    queue = result.then(() => undefined, () => undefined); return result;
  } };
  return { workflow: new BookingWorkflow(prisma), state: () => state, booking: hydrated };
}

test("cancellation tiers use exact thresholds, including immediately below each boundary", () => {
  const start = new Date("2026-12-27T08:00:00+07:00");
  for (const [hours, expected] of [[360, 0], [359.999, 20], [168, 20], [167.999, 50], [96, 50], [95.999, 80], [24, 80], [23.999, 100]]) {
    assert.equal(calculateCancellationEstimate({ startDate: start, totalAmount: 10000000, isPaid: true, now: new Date(+start - hours * 3600000) }).tier.penaltyPercent, expected);
  }
});
test("bank accounts are normalized and incomplete/invalid accounts are rejected", () => {
  assert.equal(normalizeBookingBank({ ...recipient, bankAccountName: " nguyen van a " }).bankAccountName, "NGUYEN VAN A");
  for (const value of [{}, { ...recipient, bankAccountNumber: "abc" }, { ...recipient, bankName: " " }]) assert.throws(() => normalizeBookingBank(value));
});
test("allocation preserves every dong and partial cancellation doesn't charge the whole group", () => {
  assert.deepEqual(allocateBookingAmount(10, [1, 1, 1]), [4, 3, 3]);
  const f = fixture(4, 12000000);
  assert.equal(cancellationPortion(f.booking(), [1]).amount, 3000000);
  assert.throws(() => cancellationPortion(f.booking(), [9]));
  assert.throws(() => cancellationPortion(f.booking(), [1, 1]));
});
test("unpaid booking cancels instantly and releases seats only once", async () => {
  const f = fixture(); f.state().booking.status = "pending"; f.state().payments = [];
  const result = await f.workflow.requestCancel(1, 7, { reason: "Đặt nhầm" });
  assert.equal(result.status, "cancelled"); assert.equal(f.state().schedules[0].booked_count, 0);
  await assert.rejects(f.workflow.requestCancel(1, 7, {}));
  assert.equal(f.state().schedules[0].booked_count, 0);
});
test("ownership and pending review prevent financial changes", async () => {
  const f = fixture();
  await assert.rejects(f.workflow.requestCancel(1, 8, recipient));
  f.state().payments.push({ status: "review", amount: 10 });
  await assert.rejects(f.workflow.requestCancel(1, 7, recipient));
});
test("partial cancellation keeps the trip active, archives travelers and refunds only their net fare", async () => {
  const f = fixture(4);
  await f.workflow.requestCancel(1, 7, { ...recipient, travelerIds: [1] });
  await f.workflow.approveCancel(1);
  assert.equal(f.state().booking.status, "paid"); assert.equal(f.state().booking.adult_count, 3);
  assert.equal(f.state().booking.total_amount, 9000000);
  assert.equal(f.state().booking.cancellation_meta.retainedCancellationFees, 600000);
  assert.equal(f.state().booking.booking_travelers.length, 3);
  const refund = f.state().booking.cancellation_meta.refunds[0]; assert.equal(refund.amount, 2400000);
  await f.workflow.beginRefundTransfer(1, { refundId: refund.id });
  await f.workflow.confirmRefund(1, { refundId: refund.id, amount: refund.amount, transactionCode: "PARTIAL1" });
  assert.equal(f.state().booking.status, "paid"); assert.equal(bookingFunds(f.state().payments).available, 9600000);
});
test("request timestamp remains the policy basis when admin approves after departure", async () => {
  const f = fixture(); await f.workflow.requestCancel(1, 7, recipient);
  f.state().schedules[0].start_date = new Date(Date.now() - 1000);
  f.state().booking.cancellation_meta.cancelRequest.requestedAtISO = new Date(Date.now() - 10 * 86400000).toISOString();
  await f.workflow.approveCancel(1);
  assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 4800000);
});
test("refund confirmation is bound to an approved amount and cannot be replayed", async () => {
  const f = fixture(); await f.workflow.requestCancel(1, 7, recipient); await f.workflow.approveCancel(1);
  const refund = f.state().booking.cancellation_meta.refunds[0];
  await assert.rejects(f.workflow.confirmRefund(1, { refundId: refund.id, amount: 6000000, transactionCode: "R1" }));
  await f.workflow.beginRefundTransfer(1, { refundId: refund.id });
  await f.workflow.confirmRefund(1, { refundId: refund.id, amount: refund.amount, transactionCode: "R1" });
  assert.equal(f.state().booking.status, "cancelled");
  await assert.rejects(f.workflow.confirmRefund(1, { refundId: refund.id, amount: refund.amount, transactionCode: "R2" }));
  assert.equal(f.state().payments.filter((p: any) => p.status === "refunded").length, 1);
});
test("different tours and incomplete company bank details are rejected", async () => {
  const f = fixture(); f.state().schedules[1].tour_id = 10;
  await assert.rejects(f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2, companyBankInfo: recipient }));
  f.state().schedules[1].tour_id = 9;
  await assert.rejects(f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2 }));
});
test("more expensive schedule is held but not assigned until admin confirms actual receipt", async () => {
  const f = fixture(); await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2, companyBankInfo: recipient });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  assert.equal(p.priceDifference, 2000000);
  await f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" });
  assert.equal(f.state().booking.tour_schedule_id, 1); assert.equal(f.state().schedules[1].booked_count, 2);
  await assert.rejects(f.workflow.confirmCollection(1, { proposalId: p.id, amount: 1, transactionCode: "TOP1" }));
  await f.workflow.confirmCollection(1, { proposalId: p.id, amount: 2000000, transactionCode: "TOP1" });
  assert.equal(f.state().booking.tour_schedule_id, 2); assert.equal(f.state().booking.total_amount, 8000000);
  assert.equal(f.state().schedules[0].booked_count, 0); assert.equal(f.state().schedules[1].booked_count, 2);
  await assert.rejects(f.workflow.confirmCollection(1, { proposalId: p.id, amount: 2000000, transactionCode: "TOP2" }));
});
test("cheaper schedule creates a separate refund and refunding it does not cancel the trip", async () => {
  const f = fixture(); f.state().schedules[1].price = 2000000;
  await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2 });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  await assert.rejects(f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" }));
  await f.workflow.resolve(1, 7, { ...recipient, proposalId: p.id, decision: "reschedule" });
  const refund = f.state().booking.cancellation_meta.refunds[0]; assert.equal(refund.amount, 2000000);
  await f.workflow.beginRefundTransfer(1, { refundId: refund.id });
  await f.workflow.confirmRefund(1, { refundId: refund.id, amount: 2000000, transactionCode: "EXCESS1" });
  assert.equal(f.state().booking.status, "paid"); assert.equal(f.state().booking.total_amount, 4000000);
});
test("concurrent/repeated proposal acceptance cannot reserve or release seats twice", async () => {
  const f = fixture(); f.state().schedules[1].price = 3000000;
  await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2 });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  const results = await Promise.allSettled([f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" }), f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" })]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(f.state().schedules[1].booked_count, 2); assert.ok(f.state().locks.some((s: string) => s.includes("FOR UPDATE")));
});
test("expired payment holds release once, and late money is recorded for refund rather than reviving the schedule", async () => {
  const f = fixture(); await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2, companyBankInfo: recipient });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  await f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" });
  f.state().booking.cancellation_meta.resolutionProposal.paymentDeadline = new Date(Date.now() - 1000).toISOString();
  await f.workflow.expireHolds(); await f.workflow.expireHolds();
  assert.equal(f.state().schedules[1].booked_count, 0);
  await f.workflow.confirmCollection(1, { proposalId: p.id, amount: 2000000, transactionCode: "LATE1" });
  assert.equal(f.state().booking.tour_schedule_id, 1);
  assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 2000000);
});
test("customer can choose refund while awaiting a top-up, releasing both reservations once", async () => {
  const f = fixture(); await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2, companyBankInfo: recipient });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  await f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" });
  await f.workflow.resolve(1, 7, { ...recipient, proposalId: p.id, decision: "full_refund" });
  assert.equal(f.state().booking.status, "refund_pending"); assert.equal(f.state().schedules[0].booked_count, 0); assert.equal(f.state().schedules[1].booked_count, 0);
  await assert.rejects(f.workflow.resolve(1, 7, { ...recipient, proposalId: p.id, decision: "full_refund" }));
});

test("late top-up after the original refund is completed becomes its own refundable amount", async () => {
  const f = fixture(); await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2, companyBankInfo: recipient });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  await f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" });
  await f.workflow.resolve(1, 7, { ...recipient, proposalId: p.id, decision: "full_refund" });
  const first = f.state().booking.cancellation_meta.refunds[0];
  await f.workflow.beginRefundTransfer(1, { refundId: first.id });
  await f.workflow.confirmRefund(1, { refundId: first.id, amount: first.amount, transactionCode: "ORIGINAL" });
  await f.workflow.confirmCollection(1, { proposalId: p.id, amount: 2000000, transactionCode: "LATER" });
  assert.equal(f.state().booking.status, "refund_pending"); assert.equal(f.state().booking.tour_schedule_id, 1);
  const refund = f.state().booking.cancellation_meta.refunds[1]; assert.equal(refund.amount, 2000000); assert.equal(refund.bank, undefined);
  await f.workflow.updateRefundBank(1, 7, { ...recipient, refundId: refund.id });
  await f.workflow.beginRefundTransfer(1, { refundId: refund.id });
  await f.workflow.confirmRefund(1, { refundId: refund.id, amount: refund.amount, transactionCode: "LATER-REFUND" });
  assert.equal(bookingFunds(f.state().payments).available, 0);
  assert.equal(f.state().schedules[0].booked_count, 0); assert.equal(f.state().schedules[1].booked_count, 0);
});
test("customer bank can be updated before transfer, but not by another user or after transfer", async () => {
  const f = fixture(); await f.workflow.requestCancel(1, 7, recipient); await f.workflow.approveCancel(1);
  const refund = f.state().booking.cancellation_meta.refunds[0];
  await assert.rejects(f.workflow.updateRefundBank(1, 8, { ...recipient, refundId: refund.id }));
  await f.workflow.updateRefundBank(1, 7, { ...recipient, bankAccountNumber: "9876543210", refundId: refund.id });
  assert.equal(f.state().booking.cancellation_meta.refunds[0].bank.bankAccountNumber, "9876543210");
  await f.workflow.beginRefundTransfer(1, { refundId: refund.id });
  await f.workflow.confirmRefund(1, { refundId: refund.id, amount: refund.amount, transactionCode: "BANK-EDIT" });
  await assert.rejects(f.workflow.updateRefundBank(1, 7, { ...recipient, refundId: refund.id }));
});
test("partial cancellation preserves shared services and requires an adult in the remaining party", () => {
  const f = fixture(2); f.state().booking.services_total = 1000000; f.state().booking.total_amount = 7000000;
  assert.equal(cancellationPortion(f.booking(), [1]).amount, 3000000);
  f.state().booking.booking_travelers[1].traveler_type = "CHILD";
  assert.throws(() => cancellationPortion(f.booking(), [1]), /người lớn/);
});
test("policy snapshots override newer defaults and legacy refunds are conservatively reconstructed", () => {
  const custom = DEFAULT_CANCELLATION_TIERS.map(t => ({ ...t, penaltyPercent: t.id === "low_penalty" ? 10 : t.penaltyPercent }));
  assert.equal(calculateCancellationEstimate({ startDate: future(10), totalAmount: 1000000, isPaid: true, tiers: custom }).refundAmount, 900000);
  const f = fixture(); f.state().booking.status = "cancelled"; f.state().booking.cancellation_meta = { refundAmount: "4.800.000đ", cancelRequest: recipient };
  const refunds = bookingRefunds(f.booking()); assert.equal(refunds[0].amount, 4800000); assert.equal(refunds[0].id, "legacy-1");
  f.state().payments.push({ amount: 4800000, status: "refunded" }); assert.deepEqual(bookingRefunds(f.booking()), []);
});
test("company support can waive a higher price without creating a collection", async () => {
  const f = fixture(); await f.workflow.propose(1, { allowedOptions: ["reschedule"], newScheduleId: 2, waiveDifference: true });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  assert.equal(p.priceDifference, 0); assert.equal(p.newPricing.discount_amount, 2000000);
  await f.workflow.resolve(1, 7, { proposalId: p.id, decision: "reschedule" });
  assert.equal(f.state().booking.total_amount, 6000000); assert.equal(f.state().payments.length, 1);
});
test("stale proposal IDs and oversized admin refunds cannot change booking or seats", async () => {
  const f = fixture(); await f.workflow.requestCancel(1, 7, recipient);
  await assert.rejects(f.workflow.approveCancel(1, "Không hợp lệ", 7000000));
  assert.equal(f.state().booking.status, "cancel_requested"); assert.equal(f.state().schedules[0].booked_count, 2);
  await f.workflow.rejectCancel(1, "Khách xác nhận tiếp tục chuyến đi");
  await f.workflow.propose(1, { allowedOptions: ["full_refund"] });
  await assert.rejects(f.workflow.resolve(1, 7, { ...recipient, proposalId: "old-version", decision: "full_refund" }));
});

test("bank details are frozen while transfer is processing and reopened only with a failure reason", async () => {
  const f = fixture(); await f.workflow.requestCancel(1, 7, recipient); await f.workflow.approveCancel(1);
  const refund = f.state().booking.cancellation_meta.refunds[0];
  await f.workflow.beginRefundTransfer(1, { refundId: refund.id });
  await assert.rejects(f.workflow.updateRefundBank(1, 7, { ...recipient, refundId: refund.id }));
  await assert.rejects(f.workflow.beginRefundTransfer(1, { refundId: refund.id, release: true }));
  await f.workflow.beginRefundTransfer(1, { refundId: refund.id, release: true, note: "Ngân hàng từ chối, tiền chưa chuyển" });
  await f.workflow.updateRefundBank(1, 7, { ...recipient, refundId: refund.id, bankAccountNumber: "11112222" });
  assert.equal(f.state().booking.cancellation_meta.refunds[0].bank.bankAccountNumber, "11112222");
});
test("canceling a departure stops sales and gives paid customers the full-refund option", async () => {
  const f = fixture(); const result = await f.workflow.cancelDeparture(1, "Không thể tổ chức chuyến đi");
  assert.equal(result.affected, 1); assert.equal(f.state().schedules[0].status, 0);
  assert.equal(f.state().booking.status, "cancel_proposed");
  assert.deepEqual(f.state().booking.cancellation_meta.resolutionProposal.allowedOptions, ["full_refund"]);
});
test("service incidents create bounded refunds without canceling an active trip", async () => {
  const f = fixture(); f.state().schedules[0].start_date = new Date(Date.now() - 10000);
  await f.workflow.recordIncident(1, { reference: "CASE-1", kind: "service_adjustment", reason: "Dịch vụ không được cung cấp", amount: 1000000 });
  assert.equal(f.state().booking.status, "paid"); assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 1000000);
  await assert.rejects(f.workflow.recordIncident(1, { reference: "CASE-1", kind: "service_adjustment", reason: "Lặp hồ sơ", amount: 1000000 }));
  await assert.rejects(f.workflow.recordIncident(1, { reference: "CASE-2", kind: "service_adjustment", reason: "Hoàn quá tiền", amount: 6000000 }));
});
test("verified review payments are refundable without reactivating canceled bookings", async () => {
  const f = fixture(); f.state().booking.status = "cancelled"; f.state().schedules[0].booked_count = 0;
  f.state().payments = [{ payment_id: 1, status: "review", amount: 6000000 }];
  await f.workflow.reconcileReview(1, { paymentId: 1, reason: "Đối chiếu ngân hàng đã nhận", actorId: 99 });
  assert.equal(f.state().booking.status, "refund_pending"); assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 6000000);
  assert.equal(f.state().schedules[0].booked_count, 0);
  await assert.rejects(f.workflow.reconcileReview(1, { paymentId: 1, reason: "Lặp" }));
});

test("customer withdrawal prevents later approval and never changes seat counts", async () => {
  const f = fixture(); await f.workflow.requestCancel(1, 7, recipient);
  await assert.rejects(f.workflow.withdrawCancel(1, 8));
  await f.workflow.withdrawCancel(1, 7);
  assert.equal(f.state().booking.status, "paid"); assert.equal(f.state().schedules[0].booked_count, 2);
  await assert.rejects(f.workflow.approveCancel(1)); assert.equal(f.state().payments.length, 1);
});

test("a goodwill refund can await bank details when the original cancellation had no refund", async () => {
  const f = fixture(); f.state().schedules[0].start_date = new Date(Date.now() + 2 * 3600000);
  await f.workflow.requestCancel(1, 7, { reason: "Khách có việc đột xuất" });
  await f.workflow.approveCancel(1, "Hỗ trợ khách theo phê duyệt", 1000000);
  assert.equal(f.state().booking.status, "refund_pending");
  assert.equal(f.state().booking.cancellation_meta.refunds[0].bank, undefined);
});
