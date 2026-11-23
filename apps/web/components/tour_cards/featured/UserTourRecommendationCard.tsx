"use client";

import {
  CalendarDays,
  ArrowRight,
  MapPin,
  Users,
  Star,
  Flame,
  ImageIcon,
  MoreHorizontal,
  MessageSquare,
  Calculator,
} from "lucide-react";
import FavoriteButton from "@/components/tour_cards/elements/UserFavoriteButton";
import TransportIcon from "@/components/tour_cards/elements/UserTransportIcon";
import { useEffect, useRef, useState } from "react";

export type TourRecommendationData = {
  id: number;
  title: string;
  url: string;
  image_url?: string;
  price?: number;
  duration?: string;
  schedule_id?: number;
  departure_date?: string;
  remaining_seats?: number;
  original_price?: number;
  summary?: string;
  destination?: string;
  transport?: string;
  meals?: string;
  hotel?: string;
  rating?: number;
  rating_count?: number;
  category?: string;
};

export type TourRecommendationCardProps = {
  tour: TourRecommendationData;
  favorite?: boolean;
  favoritePending?: boolean;
  onToggleFavorite?: () => void;
  error?: string;
  onAdvice?: () => void;
  onQuote?: () => void;
};

/** Hiển thị khung giới thiệu tour dùng chung cho chat hỗ trợ và chatbot. */
export function TourRecommendationCard({
  tour: context,
  favorite = false,
  favoritePending = false,
  onToggleFavorite,
  error,
  onAdvice,
  onQuote,
}: TourRecommendationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const href = context.schedule_id
    ? `${context.url}?scheduleId=${context.schedule_id}`
    : context.url;

  const discount =
    context.original_price &&
    context.price !== undefined &&
    context.original_price > context.price
      ? Math.round((1 - context.price / context.original_price) * 100)
      : 0;

  const departureDate = context.departure_date
    ? new Date(context.departure_date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "Chưa có lịch";
  const duration = context.duration?.replace(/\s*ngày\s*/gi, "N").replace(/\s*đêm\s*/gi, "Đ") || "—";

  return (
    <article className="w-full min-w-0 max-w-[420px] text-[#17264f]">
      <div className="relative flex overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_6px_20px_-6px_#bad7ff] transition hover:shadow-md">
        {/* Cột trái: Ảnh bìa tour */}
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Xem tour ${context.title}`}
          className="relative w-[38%] min-w-[125px] max-w-[155px] shrink-0 overflow-hidden bg-blue-50"
        >
          {context.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={context.image_url}
              alt={context.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-blue-200">
              <ImageIcon size={32} />
            </div>
          )}

          {/* Huy hiệu HOT */}
          {discount > 0 && (
            <span className="absolute left-2 top-2 flex items-center gap-0.5 rounded-full bg-[#ff5575] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
              <Flame size={11} fill="currentColor" />
              HOT
            </span>
          )}

          {/* Lớp phủ chân ảnh: Điểm đến & Đánh giá */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent p-2 text-white">
            {context.destination && (
              <span className="flex items-center gap-0.5 truncate text-[10px] font-semibold">
                <MapPin size={11} className="shrink-0" />
                <span className="truncate">{context.destination}</span>
              </span>
            )}
          </div>
        </a>

        {/* Cột phải: Nội dung chi tiết tour */}
        <div className="relative flex min-w-0 flex-1 flex-col justify-between p-2.5 sm:p-3">
          {/* Header thẻ: Danh mục & Nút yêu thích */}
          <div>
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#deebff] px-2 py-0.5 text-[10px] font-bold text-[#1475ff]">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{context.category || "Khám phá tour"}</span>
              </span>
              <div className="flex items-center gap-1">
                {onToggleFavorite && (
                  <FavoriteButton
                    active={favorite}
                    loading={favoritePending}
                    onClick={onToggleFavorite}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f0f1ff] text-[#2d4377] transition hover:bg-blue-100 cursor-pointer"
                    iconClassName="h-3 w-3"
                    label={favorite ? "Bỏ tour khỏi yêu thích" : "Lưu tour yêu thích"}
                  />
                )}
                {(onAdvice || onQuote) && (
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      aria-label="Tùy chọn tour"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen((prev) => !prev);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition cursor-pointer"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-7 z-40 w-28 rounded-xl border border-slate-200 bg-white p-1 shadow-lg text-xs">
                        {onAdvice && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuOpen(false);
                              onAdvice();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700 font-semibold transition cursor-pointer"
                          >
                            <MessageSquare size={13} className="text-blue-600 shrink-0" />
                            <span>Tư vấn</span>
                          </button>
                        )}
                        {onQuote && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenuOpen(false);
                              onQuote();
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition cursor-pointer"
                          >
                            <Calculator size={13} className="text-emerald-600 shrink-0" />
                            <span>Báo giá</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tên tour */}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={context.title}
              className="mt-1 line-clamp-2 [overflow-wrap:anywhere] text-xs sm:text-[13px] font-extrabold leading-snug tracking-tight text-[#17264f] hover:text-blue-600 transition-colors"
            >
              {context.title}
            </a>

            {/* Số chỗ còn lại & Đánh giá */}
            <div className="mt-1 grid min-w-0 grid-cols-2 text-[10px] text-[#7890b6]">
              <span className="flex min-w-0 items-center gap-1 pr-1">
                <Users size={11} className="shrink-0" />
                <span className="truncate">{context.remaining_seats !== undefined ? `Còn ${context.remaining_seats} chỗ` : "Chưa rõ số chỗ"}</span>
              </span>
              <span className="flex min-w-0 items-center gap-1 border-l border-blue-200 pl-2">
                <Star size={11} className="shrink-0 fill-amber-400 text-amber-400" />
                <span className="truncate">{context.rating_count && context.rating !== undefined ? `${context.rating.toFixed(1)}/5` : "Chưa đánh giá"}</span>
              </span>
            </div>

            {/* Phương tiện, ngày khởi hành & thời lượng */}
            <div className="mt-1.5 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center rounded-lg bg-[#f1f8ff] px-1.5 py-1.5 text-[10px] font-semibold text-[#4167a5]">
              <span title={context.transport || "Phương tiện theo lịch trình"} className="flex min-w-0 items-center justify-center px-1">
                <TransportIcon type={context.transport || ""} className="h-3.5 w-3.5 text-blue-600" />
              </span>
              <span title={`Khởi hành: ${departureDate}`} className="flex min-w-0 items-center justify-center gap-1 border-l border-[#b9d1f4] px-1">
                <CalendarDays size={11} className="shrink-0 text-blue-600" />
                <span className="truncate">{departureDate}</span>
              </span>
              <span title={context.duration} className="min-w-0 truncate border-l border-[#b9d1f4] px-1 text-center">{duration}</span>
            </div>
          </div>

          {/* Chân thẻ: Giá & Nút xem chi tiết */}
          <div className="mt-2 flex items-center justify-between gap-1.5 border-t border-slate-100 pt-1.5">
            <div className="min-w-0">
              {discount > 0 && context.original_price && (
                <div className="mb-1 flex items-center gap-1 text-[10px] leading-none">
                  <span className="truncate text-[#a7b9d7] line-through text-[9px]">
                    {context.original_price.toLocaleString("vi-VN")} đ
                  </span>
                  <span className="rounded-full bg-[#ff6685] px-1 py-0.2 text-[9px] font-bold text-white">
                    -{discount}%
                  </span>
                </div>
              )}
              {context.price !== undefined && (
                <p title={`${context.price.toLocaleString("vi-VN")} đ`} className="truncate text-sm font-extrabold tracking-tight text-[#ff375f] leading-none">
                  {context.price.toLocaleString("vi-VN")} đ
                </p>
              )}
            </div>

            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#1475ff] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-blue-600 active:scale-95"
            >
              <span>Xem chi tiết</span>
              <ArrowRight size={11} />
            </a>
          </div>

          {error && (
            <p role="alert" className="mt-1 text-[10px] text-rose-500">
              {error}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
