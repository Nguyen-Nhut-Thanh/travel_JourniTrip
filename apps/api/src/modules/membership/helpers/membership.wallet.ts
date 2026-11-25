import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { creditForBooking } from './membership.rules';

type Tx = Prisma.TransactionClient;
export async function lockWallet(tx: Tx, userId: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(73129, ${userId}::integer)`;
}

export async function walletBalance(tx: Tx, userId: number) {
  const sums = await tx.membership_point_transactions.aggregate({ where: { user_id: userId }, _sum: { points: true, reserved: true } });
  const total = sums._sum.points ?? 0;
  const held = sums._sum.reserved ?? 0;
  return { balance: Math.max(0, total - held), held, debt: Math.max(0, -total) };
}

/** Caller holds the user advisory lock; historical bookings are imported once,
 * then every refund/reversal is represented by a new signed entry. */
export async function reconcileWallet(tx: Tx, userId: number, now = new Date()) {
  const bookings = await tx.bookings.findMany({ where: { user_id: userId }, include: { payments: true, tour_schedules: { include: { tours: { select: { name: true } } } } } });
  const entries = await tx.membership_point_transactions.findMany({ where: { user_id: userId, kind: 'earn' } });
  for (const booking of bookings) {
    const desired = creditForBooking(booking, now)?.points ?? 0;
    const recorded = entries.filter(e => e.booking_id === booking.booking_id).reduce((sum, e) => sum + e.points, 0);
    if (desired !== recorded) await tx.membership_point_transactions.create({ data: {
      user_id: userId, booking_id: booking.booking_id, kind: 'earn', points: desired - recorded,
      event_key: `earn:${booking.booking_id}:${randomUUID()}`,
      description: desired > recorded ? `Tích điểm tour #${booking.booking_id}` : `Thu hồi điểm do điều chỉnh/hoàn booking #${booking.booking_id}`, created_at: now,
    } });
  }
  // Keep previous redemptions, including retired experience vouchers, without charging twice.
  const legacy = await tx.vouchers.findMany({ where: { owner_user_id: userId, reward_key: { startsWith: `redeemed:${userId}:` } } });
  for (const voucher of legacy) {
    const points = Number(voucher.reward_key?.split(':')[3]);
    if (Number.isSafeInteger(points) && points > 0) await tx.membership_point_transactions.upsert({
      where: { event_key: `legacy-redeem:${voucher.voucher_id}` }, update: {}, create: {
        user_id: userId, voucher_id: voucher.voucher_id, kind: 'redeem', points: -points,
        event_key: `legacy-redeem:${voucher.voucher_id}`, description: `Đổi voucher ${voucher.code}`, created_at: voucher.created_at,
      },
    });
  }
  return walletBalance(tx, userId);
}

export async function holdBookingPoints(tx: Tx, booking: { booking_id: number; user_id: number; membership_snapshot: unknown }) {
  const points = Number((booking.membership_snapshot as any)?.pointsUsed || 0);
  if (!points) return;
  await lockWallet(tx, booking.user_id);
  const entries = await tx.membership_point_transactions.findMany({ where: { user_id: booking.user_id, booking_id: booking.booking_id } });
  if (entries.some(e => e.event_key === `booking-spend:${booking.booking_id}`)) return;
  if (entries.reduce((sum, e) => sum + e.reserved, 0) === points) return;
  const wallet = await reconcileWallet(tx, booking.user_id);
  if (wallet.balance < points) throw new BadRequestException('Điểm khả dụng đã thay đổi. Vui lòng giảm số điểm hoặc đặt lại booking.');
  await tx.membership_point_transactions.create({ data: {
    user_id: booking.user_id, booking_id: booking.booking_id, kind: 'hold', points: 0, reserved: points,
    event_key: `booking-hold:${booking.booking_id}:${randomUUID()}`, description: `Giữ ${points} điểm cho booking #${booking.booking_id}`,
  } });
}

export async function settleBookingPoints(tx: Tx, booking: { booking_id: number; user_id: number; membership_snapshot: unknown }, paid: boolean) {
  const points = Number((booking.membership_snapshot as any)?.pointsUsed || 0);
  if (!points) return;
  await lockWallet(tx, booking.user_id);
  const entries = await tx.membership_point_transactions.findMany({ where: { user_id: booking.user_id, booking_id: booking.booking_id } });
  const held = entries.reduce((sum, e) => sum + e.reserved, 0);
  if (paid && entries.some(e => e.event_key === `booking-spend:${booking.booking_id}`)) return;
  if (paid && held !== points) throw new BadRequestException('Điểm của booking không còn được giữ. Giao dịch cần đối soát.');
  if (!paid && held <= 0) return;
  await tx.membership_point_transactions.create({ data: {
    user_id: booking.user_id, booking_id: booking.booking_id, kind: paid ? 'spend' : 'release',
    points: paid ? -points : 0, reserved: -held,
    event_key: paid ? `booking-spend:${booking.booking_id}` : `booking-release:${booking.booking_id}:${randomUUID()}`,
    description: `${paid ? 'Thanh toán bằng điểm' : 'Giải phóng điểm giữ chỗ'} booking #${booking.booking_id}`,
  } });
}

export async function refundBookingPoints(tx: Tx, booking: { booking_id: number; user_id: number; membership_snapshot: unknown }, points: number, event: string) {
  if (!points) return;
  await lockWallet(tx, booking.user_id);
  const entries = await tx.membership_point_transactions.findMany({ where: { user_id: booking.user_id, booking_id: booking.booking_id } });
  const spent = -entries.filter(e => e.kind === 'spend').reduce((s, e) => s + e.points, 0);
  const refunded = entries.filter(e => e.kind === 'refund').reduce((s, e) => s + e.points, 0);
  const amount = Math.min(points, Math.max(0, spent - refunded));
  if (!amount) return;
  await tx.membership_point_transactions.upsert({ where: { event_key: event }, update: {}, create: {
    user_id: booking.user_id, booking_id: booking.booking_id, kind: 'refund', points: amount,
    event_key: event, description: `Hoàn điểm booking #${booking.booking_id}`,
  } });
}
