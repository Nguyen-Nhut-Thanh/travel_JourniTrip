"use client";

import { useState, type ReactNode } from "react";
import { BriefcaseBusiness, ChevronDown, Clock3 } from "lucide-react";
import type { WorkforceSchedule } from "shared";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { getTourTypeLabel } from "@/lib/tours/admin/filters";
import { formatVND } from "@/lib/utils/currency";
import type { WorkforceTripTourGroup } from "@/lib/workforce/admin/trips";

export function TripTourList({
  groups,
  focusedScheduleId,
  renderSchedule,
  searchTerm = "",
}: {
  groups: WorkforceTripTourGroup[];
  focusedScheduleId?: number;
  renderSchedule: (schedule: WorkforceSchedule) => ReactNode;
  searchTerm?: string;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const columns = "grid grid-cols-[minmax(280px,2.5fr)_minmax(100px,1fr)_minmax(95px,1fr)_minmax(125px,1fr)_minmax(110px,1fr)_minmax(170px,1.2fr)_36px] items-center gap-4";

  if (!groups.length) {
    return <div className="p-12 text-center text-sm text-slate-500">Không có chuyến phù hợp với bộ lọc hiện tại.</div>;
  }

  return (
    <section className="ui-trip-management-tourGroups overflow-x-auto" aria-label="Chuyến điều hành theo tour">
      <div className="min-w-[1100px]">
        <div className={`${columns} border-b border-[#edf2fb] bg-slate-50/75 px-[18px] py-4 text-[11px] font-bold uppercase text-[#7187a9]`}>
          <span>Thông tin tour</span>
          <span>Loại tour</span>
          <span>Thời gian</span>
          <span>Giá cơ bản</span>
          <span>Trạng thái tour</span>
          <span>Số lượng chuyến</span>
          <span className="sr-only">Mở danh sách chuyến</span>
        </div>
        {groups.map(({ key, tour, schedules }) => {
          const isExpanded = Boolean(searchTerm.trim()) || (expanded[key] ?? schedules.some(schedule => schedule.tour_schedule_id === focusedScheduleId));
          return (
            <div key={key} className="border-b-2 border-[#b8cff0] last:border-b-0">
              <button
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`trip-tour-${key}`}
                aria-label={`${isExpanded ? "Thu gọn" : "Xem"} ${schedules.length} chuyến của ${tour.name}`}
                className={`${columns} w-full cursor-pointer px-[18px] py-[18px] text-left text-xs transition-colors hover:bg-[#f8fbff] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 ${isExpanded ? "bg-[#f8fbff]" : ""}`}
                onClick={() => setExpanded(previous => ({ ...previous, [key]: !isExpanded }))}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <ImageWithFallback src={tour.image_url || schedules[0].cover_image_url || undefined} alt={tour.name} className="h-[54px] w-[68px] shrink-0 rounded-lg bg-slate-100 object-cover" />
                  <span className="min-w-0">
                    <strong title={tour.name} className="mb-1 block truncate text-[13px] font-bold text-[#0b1747]">{tour.name}</strong>
                    <span className="block font-mono text-[11px] text-[#7387aa]">Mã: {tour.code || "—"}</span>
                    {tour.summary && <span title={tour.summary} className="mt-1 block truncate text-[11px] text-[#7387aa]">{tour.summary}</span>}
                  </span>
                </span>
                <span><span className="inline-block rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#075bff]">{getTourTypeLabel(tour.tour_type)}</span></span>
                <span className="inline-flex items-center gap-1.5 text-[#526d94]"><Clock3 size={14} className="text-[#8a9cba]" />{tour.duration_days != null ? `${tour.duration_days}N ${tour.duration_nights ?? 0}Đ` : "—"}</span>
                <span className="font-bold text-[#075bff]">{tour.base_price != null ? formatVND(tour.base_price) : "—"}</span>
                <span>{tour.status != null ? <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${tour.status === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{tour.status === 1 ? "Hoạt động" : "Tạm ẩn"}</span> : "—"}</span>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#075bff]"><BriefcaseBusiness size={15} />Số lượng chuyến: {schedules.length.toLocaleString("vi-VN")}</span>
                <ChevronDown size={18} aria-hidden="true" className={`text-[#5279ac] transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`} />
              </button>
              <div id={`trip-tour-${key}`} hidden={!isExpanded}>
                {isExpanded && <div className="border-t border-[#e1ebfa] bg-[#f5f8fd] p-3"><div className="divide-y divide-[#dce7f7] overflow-hidden rounded-xl border border-[#e1ebfa] bg-white">{schedules.map(renderSchedule)}</div></div>}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
