"use client";

import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { TOUR_AMENITY_DEFINITIONS, type TourAmenity } from 'shared';
import { AdminFormCard } from '@/components/common/admin_shared/layout/AdminFormCard';
import CustomDropdown from '@/components/common/form_controls/CustomDropdown';

type EditableAmenity = TourAmenity & { is_visible?: boolean };

export function TourAmenitiesEditor({ value, onChange, scheduleMode = false, embedded = false }: {
  value: EditableAmenity[];
  onChange: (value: EditableAmenity[]) => void;
  scheduleMode?: boolean;
  embedded?: boolean;
}) {
  const entryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const change = (index: number, patch: Partial<EditableAmenity>) => onChange(value.map((item, position) => position === index ? { ...item, ...patch } : item));
  const move = (index: number, direction: number) => {
    const next = [...value];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    onChange(next.map((item, sort_order) => ({ ...item, sort_order })));
  };
  const selectAmenity = (kind: string) => {
    const definition = TOUR_AMENITY_DEFINITIONS.find(item => item.key === kind);
    if (!definition) return;
    if (!value.some(item => item.kind === kind)) {
      onChange([...value, { kind: definition.key, title: definition.title, content: '', sort_order: value.length }]);
    }
    requestAnimationFrame(() => {
      const entry = entryRefs.current[kind];
      entry?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      entry?.querySelector<HTMLInputElement>('input:not([type="checkbox"])')?.focus({ preventScroll: true });
    });
  };
  const fields = <div className="space-y-4">
    <p className="text-[12px] leading-6 text-[#7387aa]">{scheduleMode
      ? 'Chỉnh sửa bản riêng của chuyến này. Khách sạn và xe lấy thêm thông tin từ phân bổ của chuyến; dùng ô Hiển thị để ẩn cả thẻ nếu cần.'
      : 'Tiện ích mẫu được sao chép khi tạo lịch khởi hành mới. Sửa mẫu tại đây không thay đổi các chuyến đã có. Khách sạn và xe sẽ lấy thông tin thực tế theo từng chuyến.'}</p>
    {value.map((item, index) => <div key={item.kind} ref={element => { entryRefs.current[item.kind] = element; }} className="space-y-3 rounded-xl border border-[#e1edfc] bg-[#f8fbff] p-3.5 sm:p-4">
      <div className="flex items-center justify-between gap-2 border-b border-[#edf2fb] pb-2">
        <span className="text-[13px] font-[650] text-[#075bff]">{TOUR_AMENITY_DEFINITIONS.find(def => def.key === item.kind)?.title}</span>
        <div className="flex gap-1">
          <button type="button" aria-label={`Đưa ${item.title} lên`} disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg p-1.5 hover:bg-white text-slate-500 hover:text-slate-800 disabled:opacity-30"><ArrowUp size={16} /></button>
          <button type="button" aria-label={`Đưa ${item.title} xuống`} disabled={index === value.length - 1} onClick={() => move(index, 1)} className="rounded-lg p-1.5 hover:bg-white text-slate-500 hover:text-slate-800 disabled:opacity-30"><ArrowDown size={16} /></button>
          <button type="button" aria-label={`Xóa ${item.title}`} onClick={() => onChange(value.filter((_, position) => position !== index))} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>
        </div>
      </div>
      {scheduleMode && <label className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
        <input type="checkbox" className="size-4 accent-[#075bff]" checked={item.is_visible !== false} onChange={event => change(index, { is_visible: event.target.checked })} />
        Hiển thị tiện ích
      </label>}
      <label className="block space-y-1.5 text-[12px] font-[650] text-[#0b1747]"><span>Tiêu đề thẻ</span>
        <input maxLength={150} value={item.title} onChange={event => change(index, { title: event.target.value })} className="min-h-10 w-full rounded-lg border border-[#dce7f7] bg-white px-3 py-2 text-[13px] font-medium text-slate-800 outline-none focus:border-[#075bff] focus:shadow-[0_0_0_3px_#e8f1ff]" />
      </label>
      <label className="block space-y-1.5 text-[12px] font-[650] text-[#0b1747]"><span>Nội dung chi tiết{item.kind === 'hotel' || item.kind === 'transport' ? ' (ghi chú bổ sung)' : ''}</span>
        <textarea rows={4} maxLength={20000} value={item.content} onChange={event => change(index, { content: event.target.value })} placeholder={item.kind === 'insurance' ? 'Đơn vị bảo hiểm, phạm vi, mức chi trả và điều kiện áp dụng…' : 'Nội dung hiển thị khi khách bấm vào tiện ích…'} className="w-full resize-y rounded-lg border border-[#dce7f7] bg-white px-3 py-2 text-[13px] font-normal leading-6 text-slate-700 outline-none focus:border-[#075bff] focus:shadow-[0_0_0_3px_#e8f1ff]" />
      </label>
    </div>)}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <span className="flex shrink-0 items-center gap-2 text-[13px] font-[650] text-[#075bff]"><Plus size={18} />Thêm tiện ích</span>
      <CustomDropdown
        ariaLabel="Loại tiện ích cần thêm"
        placeholder="Chọn loại tiện ích"
        selectedValue=""
        options={TOUR_AMENITY_DEFINITIONS.map(definition => ({
          value: definition.key,
          label: `${definition.title}${value.some(item => item.kind === definition.key) ? ' (đã thêm)' : ''}`,
        }))}
        onSelect={selectAmenity}
        variant="compact"
        matchTriggerWidth
        className="min-w-0 flex-1 [&_button[aria-haspopup=listbox]]:min-w-0 [&_button[aria-haspopup=listbox]]:rounded-lg [&_button[aria-haspopup=listbox]]:border-[#dce7f7] [&_button[aria-haspopup=listbox]]:bg-[#f8faff] [&_button[aria-haspopup=listbox]]:text-[13px]"
      />
    </div>
    <p className="text-xs text-[#7387aa]">Chọn mục “đã thêm” để chuyển đến phần chỉnh sửa.</p>
  </div>;
  return embedded ? fields : <AdminFormCard title="Tiện ích mẫu của tour" icon={<Sparkles className="h-5 w-5 text-sky-500" />} bodyClassName="p-6">{fields}</AdminFormCard>;
}
