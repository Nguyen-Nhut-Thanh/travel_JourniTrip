"use client";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Clock3, Flame, Gift, Pencil, Plus, Trash2, Zap } from "lucide-react";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { AdminRowActions } from "@/components/common/admin_shared/tables/AdminRowActions";
import { AdminPagination } from "@/components/common/admin_shared/tables/AdminPagination";
import {
  getFlashDealSeats,
  getFlashDealStatus,
  getManagedScheduleOffer,
  groupFlashDealSchedules,
} from "@/lib/flash_deals/admin/management";
import { getTourTypeLabel } from "@/lib/tours/admin/filters";
import { formatVND } from "@/lib/utils/currency";
import type { FlashDealSchedule } from "shared";

const FLASH_DEAL_STATUS_STYLES: Record<string, string> = {
  none: "border-slate-200 bg-slate-100 text-slate-600",
  promotion: "border-amber-200 bg-amber-50 text-amber-700",
  scheduled: "border-blue-200 bg-blue-50 text-blue-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  paused: "border-violet-200 bg-violet-50 text-violet-700",
  soldout: "border-rose-200 bg-rose-50 text-rose-700",
  expired: "border-orange-200 bg-orange-50 text-orange-700",
};

type FlashDealTableProps = {
  searchTerm?: string;
  items: FlashDealSchedule[];
  loading: boolean;
  busy: boolean;
  now: number;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (schedule: FlashDealSchedule) => void;
  onDelete: (schedule: FlashDealSchedule) => void;
};

export function FlashDealTable(props: FlashDealTableProps) {
  const { items, loading, page, onPageChange } = props;
  const groups = useMemo(() => groupFlashDealSchedules(items), [items]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const size = 10;
  const pages = Math.max(1, Math.ceil(groups.length / size));
  const current = Math.min(page, pages);
  const columns = "grid grid-cols-[minmax(280px,2.5fr)_minmax(100px,1fr)_minmax(95px,1fr)_minmax(125px,1fr)_minmax(110px,1fr)_minmax(170px,1.2fr)_36px] items-center gap-4";

  return (
    <section className="ui-flash-deal-management-tourGroups overflow-hidden min-w-0 rounded-[16px] border border-[#e1ebfa] bg-white" aria-label="Danh sách flash deal theo tour" aria-busy={loading}>
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          <div className={`${columns} border-b border-[#e8eff8] bg-slate-50/75 px-[18px] py-4 text-[11px] font-bold uppercase text-[#7489ac]`}>
            <span>Thông tin tour</span><span>Loại tour</span><span>Thời gian</span><span>Giá cơ bản</span><span>Trạng thái</span><span>Đợt khởi hành</span><span className="sr-only">Mở danh sách lịch khởi hành</span>
          </div>
          {loading ? Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="border-b border-[#edf2fa] p-[18px]" aria-hidden="true">
              <div className="h-[58px] animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
            </div>
          )) : !groups.length ? (
            <div className="flex flex-col items-center gap-2 p-[55px_20px] text-center text-[12px] text-[#8496b2]">
              <Flame size={32} className="mb-1 text-[#a9c4e7]" />
              <strong className="text-[14px] text-[#526d94]">Chưa có lịch khởi hành phù hợp</strong>
              <p>Thử đổi bộ lọc hoặc thêm lịch khởi hành để thiết lập ưu đãi.</p>
            </div>
          ) : groups.slice((current - 1) * size, current * size).map(({ key, tour, schedules }) => {
            const isExpanded = Boolean(props.searchTerm?.trim()) || expanded.has(key);
            const name = tour?.name || "Tour chưa có tên";
            return (
              <div key={key} className="border-b-2 border-[#b8cff0] last:border-b-0">
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`flash-deal-schedules-${key}`}
                  aria-label={`${isExpanded ? "Thu gọn" : "Xem"} ${schedules.length} đợt khởi hành của ${name}`}
                  className={`${columns} w-full cursor-pointer px-[18px] py-[18px] text-left text-[12px] hover:bg-[#f8fbff] ${isExpanded ? "bg-[#f8fbff]" : ""}`}
                  onClick={() => setExpanded(previous => {
                    const next = new Set(previous);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ImageWithFallback src={tour?.tour_images?.[0]?.image_url || schedules[0].cover_image_url || undefined} alt={name} className="h-[54px] w-[68px] shrink-0 rounded-lg bg-slate-100 object-cover" />
                    <span className="min-w-0">
                      <strong title={name} className="mb-1 block truncate text-[13px] font-bold text-[#0b1747]">{name}</strong>
                      <span className="block font-mono text-[11px] text-[#7387aa]">Mã: {tour?.code || "—"}</span>
                      {tour?.summary && <span title={tour.summary} className="mt-1 block truncate text-[11px] text-[#7387aa]">{tour.summary}</span>}
                    </span>
                  </span>
                  <span><span className="inline-block rounded-lg border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#075bff]">{getTourTypeLabel(tour?.tour_type)}</span></span>
                  <span className="inline-flex items-center gap-1.5 text-[#526d94]"><Clock3 size={14} className="text-[#8a9cba]" />{tour?.duration_days != null ? `${tour.duration_days}N ${tour.duration_nights ?? 0}Đ` : "—"}</span>
                  <span className="font-bold text-[#075bff]">{tour?.base_price != null ? formatVND(tour.base_price) : "—"}</span>
                  <span><span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${tour?.status === 1 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{tour?.status === 1 ? "Hoạt động" : "Tạm ẩn"}</span></span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[#526d94]"><CalendarDays size={15} className="text-[#8a9cba]" />Đợt khởi hành: <strong>{schedules.length} đợt</strong></span>
                  <ChevronDown size={18} aria-hidden="true" className={`text-[#5279ac] transition-transform motion-reduce:transition-none ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                <div id={`flash-deal-schedules-${key}`} hidden={!isExpanded}>
                  {isExpanded && <div className="border-t border-[#e1ebfa] bg-[#f5f8fd] p-3"><FlashDealScheduleTable items={schedules} loading={false} busy={props.busy} now={props.now} onEdit={props.onEdit} onDelete={props.onDelete} /></div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {!loading && <AdminPagination variant="numbered" showSinglePage currentPage={current} totalPages={pages} totalItems={groups.length} pageSize={size} itemLabel="tour" onPageChange={onPageChange} />}
    </section>
  );
}

function FlashDealScheduleTable({
  items,
  loading,
  busy,
  now,
  onEdit,
  onDelete,
}: {
  items: FlashDealSchedule[];
  loading: boolean;
  busy: boolean;
  now: number;
  onEdit: (schedule: FlashDealSchedule) => void;
  onDelete: (schedule: FlashDealSchedule) => void;
}) {
  return (
    <section
      className="ui-flash-deal-management-tableCard overflow-hidden min-w-0 [border:1px_solid_#e1ebfa] rounded-[16px] [background:white] [box-shadow:0_8px_30px_#4777ad05]"
      aria-label="Danh sách flash deal"
      aria-busy={loading}
    >
      <div className="ui-flash-deal-management-tableScroll overflow-x-auto">
        <table className="ui-flash-deal-management-table w-full border-collapse text-left whitespace-nowrap text-[12px] [&_th]:[background:linear-gradient(#fbfdff,_#f5f8fc)] [&_th]:p-[16px_18px] [&_th]:[border-bottom:1px_solid_#e8eff8] [&_th]:text-[#7489ac] [&_th]:text-[10px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[.3px]! [&_td]:p-[14px_18px] [&_td]:[border-bottom:1px_solid_#edf2fa] [&_td]:[vertical-align:middle] [&_th:not(:first-child)]:text-center [&_td:not(:first-child)]:text-center [&_th:nth-child(3)]:text-right [&_td:nth-child(3)]:text-right [&_th:nth-child(5)]:text-right [&_td:nth-child(5)]:text-right [&_th:last-child]:w-[80px] [&_td:last-child]:w-[80px] [&_tbody_tr:hover]:[background:#f8fbff] admin-max-650:[&_th]:p-[13px] admin-max-650:[&_td]:p-[13px]">
          <caption className="sr-only">Flash deals theo lịch khởi hành</caption>
          <thead>
            <tr>
              {[
                "Tour & lịch trình",
                "Chỗ trống",
                "Giá gốc",
                "Ưu đãi",
                "Giá deal",
                "Trạng thái",
                "Thao tác",
              ].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, row) => (
                <tr key={row}>
                  {Array.from({ length: 7 }, (_, column) => (
                    <td key={column}>
                      <div className="ui-flash-deal-management-skeleton h-[52px] min-w-[40px] rounded-[8px] [background:linear-gradient(90deg,_#eef4fc,_#f9fbff,_#eef4fc)] [background-size:200%_100%] animate-admin-shimmer motion-reduce:animate-none" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !items.length ? (
              <tr>
                <td colSpan={7}>
                  <div className="ui-flash-deal-management-empty p-[55px_20px] text-center text-[#8496b2] [&_svg]:m-[0_auto_12px] [&_svg]:text-[#a9c4e7] [&_strong]:block [&_strong]:text-[14px] [&_strong]:text-[#526d94] [&_p]:mt-[6px] [&_p]:text-[12px]">
                    <Flame size={32} />
                    <strong>Chưa có lịch khởi hành phù hợp</strong>
                    <p>
                      Thử đổi bộ lọc hoặc thêm lịch khởi hành để thiết lập ưu
                      đãi.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((schedule) => {
                  const deal = schedule.flash_deals;
                  const offer = getManagedScheduleOffer(schedule);
                  const status = getFlashDealStatus(schedule, now);
                  const seats = getFlashDealSeats(schedule);
                  return (
                    <tr key={schedule.tour_schedule_id}>
                      <td>
                        <div className="ui-flash-deal-management-tour flex items-center gap-[14px] min-w-[285px] max-w-[410px] [&>div]:min-w-0 [&_strong]:block [&_strong]:overflow-hidden [&_strong]:text-ellipsis [&_strong]:text-[#10234c] [&_strong]:text-[13px] [&_strong]:font-[750] admin-max-650:min-w-[260px]">
                          <ImageWithFallback
                            src={
                              schedule.cover_image_url ||
                              schedule.tours?.tour_images?.[0]?.image_url ||
                              undefined
                            }
                            alt={schedule.tours?.name || "Ảnh tour"}
                            className="ui-flash-deal-management-thumbnail w-[92px] h-[66px] shrink-0 rounded-[10px] object-cover [background:#eaf3ff] admin-max-650:w-[76px] admin-max-650:h-[58px]"
                          />
                          <div>
                            <span className="ui-flash-deal-management-code inline-block mb-[5px] max-w-[240px] overflow-hidden text-ellipsis [border:1px_solid_#d9e8ff] rounded-[5px] p-[2px_7px] [background:#edf5ff] text-[#136bff] text-[9px] font-[750] tracking-[.35px]! [vertical-align:middle]">
                              {schedule.tours?.code ||
                                `LỊCH ${schedule.tour_schedule_id}`}
                            </span>
                            <strong title={schedule.tours?.name || undefined}>
                              {schedule.tours?.name || "Tour chưa có tên"}
                            </strong>
                            <span className="ui-flash-deal-management-departure flex items-center gap-[6px] mt-[7px] text-[#0763ff] text-[11px] font-semibold">
                              <CalendarDays size={13} />
                              Khởi hành:{" "}
                              {new Date(schedule.start_date).toLocaleDateString(
                                "vi-VN",
                                { timeZone: "Asia/Bangkok" },
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="ui-flash-deal-management-seats text-[#172c55] text-[13px] font-[750] [font-variant-numeric:tabular-nums] [&[data-full=true]]:text-[#d68715]"
                          data-full={seats === 0}
                        >
                          {seats} / {schedule.quota}
                        </span>
                      </td>
                      <td>
                        <span
                          className="ui-flash-deal-management-original text-[#8a9cba] text-[12px] italic [&[data-discount=true]]:line-through"
                          data-discount={!!offer}
                        >
                          {formatVND(schedule.price)}
                        </span>
                      </td>
                      <td>
                        {offer ? (
                          <div className="flex flex-col items-center gap-1" title={offer.title}>
                            <span className={`ui-flash-deal-management-discount inline-flex items-center gap-[6px] rounded-[20px] p-[7px_10px] text-[11px] font-[750] ${offer.source === "flash_deal" ? "bg-[#fff0e9] text-[#ff642c]" : "bg-[#edf5ff] text-[#075bff]"}`}>
                              {offer.source === "flash_deal" ? <Zap size={13} fill="currentColor" /> : <Gift size={13} />}
                              {offer.discountType === "percentage"
                                ? `-${offer.discountValue}%`
                                : `-${formatVND(offer.discountValue)}`}
                            </span>
                            <span className={`text-[10px] ${offer.source === "flash_deal" ? "text-[#7387aa]" : "font-medium text-[#075bff]"}`}>{offer.source === "flash_deal" ? "Flash Deal" : "Ưu đãi đợt"}</span>
                          </div>
                        ) : (
                          <span className="ui-flash-deal-management-dash text-[#b0bed2]">
                            —
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="ui-flash-deal-management-price text-red-600 text-[15px] font-extrabold [font-variant-numeric:tabular-nums] admin-max-650:text-[14px]">
                          {offer ? formatVND(offer.price) : "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`ui-flash-deal-management-status inline-flex items-center gap-[6px] rounded-[20px] border p-[7px_10px] text-[10px] font-[650] before:content-[''] before:h-[5px] before:w-[5px] before:rounded-full before:bg-current ${FLASH_DEAL_STATUS_STYLES[status.key] ?? FLASH_DEAL_STATUS_STYLES.none}`}
                          data-status={status.key}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <div className="ui-flash-deal-management-actions flex justify-center">
                          <AdminRowActions
                            label={`Thao tác với ${schedule.tours?.name || "lịch khởi hành"}`}
                            disabled={busy}
                            actions={
                              deal
                                ? [
                                    {
                                      label: "Sửa deal",
                                      icon: <Pencil size={16} />,
                                      onClick: () => onEdit(schedule),
                                    },
                                    {
                                      label: "Xóa deal",
                                      icon: <Trash2 size={16} />,
                                      danger: true,
                                      onClick: () => onDelete(schedule),
                                    },
                                  ]
                                : [
                                    {
                                      label: "Tạo deal",
                                      icon: <Plus size={16} />,
                                      onClick: () => onEdit(schedule),
                                    },
                                  ]
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
