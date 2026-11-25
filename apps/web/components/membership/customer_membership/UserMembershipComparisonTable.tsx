import { Check, Minus } from 'lucide-react';
import { membershipBenefits, type MembershipTier, type MembershipTierId } from 'shared';
import { formatVND } from '@/lib/utils/currency';
const rows: { label: string; value: (t: MembershipTier) => string | boolean }[] = [
  { label: 'Chi tiêu xét hạng', value: t => formatVND(t.threshold) },
  { label: 'Giảm giá tour', value: t => t.tourDiscountPercent ? t.tourDiscountPercent + '%' : false },
  { label: 'Hệ số tích điểm', value: t => '×' + t.pointMultiplier.toLocaleString('vi-VN') },
  { label: 'Giảm dịch vụ đi kèm', value: t => t.serviceDiscountPercent ? t.serviceDiscountPercent + '%' : false },
  { label: 'Voucher sinh nhật', value: t => t.birthdayVoucherAmount ? formatVND(t.birthdayVoucherAmount) : false },
  { label: 'Voucher thăng hạng', value: t => t.id === 'bronze' ? false : membershipBenefits(t).find(text => text.startsWith('Voucher thăng hạng')) || false },
  { label: 'Ưu tiên xử lý yêu cầu giữ chỗ', value: t => t.priorityReservation },
];
export function UserMembershipComparisonTable({ tiers, currentTierId }: { tiers: MembershipTier[]; currentTierId: MembershipTierId }) {
  return <section className="space-y-4"><h2 className="font-serif text-2xl font-bold text-white">So sánh quyền lợi các hạng</h2><div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-white/5"><tr><th className="p-4">Quyền lợi</th>{tiers.map(t => <th key={t.id} className={`p-4 ${t.id === currentTierId ? 'text-amber-300' : 'text-white'}`}>{t.name}</th>)}</tr></thead><tbody className="divide-y divide-white/10">{rows.map(row => <tr key={row.label}><th className="p-4 font-medium text-slate-300">{row.label}</th>{tiers.map(t => { const value = row.value(t); return <td key={t.id} className="p-4 leading-5 text-slate-200">{typeof value === 'boolean' ? value ? <Check size={16} className="text-emerald-400" aria-label="Có" /> : <Minus size={16} aria-label="Không" /> : value}</td>; })}</tr>)}</tbody></table></div></section>;
}
