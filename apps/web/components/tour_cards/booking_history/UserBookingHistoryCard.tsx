"use client";

import { openSupportChat } from "@/lib/chat/support";
import { formatVND } from "@/lib/utils/currency";
import { normalizeImageSrc, PLACEHOLDER_IMAGE } from "@/lib/utils/images";
import { AdminRowActions } from "@/components/common/admin_shared/tables/AdminRowActions";
import { Tooltip } from "@/components/common/dialogs_and_feedback/dialogs/Tooltip";
import { CalendarDays, CheckCircle2, Clock, CreditCard, Eye, Globe2, Info, MapPin, MessageCircle, Plane, RotateCcw, Star, Users, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import type { BookingItemUI } from "shared";

interface BookingHistoryCardProps {
  item: BookingItemUI;
  rawBooking?: any;
  onReview?: (item: BookingItemUI) => void;
  onCancelRequest?: (rawBooking: any) => void;
}

export function BookingHistoryCard({ item, rawBooking, onReview, onCancelRequest }: BookingHistoryCardProps) {
  const imageSrc = normalizeImageSrc(item.image) || PLACEHOLDER_IMAGE;
  const waveId = `booking-history-wave-${useId().replace(/:/g, "")}`;
  const isCancelRequested = rawBooking?.status === "cancel_requested" || (item.status === "unknown" && item.statusText === "Đang yêu cầu hủy");
  const isCancellable = item.status !== "cancelled" && item.status !== "completed" && item.status !== "ongoing" && rawBooking?.status !== "no_show";
  const bookingDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : null;
  const isInternational = item.tourType === "outbound" || item.tourType === "international";
  const isYellowTag = Boolean(item.isCancelUnapproved);
  const isRefunded = item.statusText === "Đã hoàn tiền";
  const statusLabel = item.paymentStatus === "unpaid" && item.status === "upcoming" ? "Chờ thanh toán" : item.statusText;
  const infoRows = [
    { key: "location", icon: MapPin, label: "", value: item.location || "Chưa cập nhật điểm khởi hành", tone: "font-medium text-slate-500" },
    { key: "booked", icon: CalendarDays, label: "Đặt ngày:", value: bookingDate || "Chưa cập nhật", tone: "font-medium text-blue-700" },
    { key: "departure", icon: CalendarDays, label: "Khởi hành:", value: `${item.startDate} – ${item.endDate}`, tone: "font-bold text-blue-700" },
    { key: "duration", icon: Clock, label: "Thời gian:", value: item.duration || "Đang cập nhật", tone: "font-bold text-slate-800" },
    { key: "passengers", icon: Users, label: "Hành khách:", value: item.passengers, tone: "font-bold text-slate-800" },
  ];
  const statusClass = isYellowTag
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : isRefunded
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : item.status === "cancelled"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : item.status === "completed"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : item.status === "ongoing"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : item.paymentStatus === "unpaid"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-sky-200 bg-sky-50 text-sky-700";
  const StatusIcon = isYellowTag
    ? Clock
    : isRefunded
      ? RotateCcw
      : item.status === "cancelled"
        ? XCircle
        : item.status === "completed"
          ? CheckCircle2
          : Clock;

  return (
    <article className="group relative flex w-full min-w-0 flex-col gap-3.5 overflow-visible rounded-[14px] border border-[#e1edfc] bg-white p-3.5 shadow-sm transition-all duration-200 hover:border-[#b9d7fb] hover:shadow-md hover:z-20 md:flex-row md:gap-3.5">
      <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
        <defs>
          <clipPath id={`${waveId}-main`} clipPathUnits="objectBoundingBox">
            <path d="M .065 0 L .90 0 Q .97 0 .98 .07 C 1 .32 .99 .72 .95 .89 C .93 .96 .82 .98 .65 .97 C .42 .95 .20 .98 .065 .99 Q 0 .99 0 .92 L 0 .07 Q 0 0 .065 0 Z" />
          </clipPath>
          <clipPath id={`${waveId}-back`} clipPathUnits="objectBoundingBox">
            <path d="M .065 0 L .91 0 Q .98 0 .99 .07 C 1.01 .36 1 .76 .96 .94 C .94 .99 .84 1 .64 .99 L .065 1 Q 0 1 0 .93 L 0 .07 Q 0 0 .065 0 Z" />
          </clipPath>
        </defs>
      </svg>

      <div className="relative h-[190px] w-full shrink-0 sm:h-[210px] md:h-[230px] md:w-[36%]">
        <div
          className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-100/85 to-sky-200/75"
          style={{ clipPath: `url(#${waveId}-back)`, WebkitClipPath: `url(#${waveId}-back)` }}
        />
        <Link
          href={`/booking/${item.id}`}
          className="absolute inset-0 block overflow-hidden bg-sky-100"
          style={{ clipPath: `url(#${waveId}-main)`, WebkitClipPath: `url(#${waveId}-main)` }}
        >
          <Image
            src={imageSrc}
            alt={item.name}
            fill
            className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 325px"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
        </Link>
        <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-900/45 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-md">
          {isInternational ? <Globe2 className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
          {isInternational ? "Nước ngoài" : "Trong nước"}
        </span>
      </div>

      <div className="relative z-10 grid min-w-0 flex-1 grid-rows-[36px_116px_auto] gap-2 py-1">
        <div className="flex h-9 min-w-0 items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-extrabold leading-7 tracking-tight text-[#0b1747] transition-colors group-hover:text-[#075bff] md:text-lg">
              <Link href={`/booking/${item.id}`} title={item.name} className="block truncate">{item.name}</Link>
            </h3>
          </div>
          <div className="relative z-20 shrink-0">
            <AdminRowActions
              label={`Thao tác với đơn đặt tour #${item.id}`}
              orientation="horizontal"
              actions={[
                { label: "Xem chi tiết", icon: <Eye size={16} />, href: `/booking/${item.id}`, access: "view" },
                ...(item.status === "completed" || item.status === "cancelled" ? [{ label: "Đặt lại tour", icon: <RotateCcw size={16} />, href: `/tours/${item.tourId}`, access: "view" as const }] : []),
                { label: "Liên hệ hỗ trợ", icon: <MessageCircle size={16} />, onClick: () => openSupportChat({ booking_id: item.id }), access: "view" },
                ...(item.paymentStatus === "unpaid" && item.status !== "cancelled" ? [{ label: "Thanh toán ngay", icon: <CreditCard size={16} />, href: `/booking/${item.id}`, access: "view" as const }] : []),
                ...(item.status === "completed" && onReview ? [{ label: item.review ? `Xem đánh giá (${item.review.rating}★)` : "Đánh giá", icon: <Star size={16} />, onClick: () => onReview(item), access: "view" as const }] : []),
                ...(isCancellable && onCancelRequest ? [isCancelRequested
                  ? { label: "Đang chờ duyệt hủy", icon: <Clock size={16} />, disabled: true, title: "Yêu cầu hủy của bạn đang được ban quản lý xem xét", access: "view" as const }
                  : { label: "Yêu cầu hủy tour", icon: <XCircle size={16} />, onClick: () => onCancelRequest(rawBooking || item), danger: true, access: "view" as const }] : []),
              ]}
            />
          </div>
        </div>

        <div className="grid h-[116px] min-w-0 auto-rows-[20px] gap-y-1">
          {infoRows.map(({ key, icon: Icon, label, value, tone }) => (
            <div key={key} className="grid h-5 min-w-0 grid-cols-[16px_70px_minmax(0,1fr)] items-center gap-x-2">
              <Icon className="h-4 w-4 text-slate-900" />
              {label && <span className="truncate text-[11px] font-medium leading-5 text-slate-500">{label}</span>}
              <span title={value} className={`min-w-0 truncate text-xs leading-5 ${tone} ${label ? "" : "col-span-2"}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="grid min-w-0 grid-cols-2 items-end gap-x-3 gap-y-1 pt-1">
          <span title="Tổng tiền thanh toán" className="col-span-2 block truncate text-[10px] font-medium leading-tight text-slate-500">Tổng tiền thanh toán</span>
          <div className="flex min-w-0 items-center rounded-xl border border-[#e1edfc] bg-[#f8fbff] px-3.5 py-1.5">
            <span title={formatVND(item.price)} className="block min-w-0 w-full truncate text-base font-extrabold leading-tight tracking-tight text-[#075bff]">{formatVND(item.price)}</span>
          </div>
          {(() => {
            const badgeContent = (
              <div
                tabIndex={item.statusReason ? 0 : undefined}
                className={`inline-flex min-w-0 w-full items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all select-none ${
                  item.statusReason ? "cursor-help hover:brightness-95" : ""
                } ${statusClass}`}
              >
                <StatusIcon className="h-3 w-3 shrink-0" />
                <span title={statusLabel} className="min-w-0 truncate">{statusLabel}</span>
                {item.status === "ongoing" && <Plane className="h-3 w-3 -rotate-12 shrink-0" />}
                {item.statusReason && <Info className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />}
              </div>
            );

            if (!item.statusReason) return badgeContent;

            return (
              <Tooltip
                trigger={badgeContent}
                placement="top"
                align="right"
                className="inline-flex min-w-0 w-full"
                contentClassName="!min-w-0 w-max max-w-[300px] p-3 text-xs shadow-xl border border-slate-200 bg-white rounded-2xl z-50 text-left pointer-events-none"
                content={
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px]">
                      <Info className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>{isYellowTag ? "Yêu cầu hủy không được duyệt" : "Lý do / Ghi chú"}</span>
                    </div>
                    <p className="text-[12.5px] text-slate-700 leading-snug font-medium">
                      {item.statusReason}
                    </p>
                  </div>
                }
              />
            );
          })()}
        </div>
      </div>
    </article>
  );
}
