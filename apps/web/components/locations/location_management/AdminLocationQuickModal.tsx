"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { AdminModalShell } from "@/components/common/admin_shared/layout/AdminModalShell";
import { slugifyLocationName } from "@/lib/locations/admin/hierarchy";
import type { LocationQuickPayload } from "@/lib/locations/admin/explorer";
import { LOCATION_TYPE_BY_LEVEL, type LocationItem } from "shared";

export type LocationQuickModalState = {
  mode: "create" | "edit";
  target: LocationItem;
  level: number;
  provinces: LocationItem[];
  countryCode?: string | null;
};

export function LocationQuickModal({ state, onClose, onSave, onSaved }: {
  state: LocationQuickModalState;
  onClose: () => void;
  onSave: (id: number | null, payload: LocationQuickPayload) => Promise<LocationItem | null>;
  onSaved: (item: LocationItem) => void;
}) {
  const id = useId();
  const editing = state.mode === "edit";
  const [name, setName] = useState(editing ? state.target.name : "");
  const [slug, setSlug] = useState(editing ? state.target.slug : "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [note, setNote] = useState(editing ? state.target.note || "" : "");
  const [featured, setFeatured] = useState(editing ? !!state.target.is_featured : false);
  const [provinceId, setProvinceId] = useState(state.target.level_id === 5 ? String(state.target.location_id) : "");
  const [saving, setSaving] = useState(false);
  const title = editing ? "Chỉnh sửa thông tin" : state.level === 4 ? "Thêm miền mới" : state.level === 5 ? "Thêm tỉnh/thành phố mới" : "Thêm địa điểm tham quan mới";
  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60";

  return <AdminModalShell title={title} onClose={() => { if (!saving) onClose(); }} maxWidthClassName="max-w-md">
    <form className="space-y-4 p-5" onSubmit={async event => {
      event.preventDefault();
      if (saving || !name.trim() || !slug.trim()) return;
      const parentId = state.level === 6 ? Number(provinceId) : state.target.location_id;
      if (!editing && (!Number.isSafeInteger(parentId) || parentId <= 0)) return;
      const payload: LocationQuickPayload = { name: name.trim(), slug: slug.trim(), note: note.trim(), is_featured: featured };
      if (!editing) Object.assign(payload, { level_id: state.level, parent_id: parentId, location_type: LOCATION_TYPE_BY_LEVEL[state.level], country_code: state.countryCode });
      setSaving(true);
      try {
        const item = await onSave(editing ? state.target.location_id : null, payload);
        if (item) { onSaved(item); onClose(); }
      } finally { setSaving(false); }
    }}>
      <p className="text-xs text-slate-400">Đang thao tác tại: <strong className="text-slate-600">{state.target.name}</strong></p>
      <fieldset disabled={saving} className="space-y-4">
        {!editing && state.level === 6 && <div className="space-y-1.5"><label htmlFor={`${id}-province`} className="block text-xs font-semibold text-slate-700">Tỉnh/Thành phố trực thuộc *</label><select id={`${id}-province`} required value={provinceId} onChange={event => setProvinceId(event.target.value)} className={inputClass}><option value="">Chọn tỉnh/thành phố</option>{state.provinces.map(province => <option key={province.location_id} value={province.location_id}>{province.name}</option>)}</select></div>}
        <div className="space-y-1.5"><label htmlFor={`${id}-name`} className="block text-xs font-semibold text-slate-700">Tên hiển thị *</label><input id={`${id}-name`} required autoFocus maxLength={255} value={name} onChange={event => { setName(event.target.value); if (!editing && !slugEdited) setSlug(slugifyLocationName(event.target.value)); }} placeholder="Nhập tên địa danh hoặc điểm tham quan..." className={inputClass} /></div>
        <div className="space-y-1.5"><label htmlFor={`${id}-slug`} className="block text-xs font-semibold text-slate-700">Slug URL *</label><input id={`${id}-slug`} required maxLength={255} value={slug} onChange={event => { setSlugEdited(true); setSlug(event.target.value); }} placeholder="ten-dia-diem" className={`${inputClass} font-mono text-xs`} /><p className="text-[11px] text-slate-400">Slug được tạo từ tên khi thêm mới.</p></div>
        <div className="space-y-1.5"><label htmlFor={`${id}-note`} className="block text-xs font-semibold text-slate-700">Mô tả ngắn gọn</label><textarea id={`${id}-note`} rows={3} value={note} onChange={event => setNote(event.target.value)} placeholder="Mô tả đặc điểm nổi bật của địa danh..." className={`${inputClass} resize-none`} /></div>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-amber-200/70 bg-amber-50/60 p-3"><input type="checkbox" checked={featured} onChange={event => setFeatured(event.target.checked)} className="accent-amber-500" /><span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800"><Star size={14} className="fill-amber-400 text-amber-500" />Đánh dấu là địa điểm nổi bật</span></label>
      </fieldset>
      {editing && <Link href={`/admin/locations/${state.target.location_id}`} className="inline-block text-[11px] font-semibold text-blue-600 hover:underline">Mở trang chỉnh sửa đầy đủ</Link>}
      <footer className="flex justify-end gap-2 border-t border-slate-100 pt-3"><button type="button" disabled={saving} onClick={onClose} className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-50">Hủy bỏ</button><button type="submit" disabled={saving} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving && <Loader2 size={13} className="animate-spin" />}{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></footer>
    </form>
  </AdminModalShell>;
}
