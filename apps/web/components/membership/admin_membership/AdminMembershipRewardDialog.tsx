"use client";
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { MembershipRewardItem } from 'shared';
import { createMembershipReward } from '@/lib/membership/admin/api';

export function AdminMembershipRewardDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (reward: MembershipRewardItem) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState(''), [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(100), [valueVnd, setValueVnd] = useState(100000);
  const [minOrder, setMinOrder] = useState(500000), [validityDays, setValidityDays] = useState(365);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    if (minOrder <= valueVnd) { setError('Đơn tối thiểu phải lớn hơn giá trị voucher.'); return; }
    const reward = { title: title.trim(), description: description.trim(), pointsCost, valueVnd, minOrder, validityDays };
    const fingerprint = JSON.stringify(reward);
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try { onCreated(await createMembershipReward(reward, request.current.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể thêm voucher.'); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="reward-dialog-title" onCancel={e => { if (busy) e.preventDefault(); else onClose(); }} className="m-auto w-[calc(100%_-_32px)] max-w-xl max-h-[90dvh] overflow-y-auto rounded-[14px] border border-[#e1edfc] bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-900/40">
    <header className="flex items-center justify-between"><h2 id="reward-dialog-title" className="text-xl font-bold text-[#0b1747]">Thêm voucher đổi điểm</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-600"><X size={20} /></button></header>
    <p className="mt-2 text-xs leading-5 text-[#7387aa]">Voucher sẽ xuất hiện trong kho đổi điểm của user sau khi lưu. Hạn dùng tính từ ngày khách đổi điểm lấy voucher.</p>
    <form onSubmit={submit} className="mt-5 space-y-4">
      <label className="block text-xs font-semibold text-slate-700">Tên voucher<input required minLength={3} maxLength={150} disabled={busy} value={title} onChange={e => setTitle(e.target.value)} placeholder="VD: Voucher tour 200.000đ" className="mt-1 w-full rounded-lg border border-[#dce7f7] bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#075bff]" /></label>
      <div className="grid grid-cols-2 gap-4">{[
        { label:'Điểm cần đổi', value:pointsCost, set:setPointsCost, min:1, max:1000000 },
        { label:'Giá trị giảm (đ)', value:valueVnd, set:setValueVnd, min:1000, max:1000000000 },
        { label:'Đơn tối thiểu (đ)', value:minOrder, set:setMinOrder, min:1, max:9999999999 },
        { label:'Hạn dùng (ngày)', value:validityDays, set:setValidityDays, min:1, max:365 },
      ].map(field => <label key={field.label} className="block text-xs font-semibold text-slate-700">{field.label}<input required type="number" step={1} min={field.min} max={field.max} disabled={busy} value={field.value} onChange={e => field.set(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#dce7f7] bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#075bff]" /></label>)}</div>
      <label className="block text-xs font-semibold text-slate-700">Mô tả và điều kiện sử dụng<textarea required minLength={5} maxLength={1000} disabled={busy} value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-[#dce7f7] bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#075bff]" /></label>
      {error && <p role="alert" className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">{error}</p>}
      <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-[#dce7f7] px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Để sau</button><button disabled={busy} className="flex items-center gap-2 rounded-[12px] bg-[#075bff] hover:bg-[#064ddd] px-4 py-2 text-xs font-[650] text-white shadow-sm transition-all disabled:opacity-50">{busy && <Loader2 size={16} className="animate-spin" />}{busy ? 'Đang lưu...' : 'Thêm voucher'}</button></div>
    </form>
  </dialog>;
}
