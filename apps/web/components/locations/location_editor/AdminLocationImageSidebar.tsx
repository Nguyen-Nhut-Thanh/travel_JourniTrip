"use client";

import { ContentImageUpload } from "@/components/common/form_controls/ContentImageUpload";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { LOCATION_LEVEL_LABELS } from "@/lib/locations/admin/hierarchy";
import { Eye, ImageIcon, Loader2, MapPin, Mountain, Save } from "lucide-react";
import type { LocationImageSidebarProps } from "shared";
import { useAdminContentReadOnly } from '@/components/common/admin_shared/guards/AdminContentPermission';

export function LocationImageSidebar({ form, uploading, saving, onFormChange, onUploadingChange, onCancel, onSave, parentLabel }: LocationImageSidebarProps & { parentLabel?: string }) {
  const readOnly = useAdminContentReadOnly();
  return (
    <div className="space-y-3">
      <section className="rounded-[14px] border border-[#e1edfc] bg-white p-4.5 sm:p-5 shadow-2xs">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#075bff]"><ImageIcon size={18} /></span>
          <div><h2 className="text-[15px] font-bold text-[#07123e]">Ảnh bìa địa điểm</h2><p className="mt-0.5 text-xs text-[#7187a9]">Tải lên hình ảnh đại diện cho địa điểm này.</p></div>
        </div>
        <ContentImageUpload
          resource="location"
          value={form.image_url}
          disabled={readOnly || saving}
          label="Chọn ảnh bìa địa điểm"
          onUploadingChange={onUploadingChange}
          onChange={value => onFormChange(previous => ({
            ...previous,
            image_url: Array.isArray(value) ? value[0] || "" : value,
          }))}
        />
      </section>

      <section className="rounded-[14px] border border-[#e1edfc] bg-white p-4.5 sm:p-5 shadow-2xs">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#075bff]"><Eye size={18} /></span>
          <div><h2 className="text-[15px] font-bold text-[#07123e]">Xem trước</h2><p className="mt-0.5 text-xs text-[#7187a9]">Thông tin địa điểm đang thiết lập.</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-[#e1edfc] bg-slate-50/70 p-3">
          <div className="flex aspect-square w-[28%] max-w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-blue-50 border border-[#e1edfc]">
            {form.image_url ? <ImageWithFallback src={form.image_url} alt="Ảnh xem trước" className="h-full w-full object-cover" /> : <ImageIcon size={22} className="text-blue-300" />}
          </div>
          <div className="min-w-0 space-y-1.5">
            <h3 className="break-words text-sm font-bold text-[#07123e]">{form.name || "Tên địa điểm"}</h3>
            <p className="flex items-start gap-1 text-[11px] text-[#7187a9]"><MapPin size={12} className="mt-0.5 shrink-0 text-[#075bff]" /><span>{parentLabel || (form.level_id === 3 ? form.name || "Quốc gia" : "Chưa chọn vị trí")}</span></p>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/80 px-2 py-0.5 text-[10px] font-semibold text-blue-700"><Mountain size={11} />{LOCATION_LEVEL_LABELS[form.level_id]}</span>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2 pt-1">
        <button type="button" onClick={onSave} disabled={readOnly || saving || uploading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#075bff] hover:bg-[#064ddd] px-4 py-2.5 text-xs font-[650] text-white shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-wait disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Lưu địa điểm
        </button>
        <button type="button" onClick={onCancel} disabled={saving || uploading} className="inline-flex w-full items-center justify-center rounded-xl border border-[#e1edfc] bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-[#526b92] transition-colors disabled:opacity-50">
          Hủy bỏ
        </button>
      </div>
    </div>
  );
}
