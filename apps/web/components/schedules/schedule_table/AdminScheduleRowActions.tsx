"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cancelBookingDeparture } from "@/lib/booking/admin/api";
import Link from "next/link";
import { Compass, Eye, EyeOff, Gift, MoreHorizontal, Pencil, Trash2, UsersRound, Zap } from "lucide-react";
import { Popover } from "@/components/common/dialogs_and_feedback/dialogs/Popover";
import { useDismiss } from "@/lib/ui/useDismiss";
import { getScheduleBookedCount } from "@/lib/schedules/admin/status";
import type { AdminSchedule, ScheduleTablePanelProps } from "shared";
import { ADMIN_CONTENT_DENIED } from 'shared';
import { useAdminContentReadOnly } from '@/components/common/admin_shared/guards/AdminContentPermission';

export function ScheduleRowActions({
  schedule,
  busy,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewManifest,
  onConfigurePromotion,
  onConfigureFlashDeal,
}: Pick<ScheduleTablePanelProps, "onEdit" | "onDelete" | "onToggleStatus" | "onViewManifest"> & {
  schedule: AdminSchedule;
  busy: boolean;
  onConfigurePromotion?: (schedule: AdminSchedule) => void;
  onConfigureFlashDeal?: (schedule: AdminSchedule) => void;
}) {
  const [open, setOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const readOnly = useAdminContentReadOnly();
  const bookedCount = getScheduleBookedCount(schedule);
  const hasBookings = bookedCount > 0;
  const wrapper = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLButtonElement>(null);
  useDismiss(wrapper, open, () => setOpen(false));
  return (
    <div ref={wrapper}>
      <button
        ref={anchor}
        type="button"
        disabled={busy}
        className="ui-schedule-overview-actionsTrigger inline-grid place-items-center w-[30px] h-[32px] rounded-[8px] text-[#5075ab] [&:hover]:[background:#e9f2ff] [&:hover]:text-[#075bff] [&:disabled]:opacity-[.4] [&:disabled]:cursor-wait"
        aria-label={`Thao tác lịch khởi hành ${schedule.tour_schedule_id}`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal size={22} />
      </button>
      {open && (
        <Popover
          anchorRef={anchor}
          align="end"
          width={208}
          className="ui-schedule-overview-menu p-[6px] [border:1px_solid_#e1eaf8] rounded-[12px] [background:white] [box-shadow:0_10px_32px_#263d6826] [&>div]:flex [&>div]:flex-col [&_button]:flex [&_button]:items-center [&_button]:gap-[9px] [&_button]:rounded-[7px] [&_button]:p-[10px] [&_button]:text-[12px] [&_button]:text-left [&_button]:text-[#4a648c] [&_button:hover]:[background:#edf5ff] [&_button:hover]:text-[#075bff] [&_.ui-schedule-overview-danger]:text-[#dc3653] [&_.ui-schedule-overview-danger:hover]:text-[#c72544] [&_.ui-schedule-overview-danger:hover]:[background:#fff0f3]"
        >
          <div aria-label="Thao tác lịch khởi hành">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onViewManifest?.(schedule.tour_schedule_id);
              }}
            >
              <UsersRound size={16} className="text-blue-600" />
              <span>Danh sách đoàn</span>
            </button>
            <Link
              href={`/admin/trips?schedule=${schedule.tour_schedule_id}`}
              className="flex items-center gap-[9px] rounded-[7px] p-[10px] text-[12px] text-left text-[#4a648c] hover:bg-[#edf5ff] hover:text-[#075bff]"
              onClick={() => setOpen(false)}
            >
              <Compass size={16} className="text-blue-600" />
              <span>Điều hành chuyến</span>
            </Link>
            <button
              type="button"
              disabled={readOnly}
              title={readOnly ? ADMIN_CONTENT_DENIED : undefined}
              onClick={() => {
                setOpen(false);
                onConfigurePromotion?.(schedule);
              }}
            >
              <Gift size={16} className="text-amber-500" />
              <span>Ưu đãi đợt khởi hành</span>
            </button>
            <button
              type="button"
              disabled={readOnly}
              title={readOnly ? ADMIN_CONTENT_DENIED : undefined}
              onClick={() => {
                setOpen(false);
                onConfigureFlashDeal?.(schedule);
              }}
            >
              <Zap size={16} className="text-amber-500" />
              <span>Flash Deal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit(schedule.tour_schedule_id);
              }}
            >
              <Pencil size={16} />
              {readOnly ? 'Xem chi tiết lịch' : 'Chỉnh sửa lịch'}
            </button>
            <button
              type="button"
              disabled={readOnly}
              title={readOnly ? ADMIN_CONTENT_DENIED : undefined}
              onClick={() => {
                setOpen(false);
                anchor.current?.focus();
                onToggleStatus(
                  schedule.tour_schedule_id,
                  schedule.status,
                  getScheduleBookedCount(schedule),
                );
              }}
            >
              {schedule.status === 1 ? <EyeOff size={16} /> : <Eye size={16} />}
              {schedule.status === 1 ? "Tạm khóa lịch" : "Mở lại lịch"}
            </button>
            <button
              type="button"
              disabled={readOnly || hasBookings}
              title={
                readOnly
                  ? ADMIN_CONTENT_DENIED
                  : hasBookings
                    ? "Lịch khởi hành đã có khách đặt, không thể xóa"
                    : undefined
              }
              className="ui-schedule-overview-danger disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                setOpen(false);
                onDelete(schedule.tour_schedule_id);
              }}
            >
              <Trash2 size={16} />
              Xóa lịch khởi hành
            </button>
            {readOnly && <p role="note" className="px-2 py-2 text-[11px] leading-5 text-amber-700">{ADMIN_CONTENT_DENIED}</p>}
            {!readOnly && new Date(schedule.start_date) > new Date() && <button type="button" className="ui-schedule-overview-danger" onClick={() => { setOpen(false); setCancelOpen(true); }}>Ngừng chuyến và xử lý booking</button>}
          </div>
        </Popover>
      )}
      {cancelOpen && createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-label="Ngừng chuyến và xử lý booking">
        <form className="w-full max-w-lg space-y-3 rounded-2xl bg-white p-5 text-sm text-slate-800" onSubmit={async event => {
          event.preventDefault(); setCancelBusy(true); setCancelError("");
          try { await cancelBookingDeparture(schedule.tour_schedule_id, cancelReason); window.location.reload(); }
          catch (error) { setCancelError(error instanceof Error ? error.message : "Không xử lý được chuyến."); setCancelBusy(false); }
        }}>
          <h2 className="text-lg font-bold">Ngừng chuyến #{schedule.tour_schedule_id}</h2>
          <p>Chuyến ngừng nhận đặt mới. Đơn chưa thanh toán được hủy và nhả chỗ; khách đã thanh toán nhận đề xuất hoàn tiền. Bạn có thể thỏa thuận lịch mới cùng tour với từng booking sau đó.</p>
          <label className="block">Lý do<textarea required minLength={3} maxLength={2000} value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
          {cancelError && <p role="alert" className="text-red-700">{cancelError}</p>}
          <div className="flex justify-end gap-2"><button type="button" disabled={cancelBusy} onClick={() => setCancelOpen(false)} className="rounded-lg border px-3 py-2">Quay lại</button><button disabled={cancelBusy} className="rounded-lg bg-red-700 px-3 py-2 text-white disabled:opacity-50">{cancelBusy ? "Đang xử lý…" : "Xác nhận ngừng chuyến"}</button></div>
        </form>
      </div>, document.body)}
    </div>
  );
}
