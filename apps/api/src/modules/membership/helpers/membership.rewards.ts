import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { DEFAULT_MEMBERSHIP_REWARDS, type MembershipRewardItem } from 'shared';

export async function membershipRewards(db: Prisma.TransactionClient): Promise<MembershipRewardItem[]> {
  const rows = await db.$queryRaw<{ config: MembershipRewardItem }[]>`SELECT config FROM membership_reward_catalog ORDER BY created_at, reward_id`;
  return [...DEFAULT_MEMBERSHIP_REWARDS, ...rows.map(row => row.config)];
}

export function normalizeMembershipReward(value: unknown): MembershipRewardItem {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v.title !== 'string' || v.title.trim().length < 3 || v.title.length > 150 ||
      typeof v.description !== 'string' || v.description.trim().length < 5 || v.description.length > 1000 ||
      !Number.isSafeInteger(v.pointsCost) || Number(v.pointsCost) < 1 || Number(v.pointsCost) > 1_000_000 ||
      !Number.isSafeInteger(v.valueVnd) || Number(v.valueVnd) < 1000 || Number(v.valueVnd) > 1_000_000_000 ||
      !Number.isSafeInteger(v.minOrder) || Number(v.minOrder) <= Number(v.valueVnd) || Number(v.minOrder) > 9_999_999_999 ||
      !Number.isSafeInteger(v.validityDays) || Number(v.validityDays) < 1 || Number(v.validityDays) > 365) {
    throw new BadRequestException('Nhập đủ tên, mô tả, điểm nguyên dương, giá trị voucher và hạn dùng 1–365 ngày. Đơn tối thiểu phải lớn hơn giá trị voucher.');
  }
  return { id: '', title: v.title.trim(), description: v.description.trim(), pointsCost: Number(v.pointsCost), valueVnd: Number(v.valueVnd), minOrder: Number(v.minOrder), validityDays: Number(v.validityDays), category: 'Voucher tour', imageUrl: '/images/shared/travel-cover.png' };
}
