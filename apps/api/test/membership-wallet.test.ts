import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { maxBookingPoints, membershipEarnedPoints, membershipReschedulePrice } from 'shared';
import { creditForBooking } from '../src/modules/membership/helpers/membership.rules';
import { holdBookingPoints, settleBookingPoints, refundBookingPoints, walletBalance } from '../src/modules/membership/helpers/membership.wallet';
import { bookingFixture } from './booking-workflow.fixture';
import { BookingsService } from '../src/modules/bookings/bookings.service';

function fixture() {
  const f = bookingFixture();
  f.state().booking.membership_snapshot = { pointsUsed: 100, pointsDiscount: 100000 };
  f.state().points.push({ user_id: 7, kind: 'adjust', points: 1000, reserved: 0, event_key: 'seed' });
  return f;
}
test('Points + Cash caps against the amount after all other discounts and floors fractional points', () => {
  assert.equal(maxBookingPoints(999999, 5000), 299);
  assert.equal(maxBookingPoints(1000000, 20), 20);
  assert.equal(maxBookingPoints(-1, 20), 0);
  assert.equal(membershipEarnedPoints(150000, 1.5), 2);
  assert.deepEqual(membershipReschedulePrice(200000,100000,100), { pointsUsed:60,pointsDiscount:60000,pointsReturned:40,discount:60000,cash:140000 });
});
test('a point hold cannot be spent again, settlement and refunds remain idempotent', async () => {
  const f = fixture(), b = f.booking();
  await holdBookingPoints(f.prisma, b); await holdBookingPoints(f.prisma, b);
  assert.deepEqual(await walletBalance(f.prisma, 7), { balance: 900, held: 100, debt: 0 });
  await settleBookingPoints(f.prisma, b, true); await settleBookingPoints(f.prisma, b, true);
  assert.deepEqual(await walletBalance(f.prisma, 7), { balance: 900, held: 0, debt: 0 });
  await refundBookingPoints(f.prisma, b, 50, 'refund-1'); await refundBookingPoints(f.prisma, b, 50, 'refund-1');
  assert.equal((await walletBalance(f.prisma, 7)).balance, 950);
  await refundBookingPoints(f.prisma, b, 1000, 'refund-2');
  assert.equal((await walletBalance(f.prisma, 7)).balance, 1000);
});
test('failed checkout releases points, retry reserves them again, and a reversal preserves debt', async () => {
  const f = fixture(), b = f.booking();
  await holdBookingPoints(f.prisma, b); await settleBookingPoints(f.prisma, b, false); await settleBookingPoints(f.prisma, b, false);
  assert.deepEqual(await walletBalance(f.prisma, 7), { balance: 1000, held: 0, debt: 0 });
  await holdBookingPoints(f.prisma, b); await settleBookingPoints(f.prisma, b, true);
  f.state().points.push({ user_id: 7, kind: 'earn', points: -1000, reserved: 0 });
  assert.deepEqual(await walletBalance(f.prisma, 7), { balance: 0, held: 0, debt: 100 });
});
test('completion credits require full payment and do not move to a later duplicate payment date', () => {
  const f = bookingFixture(1,1000000), now = new Date('2026-11-23T05:00:00Z');
  const b = { ...f.booking(), tour_schedules: { end_date: new Date('2026-11-01'), tours: { name: 'Tour' } }, membership_snapshot: { pointMultiplier: 2 },
    payments: [{ status: 'completed', amount: 500000, paid_at: new Date('2026-10-20'), created_at: new Date('2026-10-20') }] };
  assert.equal(creditForBooking(b, now), null);
  b.payments[0].amount = 1000000;
  const first = creditForBooking(b, now)!;
  b.payments.push({ status: 'completed', amount: 1000000, paid_at: new Date('2026-11-20'), created_at: new Date('2026-11-20') });
  assert.equal(creditForBooking(b, now)!.completedAt.toISOString(), first.completedAt.toISOString());
  assert.equal(first.points, 20);
  b.payments.pop();
  const refunded = creditForBooking({ ...b, cancellation_meta: { refunds: [{ status: 'pending', amount: 200000 }] } }, now)!;
  assert.equal(refunded.points, 16);
});
test('company cancellation returns all active booking points once; cash refund is separate', async () => {
  const f = fixture(); await holdBookingPoints(f.prisma, f.booking()); await settleBookingPoints(f.prisma, f.booking(), true);
  await f.workflow.propose(1, { allowedOptions: ['full_refund'] });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  await f.workflow.resolve(1, 7, { proposalId: p.id, decision: 'full_refund', bankName: 'VCB', bankAccountNumber: '0123456789', bankAccountName: 'NGUYEN VAN A' });
  assert.equal((await walletBalance(f.prisma, 7)).balance, 1000);
  assert.equal(f.state().booking.cancellation_meta.refunds[0].amount, 6000000);
  await assert.rejects(f.workflow.resolve(1, 7, { proposalId: p.id, decision: 'full_refund' }));
});
test('partial customer cancellation allocates points and applies the same refund ratio as cash', async () => {
  const f = fixture(); await holdBookingPoints(f.prisma, f.booking()); await settleBookingPoints(f.prisma, f.booking(), true);
  await f.workflow.requestCancel(1, 7, { travelerIds: [2], reason: 'Khách thay đổi kế hoạch', bankName: 'VCB', bankAccountNumber: '0123456789', bankAccountName: 'NGUYEN VAN A' });
  const cashRefund = f.state().booking.cancellation_meta.cancelRequest.numericRefundAmount;
  await f.workflow.approveCancel(1);
  const expected = Math.floor(50 * cashRefund / 3000000);
  assert.equal(f.state().booking.membership_snapshot.pointsUsed, 50);
  assert.equal((await walletBalance(f.prisma, 7)).balance, 900 + expected);
  assert.equal(f.state().booking.cancellation_meta.cancellationHistory[0].pointsRefunded, expected);
});
test('expired unpaid booking releases its point hold and repeated expiration does not release twice', async () => {
  const f = fixture(); f.state().booking.status = 'pending'; f.state().booking.created_at = new Date(Date.now() - 16 * 60000); f.state().payments = [];
  await holdBookingPoints(f.prisma,f.booking());
  const service = new BookingsService(f.prisma,{} as any,{} as any);
  assert.equal(await service.cancelExpiredPendingBookings(),1);
  assert.equal(f.state().booking.status,'cancelled');
  assert.equal((await walletBalance(f.prisma,7)).balance,1000);
  assert.equal(await service.cancelExpiredPendingBookings(),0);
  assert.equal((await walletBalance(f.prisma,7)).held,0);
});
test('a cheaper reschedule returns excess points only after acceptance and a subsequent company cancellation returns the rest', async () => {
  const f = fixture(); f.state().booking.discount_amount = 100000; f.state().schedules[1].price = 100000;
  await holdBookingPoints(f.prisma,f.booking()); await settleBookingPoints(f.prisma,f.booking(),true);
  await f.workflow.propose(1,{ allowedOptions:['reschedule'],newScheduleId:2 });
  const p = f.state().booking.cancellation_meta.resolutionProposal;
  assert.equal(p.pointsReturned,40);
  assert.equal((await walletBalance(f.prisma,7)).balance,900);
  const recipient = { bankName:'VCB',bankAccountNumber:'0123456789',bankAccountName:'NGUYEN VAN A' };
  await f.workflow.resolve(1,7,{ proposalId:p.id,decision:'reschedule',...recipient });
  assert.equal((await walletBalance(f.prisma,7)).balance,940);
  assert.equal(f.state().booking.membership_snapshot.pointsUsed,60);
  // Finish the pending cash refund before creating another financial proposal.
  f.state().booking.cancellation_meta.refunds[0].status = 'completed';
  f.state().payments.push({ payment_id:2,booking_id:1,status:'refunded',amount:5860000 });
  await f.workflow.propose(1,{ allowedOptions:['full_refund'] });
  const next = f.state().booking.cancellation_meta.resolutionProposal;
  await f.workflow.resolve(1,7,{ proposalId:next.id,decision:'full_refund',...recipient });
  assert.equal((await walletBalance(f.prisma,7)).balance,1000);
});
