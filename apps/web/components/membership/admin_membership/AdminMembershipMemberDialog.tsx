"use client";
import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { MembershipSummary } from 'shared';
import { getMemberDetails, adjustMembershipPoints } from '@/lib/membership/admin/api';
import { formatVND } from '@/lib/utils/currency';
import { membershipDate, type MemberRow } from './AdminMembershipMembersTable';
import { MembershipTierPreview } from './AdminMembershipTierPreview';
import { MembershipPointHistory } from '../MembershipPointHistory';

export function MembershipMemberDialog({ member, onClose }: { member: MemberRow; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<MembershipSummary | null>(null), [error, setError] = useState('');
  const [revision, setRevision] = useState(0), [points, setPoints] = useState(''), [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false), [notice, setNotice] = useState('');
  const request = useRef<{ points: number; reason: string; id: string } | null>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => { let active = true; setError(''); getMemberDetails(member.userId).then(result => { if (active) setData(result); }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải hồ sơ.'); }); return () => { active = false; }; }, [member.userId, revision]);
  async function adjust(e: React.FormEvent) {
    e.preventDefault(); if (saving) return;
    const amount = Number(points), text = reason.trim();
    if (!Number.isSafeInteger(amount) || !amount || Math.abs(amount) > 1000000 || text.length < 5) { setError('Nhập số điểm nguyên khác 0 và lý do ít nhất 5 ký tự.'); return; }
    if (!request.current || request.current.points !== amount || request.current.reason !== text) request.current = { points: amount, reason: text, id: crypto.randomUUID() };
    setSaving(true); setError(''); setNotice('');
    try { setData(await adjustMembershipPoints(member.userId, amount, text, request.current.id)); setPoints(''); setReason(''); request.current = null; setNotice('Đã điều chỉnh điểm và lưu người thực hiện cùng lý do.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể điều chỉnh điểm.'); }
    finally { setSaving(false); }
  }
  return <dialog ref={dialog} aria-labelledby="member-detail-title" onCancel={e => { if (saving) e.preventDefault(); else onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_32px)] max-w-[1000px] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-white p-5"><div><h2 id="member-detail-title" className="font-bold">{member.name}</h2><p className="mt-1 text-xs text-slate-500">{member.email}</p></div><button disabled={saving} aria-label="Đóng hồ sơ" onClick={onClose} className="p-1.5"><X size={19} /></button></header>
    {error && <p role="alert" className="m-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}<button onClick={() => setRevision(v => v + 1)} className="ml-3 underline">Tải lại</button></p>}
    {notice && <p role="status" className="m-5 text-sm text-emerald-700">{notice}</p>}
    {!data ? !error && <Loader2 className="m-12 mx-auto animate-spin" aria-label="Đang tải hồ sơ" /> : <div className="grid items-start gap-5 p-5 md:grid-cols-[1.4fr_1fr]"><div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">{[['Chi tiêu kỳ này',formatVND(data.spending)],['Ngày xét lại',membershipDate(data.cycleEnd)]].map(([label,value]) => <div key={label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-sm font-bold">{value}</p></div>)}</div>
      <MembershipPointHistory summary={data} admin />
      <form onSubmit={adjust} className="space-y-3 rounded-2xl border bg-white p-5"><h3 className="text-sm font-bold">Điều chỉnh điểm</h3><label className="block text-xs">Số điểm (âm để trừ, dương để cộng)<input type="number" required step={1} min={-1000000} max={1000000} disabled={saving} value={points} onChange={e => setPoints(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><label className="block text-xs">Lý do<textarea required minLength={5} maxLength={400} disabled={saving} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu điều chỉnh'}</button></form>
      <section className="rounded-2xl border bg-white p-5"><h3 className="text-sm font-bold">Voucher hội viên</h3><ul className="mt-3 space-y-2">{data.vouchers.map(v => <li key={v.voucher_id} className="text-xs"><strong>{v.code}</strong> · {v.state === 'available' ? 'Khả dụng' : v.state === 'used' ? 'Đã dùng' : v.state === 'upcoming' ? 'Sắp có hiệu lực' : 'Hết hạn'}</li>)}</ul></section>
    </div><MembershipTierPreview tier={data.tier} /></div>}
  </dialog>;
}
