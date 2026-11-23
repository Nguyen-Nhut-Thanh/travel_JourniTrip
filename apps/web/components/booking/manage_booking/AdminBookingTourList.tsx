"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ChevronDown, Clock3, Ticket } from "lucide-react";
import { AdminPagination } from "@/components/common/admin_shared/tables/AdminPagination";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { getAdminBookingList } from "@/lib/booking/admin/api";
import { getTourBookingFilters } from "@/lib/booking/admin/management";
import { getTourTypeLabel } from "@/lib/tours/admin/filters";
import { formatVND } from "@/lib/utils/currency";
import { BookingManagementTable } from "./AdminBookingManagementTable";
import type { BookingActionType } from "./AdminBookingRowActions";
import type { AdminBooking, AdminBookingFilters, AdminBookingListResponse, AdminBookingTourGroup } from "shared";

type BookingActions = {
  busy: boolean;
  onAction: (booking: AdminBooking, type: BookingActionType) => void;
};

function TourBookings({ tourId, filters, refreshKey, cancelRequestedCount, cancellationsOnly, onCancellationViewChange, ...actions }: BookingActions & { tourId: number; filters: AdminBookingFilters; refreshKey: number; cancelRequestedCount: number; cancellationsOnly: boolean; onCancellationViewChange: (value: boolean) => void }) {
  const [items, setItems] = useState<AdminBooking[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const filterKey = JSON.stringify(getTourBookingFilters(filters, tourId, cancellationsOnly));

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    void getAdminBookingList<AdminBookingListResponse>(page, 10, JSON.parse(filterKey))
      .then(data => {
        if (!active) return;
        if (page > data.totalPages) { setPage(Math.max(1, data.totalPages)); return; }
        setItems(data.items); setTotal(data.total); setTotalPages(data.totalPages);
      })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Không thể tải booking của tour."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tourId, filterKey, page, refreshKey, retry]);

  return <div className="space-y-3">
    {(cancelRequestedCount > 0 || cancellationsOnly) && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] text-rose-700"><span className="inline-flex items-center gap-2"><AlertCircle size={15} className="shrink-0" />{cancellationsOnly ? "Đang xem yêu cầu hủy của toàn bộ tour." : `Có ${cancelRequestedCount} yêu cầu hủy đang chờ xử lý trong tour.`}</span><button type="button" aria-pressed={cancellationsOnly} onClick={() => { onCancellationViewChange(!cancellationsOnly); setPage(1); }} className="cursor-pointer font-semibold underline">{cancellationsOnly ? "Về bộ lọc hiện tại" : "Xem yêu cầu hủy"}</button></div>}
    {error ? <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"><span>{error}</span><button type="button" onClick={() => setRetry(value => value + 1)} className="shrink-0 cursor-pointer font-semibold underline">Tải lại</button></div> : <BookingManagementTable items={items} total={total} page={page} totalPages={totalPages} loading={loading} onPage={setPage} {...actions} />}
  </div>;
}

export function BookingTourList({ groups, total, page, totalPages, loading, filters, refreshKey, onPage, ...actions }: BookingActions & {
  groups: AdminBookingTourGroup[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  filters: AdminBookingFilters;
  refreshKey: number;
  onPage: (page: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [cancellationViews, setCancellationViews] = useState<Record<number, boolean>>({});
  const columns = "grid grid-cols-[minmax(280px,2.5fr)_minmax(100px,1fr)_minmax(95px,1fr)_minmax(125px,1fr)_minmax(110px,1fr)_minmax(150px,1.2fr)_36px] items-center gap-4";
  return <section className="ui-booking-management-tourGroups min-w-0 overflow-hidden rounded-[14px] border border-[#e1edfc] bg-white shadow-2xs" aria-label="Booking theo tour" aria-busy={loading}>
    <div className="flex items-center justify-between gap-3 border-b border-[#edf2fb] px-4 py-3"><h2 className="text-[15px] font-bold text-[#0b1747]">Booking theo tour <span className="text-xs font-semibold text-[#7387aa]">({total.toLocaleString("vi-VN")} tour)</span></h2><span className="text-[11px] text-[#7387aa]">Bấm tour để xem booking</span></div>
    <div className="overflow-x-auto"><div className="min-w-[1080px]">
      <div className={`${columns} border-b border-[#edf2fb] bg-slate-50/75 px-[18px] py-4 text-[11px] font-bold uppercase text-[#7187a9]`}><span>Thông tin tour</span><span>Loại tour</span><span>Thời gian</span><span>Giá cơ bản</span><span>Trạng thái tour</span><span>Số lượng booking</span><span className="sr-only">Mở danh sách booking</span></div>
      {loading ? Array.from({ length: 5 }, (_, index) => <div key={index} aria-hidden="true" className="border-b border-[#edf2fb] p-[18px]"><div className="h-[58px] animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" /></div>) : !groups.length ? <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-xs text-[#7387aa]"><Ticket size={30} className="mb-1 text-[#a9c4e7]" /><strong className="text-sm text-[#0b1747]">Không tìm thấy tour có booking phù hợp</strong><p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div> : groups.map(({ tour, booking_count, cancel_requested_count = 0 }) => {
        const open = expanded[tour.tour_id] ?? Boolean(filters.search?.trim());
        return <div key={tour.tour_id} className="border-b-2 border-[#b8cff0] last:border-b-0">
          <button type="button" aria-expanded={open} aria-controls={`booking-tour-${tour.tour_id}`} aria-label={`${open ? "Thu gọn" : "Xem"} ${booking_count} booking của ${tour.name}${cancel_requested_count > 0 ? `, có ${cancel_requested_count} yêu cầu hủy cần xử lý` : ""}`} onClick={() => setExpanded(previous => ({ ...previous, [tour.tour_id]: !open }))} className={`${columns} w-full cursor-pointer px-[18px] py-[18px] text-left text-xs transition-colors hover:bg-[#f8fbff] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-500 ${open ? "bg-[#f8fbff]" : ""}`}>
            <span className="flex min-w-0 items-center gap-3"><ImageWithFallback src={tour.tour_images?.[0]?.image_url} alt={tour.name} className="h-[54px] w-[68px] shrink-0 rounded-lg bg-slate-100 object-cover" /><span className="min-w-0"><strong title={tour.name} className="mb-1 block truncate text-[13px] font-bold text-[#0b1747]">{tour.name}</strong><span className="block font-mono text-[11px] text-[#7387aa]">Mã: {tour.code || "—"}</span>{tour.summary && <span title={tour.summary} className="mt-1 block truncate text-[11px] text-[#7387aa]">{tour.summary}</span>}</span></span>
            <span><span className="inline-block rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#075bff]">{getTourTypeLabel(tour.tour_type)}</span></span>
            <span className="inline-flex items-center gap-1.5 text-[#526d94]"><Clock3 size={14} className="text-[#8a9cba]" />{tour.duration_days}N {tour.duration_nights}Đ</span>
            <span className="font-bold text-[#075bff]">{formatVND(tour.base_price)}</span>
            <span><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${tour.status === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{tour.status === 1 ? "Hoạt động" : "Tạm ẩn"}</span></span>
            <span className="flex flex-col items-start gap-1.5"><span className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#075bff]"><Ticket size={15} />{booking_count.toLocaleString("vi-VN")} booking</span>{cancel_requested_count > 0 && <span title="Yêu cầu hủy đang chờ xử lý của toàn bộ tour" className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700"><AlertCircle size={12} />{cancel_requested_count.toLocaleString("vi-VN")} yêu cầu hủy</span>}</span>
            <ChevronDown size={18} aria-hidden="true" className={`text-[#5279ac] transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
          </button>
          <div id={`booking-tour-${tour.tour_id}`} hidden={!open}>{open && <div className="border-t border-[#e1ebfa] bg-[#f5f8fd] p-3"><TourBookings tourId={tour.tour_id} filters={filters} refreshKey={refreshKey} cancelRequestedCount={cancel_requested_count} cancellationsOnly={!!cancellationViews[tour.tour_id]} onCancellationViewChange={value => setCancellationViews(previous => ({ ...previous, [tour.tour_id]: value }))} {...actions} /></div>}</div>
        </div>;
      })}
    </div></div>
    {!loading && <AdminPagination variant="numbered" showSinglePage currentPage={page} totalPages={totalPages} totalItems={total} pageSize={10} itemLabel="tour" onPageChange={onPage} />}
  </section>;
}
