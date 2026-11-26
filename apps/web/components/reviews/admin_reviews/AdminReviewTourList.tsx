"use client";

import { useState } from "react";
import { ChevronDown, Clock3, MessageSquare, Star } from "lucide-react";
import { AdminPagination } from "@/components/common/admin_shared/tables/AdminPagination";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { getTourTypeLabel } from "@/lib/tours/admin/filters";
import { formatVND } from "@/lib/utils/currency";
import type { ReviewTourGroup } from "@/lib/reviews/admin/management";
import { ReviewTable, type ReviewTableProps } from "./AdminReviewTable";

type ReviewTourListProps = Omit<ReviewTableProps, "items"> & {
  groups: ReviewTourGroup[];
  searchTerm?: string;
};

export function ReviewTourList({
  groups,
  loading,
  currentPage = 1,
  totalPages = 1,
  totalItems = groups.length,
  pageSize = 10,
  onPageChange,
  searchTerm = "",
  ...actions
}: ReviewTourListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const columns = "grid grid-cols-[minmax(280px,2.5fr)_minmax(100px,1fr)_minmax(95px,1fr)_minmax(125px,1fr)_minmax(110px,1fr)_minmax(110px,1fr)_minmax(170px,1.2fr)_36px] items-center gap-4";

  if (loading || !groups.length) {
    return <ReviewTable items={[]} loading={loading} {...actions} />;
  }

  return (
    <section className="ui-review-management-tourGroups min-w-0 overflow-hidden rounded-[14px] border border-[#e1edfc] bg-white shadow-2xs" aria-label="Đánh giá theo tour">
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          <div className={`${columns} border-b border-[#edf2fb] bg-slate-50/75 px-[18px] py-4 text-[11px] font-bold uppercase text-[#7187a9]`}>
            <span>Thông tin tour</span>
            <span>Loại tour</span>
            <span>Thời gian</span>
            <span>Giá cơ bản</span>
            <span>Trạng thái tour</span>
            <span>Sao trung bình</span>
            <span>Đánh giá</span>
            <span className="sr-only">Mở danh sách đánh giá</span>
          </div>
          {groups.map(({ tourId, name, code, tour, reviews, averageRating }) => {
            const isExpanded = Boolean(searchTerm.trim()) || expanded.has(tourId);
            const pending = reviews.filter(review => review.status === 0).length;
            return (
              <div key={tourId} className="border-b-2 border-[#b8cff0] last:border-b-0">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`review-tour-${tourId}`}
                  aria-label={`${isExpanded ? "Thu gọn" : "Xem"} ${reviews.length} đánh giá của ${name}`}
                  className={`${columns} w-full cursor-pointer px-[18px] py-[18px] text-left text-xs transition-colors hover:bg-[#f8fbff] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 ${isExpanded ? "bg-[#f8fbff]" : ""}`}
                  onClick={() => setExpanded(previous => {
                    const next = new Set(previous);
                    if (next.has(tourId)) next.delete(tourId);
                    else next.add(tourId);
                    return next;
                  })}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ImageWithFallback src={tour?.image_url || undefined} alt={name} className="h-[54px] w-[68px] shrink-0 rounded-lg bg-slate-100 object-cover" />
                    <span className="min-w-0">
                      <strong title={name} className="mb-1 block truncate text-[13px] font-bold text-[#0b1747]">{name}</strong>
                      <span className="block font-mono text-[11px] text-[#7387aa]">Mã: {code || "—"}</span>
                      {tour?.summary && <span title={tour.summary} className="mt-1 block truncate text-[11px] text-[#7387aa]">{tour.summary}</span>}
                    </span>
                  </span>
                  <span><span className="inline-block rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#075bff]">{getTourTypeLabel(tour?.tour_type)}</span></span>
                  <span className="inline-flex items-center gap-1.5 text-[#526d94]"><Clock3 size={14} className="text-[#8a9cba]" />{tour?.duration_days != null ? `${tour.duration_days}N ${tour.duration_nights ?? 0}Đ` : "—"}</span>
                  <span className="font-bold text-[#075bff]">{tour?.base_price != null ? formatVND(tour.base_price) : "—"}</span>
                  <span>
                    {tour?.status != null ? <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${tour.status === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{tour.status === 1 ? "Hoạt động" : "Tạm ẩn"}</span> : "—"}
                  </span>
                  <span
                    title="Điểm trung bình từ các đánh giá đã duyệt"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-amber-600"
                  >
                    <Star size={15} aria-hidden="true" className="fill-amber-400 text-amber-400" />
                    {averageRating != null ? (
                      <span aria-label={`${averageRating.toFixed(1)} trên 5 sao`}>{averageRating.toFixed(1)}<span className="font-normal text-[#7387aa]">/5</span></span>
                    ) : (
                      <span className="text-[11px] font-normal text-[#7387aa]">Chưa có</span>
                    )}
                  </span>
                  <span className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#075bff]"><MessageSquare size={15} />{reviews.length.toLocaleString("vi-VN")} đánh giá</span>
                    {pending > 0 && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{pending.toLocaleString("vi-VN")} chờ duyệt</span>}
                  </span>
                  <ChevronDown size={18} aria-hidden="true" className={`text-[#5279ac] transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                <div id={`review-tour-${tourId}`} hidden={!isExpanded}>
                  {isExpanded && <div className="border-t border-[#e1ebfa] bg-[#f5f8fd] p-3"><ReviewTable items={reviews} loading={false} {...actions} /></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {onPageChange && <AdminPagination variant="numbered" showSinglePage currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} itemLabel="tour" onPageChange={onPageChange} />}
    </section>
  );
}
