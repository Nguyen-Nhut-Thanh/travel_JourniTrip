"use client";

import { useMemo, useState } from "react";
import { Calculator, Sparkles, TrendingUp } from "lucide-react";
import type { MembershipTier } from "shared";
import { formatVND } from "@/lib/utils/currency";

const QUICK_SPENDS = [
  { label: "10 Tr", value: 10_000_000 },
  { label: "30 Tr", value: 30_000_000 },
  { label: "50 Tr", value: 50_000_000 },
  { label: "100 Tr", value: 100_000_000 },
  { label: "150 Tr", value: 150_000_000 },
];

export function AdminMembershipSimulator({
  tiers,
}: {
  tiers: MembershipTier[];
}) {
  const [spend, setSpend] = useState<number>(50_000_000);

  // 100.000 VNĐ chi tiêu cơ sở = 10 Điểm thưởng (Pts)
  const basePts = useMemo(() => Math.floor((spend / 100_000) * 10), [spend]);

  const tierStyles: Record<
    string,
    { border: string; bg: string; badge: string; text: string }
  > = {
    bronze: {
      border: "border-slate-200",
      bg: "bg-slate-50/70",
      badge: "bg-slate-200 text-slate-700 border-slate-300",
      text: "text-slate-800",
    },
    silver: {
      border: "border-slate-300",
      bg: "bg-slate-100/60",
      badge: "bg-slate-200 text-slate-700 border-slate-300",
      text: "text-slate-800",
    },
    gold: {
      border: "border-amber-300 shadow-amber-500/10",
      bg: "bg-gradient-to-b from-amber-50/70 to-white",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      text: "text-amber-900",
    },
    platinum: {
      border: "border-sky-300 shadow-sky-500/10",
      bg: "bg-gradient-to-b from-sky-50/70 to-white",
      badge: "bg-sky-100 text-sky-800 border-sky-300",
      text: "text-sky-950",
    },
    diamond: {
      border: "border-purple-300 shadow-purple-500/10",
      bg: "bg-gradient-to-b from-purple-50/70 to-white",
      badge: "bg-purple-100 text-purple-800 border-purple-300",
      text: "text-purple-950",
    },
  };

  return (
    <section className="rounded-[14px] border border-[#e1edfc] bg-white p-5 sm:p-6 shadow-sm space-y-5">
      {/* Header & Simulated Spend Display */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#075bff] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60 mb-2">
            <Calculator size={13} />
            <span>Công Cụ Kiểm Thử Tích Điểm Thưởng</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#07123e] tracking-tight">
            Bộ Mô Phỏng Tích Điểm Thưởng (Admin Simulator)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kéo thanh trượt để kiểm tra ngay số điểm Pts và quyền lợi tiết kiệm khách hàng nhận được ở từng hạng thẻ theo mức chi tiêu giả định.
          </p>
        </div>

        <div className="px-5 py-3 rounded-xl border border-blue-200 bg-blue-50/70 text-right shrink-0">
          <span className="text-[11px] font-medium text-slate-500 block">
            Mức chi tiêu giả định
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#075bff]">
            {formatVND(spend)}
          </span>
        </div>
      </div>

      {/* Slider & Quick Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 mr-1">Mốc nhanh:</span>
            {QUICK_SPENDS.map((q) => (
              <button
                key={q.value}
                type="button"
                onClick={() => setSpend(q.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  spend === q.value
                    ? "bg-[#075bff] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Tối đa: 200.000.000 đ
          </span>
        </div>

        <div className="relative pt-1">
          <input
            type="range"
            min={1_000_000}
            max={200_000_000}
            step={1_000_000}
            value={spend}
            onChange={(e) => setSpend(Number(e.target.value))}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#075bff]"
            aria-label="Thanh trượt mức chi tiêu giả định"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
            <span>1.000.000 đ</span>
            <span>50.000.000 đ</span>
            <span>100.000.000 đ</span>
            <span>150.000.000 đ</span>
            <span>200.000.000 đ</span>
          </div>
        </div>
      </div>

      {/* 5 Simulated Output Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
        {tiers.map((tier) => {
          const earned = Math.round(basePts * tier.pointMultiplier);
          const bonus = earned - basePts;
          const tourSaving = Math.round((spend * tier.tourDiscountPercent) / 100);
          const style = tierStyles[tier.id] || tierStyles.bronze;

          return (
            <div
              key={tier.id}
              className={`rounded-xl border ${style.border} ${style.bg} p-4 flex flex-col justify-between shadow-xs transition-all hover:shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={`text-xs font-bold ${style.text}`}>
                    {tier.name}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${style.badge}`}
                  >
                    {tier.pointMultiplier.toLocaleString("vi-VN", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                    × Pts
                  </span>
                </div>

                <div className="my-1.5">
                  <span className="text-2xl font-black text-[#07123e]">
                    {earned.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 ml-1">Pts</span>
                </div>

                <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                  <TrendingUp size={12} />
                  <span>
                    {bonus > 0
                      ? `+${bonus.toLocaleString("vi-VN")} Pts thưởng`
                      : "Điểm cơ sở"}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-200/80 space-y-1 text-[11px] text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Giảm giá tour:</span>
                  <span className="font-bold text-[#07123e]">
                    {tier.tourDiscountPercent > 0
                      ? `-${formatVND(tourSaving)}`
                      : "Không giảm"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Voucher SN:</span>
                  <span className="font-semibold text-slate-700">
                    {formatVND(tier.birthdayVoucherAmount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

