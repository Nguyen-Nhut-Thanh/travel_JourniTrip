import 'reflect-metadata';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { MEMBERSHIP_TIERS } from 'shared';
import { MembershipService } from '../src/modules/membership/membership.service';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { BookingWorkflow } from '../src/modules/bookings/booking-workflow';
import { holdBookingPoints, settleBookingPoints, refundBookingPoints, walletBalance, lockWallet, reconcileWallet } from '../src/modules/membership/helpers/membership.wallet';

config({ quiet: true });
const enabled = process.env.RUN_MEMBERSHIP_DB_TESTS === '1';
const rollback = new Error('ROLLBACK_MEMBERSHIP_TEST');

test('PostgreSQL wallet, legacy import, redemptions, policy versions and user/admin parity (rolled back)', { skip: !enabled }, async () => {
  const db = new PrismaClient({ log: [] });
  try {
    await assert.rejects(db.$transaction(async tx => {
      const account = await tx.accounts.create({ data: { email: `membership-${randomUUID()}@example.invalid` } });
      const user = await tx.users.create({ data: { account_id: account.account_id, full_name: 'Membership rollback verification' } });
      const schedule = await tx.tour_schedules.findFirstOrThrow({ where: { tours: { status: 1 } } });
      const booking = await tx.bookings.create({ data: {
        user_id: user.user_id, tour_schedule_id: schedule.tour_schedule_id, contact_name: 'Membership test', contact_phone: '0901234567', contact_email: 'membership@example.invalid',
        total_amount: 900000, membership_snapshot: { pointsUsed: 100, pointsDiscount: 100000 },
      } });
      await lockWallet(tx, user.user_id);
      await tx.membership_point_transactions.create({ data: { user_id: user.user_id, kind: 'adjust', points: 1000, event_key: randomUUID(), description: 'Rollback verification only' } });
      await holdBookingPoints(tx, booking); await holdBookingPoints(tx, booking);
      assert.deepEqual(await walletBalance(tx, user.user_id), { balance: 900, held: 100, debt: 0 });
      await settleBookingPoints(tx, booking, true); await settleBookingPoints(tx, booking, true);
      assert.deepEqual(await walletBalance(tx, user.user_id), { balance: 900, held: 0, debt: 0 });
      await refundBookingPoints(tx, booking, 100, `test-refund:${booking.booking_id}`);
      await refundBookingPoints(tx, booking, 100, `test-refund:${booking.booking_id}`);
      assert.equal((await walletBalance(tx, user.user_id)).balance,1000);
      const now = new Date();
      await tx.vouchers.create({ data: { owner_user_id: user.user_id, code: `TEST-${randomUUID()}`, reward_key: `redeemed:${user.user_id}:retired-reward:50:123`, discount_type: 'fixed', discount_value: 50000, start_date: now, expiry_date: new Date(+now + 86400000) } });
      await reconcileWallet(tx, user.user_id); await reconcileWallet(tx, user.user_id);
      assert.equal((await walletBalance(tx, user.user_id)).balance,950);

      // The service's nested transactions reuse this outer transaction so every assertion rolls back.
      const adapter = new Proxy(tx, { get(target, prop) { if (prop === '$transaction') return (fn: any) => fn(tx); const value = Reflect.get(target, prop); return typeof value === 'function' ? value.bind(target) : value; } });
      const service = new MembershipService(adapter as any);
      service.sweep = async () => {};
      const before = await service.forAccount(account.account_id);
      const requestId = randomUUID();
      const redemption = await service.redeemReward(account.account_id,'tour-voucher-100k',requestId);
      const repeated = await service.redeemReward(account.account_id,'tour-voucher-100k',requestId);
      assert.equal(redemption.voucherCode,repeated.voucherCode);
      assert.equal(repeated.remainingPoints,850);
      await assert.rejects(service.redeemReward(account.account_id,'tour-voucher-500k',requestId));
      const userView = await service.forAccount(account.account_id), adminView = await service.syncUser(user.user_id);
      assert.equal(userView.pointsBalance,850); assert.deepEqual(userView,adminView);
      const tiers = structuredClone(MEMBERSHIP_TIERS); tiers[1].pointMultiplier = 1.8;
      await service.updateSettings(tiers,before.programVersion!,account.account_id);
      const after = await service.forAccount(account.account_id);
      assert.equal(after.programVersion,before.programVersion! + 1);
      assert.equal(after.tiers[1].pointMultiplier,1.8);
      await assert.rejects(service.updateSettings(tiers,before.programVersion!,account.account_id));
      const adjustId = randomUUID();
      await service.adjustPoints(user.user_id,20,'Rollback adjustment verification',adjustId,account.account_id);
      const adjusted = await service.adjustPoints(user.user_id,20,'Rollback adjustment verification',adjustId,account.account_id);
      assert.equal(adjusted.pointsBalance,870);
      await assert.rejects(service.adjustPoints(user.user_id,-900,'Cannot overspend wallet',randomUUID(),account.account_id));
      const oldEnd = new Date(Date.now() - 400 * 86400000);
      const oldSchedule = await tx.tour_schedules.create({ data: { tour_id: schedule.tour_id, departure_location_id: schedule.departure_location_id, start_date: new Date(+oldEnd - 86400000), end_date: oldEnd, quota: 1 } });
      const oldBooking = await tx.bookings.create({ data: { user_id: user.user_id, tour_schedule_id: oldSchedule.tour_schedule_id, contact_name: 'Rollback old trip', contact_phone: '0901234567', contact_email: 'membership@example.invalid', total_amount: 10000000, status: 'completed', membership_snapshot: { pointMultiplier: 1 } } });
      await tx.payments.create({ data: { booking_id: oldBooking.booking_id, method: 'vnpay', status: 'completed', amount: 10000000, paid_at: oldEnd } });
      const nextCycle = await service.forAccount(account.account_id);
      assert.equal(nextCycle.points,0); // Cycle reset never resets the wallet.
      assert.equal(nextCycle.pointsBalance,970);
      assert.equal(nextCycle.tier.id,'silver');
      const recentEnd = new Date(Date.now() - 3 * 86400000);
      const recentSchedule = await tx.tour_schedules.create({ data: { tour_id: schedule.tour_id, departure_location_id: schedule.departure_location_id, start_date: new Date(+recentEnd - 86400000), end_date: recentEnd, quota: 1 } });
      const recentBooking = await tx.bookings.create({ data: { user_id: user.user_id, tour_schedule_id: recentSchedule.tour_schedule_id, contact_name: 'Rollback current trip', contact_phone: '0901234567', contact_email: 'membership@example.invalid', total_amount: 6000000, status: 'completed', membership_snapshot: { pointMultiplier: 1 } } });
      await tx.payments.create({ data: { booking_id: recentBooking.booking_id, method: 'vnpay', status: 'completed', amount: 6000000, paid_at: recentEnd } });
      const localNow = new Date(Date.now() + 7 * 3600000);
      await tx.users.update({ where: { user_id: user.user_id }, data: { birthday: new Date(Date.UTC(1990,localNow.getUTCMonth(),1)) } });
      const qualified = await service.forAccount(account.account_id);
      assert.equal(qualified.points,60); assert.equal(qualified.pointsBalance,1030);
      assert.ok(qualified.vouchers.some(v => v.is_birthday));
      const issued = await tx.vouchers.count({ where: { owner_user_id: user.user_id } });
      await service.forAccount(account.account_id);
      assert.equal(await tx.vouchers.count({ where: { owner_user_id: user.user_id } }),issued);
      assert.equal(await tx.vouchers.count({ where: { owner_user_id: user.user_id, reward_key: { startsWith: 'upgrade:' } } }),1);
      await tx.payments.create({ data: { booking_id: recentBooking.booking_id, method: 'bank', status: 'refunded', amount: 1200000 } });
      const afterRefund = await service.forAccount(account.account_id);
      assert.equal(afterRefund.pointsBalance,1018);
      assert.equal(afterRefund.points,48);
      const listed = await service.adminList(1);
      assert.equal(Object.values(listed.tierCounts ?? {}).reduce((sum,n) => sum + n,0),listed.memberTotal);
      assert.equal(listed.items.find(item => item.userId === user.user_id)?.tier,afterRefund.tier.id);
      assert.equal(listed.programVersion,afterRefund.programVersion);
      const futureStart = new Date(Date.now() + 100 * 86400000);
      const futureSchedule = await tx.tour_schedules.create({ data: { tour_id: schedule.tour_id, departure_location_id: schedule.departure_location_id, start_date: futureStart, end_date: new Date(+futureStart + 86400000), price: 1000000, quota: 2 } });
      const bookingService = new BookingsService(adapter as any,{ sendBookingCreatedEmail: async () => {} } as any,service);
      const payload = { user_id: user.user_id, tour_schedule_id: futureSchedule.tour_schedule_id, contact_name: 'Rollback Customer',contact_phone:'0901234567',contact_email:'membership@example.invalid', adult_count:1,child_count:0,infant_count:0,payment_method:'vnpay',points_to_use:100,travelers:[{ fullName:'Rollback Customer',gender:'male',type:'adult',birthday:'1990-01-01' }] };
      const checkout = await bookingService.createBooking(payload);
      assert.equal(Number(checkout.total_amount),880000);
      assert.equal((checkout.membership_snapshot as any).pointsDiscount,100000);
      assert.equal((checkout.membership_snapshot as any).programVersion,afterRefund.programVersion);
      assert.deepEqual(await walletBalance(tx,user.user_id),{ balance:918,held:100,debt:0 });
      await assert.rejects(bookingService.createBooking({ ...payload,points_to_use:300 }));
      assert.equal(await tx.bookings.count({ where: { user_id:user.user_id,tour_schedule_id:futureSchedule.tour_schedule_id } }),1);
      await new BookingWorkflow(adapter as any).requestCancel(checkout.booking_id,user.user_id,{ reason:'Rollback cancellation' });
      assert.deepEqual(await walletBalance(tx,user.user_id),{ balance:1018,held:0,debt:0 });
      assert.equal((await tx.tour_schedules.findUniqueOrThrow({ where:{tour_schedule_id:futureSchedule.tour_schedule_id} })).booked_count,0);
      const rewardRequest = randomUUID();
      const rewardInput = { title:'Rollback custom voucher', description:'Test voucher for rollback only', pointsCost:25,valueVnd:25000,minOrder:150000,validityDays:7 };
      const custom = await service.createReward(rewardInput,rewardRequest,account.account_id);
      assert.deepEqual(await service.createReward(rewardInput,rewardRequest,account.account_id),custom);
      await assert.rejects(service.createReward({ ...rewardInput,pointsCost:0 },randomUUID(),account.account_id));
      await assert.rejects(service.createReward({ ...rewardInput,pointsCost:26 },rewardRequest,account.account_id));
      const catalogAdmin = await service.adminList(1), catalogUser = await service.forAccount(account.account_id);
      assert.deepEqual(catalogAdmin.rewards?.find(r=>r.id===custom.id),catalogUser.rewards?.find(r=>r.id===custom.id));
      assert.equal(catalogUser.rewards?.filter(r=>r.id===custom.id).length,1);
      const redeemedCustom = await service.redeemReward(account.account_id,custom.id,randomUUID());
      assert.equal(redeemedCustom.remainingPoints,993);
      const issuedCustom = await tx.vouchers.findUniqueOrThrow({ where:{code:redeemedCustom.voucherCode} });
      assert.equal(Number(issuedCustom.min_order_value),150000);
      assert.equal(Number(issuedCustom.discount_value),25000);
      assert.equal(+issuedCustom.expiry_date - +issuedCustom.start_date,7*86400000);
      throw rollback;
    }, { timeout: 30000 }), error => error === rollback);
  } finally { await db.$disconnect(); }
});
