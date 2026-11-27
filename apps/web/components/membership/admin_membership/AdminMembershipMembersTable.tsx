import { AdminSearchInput } from "@/components/common/admin_shared/tables/AdminSearchInput";
import { Eye, Loader2, Users } from "lucide-react";
import type { MembershipAdminList } from "shared";
import { formatVND } from "@/lib/utils/currency";
import { tierStyles } from "@/components/membership/admin_membership/AdminMembershipTierPreview";

export type MemberRow = MembershipAdminList["items"][number];
export const membershipDate = (value: string | null) => value ? new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "Chưa bắt đầu";

export function MembershipMembersTable({ data, page, search, filter, loading, onSearch, onFilter, onPage, onDetails }: {
  data: MembershipAdminList; page: number; search: string; filter: string; loading: boolean;
  onSearch: (value: string) => void; onFilter: (value: string) => void; onPage: (value: number) => void; onDetails: (member: MemberRow) => void;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[14px] border border-[#e1edfc] bg-white shadow-sm" aria-busy={loading}>
      <header className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#0b1747]">
            <Users size={17} className="text-[#075bff]" />
            Danh sách hội viên ({data.total})
          </h2>
          <p className="mt-1 text-xs text-[#607599]">Chi tiêu, tiến độ thăng hạng và kỳ xét lại.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="min-w-52 flex-1">
            <AdminSearchInput
              loading={loading}
              aria-label="Tìm hội viên"
              value={search}
              onChange={value => onSearch(value)}
              placeholder="Tên, email, điện thoại, mã..."
              maxLength={200}
              inputClassName="w-full rounded-xl border border-[#dce7f7] bg-[#f8fbff] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#075bff] focus:bg-white"
            />
          </div>
          <select
            aria-label="Lọc theo hạng"
            value={filter}
            onChange={event => onFilter(event.target.value)}
            className="rounded-xl border border-[#dce7f7] bg-[#f8fbff] px-3 py-2 text-xs font-semibold text-[#0b1747] outline-none focus:border-[#075bff]"
          >
            <option value="all">Tất cả hạng</option>
            {data.tiers.map(tier => <option key={tier.id} value={tier.id}>{tier.name}</option>)}
          </select>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-xs">
          <thead className="border-y border-[#e1edfc] bg-[#f8fbff] text-[10px] font-bold uppercase tracking-wider text-[#607599]">
            <tr>
              {["Hội viên", "Hạng hiện tại", "Chi tiêu & tiến độ", "Ngày xét lại", "Voucher / Đơn", "Thao tác"].map(label => (
                <th key={label} scope="col" className="px-5 py-3.5 font-bold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e1edfc]">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-16 text-center">
                  <Loader2 size={22} className="mx-auto animate-spin text-[#075bff]" aria-label="Đang tải" />
                </td>
              </tr>
            ) : data.items.map(member => {
              const tier = data.tiers.find(t => t.id === member.tier) ?? data.tiers[0];
              const next = data.tiers[data.tiers.indexOf(tier) + 1];
              const progress = next ? Math.min(100, (member.spending / next.threshold) * 100) : 100;
              const days = member.cycleEnd ? Math.ceil((new Date(member.cycleEnd).getTime() - Date.now()) / 86400000) : null;
              return (
                <tr key={member.userId} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100/70 text-xs font-bold text-[#075bff]">
                        {member.name.split(' ').filter(Boolean).slice(-2).map(word => word[0]).join('')}
                      </span>
                      <div>
                        <p className="font-bold text-[#0b1747]">{member.name}</p>
                        <p className="mt-1 text-[11px] text-[#607599]">{member.email}</p>
                        <p className="mt-1 text-[10px] text-[#8aa0be]">TV-{String(member.userId).padStart(5, '0')}{member.phone ? ` · ${member.phone}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-semibold ${tierStyles[tier.id].badge}`}>
                      {tier.name}
                    </span>
                  </td>
                  <td className="min-w-52 px-5 py-4">
                    <p className="font-bold text-[#0b1747]">{formatVND(member.spending)}</p>
                    <div className="mt-2 h-1.5 max-w-44 overflow-hidden rounded-full bg-[#dce7f7]">
                      <div className="h-full rounded-full bg-[#075bff]" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-1.5 text-[10px] text-[#607599]">
                      {next ? `Còn ${formatVND(Math.max(0, next.threshold - member.spending))} lên ${next.name}` : 'Hạng cao nhất'}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="whitespace-nowrap text-[#4a6182]">{membershipDate(member.cycleEnd)}</p>
                    {days !== null && (
                      <p className={`mt-1.5 text-[10px] ${days <= 30 ? 'font-semibold text-amber-600' : 'text-[#8aa0be]'}`}>
                        {days <= 0 ? 'Đang chờ xét lại' : `Còn ${days} ngày`}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#0b1747]">{member.voucherCount} voucher</p>
                    <p className="mt-1.5 text-[10px] text-[#607599]">{member.bookingCount} đơn đặt tour</p>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      aria-label={`Chi tiết ${member.name}`}
                      onClick={() => onDetails(member)}
                      className="rounded-xl border border-[#dce7f7] bg-white p-2 text-[#4a6182] hover:border-blue-300 hover:bg-blue-50 hover:text-[#075bff] transition-colors"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && !data.items.length && (
        <div className="p-14 text-center text-sm text-[#607599]">Không có hội viên phù hợp.</div>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-[#e1edfc] px-5 py-4 text-xs text-[#607599]">
        <span>Trang {page} / {Math.max(1, Math.ceil(data.total / 20))}</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => onPage(page - 1)}
            className="rounded-xl border border-[#dce7f7] bg-white px-3 py-1.5 font-medium text-[#0b1747] hover:bg-blue-50/50 disabled:opacity-40 transition-colors"
          >
            Trước
          </button>
          <button
            type="button"
            disabled={loading || page * 20 >= data.total}
            onClick={() => onPage(page + 1)}
            className="rounded-xl border border-[#dce7f7] bg-white px-3 py-1.5 font-medium text-[#0b1747] hover:bg-blue-50/50 disabled:opacity-40 transition-colors"
          >
            Sau
          </button>
        </div>
      </footer>
    </section>
  );
}
