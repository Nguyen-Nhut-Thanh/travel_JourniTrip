"use client";

import { ImageUpload } from "@/components/common/form_controls/ImageUpload";
import { VndPriceInput } from "@/components/common/form_controls/VndPriceInput";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  Image,
  Info,
  Loader2,
  Minus,
  Moon,
  Plane,
  Plus,
  UsersRound,
} from "lucide-react";
import type { TourDetailForm, TourSidebarProps } from "shared";
import {
  getTourNightRange,
  isValidTourDuration,
  MAX_TOUR_IMAGES,
} from "shared";
import { useEffect, useRef } from "react";
import { TourEditorCard } from "@/components/tours/tour_editor/AdminTourEditorCard";
import { useAdminContentReadOnly } from '@/components/common/admin_shared/guards/AdminContentPermission';

export function TourSidebar<T extends TourDetailForm>({
  tour,
  mode = "edit",
  saving,
  success,
  lockCoreFields = false,
  onSave,
  onTourChange,
}: TourSidebarProps<T>) {
  const readOnly = useAdminContentReadOnly();
  const controlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const updateHeight = () =>
      controls.style.setProperty(
        "--tour-controls-height",
        `${controls.getBoundingClientRect().height}px`,
      );
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(controls);
    return () => observer.disconnect();
  }, []);
  const days = Number(tour.duration_days ?? 1);
  const nights = Number(tour.duration_nights ?? 0);
  const nightRange = getTourNightRange(days);
  const durationValid = isValidTourDuration(days, nights);
  const changeDuration = (
    field: "duration_days" | "duration_nights",
    next: number,
  ) =>
    onTourChange((previous) => {
      const nextDays =
        field === "duration_days"
          ? Math.max(1, Math.trunc(next))
          : Number(previous.duration_days ?? 1);
      const range = getTourNightRange(nextDays);
      const nextNights = Math.min(
        range.max,
        Math.max(
          range.min,
          field === "duration_nights"
            ? Math.trunc(next)
            : Number(previous.duration_nights ?? 0),
        ),
      );
      return {
        ...previous,
        duration_days: nextDays,
        duration_nights: nextNights,
      };
    });
  return (
    <aside
      className="flex min-w-0 flex-col gap-4 lg:self-stretch"
      aria-label="Hình ảnh, thời lượng và giá tour"
    >
      <TourEditorCard
        id="tour-media"
        title="Hình ảnh quảng bá"
        description="Ảnh đại diện hiển thị cho tour trên website."
        icon={Image}
      >
        <div className="[&>div>div:first-child]:rounded-xl [&>div>div:first-child]:border [&>div>div:first-child]:border-blue-200 [&>div>div:first-child]:bg-[linear-gradient(145deg,#f3f8ff,#fff)] [&>div>div:first-child]:px-3 [&>div>div:first-child]:py-4 [&>div>div:first-child_p:first-of-type]:text-[13px] [&>div>div:first-child_p:first-of-type]:text-slate-700 [&>div>div:first-child_p:last-of-type]:text-[12px] [&>div>div:first-child_p:last-of-type]:leading-[1.6]">
          <ImageUpload
            multiple
            maxFiles={MAX_TOUR_IMAGES}
            previewLayout="carousel"
            label="Kéo thả ảnh vào đây hoặc nhấn để chọn"
            value={tour.images || []}
            onChange={(urls) =>
              onTourChange((previous) => ({
                ...previous,
                images: urls as string[],
              }))
            }
          />
        </div>
        <p className="text-[12px] leading-[1.6] text-[#7387aa] mt-2.5">
          Tối đa {MAX_TOUR_IMAGES} ảnh. Ảnh đầu tiên được dùng làm ảnh bìa.
        </p>
      </TourEditorCard>
      <TourEditorCard
        id="tour-settings"
        title="Thời lượng"
        description="Thời gian của tour."
        icon={Clock3}
      >
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                key: "duration_days",
                label: "Số ngày",
                min: 1,
                icon: CalendarDays,
              },
              { key: "duration_nights", label: "Số đêm", min: 0, icon: Moon },
            ] as const
          ).map((item) => {
            const count = Number(tour[item.key] ?? item.min);
            const Icon = item.icon;
            const minimum =
              item.key === "duration_nights" ? nightRange.min : item.min;
            const maximum =
              item.key === "duration_nights" ? nightRange.max : undefined;
            return (
              <div key={item.key} className="flex min-w-0 flex-col gap-1.5">
                <label htmlFor={item.key} className="flex items-center gap-1.5 text-[13px] leading-[1.5] font-[650] text-[#0b1747]">
                  {item.label} <span className="text-[#ed5f6c]">*</span>
                </label>
                <div className="grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-1 rounded-lg border border-[#dce7f7] bg-[#f9fbff] px-2 py-2">
                  <button
                    type="button"
                    className="grid size-5.5 shrink-0 place-items-center rounded-full bg-[#eaf0f8] text-[#53627d] hover:bg-blue-100 hover:text-[#075bff] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={lockCoreFields || count <= minimum}
                    aria-label={"Giảm " + item.label.toLowerCase()}
                    onClick={() => changeDuration(item.key, count - 1)}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="flex min-w-0 items-center justify-center gap-1 [&>svg]:shrink-0 [&>svg]:text-[#8090a9]">
                    <Icon size={15} />
                    <input
                      id={item.key}
                      type="number"
                      min={minimum}
                      max={maximum}
                      step={1}
                      disabled={lockCoreFields}
                      value={count}
                      aria-invalid={!durationValid}
                      aria-describedby="tour-duration-help"
                      className="w-10 min-w-0 [appearance:textfield] bg-transparent p-0 text-center text-[14px] font-[650] text-slate-900 outline-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                      onChange={(event) =>
                        changeDuration(item.key, Number(event.target.value))
                      }
                    />
                  </span>
                  <button
                    type="button"
                    className="grid size-5.5 shrink-0 place-items-center rounded-full bg-[#eaf0f8] text-[#53627d] hover:bg-blue-100 hover:text-[#075bff] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={
                      lockCoreFields ||
                      (maximum !== undefined && count >= maximum)
                    }
                    aria-label={"Tăng " + item.label.toLowerCase()}
                    onClick={() => changeDuration(item.key, count + 1)}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p
          id="tour-duration-help"
          className={
            durationValid ? "text-[12px] leading-[1.6] text-[#7387aa] mt-2.5" : "mt-2.5 text-[12px] leading-[1.6] text-rose-600 font-medium"
          }
          role={durationValid ? undefined : "alert"}
        >
          Số đêm từ {nightRange.min} đến {nightRange.max}, chênh tối đa 1 so với
          số ngày.
        </p>
      </TourEditorCard>
      <div ref={controlsRef} className="flex shrink-0 flex-col gap-4 lg:sticky lg:top-[min(16px,calc(100dvh_-_var(--tour-controls-height,600px)_-_16px))] lg:z-[5]">
        <TourEditorCard
          title="Quản lý chốt khách"
          description="Thiết lập thời hạn chốt khách cho tour."
          icon={UsersRound}
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor="tour-cut-off" className="flex items-center gap-1.5 text-[13px] leading-[1.5] font-[650] text-[#0b1747]">
              Chốt trước (giờ) <span className="text-[#ed5f6c]">*</span>
            </label>
            <div className="relative">
              <Clock3 size={17} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#7e8da5]" />
              <input
                id="tour-cut-off"
                type="number"
                min={0}
                step={1}
                className="w-full rounded-lg border border-[#dce7f7] bg-[#f8faff] px-3 py-2 text-[13px] leading-[1.5] text-slate-800 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-[#075bff] focus:bg-white focus:shadow-[0_0_0_3px_#e8f1ff] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 read-only:cursor-not-allowed read-only:bg-slate-100 read-only:text-slate-500 pl-9"
                value={tour.cut_off_hours ?? ""}
                placeholder="24"
                onChange={(event) =>
                  onTourChange((previous) => ({
                    ...previous,
                    cut_off_hours:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <p className="mt-2.5 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/70 p-2.5 text-[12px] leading-[1.6] text-slate-600 [&_svg]:mt-0.5 [&_svg]:shrink-0 [&_svg]:text-[#075bff]">
            <Info size={16} />
            <span>
              Tour tự động ngừng nhận đặt chỗ trước giờ khởi hành theo thời hạn
              này.
            </span>
          </p>
        </TourEditorCard>
        <TourEditorCard
          title="Giá tour & Phụ thu"
          description="Giá cơ bản và phụ thu phòng đơn mặc định."
          icon={Coins}
        >
          <div className="space-y-3">
            <div>
              <label htmlFor="tour-base-price" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-[650] text-[#0b1747]">
                <Coins size={14} className="text-[#075bff]" />
                Giá cơ bản (Người lớn)
              </label>
              <VndPriceInput
                id="tour-base-price"
                value={tour.base_price ?? 0}
                onChange={(value) =>
                  onTourChange((previous) => ({
                    ...previous,
                    base_price: Number(value),
                  }))
                }
                placeholder="Ví dụ: 5.000.000"
              />
            </div>
            <div>
              <label htmlFor="tour-single-room-surcharge" className="mb-1.5 flex items-center gap-1.5 text-[12px] font-[650] text-[#0b1747]">
                <BedDouble size={14} className="text-[#075bff]" />
                + Phòng đơn (mặc định)
              </label>
              <VndPriceInput
                id="tour-single-room-surcharge"
                value={tour.single_room_surcharge ?? 0}
                onChange={(value) =>
                  onTourChange((previous) => ({
                    ...previous,
                    single_room_surcharge: Number(value),
                  }))
                }
                placeholder="Ví dụ: 1.000.000"
              />
            </div>
          </div>
        </TourEditorCard>
        <button
          type="button"
          onClick={onSave}
          disabled={readOnly || saving}
          className="relative flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#075bff] bg-[#075bff] px-6 py-3 text-[14px] font-[650] text-white shadow-sm transition-colors duration-180 hover:bg-[#064ddd] disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={19} />
          ) : success ? (
            <CheckCircle2 size={19} />
          ) : (
            <Plane size={19} />
          )}
          <span>
            {saving
              ? "Đang lưu..."
              : success
                ? "Đã lưu thành công"
                : mode === "create"
                  ? "Hoàn tất & Tạo Tour"
                  : "Lưu thay đổi"}
          </span>
          {!saving && !success && (
            <ArrowRight size={18} className="absolute right-4" />
          )}
        </button>
        <p className="text-center text-[12px] text-[#7387aa]">
          {mode === "create"
            ? "Hoàn tất thông tin để tạo hành trình mới."
            : "Các thay đổi sẽ được cập nhật cho tour này."}
        </p>
      </div>
    </aside>
  );
}
