export type MembershipTierId =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

export interface MembershipTier {
  id: MembershipTierId;
  name: string;
  threshold: number;
  discountType: "fixed" | "percentage";
  discountValue: number;
  maxDiscount: number;
  minOrder: number;
  benefits: string[];
  tourDiscountPercent: number;
  pointMultiplier: number;
  birthdayVoucherAmount: number;
  serviceDiscountPercent: number;
  priorityReservation: boolean;
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    id: "bronze",
    name: "Đồng",
    tourDiscountPercent: 0,
    pointMultiplier: 1,
    birthdayVoucherAmount: 50_000,
    serviceDiscountPercent: 0,
    priorityReservation: false,
    threshold: 0,
    discountType: "fixed",
    discountValue: 0,
    maxDiscount: 0,
    minOrder: 0,
    benefits: [],
  },
  {
    id: "silver",
    name: "Bạc",
    tourDiscountPercent: 2,
    pointMultiplier: 1.2,
    birthdayVoucherAmount: 100_000,
    serviceDiscountPercent: 5,
    priorityReservation: false,
    threshold: 5_000_000,
    discountType: "fixed",
    discountValue: 100_000,
    maxDiscount: 100_000,
    minOrder: 2_000_000,
    benefits: [],
  },
  {
    id: "gold",
    name: "Vàng",
    tourDiscountPercent: 3,
    pointMultiplier: 1.5,
    birthdayVoucherAmount: 200_000,
    serviceDiscountPercent: 10,
    priorityReservation: true,
    threshold: 15_000_000,
    discountType: "percentage",
    discountValue: 3,
    maxDiscount: 200_000,
    minOrder: 3_000_000,
    benefits: [],
  },
  {
    id: "platinum",
    name: "Bạch kim",
    tourDiscountPercent: 5,
    pointMultiplier: 2,
    birthdayVoucherAmount: 300_000,
    serviceDiscountPercent: 15,
    priorityReservation: true,
    threshold: 30_000_000,
    discountType: "percentage",
    discountValue: 5,
    maxDiscount: 400_000,
    minOrder: 5_000_000,
    benefits: [],
  },
  {
    id: "diamond",
    name: "Kim cương",
    tourDiscountPercent: 7,
    pointMultiplier: 3,
    birthdayVoucherAmount: 500_000,
    serviceDiscountPercent: 20,
    priorityReservation: true,
    threshold: 60_000_000,
    discountType: "percentage",
    discountValue: 7,
    maxDiscount: 700_000,
    minOrder: 7_000_000,
    benefits: [],
  },
].map((tier) => ({ ...tier, benefits: membershipBenefits(tier as MembershipTier) })) as MembershipTier[];

export interface MembershipVoucher {
  voucher_id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_discount_amount: number | null;
  start_date: string;
  expiry_date: string;
  state: "available" | "used" | "expired" | "upcoming";
  eligible_tiers?: MembershipTierId[];
  is_birthday?: boolean;
}

export interface MembershipNotification {
  booking_id?: number | null;
  voucher_id?: number | null;
  notification_id: number;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export interface MembershipRewardItem {
  minOrder?: number;
  validityDays?: number;
  id: string;
  title: string;
  category: string;
  pointsCost: number;
  imageUrl: string;
  description: string;
  valueVnd?: number;
}

export const DEFAULT_MEMBERSHIP_REWARDS: MembershipRewardItem[] = [
  { id: "tour-voucher-100k", title: "Voucher tour 100.000đ", category: "Voucher tour", pointsCost: 100, valueVnd: 100_000,
    imageUrl: "/images/shared/travel-cover.png", description: "Giảm 100.000đ tiền tour cho một đơn từ 500.000đ. Có hiệu lực 12 tháng; không quy đổi thành tiền mặt." },
  { id: "tour-voucher-500k", title: "Voucher tour 500.000đ", category: "Voucher tour", pointsCost: 500, valueVnd: 500_000,
    imageUrl: "/images/shared/travel-cover.png", description: "Giảm 500.000đ tiền tour cho một đơn từ 2.500.000đ. Có hiệu lực 12 tháng; không quy đổi thành tiền mặt." },
  { id: "tour-discount-voucher-1m", title: "Voucher tour 1.000.000đ", category: "Voucher tour", pointsCost: 1000, valueVnd: 1_000_000,
    imageUrl: "/images/shared/travel-cover.png", description: "Giảm 1.000.000đ tiền tour cho một đơn từ 5.000.000đ. Có hiệu lực 12 tháng; không quy đổi thành tiền mặt." },
];

export interface MembershipSummary {
  tier: MembershipTier;
  tiers: MembershipTier[];
  cycleStart: string | null;
  cycleEnd: string | null;
  spending: number;
  points: number;
  pointsBalance?: number;
  pointsHeld?: number;
  pointsDebt?: number;
  pointTransactions?: MembershipPointTransaction[];
  programVersion?: number;
  nextTier: MembershipTier | null;
  toNextTier: number;
  toRetainTier: number;
  progress: number;
  vouchers: MembershipVoucher[];
  notifications: MembershipNotification[];
  history: {
    bookingId: number;
    tourName: string;
    completedAt: string;
    amount: number;
    points: number;
  }[];
  cycles: {
    start: string;
    end: string;
    spending: number;
    tier: MembershipTierId;
  }[];
  rewards?: MembershipRewardItem[];
}

export interface MembershipAdminList {
  rewards?: MembershipRewardItem[];
  tierCounts?: Partial<Record<MembershipTierId, number>>;
  programVersion?: number;
  items: {
    userId: number;
    name: string;
    email: string;
    tier: string;
    spending: number;
    cycleEnd: string | null;
    voucherCount: number;
    phone: string | null;
    bookingCount: number;
    pointsBalance?: number;
  }[];
  total: number;
  page: number;
  tiers: MembershipTier[];
  issued: number;
  used: number;
  discountTotal: number;
  memberTotal: number;
}

export interface MembershipBookingSnapshot {
  programVersion?: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  tier: MembershipTierId;
  name: string;
  pointMultiplier: number;
  priorityReservation: boolean;
  tourDiscountPercent: number;
  serviceDiscountPercent: number;
  tourDiscount: number;
  serviceDiscount: number;
  voucherDiscount: number;
  originalAdultPrice?: number;
  originalChildPrice?: number;
  promoType?: 'flash_deal' | 'schedule_promotion' | null;
  promoTitle?: string | null;
  promoDiscount?: number;
  promoGift?: string | null;
}

export function membershipBenefits(tier: MembershipTier): string[] {
  return [
    ...(tier.tourDiscountPercent ? [`Giảm ${tier.tourDiscountPercent}% giá tour`] : []),
    `Tích điểm ×${tier.pointMultiplier.toLocaleString("vi-VN")}`,
    ...(tier.birthdayVoucherAmount ? [`Voucher sinh nhật ${tier.birthdayVoucherAmount.toLocaleString("vi-VN")}đ`] : []),
    ...(tier.serviceDiscountPercent ? [`Giảm ${tier.serviceDiscountPercent}% dịch vụ đi kèm`] : []),
    ...(tier.priorityReservation ? ["Ưu tiên xử lý yêu cầu giữ chỗ"] : []),
    ...(tier.id !== "bronze" ? [`Voucher thăng hạng ${tier.discountType === "percentage" ? `${tier.discountValue}% (tối đa ${tier.maxDiscount.toLocaleString("vi-VN")}đ)` : `${tier.discountValue.toLocaleString("vi-VN")}đ`}, đơn từ ${tier.minOrder.toLocaleString("vi-VN")}đ`] : []),
  ];
}

export interface MembershipPointTransaction {
  id: number;
  bookingId: number | null;
  kind: string;
  points: number;
  reserved: number;
  description: string;
  createdAt: string;
}

export const MEMBERSHIP_POINTS_POLICY = {
  earningBaseVnd: 100_000,
  valueVnd: 1_000,
  maxPaymentPercent: 30,
  expiryMonths: null,
  cycleMonths: 12,
} as const;

export function maxBookingPoints(amountAfterDiscounts: number, availablePoints: number) {
  if (!Number.isFinite(amountAfterDiscounts) || !Number.isFinite(availablePoints)) return 0;
  return Math.max(0, Math.min(Math.floor(availablePoints), Math.floor(Math.max(0, amountAfterDiscounts) * MEMBERSHIP_POINTS_POLICY.maxPaymentPercent / 100 / MEMBERSHIP_POINTS_POLICY.valueVnd)));
}

export function membershipEarnedPoints(amount: number, multiplier: number) {
  return Math.floor(Math.max(0, amount) * Math.round(multiplier * 10) / (MEMBERSHIP_POINTS_POLICY.earningBaseVnd * 10));
}

export function membershipReschedulePrice(gross: number, discount: number, activePoints: number) {
  const otherDiscount = Math.max(0, discount - activePoints * MEMBERSHIP_POINTS_POLICY.valueVnd);
  const afterOtherDiscounts = Math.max(0, gross - otherDiscount);
  const pointsUsed = maxBookingPoints(afterOtherDiscounts, activePoints);
  const pointsDiscount = pointsUsed * MEMBERSHIP_POINTS_POLICY.valueVnd;
  return { pointsUsed, pointsDiscount, pointsReturned: activePoints - pointsUsed, discount: otherDiscount + pointsDiscount, cash: afterOtherDiscounts - pointsDiscount };
}

export function membershipPrice(tier: MembershipTier | null, subtotal: number, servicesTotal: number, voucherDiscount = 0) {
  const tourDiscount = Math.round(Math.max(0, subtotal - voucherDiscount) * (tier?.tourDiscountPercent ?? 0) / 100 / 1000) * 1000;
  const serviceDiscount = Math.round(servicesTotal * (tier?.serviceDiscountPercent ?? 0) / 100 / 1000) * 1000;
  return { tourDiscount, serviceDiscount };
}

export function membershipDiscount(
  voucher: {
    discount_type: string;
    discount_value: number;
    min_order_value: number;
    max_discount_amount: number | null;
  },
  amount: number,
): number {
  if (
    !Number.isFinite(amount) ||
    amount < voucher.min_order_value ||
    amount <= 0
  )
    return 0;
  let discount =
    voucher.discount_type === "percentage"
      ? (amount * voucher.discount_value) / 100
      : voucher.discount_value;
  if (
    voucher.discount_type === "percentage" &&
    voucher.max_discount_amount !== null
  )
    discount = Math.min(discount, voucher.max_discount_amount);
  return Math.min(amount, Math.round(Math.max(0, discount) / 1000) * 1000);
}
