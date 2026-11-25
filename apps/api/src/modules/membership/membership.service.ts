import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { sqlSearchText } from "../../common/search";
import {
  MEMBERSHIP_TIERS,
  type MembershipSummary,
  type MembershipTier,
  type MembershipAdminList,
  type MembershipTierId,
} from "shared";
import {
  birthdayWindow,
  calculateMembership,
  creditForBooking,
  normalizeMembershipTiers,
} from "./helpers";
import { lockWallet, reconcileWallet, walletBalance } from './helpers/membership.wallet';
import { membershipRewards, normalizeMembershipReward } from './helpers/membership.rewards';
import { getAccountUserId } from "../../common/auth/account-user";
import { PrismaService } from "../../infrastructure/database/prisma.service";

@Injectable()
export class MembershipService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(MembershipService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopped = false;
  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => void this.sweep(), 60 * 60 * 1000);
    this.timer.unref();
    void this.sweep();
  }
  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
  }

  // Periodic reconciliation also handles expired cycles while customers are offline.
  sweep(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    return this.running ??= this.runSweep().finally(() => { this.running = undefined; });
  }

  private async runSweep() {
    try {
      let cursor = 0;
      while (!this.stopped) {
        const users = await this.prisma.users.findMany({
          where: {
            user_id: { gt: cursor },
            is_staff: false,
          },
          select: { user_id: true },
          orderBy: { user_id: "asc" },
          take: 100,
        });
        if (!users.length) break;
        for (const user of users) {
          try {
            await this.syncUser(user.user_id);
          } catch (error) {
            this.logger.error(
              `Không thể xét hạng tài khoản ${user.user_id}`,
              error instanceof Error ? error.stack : undefined,
            );
          }
        }
        cursor = users[users.length - 1].user_id;
      }
    } catch (error) {
      this.logger.error(
        "Không thể chạy xét hạng thành viên",
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async forAccount(accountId: number) {
    return this.syncUser(
      await getAccountUserId(
        this.prisma,
        accountId,
        "Không tìm thấy người dùng.",
      ),
    );
  }

  async syncUser(userId: number, now = new Date()): Promise<MembershipSummary> {
    return this.prisma.$transaction(
      async (tx) => {
        // Serialize reward issuance across HTTP requests and multiple API processes.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(73129, ${userId}::integer)`;
        const user = await tx.users.findUnique({ where: { user_id: userId }, select: { birthday: true } });
        if (!user) throw new NotFoundException("Không tìm thấy thành viên.");
        const existing = await tx.memberships.findUnique({
          where: { user_id: userId },
        });
        let program = await tx.membership_program.findUnique({
          where: { id: 1 },
        });
        if (!program) {
          const defaults = JSON.parse(JSON.stringify(normalizeMembershipTiers(MEMBERSHIP_TIERS)));
          await tx.membership_program.createMany({ data: [{ id: 1, tiers: defaults, version: 1 }], skipDuplicates: true });
          program = await tx.membership_program.findUniqueOrThrow({ where: { id: 1 } });
          await tx.membership_program_versions.upsert({ where: { version: 1 }, update: {}, create: { version: 1, tiers: JSON.parse(JSON.stringify(program.tiers)) } });
        }
        const tiers = program
          ? normalizeMembershipTiers(program.tiers)
          : normalizeMembershipTiers(MEMBERSHIP_TIERS);
        const bookings = await tx.bookings.findMany({
          where: {
            user_id: userId,
            tour_schedules: { end_date: { lte: now } },
          },
          include: {
            payments: true,
            tour_schedules: { include: { tours: { select: { name: true } } } },
          },
        });
        const credits = bookings.flatMap((booking) => {
          const credit = creditForBooking(booking, now);
          return credit ? [credit] : [];
        });
        const state = calculateMembership(
          existing?.started_at ?? null,
          credits,
          now,
          tiers,
        );
        await tx.memberships.upsert({
          where: { user_id: userId },
          create: {
            user_id: userId,
            started_at: state.anchor,
            tier: state.tier.id,
            cycle_start: state.start,
            cycle_end: state.end,
            spending: state.spending,
          },
          update: {
            started_at: state.anchor,
            tier: state.tier.id,
            cycle_start: state.start,
            cycle_end: state.end,
            spending: state.spending,
          },
        });
        const notify = async (key: string, title: string, message: string, voucherId?: number) =>
          tx.membership_notifications.upsert({
            where: { event_key: key },
            create: {
              user_id: userId,
              voucher_id: voucherId,
              event_key: key,
              title,
              message,
              created_at: now,
            },
            update: {},
          });
        const wallet = await reconcileWallet(tx, userId, now);
        if (state.start) for (const tier of tiers.slice(1).filter(t => state.spending >= t.threshold)) {
          const key = `upgrade:${userId}:${state.start.toISOString()}:${tier.id}`;
          const voucher = await tx.vouchers.upsert({ where: { reward_key: key }, update: {}, create: {
            owner_user_id: userId, reward_key: key, code: 'UP-' + randomBytes(10).toString('hex').toUpperCase(),
            name: `Quà thăng hạng ${tier.name}`, discount_type: tier.discountType, discount_value: tier.discountValue,
            min_order_value: tier.minOrder, max_discount_amount: tier.maxDiscount, usage_limit: 1,
            start_date: now, expiry_date: new Date(now.getTime() + 365 * 86400_000),
          } });
          await notify(key, `Chúc mừng đạt hạng ${tier.name}!`, `Voucher ${voucher.code} đã được thêm vào ví.`, voucher.voucher_id);
        }
        const birthday = birthdayWindow(user.birthday, now);
        if (birthday && state.tier.birthdayVoucherAmount > 0) {
          const rewardKey = 'birthday:' + userId + ':' + birthday.year;
          const voucher = await tx.vouchers.upsert({
            where: { reward_key: rewardKey }, update: {},
            create: {
              owner_user_id: userId, reward_key: rewardKey,
              code: 'BD-' + randomBytes(10).toString('hex').toUpperCase(),
              discount_type: 'fixed', discount_value: state.tier.birthdayVoucherAmount,
              min_order_value: 0, max_discount_amount: state.tier.birthdayVoucherAmount,
              usage_limit: 1, start_date: birthday.start, expiry_date: new Date(birthday.end.getTime() - 1),
            },
          });
          await notify(rewardKey, 'Chúc mừng sinh nhật!', 'JourniTrip tặng bạn voucher ' + Number(voucher.discount_value).toLocaleString('vi-VN') + 'đ, dùng trong tháng sinh nhật của bạn.', voucher.voucher_id);
        }
        if (state.start && state.end) {
          const cycleKey = `${userId}:${state.start.toISOString()}`;
          if (existing?.cycle_start && existing.cycle_start < state.start) {
            await notify(
              `renew:${cycleKey}`,
              "Đã xét lại hạng thành viên",
              `Hạng của bạn trong chu kỳ mới là ${state.tier.name}. Chi tiêu xét hạng bắt đầu lại; voucher đã cấp vẫn giữ nguyên hạn dùng.`,
            );
          }
          const remaining = Math.max(0, state.tier.threshold - state.spending);
          const days = Math.ceil(
            (state.end.getTime() - now.getTime()) / 86400_000,
          );
          if (remaining > 0 && days <= 30) {
            const milestone = days <= 7 ? 7 : 30;
            await notify(
              `remind:${cycleKey}:${milestone}`,
              `Sắp đến ngày xét lại hạng ${state.tier.name}`,
              `Còn ${days} ngày đến ngày xét hạng. Bạn cần thêm ${remaining.toLocaleString("vi-VN")}đ chi tiêu từ tour hoàn thành để giữ hạng ${state.tier.name}.`,
            );
          }
        }
        const [vouchers, notifications] = await Promise.all([
          tx.vouchers.findMany({
            where: { OR: [
              { owner_user_id: userId },
              { owner_user_id: null, status: 1, expiry_date: { gt: now }, OR: [{ eligible_tiers: { isEmpty: true } }, { eligible_tiers: { has: state.tier.id } }] },
            ] },
            orderBy: { created_at: "desc" },
          }),
          tx.membership_notifications.findMany({
            where: { user_id: userId },
            orderBy: [{ created_at: "desc" }, { notification_id: "desc" }],
            take: 100,
          }),
        ]);
        const nextTier =
          tiers[tiers.findIndex((tier) => tier.id === state.tier.id) + 1] ??
          null;
        const target = nextTier?.threshold ?? state.tier.threshold;
        const totalPoints = state.history.reduce(
          (sum, credit) =>
            sum + (credit.points ?? Math.floor(credit.amount / 100_000)),
          0,
        );
        const pointTransactions = await tx.membership_point_transactions.findMany({ where: { user_id: userId }, orderBy: [{ created_at: 'desc' }, { transaction_id: 'desc' }], take: 100 });

        return {
          tier: state.tier,
          tiers,
          cycleStart: state.start?.toISOString() ?? null,
          cycleEnd: state.end?.toISOString() ?? null,
          spending: state.spending,
          points: totalPoints,
          pointsBalance: wallet.balance,
          pointsHeld: wallet.held,
          pointsDebt: wallet.debt,
          programVersion: program?.version ?? 1,
          pointTransactions: pointTransactions.map(e => ({ id: e.transaction_id, bookingId: e.booking_id, kind: e.kind, points: e.points, reserved: e.reserved, description: e.description, createdAt: e.created_at.toISOString() })),
          rewards: await membershipRewards(tx),
          nextTier,
          toNextTier: nextTier
            ? Math.max(0, nextTier.threshold - state.spending)
            : 0,
          toRetainTier: Math.max(0, state.tier.threshold - state.spending),
          progress: target ? Math.min(100, (state.spending / target) * 100) : 0,
          vouchers: vouchers.map((voucher) => ({
            voucher_id: voucher.voucher_id,
            code: voucher.code,
            discount_type: voucher.discount_type,
            discount_value: Number(voucher.discount_value),
            min_order_value: Number(voucher.min_order_value),
            max_discount_amount:
              voucher.max_discount_amount === null
                ? null
                : Number(voucher.max_discount_amount),
            start_date: voucher.start_date.toISOString(),
            expiry_date: voucher.expiry_date.toISOString(),
            eligible_tiers: voucher.eligible_tiers as MembershipTierId[],
            is_birthday: voucher.reward_key?.startsWith('birthday:') ?? false,
            state:
              voucher.used_count >= voucher.usage_limit
                ? (voucher.owner_user_id === userId ? "used" as const : "expired" as const)
                : voucher.expiry_date <= now || voucher.status !== 1
                  ? ("expired" as const)
                  : voucher.start_date > now ? ("upcoming" as const) : ("available" as const),
          })),
          notifications: notifications.map((item) => ({
            notification_id: item.notification_id,
            voucher_id: item.voucher_id,
            booking_id: item.booking_id,
            title: item.title,
            message: item.message,
            created_at: item.created_at.toISOString(),
            read_at: item.read_at?.toISOString() ?? null,
          })),
          history: state.history.map((credit) => ({
            ...credit,
            completedAt: credit.completedAt.toISOString(),
            points: credit.points ?? Math.floor(credit.amount / 100_000),
          })),
          cycles: state.cycles,
        };
      },
      { timeout: 20_000 },
    );
  }

  async readNotifications(accountId: number) {
    const userId = await getAccountUserId(
      this.prisma,
      accountId,
      "Không tìm thấy người dùng.",
    );
    await this.prisma.membership_notifications.updateMany({
      where: { user_id: userId, read_at: null },
      data: { read_at: new Date() },
    });
    return { success: true };
  }

  async redeemReward(accountId: number, rewardId: string, requestId: string) {
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestId || '')) throw new BadRequestException('Mã yêu cầu đổi điểm không hợp lệ.');
    const userId = await getAccountUserId(this.prisma, accountId, 'Không tìm thấy người dùng.');
    const reward = (await membershipRewards(this.prisma)).find(r => r.id === rewardId);
    if (!reward) throw new NotFoundException('Phần thưởng không tồn tại.');
    return this.prisma.$transaction(async tx => {
      await lockWallet(tx, userId);
      const wallet = await reconcileWallet(tx, userId);
      const key = `wallet-redeem:${userId}:${requestId}`;
      const existing = await tx.vouchers.findUnique({ where: { reward_key: key } });
      if (existing) {
        if (existing.name !== reward.title) throw new ConflictException('Mã yêu cầu đã được dùng cho phần thưởng khác.');
        return { success: true, voucherCode: existing.code, remainingPoints: wallet.balance };
      }
      if (wallet.balance < reward.pointsCost) throw new BadRequestException('Không đủ điểm khả dụng để đổi voucher này.');
      const now = new Date();
      const voucher = await tx.vouchers.create({ data: {
        owner_user_id: userId, reward_key: key, code: 'VIP-' + randomBytes(10).toString('hex').toUpperCase(),
        name: reward.title, short_description: reward.description, image_url: reward.imageUrl,
        discount_type: 'fixed', discount_value: reward.valueVnd!, min_order_value: reward.minOrder ?? reward.valueVnd! * 5,
        max_discount_amount: reward.valueVnd!, usage_limit: 1, start_date: now,
        expiry_date: new Date(now.getTime() + (reward.validityDays ?? 365) * 86400_000), status: 1,
      } });
      await tx.membership_point_transactions.create({ data: {
        user_id: userId, voucher_id: voucher.voucher_id, kind: 'redeem', points: -reward.pointsCost,
        event_key: key, description: `Đổi voucher ${voucher.code}`,
      } });
      await tx.membership_notifications.create({ data: { user_id: userId, voucher_id: voucher.voucher_id,
        event_key: `notify:${key}`, title: 'Đổi thưởng thành công', message: `Đã dùng ${reward.pointsCost} điểm đổi ${reward.title}. Mã: ${voucher.code}` } });
      return { success: true, voucherCode: voucher.code, remainingPoints: wallet.balance - reward.pointsCost };
    }, { timeout: 20_000 });
  }

  async createReward(value: unknown, requestId: string, actorAccountId: number) {
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestId || '')) throw new BadRequestException('Mã yêu cầu không hợp lệ.');
    const config = { ...normalizeMembershipReward(value), id: `custom-${requestId}` };
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`INSERT INTO membership_reward_catalog (reward_id, config, created_by) VALUES (${config.id}, ${JSON.stringify(config)}::jsonb, ${actorAccountId}) ON CONFLICT (reward_id) DO NOTHING`;
      const [row] = await tx.$queryRaw<{ config: typeof config; created_by: number }[]>`SELECT config, created_by FROM membership_reward_catalog WHERE reward_id = ${config.id}`;
      if (row.created_by !== actorAccountId || JSON.stringify(normalizeMembershipReward(row.config)) !== JSON.stringify(normalizeMembershipReward(config))) throw new ConflictException('Mã yêu cầu đã được dùng cho voucher khác.');
      return row.config;
    });
  }

  async adjustPoints(userId: number, points: number, reason: string, requestId: string, actorAccountId: number) {
    if (!Number.isSafeInteger(points) || points === 0 || Math.abs(points) > 1_000_000 || typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 400 || !/^[a-zA-Z0-9-]{16,80}$/.test(requestId || '')) throw new BadRequestException('Cần số điểm hợp lệ, lý do từ 5–400 ký tự và mã yêu cầu.');
    await this.syncUser(userId);
    await this.prisma.$transaction(async tx => {
      await lockWallet(tx, userId);
      const key = `adjust:${userId}:${requestId}`;
      const existing = await tx.membership_point_transactions.findUnique({ where: { event_key: key } });
      if (existing) {
        if (existing.points !== points || existing.description !== reason.trim()) throw new ConflictException('Mã yêu cầu đã được sử dụng.');
        return;
      }
      const wallet = await reconcileWallet(tx, userId);
      if (points < 0 && wallet.balance < -points) throw new BadRequestException('Không đủ điểm khả dụng để trừ.');
      await tx.membership_point_transactions.create({ data: { user_id: userId, kind: 'adjust', points, event_key: key, description: reason.trim(), actor_account_id: actorAccountId } });
    });
    return this.syncUser(userId);
  }

  async updateSettings(value: unknown, expectedVersion: number, actorAccountId: number): Promise<MembershipTier[]> {
    const tiers = normalizeMembershipTiers(value);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new BadRequestException('Phiên bản cấu hình không hợp lệ.');
    await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(73130, 1)`;
      const existing = await tx.membership_program.findUnique({ where: { id: 1 } });
      if ((existing?.version ?? 1) !== expectedVersion) throw new ConflictException('Cấu hình đã được người khác cập nhật. Vui lòng tải lại trước khi lưu.');
      const version = expectedVersion + 1;
      const json = JSON.parse(JSON.stringify(tiers));
      await tx.membership_program_versions.upsert({ where: { version: expectedVersion }, update: {}, create: { version: expectedVersion, tiers: existing?.tiers ?? JSON.parse(JSON.stringify(normalizeMembershipTiers(MEMBERSHIP_TIERS))) } });
      await tx.membership_program.upsert({ where: { id: 1 }, create: { id: 1, tiers: json, version }, update: { tiers: json, version } });
      await tx.membership_program_versions.create({ data: { version, tiers: json, actor_account_id: actorAccountId } });
    });
    // Cached summaries are refreshed using the same policy before the admin list is returned.
    await this.sweep();
    return tiers;
  }

  async adminList(page: number, search = '', tier = 'all', limit = 20): Promise<MembershipAdminList> {
    await this.sweep();
    const matched = search.trim() ? await this.prisma.$queryRaw<{ user_id: number }[]>(Prisma.sql`
      SELECT u.user_id FROM users u
      JOIN accounts a ON a.account_id = u.account_id
      WHERE ${sqlSearchText(Prisma.sql`concat_ws(' ', u.full_name, u.phone, a.email)`, search)}
        OR u.user_id = ${/^\d+$/.test(search.trim()) && Number(search) <= 2147483647 ? Number(search) : -1}
    `) : null;
    const where = {
      user: { is_staff: false },
      ...(tier !== 'all' ? { tier } : {}),
      ...(matched ? { user_id: { in: matched.map(item => item.user_id) } } : {}),
    };
    const [members, total, issued, used, discounts, program, memberTotal] =
      await Promise.all([
        this.prisma.memberships.findMany({
          orderBy: { user_id: "asc" },
          where,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              include: {
                accounts: { select: { email: true } },
                _count: { select: { member_vouchers: true, bookings: true } },
              },
            },
          },
        }),
        this.prisma.memberships.count({ where }),
        this.prisma.vouchers.count({ where: { owner_user_id: { not: null }, owner: { is_staff: false } } }),
        this.prisma.vouchers.count({
          where: { owner_user_id: { not: null }, owner: { is_staff: false }, used_count: { gt: 0 } },
        }),
        this.prisma.bookings.aggregate({
          where: {
            OR: [{ vouchers: { owner_user_id: { not: null } } }, { membership_snapshot: { path: ["tourDiscount"], gt: 0 } }, { membership_snapshot: { path: ["serviceDiscount"], gt: 0 } }],
            status: { in: ["paid", "completed"] },
          },
          _sum: { discount_amount: true },
        }),
        this.prisma.membership_program.findUnique({ where: { id: 1 } }),
        this.prisma.memberships.count({ where: { user: { is_staff: false } } }),
      ]);
    const tierCounts = await this.prisma.memberships.groupBy({ by: ['tier'], where: { user: { is_staff: false } }, _count: { _all: true } });
    return {
      tierCounts: Object.fromEntries(tierCounts.map(item => [item.tier, item._count._all])),
      rewards: await membershipRewards(this.prisma),
      items: await Promise.all(members.map(async (member) => ({
        pointsBalance: (await walletBalance(this.prisma, member.user_id)).balance,
        userId: member.user_id,
        name: member.user.full_name,
        email: member.user.accounts.email,
        tier: member.tier,
        spending: Number(member.spending),
        cycleEnd: member.cycle_end?.toISOString() ?? null,
        voucherCount: member.user._count.member_vouchers,
        phone: member.user.phone,
        bookingCount: member.user._count.bookings,
      }))),
      total,
      memberTotal,
      programVersion: program?.version ?? 1,
      page,
      tiers: program
        ? normalizeMembershipTiers(program.tiers)
        : normalizeMembershipTiers(MEMBERSHIP_TIERS),
      issued,
      used,
      discountTotal: Number(discounts._sum.discount_amount ?? 0),
    };
  }
}
