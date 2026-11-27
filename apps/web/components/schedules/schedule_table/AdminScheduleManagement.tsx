"use client";

import { AdminSearchHighlight } from "@/components/common/admin_shared/tables/AdminSearchHighlight";
import { AdminSearchInput } from "@/components/common/admin_shared/tables/AdminSearchInput";

import { AdminPagination } from "@/components/common/admin_shared/tables/AdminPagination";
import CustomDropdown from "@/components/common/form_controls/CustomDropdown";
import { ConfirmDialog } from "@/components/common/dialogs_and_feedback/dialogs/ConfirmDialog";
import { deleteAdminSchedule, getTourSchedules } from "@/lib/schedules/admin/api";
import { getScheduleBookedCount, getScheduleStatusMeta } from "@/lib/schedules/admin/status";
import { filterTourSchedules, formatScheduleDate, getSchedulePickupOptions } from "@/lib/schedules/admin/tour-schedules";
import { useToast } from "@/lib/notifications/useToast";
import { formatVND } from "@/lib/utils/currency";
import { AlertTriangle, ArrowRight, Banknote, CalendarDays, Loader2, MapPin, Palmtree, Pencil, Plane, Plus, RefreshCw, Tag, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AdminSchedule, CustomDropdownProps } from "shared";

function ScheduleFilter(props: Pick<CustomDropdownProps, "ariaLabel" | "selectedValue" | "options" | "onSelect" | "icon">) {
  return <CustomDropdown {...props} variant="compact" matchTriggerWidth className="min-w-0 [&_button[aria-haspopup=listbox]]:min-h-10 [&_button[aria-haspopup=listbox]]:min-w-0 [&_button[aria-haspopup=listbox]]:rounded-lg [&_button[aria-haspopup=listbox]]:border-[#dce7f7] [&_button[aria-haspopup=listbox]]:bg-white [&_button[aria-haspopup=listbox]]:px-3 [&_button[aria-haspopup=listbox]]:text-[13px] [&_button[aria-haspopup=listbox]]:font-medium [&_button[aria-haspopup=listbox]]:shadow-none" />;
}

export function ScheduleManagement({ tourId }: { tourId?: number }) {
  const pageSize = 10;
  const { success, error: showError } = useToast();
  const [schedules, setSchedules] = useState<AdminSchedule[]>([]);
  const [loading, setLoading] = useState(Boolean(tourId));
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [pickup, setPickup] = useState("all");
  const [time, setTime] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleting = useRef(false);

  useEffect(() => {
    if (!tourId) { setSchedules([]); setLoading(false); return; }
    let active = true;
    setSchedules([]);
    setLoading(true);
    setLoadError("");
    void getTourSchedules<AdminSchedule>(tourId).then(items => {
      if (active) setSchedules(items);
    }).catch(error => {
      if (active) setLoadError(error instanceof Error ? error.message : "Không thể tải lịch khởi hành.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [tourId, reload]);

  const pickupOptions = useMemo(() => [{ value: "all", label: "Tất cả điểm đón" }, ...getSchedulePickupOptions(schedules)], [schedules]);
  const filteredSchedules = useMemo(() => filterTourSchedules(schedules, { search, pickup, time, status: statusFilter }), [schedules, search, pickup, time, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const visibleSchedules = filteredSchedules.slice((page - 1) * pageSize, page * pageSize);
  const hasFilters = Boolean(search.trim() || pickup !== "all" || time !== "all" || statusFilter !== "all");

  useEffect(() => { setCurrentPage(1); }, [tourId, search, pickup, time, statusFilter]);
  useEffect(() => { setCurrentPage(current => Math.min(current, totalPages)); }, [totalPages]);

  const resetFilters = () => {
    setSearch(""); setPickup("all"); setTime("all"); setStatusFilter("all"); setCurrentPage(1);
  };
  const handleDelete = async () => {
    if (pendingDeleteId === null || deleting.current) return;
    const id = pendingDeleteId;
    deleting.current = true;
    setDeletingId(id);
    try {
      await deleteAdminSchedule(id);
      setSchedules(current => current.filter(schedule => schedule.tour_schedule_id !== id));
      setPendingDeleteId(null);
      success("Đã xóa lịch khởi hành thành công");
    } catch (error) {
      setPendingDeleteId(null);
      showError(error instanceof Error ? error.message : "Không thể xóa lịch khởi hành.");
    } finally {
      deleting.current = false;
      setDeletingId(null);
    }
  };

  return <section aria-labelledby="tour-schedules-title" aria-busy={loading} className="@container/tour-schedules relative isolate min-w-0 rounded-[14px] border border-[#e1edfc] bg-white p-4 sm:p-5 shadow-sm text-[#0b1747]">
    <div aria-hidden="true" className="pointer-events-none absolute top-0 right-[14%] -z-[1] h-[118px] w-[43%] bg-[url('/images/about/our-story-ha-long-bay.png')] bg-cover bg-[center_56%] opacity-[.12] [mask-image:linear-gradient(90deg,transparent,#000_35%,#000_80%,transparent)] max-sm:hidden" />

    <header className="relative mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm"><CalendarDays size={20} /></span>
        <div>
          <h2 id="tour-schedules-title" className="text-[16px] leading-[1.5] font-[750] text-[#0b1747]">Lịch khởi hành</h2>
          <p className="mt-0.5 text-[12px] leading-[1.5] text-[#7387aa]">Quản lý các đợt khởi hành của tour một cách trực quan và linh hoạt.</p>
        </div>
      </div>
      <Link href={tourId ? `/admin/schedules/new?tourId=${tourId}` : "/admin/schedules"} aria-describedby={!tourId ? "tour-schedules-save-hint" : undefined} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[12px] border border-[#075bff] bg-[#075bff] px-4 py-2.5 text-[13px] font-[650] text-white shadow-sm transition-colors duration-180 hover:bg-[#064ddd]">
        <Plus size={18} /> Thêm lịch mới
      </Link>
    </header>

    <fieldset disabled={loading || !tourId} className="mb-4 grid min-w-0 gap-2.5 disabled:opacity-60 sm:grid-cols-2 @min-[900px]/tour-schedules:grid-cols-[minmax(180px,1.55fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(145px,1fr)_auto]">
      <legend className="sr-only">Tìm kiếm và lọc lịch khởi hành</legend>
      <div className="relative min-w-0 sm:col-span-2 @min-[900px]/tour-schedules:col-span-1">
        <AdminSearchInput aria-label="Tìm kiếm lịch khởi hành" placeholder="Tìm kiếm lịch khởi hành..." value={search} onChange={value => setSearch(value)} inputClassName="min-h-10 w-full rounded-lg border border-[#dce7f7] bg-white py-2 pr-3 pl-10 text-[13px] text-slate-800 shadow-none outline-none placeholder:text-slate-400 focus:border-[#075bff] focus:ring-2 focus:ring-blue-100" />
      </div>
      <ScheduleFilter ariaLabel="Lọc theo điểm đón hoặc nơi xuất phát" selectedValue={pickup} options={pickupOptions} onSelect={setPickup} icon={MapPin} />
      <ScheduleFilter ariaLabel="Lọc theo thời gian khởi hành" selectedValue={time} options={[
        { value: "all", label: "Tất cả thời gian" }, { value: "upcoming", label: "Sắp khởi hành" },
        { value: "this-month", label: "Tháng này" }, { value: "next-month", label: "Tháng sau" }, { value: "past", label: "Đã khởi hành" },
      ]} onSelect={setTime} icon={CalendarDays} />
      <ScheduleFilter ariaLabel="Lọc theo trạng thái lịch khởi hành" selectedValue={statusFilter} options={[
        { value: "all", label: "Tất cả trạng thái" }, { value: "selling", label: "Đang nhận khách" },
        { value: "full", label: "Đã hết chỗ" }, { value: "hidden", label: "Tạm khóa" }, { value: "past", label: "Đã khởi hành" },
      ]} onSelect={setStatusFilter} icon={Tag} />
      <button type="button" onClick={() => { resetFilters(); setReload(current => current + 1); }} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#d3e4ff] bg-white px-3.5 py-2 text-[12px] font-[650] whitespace-nowrap text-[#075bff] transition-colors duration-180 hover:bg-[#f1f7ff] disabled:cursor-wait">
        <RefreshCw size={15} /> Làm mới
      </button>
    </fieldset>

    {loading ? <div role="status" className="space-y-3 py-2">
      <span className="sr-only">Đang tải lịch khởi hành</span>
      {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl border border-[#e1edfc] bg-blue-50/50" />)}
    </div> : loadError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-[13px] text-rose-700">
      <span>{loadError}</span><button type="button" onClick={() => setReload(current => current + 1)} className="font-bold underline underline-offset-2">Tải lại</button>
    </div> : visibleSchedules.length === 0 ? <div className="flex min-h-[160px] flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-[#dce7f7] bg-slate-50/50 px-5 py-8 text-center">
      <CalendarDays size={30} strokeWidth={1.5} className="text-[#98b9e7]" />
      <p className="text-[14px] font-bold text-[#0b1747]">{!tourId ? "Tạo lịch khởi hành sau khi lưu tour" : hasFilters ? "Không tìm thấy lịch khởi hành phù hợp" : "Tour chưa có lịch khởi hành"}</p>
      <p id={!tourId ? "tour-schedules-save-hint" : undefined} className="max-w-md text-[12px] leading-[1.6] text-[#7387aa]">{!tourId ? "Lưu tour trước để tạo lịch khởi hành gắn với tour này tại trang quản lý lịch khởi hành." : hasFilters ? "Thử thay đổi từ khóa, điểm đón, thời gian hoặc trạng thái." : "Bấm Thêm lịch mới để thiết lập ngày đi, điểm đón và các dịch vụ cho chuyến đi."}</p>
      {hasFilters && <button type="button" onClick={resetFilters} className="text-[12px] font-[650] text-[#075bff] hover:underline">Xóa bộ lọc</button>}
    </div> : <div role="region" aria-label="Danh sách lịch khởi hành của tour" tabIndex={0} className="overflow-x-auto rounded-[14px] border border-[#e1edfc] bg-white outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead><tr className="border-b border-[#edf2fb] bg-slate-50/75 text-[12px] font-[650] text-[#7387aa] uppercase">
          {["Thời gian", "Giá vé", "Đã đặt / Tổng chỗ", "Mức lấp đầy", "Trạng thái", "Thao tác"].map(label => <th key={label} scope="col" className="px-4 py-3 font-[650] last:text-right">{label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-[#edf2fb] text-[13px]">
          {visibleSchedules.map(schedule => {
            const booked = getScheduleBookedCount(schedule);
            const percent = schedule.quota > 0 ? Math.min(100, Math.round(booked / schedule.quota * 100)) : 0;
            const status = getScheduleStatusMeta(schedule);
            const label = status.label === "Đang hoạt động" ? "Đang nhận khách" : status.label;
            return <tr key={schedule.tour_schedule_id} className="group transition-colors hover:bg-slate-50/60">
              <td className="px-4 py-3"><div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#075bff]"><CalendarDays size={18} /></span>
                <div><span className="mb-0.5 block font-mono text-xs font-semibold text-[#075bff]"><AdminSearchHighlight text={schedule.code || `#${schedule.tour_schedule_id}`} query={search} /></span><div className="flex items-center gap-2 text-[14px] font-bold whitespace-nowrap text-[#0b1747]">{formatScheduleDate(schedule.start_date)} <ArrowRight size={14} className="text-[#075bff]" /> {formatScheduleDate(schedule.end_date)}</div><p className="mt-0.5 text-[11px] text-[#7387aa]">{schedule.departure_location?.name || "Chưa có nơi xuất phát"} · {schedule.pickup_points?.length ?? 0} điểm đón</p></div>
              </div></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2 whitespace-nowrap"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><Banknote size={16} /></span><strong className="text-[15px] font-extrabold text-slate-900 tabular-nums">{formatVND(schedule.price)}</strong></div></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2 text-[14px] whitespace-nowrap text-[#0b1747] tabular-nums"><UsersRound size={17} className="text-[#7387aa]" /><span><strong className="font-bold text-emerald-700">{booked}</strong> / {schedule.quota}</span></div></td>
              <td className="px-4 py-3"><div className="min-w-[95px] max-w-[130px]">
                <span className="mb-1 block text-[11px] font-bold text-[#7387aa] tabular-nums">{percent}%</span>
                <div role="progressbar" aria-label={`Mức lấp đầy lịch ngày ${formatScheduleDate(schedule.start_date)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${booked} trên ${schedule.quota} chỗ`} className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div style={{ width: `${percent}%` }} className={`h-full rounded-full ${percent >= 100 ? "bg-rose-500" : percent >= 80 ? "bg-amber-500" : "bg-[#075bff]"}`} />
                </div>
              </div></td>
              <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[11px] font-[650] whitespace-nowrap ${status.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}><span className="size-1.5 shrink-0 rounded-full bg-current" />{label}</span></td>
              <td className="px-4 py-3 text-right"><div className="flex items-center justify-end gap-2.5 whitespace-nowrap">
                <Link href={`/admin/schedules/${schedule.tour_schedule_id}`} aria-label={`Chỉnh sửa lịch khởi hành ngày ${formatScheduleDate(schedule.start_date)}`} className="inline-flex items-center gap-1 text-xs font-[650] text-[#075bff] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#075bff]"><Pencil size={15} />Chỉnh sửa</Link>
                <span aria-hidden="true" className="h-3.5 w-px bg-slate-200" />
                <button type="button" disabled={deletingId !== null} aria-label={`Xóa lịch khởi hành ngày ${formatScheduleDate(schedule.start_date)}`} onClick={() => setPendingDeleteId(schedule.tour_schedule_id)} className="rounded-lg p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-rose-400 disabled:cursor-wait disabled:opacity-40">{deletingId === schedule.tour_schedule_id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}</button>
              </div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>}

    {!loading && !loadError && filteredSchedules.length > pageSize && <div className="mt-3"><AdminPagination variant="numbered" currentPage={page} totalPages={totalPages} totalItems={filteredSchedules.length} pageSize={pageSize} itemLabel="lịch khởi hành" onPageChange={setCurrentPage} /></div>}
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-[1] h-[45px] overflow-hidden text-[#b9e3f7]">
      <Palmtree size={55} strokeWidth={1.3} className="absolute bottom-[-10px] left-[-4px] -rotate-[15deg] opacity-60" />
      <Palmtree size={42} strokeWidth={1.3} className="absolute right-1 bottom-[-8px] rotate-[12deg] opacity-60" />
      <svg viewBox="0 0 1200 45" preserveAspectRatio="none" fill="none" className="absolute inset-x-0 bottom-0 h-7 w-full"><path d="M0 15C70-5 130 44 225 40H965C1060 44 1140-8 1200 20V45H0Z" fill="#e4f3ff" /></svg>
    </div>
    <ConfirmDialog open={pendingDeleteId !== null} icon={<AlertTriangle size={32} />} title="Xóa lịch khởi hành?" description="Lịch khởi hành này sẽ bị xóa khỏi tour. Hành động này không thể hoàn tác." confirmLabel={deletingId !== null ? "Đang xóa..." : "Xác nhận xóa"} cancelLabel="Hủy bỏ" onConfirm={() => { void handleDelete(); }} onCancel={() => { if (!deleting.current) setPendingDeleteId(null); }} />
  </section>;
}
