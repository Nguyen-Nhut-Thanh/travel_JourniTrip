"use client";
import { CheckCircle2, Eye, Gem } from 'lucide-react';
import { membershipBenefits, type MembershipTier, type MembershipTierId } from 'shared';
import { formatVND } from '@/lib/utils/currency';
export function UserMembershipTierGrid({ tiers, currentTierId, onPreviewTier }: { tiers: MembershipTier[]; currentTierId: MembershipTierId; onPreviewTier: (id: MembershipTierId) => void }) {
  return <section className="space-y-5"><div><h2 className="font-serif text-2xl font-bold text-white">Quyền lợi theo hạng thành viên</h2><p className="mt-2 text-xs text-slate-400">Chi tiêu hợp lệ trong chu kỳ 12 tháng; quyền lợi áp dụng theo hạng lúc đặt tour.</p></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{tiers.map(tier => <article key={tier.id} className={`flex flex-col rounded-3xl border p-4 ${tier.id === currentTierId ? 'border-amber-400 bg-amber-500/10' : 'border-white/10 bg-[#122238]/45'}`}>
    <div className="flex items-center justify-between"><h3 className="text-lg font-bold text-white">{tier.name}</h3><Gem className="size-5 text-amber-400" /></div>{tier.id === currentTierId && <p className="mt-1 text-xs text-amber-300">Hạng của bạn</p>}<div className="my-4 border-y border-white/10 py-3"><p className="text-xs text-slate-400">Điều kiện đạt hạng</p><p className="mt-1 text-sm font-bold text-white">{tier.threshold ? formatVND(tier.threshold) : 'Đăng ký miễn phí'}</p></div>
    <ul className="flex-1 space-y-3">{membershipBenefits(tier).map(text => <li key={text} className="flex gap-2 text-xs leading-5 text-slate-300"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-amber-400" />{text}</li>)}</ul>
    <button onClick={() => onPreviewTier(tier.id)} className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 py-2 text-xs font-bold text-amber-300"><Eye size={14} />Xem thẻ {tier.name}</button>
  </article>)}</div></section>;
}
