import { config } from 'dotenv';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { prisma } from '../../packages/database/src/index';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export type MembershipTierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TierDefinition {
  id: MembershipTierId;
  name: string;
  threshold: number;
  defaultTargetSpending: number;
  pointMultiplier: number;
  birthdayVoucherAmount: number;
  upgradeVoucherAmount: number;
  minOrderValue: number;
}

export const TIER_DEFINITIONS: Record<MembershipTierId, TierDefinition> = {
  bronze: {
    id: 'bronze',
    name: 'Đồng (Bronze)',
    threshold: 0,
    defaultTargetSpending: 0,
    pointMultiplier: 1,
    birthdayVoucherAmount: 50_000,
    upgradeVoucherAmount: 0,
    minOrderValue: 0,
  },
  silver: {
    id: 'silver',
    name: 'Bạc (Silver)',
    threshold: 5_000_000,
    defaultTargetSpending: 6_000_000,
    pointMultiplier: 1.2,
    birthdayVoucherAmount: 100_000,
    upgradeVoucherAmount: 100_000,
    minOrderValue: 2_000_000,
  },
  gold: {
    id: 'gold',
    name: 'Vàng (Gold)',
    threshold: 15_000_000,
    defaultTargetSpending: 18_000_000,
    pointMultiplier: 1.5,
    birthdayVoucherAmount: 200_000,
    upgradeVoucherAmount: 200_000,
    minOrderValue: 3_000_000,
  },
  platinum: {
    id: 'platinum',
    name: 'Bạch kim (Platinum)',
    threshold: 30_000_000,
    defaultTargetSpending: 35_000_000,
    pointMultiplier: 2,
    birthdayVoucherAmount: 300_000,
    upgradeVoucherAmount: 400_000,
    minOrderValue: 5_000_000,
  },
  diamond: {
    id: 'diamond',
    name: 'Kim cương (Diamond)',
    threshold: 60_000_000,
    defaultTargetSpending: 85_000_000,
    pointMultiplier: 3,
    birthdayVoucherAmount: 500_000,
    upgradeVoucherAmount: 700_000,
    minOrderValue: 7_000_000,
  },
};

export interface UpgradeMemberOptions {
  email: string;
  targetTier: MembershipTierId;
  password?: string;
  fullName?: string;
  customSpending?: number;
  createBookings?: boolean;
  issueVouchers?: boolean;
  resetSpending?: boolean;
}

export interface ServiceLog {
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export async function listUsersWithMembership() {
  const users = await prisma.users.findMany({
    where: {
      OR: [
        { accounts: { is: { email: { not: '' } } } },
        { membership: { isNot: null } },
      ],
    },
    select: {
      user_id: true,
      full_name: true,
      is_staff: true,
      phone: true,
      accounts: {
        select: {
          email: true,
          status: true,
        },
      },
      membership: {
        select: {
          tier: true,
          spending: true,
          cycle_start: true,
          cycle_end: true,
          updated_at: true,
        },
      },
    },
    orderBy: { user_id: 'desc' },
    take: 100,
  });

  return users.map((u) => ({
    userId: u.user_id,
    fullName: u.full_name,
    email: u.accounts?.email || '',
    isStaff: u.is_staff,
    tier: (u.membership?.tier || 'bronze') as MembershipTierId,
    spending: Number(u.membership?.spending || 0),
    cycleStart: u.membership?.cycle_start || null,
    cycleEnd: u.membership?.cycle_end || null,
  }));
}

export async function upgradeMemberTier(options: UpgradeMemberOptions) {
  const logs: ServiceLog[] = [];
  const log = (level: ServiceLog['level'], message: string) => {
    const item: ServiceLog = { level, message, timestamp: new Date().toLocaleTimeString('vi-VN') };
    logs.push(item);
    console.log(`[${item.timestamp}] [${level.toUpperCase()}] ${message}`);
  };

  const email = options.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Vui lòng nhập email tài khoản.');
  }

  const tierDef = TIER_DEFINITIONS[options.targetTier];
  if (!tierDef) {
    throw new Error(`Hạng hội viên không hợp lệ: ${options.targetTier}`);
  }

  const shouldCreateBookings = options.createBookings !== false;
  const shouldIssueVouchers = options.issueVouchers !== false;
  const shouldReset = options.resetSpending === true;

  log('info', `Bắt đầu xử lý nâng hạng [${tierDef.name}] cho tài khoản: ${email}`);

  let account = await prisma.accounts.findUnique({
    where: { email },
    include: {
      users: {
        include: {
          membership: true,
        },
      },
    },
  });

  let userId: number;
  let fullName = options.fullName?.trim() || '';
  let currentSpending = 0;

  if (account) {
    log('info', `Tìm thấy tài khoản sẵn có (Account ID: ${account.account_id})`);

    const accountUpdateData: Record<string, unknown> = {
      email_verified: true,
      status: 1,
    };
    if (options.password && options.password.trim()) {
      accountUpdateData.password_hash = await bcrypt.hash(options.password.trim(), 10);
      log('info', 'Đã cập nhật mật khẩu mới cho tài khoản.');
    }

    await prisma.accounts.update({
      where: { account_id: account.account_id },
      data: accountUpdateData,
    });

    if (account.users) {
      userId = account.users.user_id;
      fullName = fullName || account.users.full_name;
      currentSpending = Number(account.users.membership?.spending || 0);
      if (options.fullName?.trim()) {
        await prisma.users.update({
          where: { user_id: userId },
          data: { full_name: fullName },
        });
      }
    } else {
      fullName = fullName || `Hội viên ${tierDef.name}`;
      const newUser = await prisma.users.create({
        data: {
          account_id: account.account_id,
          full_name: fullName,
          birthday: new Date('1994-06-15'),
          phone: '0988889999',
        },
      });
      userId = newUser.user_id;
      log('info', `Đã tạo hồ sơ User #${userId}.`);
    }
  } else {
    const rawPassword = options.password?.trim() || '123456';
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    fullName = fullName || `Hội viên ${tierDef.name}`;

    const created = await prisma.accounts.create({
      data: {
        email,
        password_hash: passwordHash,
        email_verified: true,
        status: 1,
        provider: 'local',
        users: {
          create: {
            full_name: fullName,
            birthday: new Date('1994-06-15'),
            phone: '0988889999',
          },
        },
      },
      include: { users: true },
    });

    userId = created.users!.user_id;
    log('success', `Đã tạo mới tài khoản ${email} (mật khẩu: ${rawPassword}) — User #${userId}`);
  }

  // Tính toán mức chi tiêu mục tiêu
  let targetSpending: number;
  if (typeof options.customSpending === 'number' && !Number.isNaN(options.customSpending) && options.customSpending >= 0) {
    targetSpending = options.customSpending;
  } else if (shouldReset) {
    targetSpending = tierDef.defaultTargetSpending;
  } else {
    targetSpending = Math.max(currentSpending, tierDef.defaultTargetSpending);
  }

  const deltaSpending = shouldReset ? targetSpending : Math.max(0, targetSpending - currentSpending);
  let bookingCreated: { bookingId: number; amount: number; tourName: string } | null = null;

  // Tạo booking hoàn thành bổ sung nếu cần phát sinh chi tiêu thực tế
  if (shouldCreateBookings && deltaSpending > 0) {
    const tour = await prisma.tours.findFirst({
      select: { tour_id: true, name: true, departure_location: true },
      orderBy: { tour_id: 'asc' },
    });

    if (!tour) {
      log('warn', 'Không tìm thấy tour nào trong DB để tạo booking lịch sử; sẽ chỉ cập nhật trực tiếp bảng memberships.');
    } else {
      const locationFallback = tour.departure_location || (await prisma.locations.findFirst({ select: { location_id: true } }))?.location_id;
      if (!locationFallback) {
        log('warn', 'Không tìm thấy location trong DB để tạo lịch khởi hành mẫu; sẽ chỉ cập nhật trực tiếp bảng memberships.');
      } else {
        const now = new Date();
        const pastStart = new Date(now.getTime() - 20 * 24 * 3600_000);
        const pastEnd = new Date(pastStart.getTime() + 3 * 24 * 3600_000);

        const schedule = await prisma.tour_schedules.create({
          data: {
            tour_id: tour.tour_id,
            start_date: pastStart,
            end_date: pastEnd,
            quota: 30,
            booked_count: 1,
            price: deltaSpending,
            departure_location_id: locationFallback,
            status: 1,
          },
        });

        const booking = await prisma.bookings.create({
          data: {
            user_id: userId,
            tour_schedule_id: schedule.tour_schedule_id,
            contact_name: fullName,
            contact_phone: '0988889999',
            contact_email: email,
            adult_count: 1,
            child_count: 0,
            infant_count: 0,
            adult_unit_price: deltaSpending,
            total_amount: deltaSpending,
            discount_amount: 0,
            status: 'completed',
            note: `[MEMBERSHIP_SEED] Tier: ${tierDef.id}`,
            membership_snapshot: {
              tier: tierDef.id,
              pointMultiplier: tierDef.pointMultiplier,
            },
            payments: {
              create: {
                method: 'bank',
                amount: deltaSpending,
                status: 'completed',
                paid_at: pastStart,
                transaction_code: `TXN-TIER-${userId}-${Date.now()}`,
              },
            },
          },
        });

        bookingCreated = {
          bookingId: booking.booking_id,
          amount: deltaSpending,
          tourName: tour.name,
        };
        log('success', `Đã tạo đơn hoàn thành #${booking.booking_id} (${tour.name}) trị giá ${deltaSpending.toLocaleString('vi-VN')} đ.`);
      }
    }
  }

  // Cập nhật bảng memberships
  const now = new Date();
  const cycleStart = account?.users?.membership?.cycle_start ?? new Date(now.getTime() - 30 * 24 * 3600_000);
  const cycleEnd = account?.users?.membership?.cycle_end ?? new Date(cycleStart.getTime() + 365 * 24 * 3600_000);

  const membership = await prisma.memberships.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      tier: tierDef.id,
      spending: targetSpending,
      started_at: cycleStart,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
    },
    update: {
      tier: tierDef.id,
      spending: targetSpending,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
    },
  });

  log('success', `Đã cập nhật hạng [${tierDef.name}] với tổng chi tiêu ${targetSpending.toLocaleString('vi-VN')} đ.`);

  // Cấp voucher đặc quyền theo hạng
  const vouchersIssued: string[] = [];
  if (shouldIssueVouchers && tierDef.id !== 'bronze') {
    const voucherSpecs = [
      {
        code: `UPG-${tierDef.id.toUpperCase()}-U${userId}`,
        name: `Voucher Thăng Hạng ${tierDef.name}`,
        short_description: `Ưu đãi chúc mừng thăng hạng ${tierDef.name}.`,
        discount_type: 'fixed',
        discount_value: tierDef.upgradeVoucherAmount,
        min_order_value: tierDef.minOrderValue,
        max_discount_amount: tierDef.upgradeVoucherAmount,
        eligible_tiers: [tierDef.id],
        reward_key: `upgrade:${userId}:${tierDef.id}`,
      },
      {
        code: `BD-${tierDef.id.toUpperCase()}-U${userId}`,
        name: `Voucher Sinh Nhật Hạng ${tierDef.name}`,
        short_description: `Quà tặng sinh nhật dành cho hội viên ${tierDef.name}.`,
        discount_type: 'fixed',
        discount_value: tierDef.birthdayVoucherAmount,
        min_order_value: 0,
        max_discount_amount: tierDef.birthdayVoucherAmount,
        eligible_tiers: ['diamond', 'platinum', 'gold', 'silver', 'bronze'],
        reward_key: `birthday:${userId}:${now.getUTCFullYear()}`,
      },
    ];

    for (const v of voucherSpecs) {
      if (v.discount_value <= 0) continue;
      await prisma.vouchers.deleteMany({
        where: { OR: [{ code: v.code }, { reward_key: v.reward_key }] },
      });
      await prisma.vouchers.create({
        data: {
          owner_user_id: userId,
          code: v.code,
          name: v.name,
          short_description: v.short_description,
          discount_type: v.discount_type,
          discount_value: v.discount_value,
          min_order_value: v.min_order_value,
          max_discount_amount: v.max_discount_amount,
          usage_limit: 1,
          used_count: 0,
          start_date: now,
          expiry_date: new Date(now.getTime() + 180 * 24 * 3600_000),
          status: 1,
          eligible_tiers: v.eligible_tiers,
          reward_key: v.reward_key,
        },
      });
      vouchersIssued.push(v.code);
    }

    if (vouchersIssued.length > 0) {
      log('success', `Đã cấp ${vouchersIssued.length} voucher vào ví: ${vouchersIssued.join(', ')}`);
    }
  }

  return {
    success: true,
    userId,
    email,
    fullName,
    tier: membership.tier,
    spending: Number(membership.spending),
    bookingCreated,
    vouchersIssued,
    logs,
  };
}

