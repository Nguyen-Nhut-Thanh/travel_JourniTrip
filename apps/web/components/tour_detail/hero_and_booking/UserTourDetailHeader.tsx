"use client";

import FavoriteButton from "@/components/tour_cards/elements/UserFavoriteButton";
import { useTourFavorite } from "@/lib/hooks/useTourFavorite";
import { useToast } from "@/lib/notifications/useToast";
import { Check, ChevronRight, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { TourDetailHeroProps } from "shared";

export default function TourDetailHeader({ tour }: TourDetailHeroProps) {
  const toast = useToast();
  const { favorite, pending, handleFavoriteClick } = useTourFavorite(tour.tour_id, tour.name);
  const [copied, setCopied] = useState(false);

  const handleShareClick = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Đã chép liên kết tour vào bộ nhớ tạm!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép liên kết. Vui lòng thử lại.");
    }
  };

  return (
    <header className="min-w-0 space-y-4">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 sm:text-sm">
        <Link href="/" className="shrink-0 transition hover:text-sky-600">Trang chủ</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <Link href="/tours" className="shrink-0 transition hover:text-sky-600">Tour</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="min-w-0 truncate font-bold text-slate-900">{tour.name}</span>
      </nav>

      <div className="flex w-full items-start justify-between gap-3 sm:gap-6">
        <h1 className="min-w-0 flex-1 break-words text-xl font-bold leading-snug text-[#07123e] sm:text-2xl lg:text-[28px]">
          {tour.name}
        </h1>

        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <FavoriteButton
            active={favorite}
            loading={pending}
            onClick={handleFavoriteClick}
            className={`flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200/90 bg-white shadow-xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 disabled:opacity-50 ${
              favorite
                ? "border-rose-200 bg-rose-50/60 text-rose-600"
                : "text-slate-700"
            }`}
            iconClassName="h-5 w-5"
          />
          <button
            type="button"
            onClick={handleShareClick}
            aria-label={copied ? "Đã sao chép liên kết tour" : "Chia sẻ tour"}
            title={copied ? "Đã sao chép liên kết tour" : "Chia sẻ tour"}
            className="flex h-10 items-center gap-2 rounded-[12px] border border-slate-200/90 bg-white px-3.5 shadow-xs transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-600">Đã chép</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 text-slate-700" />
                <span className="text-sm font-semibold text-[#075bff]">Chia sẻ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
