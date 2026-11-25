"use client";

import { useState } from "react";
import {
  Check,
  Crown,
  Edit3,
  Gem,
  Plane,
  Shield,
  Sparkles,
} from "lucide-react";
import type { MembershipTier } from "shared";
import { formatVND } from "@/lib/utils/currency";
import { AdminMembershipTierEditDialog } from "./AdminMembershipTierEditDialog";

interface TierVisualMeta {
  subtitle: string;
  cardClass: string;
  badgeClass: string;
  accentText: string;
  icon: typeof Crown;
}

const TIER_VISUALS: Record<string, TierVisualMeta> = {
  bronze: {
    subtitle: "STANDARD MEMBER",
    cardClass:
      "bg-gradient-to-br from-[#1e293b] via-[#334155] to-[#0f172a] text-white border border-slate-700/60 shadow-lg",
    badgeClass: "bg-slate-700/70 text-slate-200 border-slate-600",
    accentText: "text-slate-300",
    icon: Shield,
  },
  silver: {
    subtitle: "EXPLORER SILVER",
    cardClass:
      "bg-gradient-to-br from-[#475569] via-[#64748b] to-[#334155] text-white border border-slate-400/40 shadow-lg",
    badgeClass: "bg-slate-200/20 text-white border-slate-300/40",
    accentText: "text-slate-200",
    icon: Sparkles,
  },
  gold: {
    subtitle: "PRESTIGE GOLD",
    cardClass:
      "bg-gradient-to-br from-[#92400e] via-[#b45309] to-[#78350f] text-white border border-amber-400/50 shadow-lg shadow-amber-900/10",
    badgeClass: "bg-amber-400/20 text-amber-200 border-amber-400/40",
    accentText: "text-amber-200",
    icon: Crown,
  },
  platinum: {
    subtitle: "SIGNATURE PLATINUM",
    cardClass:
      "bg-gradient-to-br from-[#0f172a] via-[#075985] to-[#0c4a6e] text-white border border-sky-400/50 shadow-lg shadow-sky-900/10",
    badgeClass: "bg-sky-400/20 text-sky-200 border-sky-400/40",
    accentText: "text-sky-200",
    icon: Gem,
  },
  diamond: {
    subtitle: "ROYAL DIAMOND",
    cardClass:
      "bg-gradient-to-br from-[#3b0764] via-[#581c87] to-[#1e1b4b] text-white border border-purple-400/50 shadow-lg shadow-purple-900/10",
    badgeClass: "bg-purple-400/20 text-purple-200 border-purple-400/40",
    accentText: "text-purple-200",
    icon: Gem,
  },
};

export function AdminMembershipTierGrid({
  tiers,
  disabled,
  onUpdateTier,
}: {
  tiers: MembershipTier[];
  disabled: boolean;
  onUpdateTier: (updated: MembershipTier) => void;
}) {
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#07123e] tracking-tight">
            Năm Cấp Độ Đặc Quyền Xứng Tầm
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhấn "Chỉnh Sửa Hạng" trên từng thẻ để thay đổi ngưỡng chi tiêu, hệ số nhân điểm và danh sách đặc quyền thực tế.
          </p>
        </div>
      </div>

      {/* 5 Metallic Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-stretch">
        {tiers.map((tier) => {
          const visual = TIER_VISUALS[tier.id] || TIER_VISUALS.bronze;
          const TierIcon = visual.icon;

          return (
            <div
              key={tier.id}
              className={`rounded-[16px] ${visual.cardClass} p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div>
                {/* Header Tag & Multiplier */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[9.5px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${visual.badgeClass}`}
                  >
                    {visual.subtitle}
                  </span>
                  <span className="text-xs font-black text-amber-300">
                    Tích {tier.pointMultiplier.toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}×
                  </span>
                </div>

                {/* Tier Name & Icon */}
                <div className="flex items-center justify-between gap-2 my-2">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {tier.name}
                  </h3>
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white">
                    <TierIcon size={18} />
                  </div>
                </div>

                {/* Min Spend Threshold */}
                <div className="mt-2 pb-3 border-b border-white/15">
                  <span className="text-[10px] text-white/70 block uppercase tracking-wider font-semibold">
                    Ngưỡng chi tiêu kích hoạt
                  </span>
                  <span className="text-base font-extrabold text-amber-200">
                    {tier.threshold > 0
                      ? `Từ ${formatVND(tier.threshold)}`
                      : "Mặc định tài khoản"}
                  </span>
                </div>

                {/* Key Metrics Quick View */}
                <div className="grid grid-cols-2 gap-2 my-3 text-[11px]">
                  <div className="rounded-lg bg-white/10 p-2 text-center">
                    <span className="block text-[10px] text-white/60">Giảm tour</span>
                    <span className="font-extrabold text-white">
                      {tier.tourDiscountPercent > 0
                        ? `Giảm ${tier.tourDiscountPercent}%`
                        : "Giá chuẩn"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white/10 p-2 text-center">
                    <span className="block text-[10px] text-white/60">Voucher SN</span>
                    <span className="font-extrabold text-white">
                      {tier.birthdayVoucherAmount > 0
                        ? formatVND(tier.birthdayVoucherAmount)
                        : "Không có"}
                    </span>
                  </div>
                </div>

                {/* Perks Bullet List */}
                <div className="mt-3 space-y-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-white/70 block">
                    Đặc quyền tiêu biểu
                  </span>
                  <ul className="space-y-1.5 text-xs text-white/90">
                    {(tier.benefits || []).slice(0, 4).map((benefit, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[11px] leading-[1.4]">
                        <Check size={13} className="text-emerald-300 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Edit Button */}
              <div className="mt-5 pt-3 border-t border-white/15">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setEditingTier(tier)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Edit3 size={14} />
                  <span>Chỉnh Sửa Hạng</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog Modal */}
      {editingTier && (
        <AdminMembershipTierEditDialog
          tier={editingTier}
          onClose={() => setEditingTier(null)}
          onSave={(updated) => {
            onUpdateTier(updated);
            setEditingTier(null);
          }}
        />
      )}
    </section>
  );
}

