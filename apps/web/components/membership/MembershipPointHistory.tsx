import Link from 'next/link';
import type { MembershipSummary } from 'shared';

export function MembershipPointHistory({ summary, admin = false }: { summary: MembershipSummary; admin?: boolean }) {
  return <section className={`rounded-2xl border p-5 ${admin ? 'border-slate-200 bg-white text-slate-700' : 'border-white/10 bg-[#122238]/45 text-slate-200'}`}>
    <h2 className="font-bold">Ví điểm & Lịch sử giao dịch</h2>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <p>Khả dụng<strong className="mt-1 block text-xl text-blue-500">{(summary.pointsBalance ?? 0).toLocaleString('vi-VN')} điểm</strong></p>
      <p>Đang giữ cho booking<strong className="mt-1 block text-xl">{(summary.pointsHeld ?? 0).toLocaleString('vi-VN')} điểm</strong></p>
    </div>
    {!!summary.pointsDebt && <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-600">Cần bù {summary.pointsDebt.toLocaleString('vi-VN')} điểm do điều chỉnh/hoàn tiền sau khi đã tiêu điểm. Điểm tích lũy tiếp theo sẽ bù khoản này trước.</p>}
    <p className="mt-3 text-xs opacity-70">Điểm không đặt lại theo chu kỳ xét hạng và hiện không hết hạn. Hiển thị 100 giao dịch gần nhất.</p>
    <ul className="mt-4 divide-y divide-current/10">{summary.pointTransactions?.map(item => <li key={item.id} className="flex items-start justify-between gap-3 py-3 text-xs">
      <div><p className="font-medium">{item.description}</p><p className="mt-1 opacity-60">{new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>{item.bookingId && <Link className="mt-1 block text-blue-500 underline" href={admin ? `/admin/bookings?search=${item.bookingId}` : `/booking/${item.bookingId}`}>Booking #{item.bookingId}</Link>}</div>
      <div className="shrink-0 text-right"><p className={`font-bold ${item.points > 0 ? 'text-emerald-500' : item.points < 0 ? 'text-rose-500' : ''}`}>{item.points > 0 ? '+' : ''}{item.points.toLocaleString('vi-VN')} điểm</p>{item.reserved !== 0 && <p className="mt-1 opacity-70">{item.reserved > 0 ? 'Giữ' : 'Bỏ giữ'} {Math.abs(item.reserved).toLocaleString('vi-VN')} điểm</p>}</div>
    </li>)}</ul>
    {!summary.pointTransactions?.length && <p className="py-5 text-center text-xs opacity-60">Chưa có giao dịch điểm.</p>}
  </section>;
}
