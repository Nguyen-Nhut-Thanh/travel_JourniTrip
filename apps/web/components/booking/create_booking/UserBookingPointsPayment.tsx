"use client";
import { maxBookingPoints, MEMBERSHIP_POINTS_POLICY } from 'shared';
import { formatVND } from '@/lib/utils/currency';

export function UserBookingPointsPayment({ balance, amount, points, disabled, onChange }: { balance: number; amount: number; points: number; disabled: boolean; onChange: (points: number) => void }) {
  const max = maxBookingPoints(amount, balance);
  return <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
    <h2 className="font-bold text-slate-900">Dùng điểm thành viên</h2>
    <p className="mt-2 text-xs leading-5 text-slate-500">Khả dụng: <strong className="text-blue-600">{balance.toLocaleString('vi-VN')} điểm</strong>. 1 điểm = {formatVND(MEMBERSHIP_POINTS_POLICY.valueVnd)}, tối đa {MEMBERSHIP_POINTS_POLICY.maxPaymentPercent}% số tiền sau ưu đãi.</p>
    <div className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-36 flex-1 text-xs text-slate-600">Số điểm sử dụng<input type="number" min={0} max={max} step={1} disabled={disabled || max === 0} value={points} onChange={e => onChange(Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))))} className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:opacity-60" /></label><button type="button" disabled={disabled || max === 0} onClick={() => onChange(points ? 0 : max)} className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 disabled:opacity-50">{points ? 'Bỏ dùng điểm' : 'Dùng tối đa'}</button></div>
    <p className="mt-3 text-xs leading-5 text-slate-500">{points ? `Giảm ${formatVND(points * MEMBERSHIP_POINTS_POLICY.valueVnd)}. ` : ''}Điểm được giữ khi đặt tour và trừ sau khi thanh toán thành công. Nếu hủy sau thanh toán, điểm được hoàn theo tỷ lệ hoàn của phần dịch vụ hủy; công ty hủy toàn bộ thì hoàn lại điểm.</p>
  </section>;
}
