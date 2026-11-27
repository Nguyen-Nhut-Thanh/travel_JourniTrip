"use client";

import { CheckCircle2, Eye } from "lucide-react";
import {
  membershipBenefits,
  type MembershipTier,
  type MembershipTierId,
} from "shared";
import { formatVND } from "@/lib/utils/currency";

interface TierVisual {
  subtitle: string;
  cardTag: string;
  cardClass: string;
  tagClass: string;
  multiplierColor: string;
  spendColor: string;
  checkColor: string;
  btnClass: string;
}

const TIER_VISUALS: Record<MembershipTierId, TierVisual> = {
  bronze: {
    subtitle: "CLASSIC EXPLORER",
    cardTag: "CLASSIC EXPLORER",
    cardClass:
      "bg-gradient-to-b from-[#161c28] via-[#121722] to-[#0c1017] border-slate-700/60 shadow-md text-white",
    tagClass: "border-slate-600/80 bg-slate-800/80 text-slate-300",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-400",
    btnClass: "border-white/15 bg-white/10 hover:bg-white/20 text-white",
  },
  silver: {
    subtitle: "EXPLORER SILVER",
    cardTag: "EXPLORER SILVER",
    cardClass:
      "bg-gradient-to-b from-[#243042] via-[#1d2737] to-[#151d2a] border-slate-600/60 shadow-md text-white",
    tagClass: "border-slate-500/80 bg-slate-700/80 text-slate-200",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-400",
    btnClass: "border-white/15 bg-white/10 hover:bg-white/20 text-white",
  },
  gold: {
    subtitle: "PRESTIGE GOLD",
    cardTag: "PRESTIGE GOLD",
    cardClass:
      "bg-gradient-to-b from-[#8c440b] via-[#9a4b0d] to-[#592705] border-amber-500/60 shadow-lg shadow-amber-950/25 text-white",
    tagClass: "border-amber-400/50 bg-amber-900/60 text-amber-200",
    multiplierColor: "text-amber-200",
    spendColor: "text-[#fde047]",
    checkColor: "text-amber-300",
    btnClass: "border-amber-300/40 bg-amber-600/35 hover:bg-amber-600/50 text-white",
  },
  platinum: {
    subtitle: "SIGNATURE PLATINUM",
    cardTag: "SIGNATURE PLATINUM",
    cardClass:
      "bg-gradient-to-b from-[#0d4f77] via-[#083a58] to-[#05263a] border-sky-500/60 shadow-lg shadow-sky-950/25 text-white",
    tagClass: "border-sky-400/50 bg-sky-900/60 text-sky-200",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-300",
    btnClass: "border-sky-300/40 bg-sky-600/35 hover:bg-sky-600/50 text-white",
  },
  diamond: {
    subtitle: "ROYAL DIAMOND",
    cardTag: "ROYAL DIAMOND",
    cardClass:
      "bg-gradient-to-b from-[#4a1078] via-[#350b57] to-[#200636] border-purple-500/60 shadow-lg shadow-purple-950/25 text-white",
    tagClass: "border-purple-400/50 bg-purple-900/60 text-purple-200",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-300",
    btnClass: "border-purple-300/40 bg-purple-600/35 hover:bg-purple-600/50 text-white",
  },
};

export function UserMembershipTierGrid({
  tiers,
  currentTierId,
  onPreviewTier,
}: {
  tiers: MembershipTier[];
  currentTierId: MembershipTierId;
  onPreviewTier: (id: MembershipTierId) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif text-2xl font-bold text-white sm:text-3xl">
          Năm Cấp Độ Đặc Quyền Xứng Tầm
        </h2>
        <p className="mt-1.5 text-xs text-slate-400 sm:text-sm">
          Chi tiêu hợp lệ trong chu kỳ 12 tháng; quyền lợi áp dụng tự động theo hạng lúc đặt tour.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {tiers.map((tier) => {
          const visual = TIER_VISUALS[tier.id] || TIER_VISUALS.bronze;
          const isCurrent = tier.id === currentTierId;

          return (
            <article
              key={tier.id}
              className={`relative rounded-[16px] border ${visual.cardClass} p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl ${
                isCurrent ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-[#050B14]" : ""
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#050B14] shadow">
                  Hạng của bạn
                </span>
              )}

              <div>
                {/* Header Tag & Multiplier */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[9.5px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${visual.tagClass}`}
                  >
                    {visual.cardTag}
                  </span>
                  <span className={`text-xs font-black ${visual.multiplierColor}`}>
                    Tích {tier.pointMultiplier.toFixed(1)}x
                  </span>
                </div>

                {/* Tier Name */}
                <h3 className="text-2xl font-black font-serif tracking-tight text-white my-2">
                  {tier.name}
                </h3>

                {/* Spend Threshold */}
                <div className="mt-2 pb-3 border-b border-white/15">
                  <span className="text-[10px] text-white/70 block uppercase tracking-wider font-semibold">
                    Ngưỡng chi tiêu kích hoạt
                  </span>
                  <span className={`text-sm font-extrabold ${visual.spendColor}`}>
                    {tier.threshold === 0
                      ? "Miễn phí / Mặc định"
                      : "Từ " + formatVND(tier.threshold)}
                  </span>
                </div>

                {/* Perks Bullet List */}
                <ul className="mt-4 space-y-2 text-xs text-white/90">
                  {membershipBenefits(tier).map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] leading-[1.45]">
                      <CheckCircle2
                        size={14}
                        className={`${visual.checkColor} shrink-0 mt-0.5`}
                      />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-3 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => onPreviewTier(tier.id)}
                  className={`w-full py-2.5 px-3 rounded-[12px] border ${visual.btnClass} font-[650] text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer`}
                >
                  <Eye size={14} />
                  <span>Xem thẻ 3D</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
