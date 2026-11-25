"use client";

import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Save, Users, Gift, Ticket, Crown, Sparkles, LayoutGrid, Award, Table, Sliders, Calculator, Pencil, CheckCircle2, X, Plus, Search } from 'lucide-react';
import { DEFAULT_MEMBERSHIP_REWARDS, MEMBERSHIP_POINTS_POLICY, membershipEarnedPoints, membershipBenefits, type MembershipAdminList, type MembershipTier, type MembershipTierId } from 'shared';
import { getAdminMembership, saveMembershipSettings } from '@/lib/membership/admin/api';
import { formatVND } from '@/lib/utils/currency';
import { UserMembershipComparisonTable } from '../customer_membership/UserMembershipComparisonTable';
import { MembershipTierSettings } from './AdminMembershipTierSettings';
import { MembershipTierPreview } from './AdminMembershipTierPreview';
import { type MemberRow } from './AdminMembershipMembersTable';
import { AdminMembershipRewardDialog } from './AdminMembershipRewardDialog';
import { MembershipMemberDialog } from './AdminMembershipMemberDialog';

const TIER_VISUALS: Record<MembershipTierId, { subtitle: string; cardClass: string; badgeColor: string }> = {"bronze":{"subtitle":"CLASSIC EXPLORER","cardClass":"card-member","badgeColor":"text-slate-300 bg-slate-800 border-slate-700"},"silver":{"subtitle":"EXPLORER SILVER","cardClass":"card-silver","badgeColor":"text-slate-100 bg-slate-600/50 border-slate-400/40"},"gold":{"subtitle":"PRESTIGE GOLD","cardClass":"card-gold","badgeColor":"text-amber-300 bg-amber-500/20 border-amber-400/40"},"platinum":{"subtitle":"SIGNATURE PLATINUM","cardClass":"card-platinum","badgeColor":"text-sky-300 bg-sky-500/20 border-sky-400/40"},"diamond":{"subtitle":"ROYAL DIAMOND","cardClass":"card-diamond","badgeColor":"text-purple-300 bg-purple-500/20 border-purple-400/40"}};
const formatNum = (n: number) => n.toLocaleString('vi-VN');
export function AdminMembershipLuxuryConsole() {
  const [data, setData] = useState<MembershipAdminList | null>(null);
  const [draft, setDraft] = useState<MembershipTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<MembershipTierId>('bronze');
  const [tab, setTab] = useState<'overview' | 'tiers' | 'members' | 'rewards' | 'matrix' | 'policies'>('overview');
  const [page, setPage] = useState(1), [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [revision, setRevision] = useState(0), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [member, setMember] = useState<MemberRow | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [simulatorSpend, setSimulatorSpend] = useState(50000000);
  const dirty = useRef(false);
  const settingsVersion = useRef(1);
  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      setLoading(true); setError('');
      getAdminMembership(page, search, filter).then(result => {
        if (!active) return;
        setData(result);
        if (!dirty.current) { setDraft(result.tiers); settingsVersion.current = result.programVersion ?? 1; }
      }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu.'); })
      .finally(() => { if (active) setLoading(false); });
    }, search ? 300 : 0);
    return () => { active = false; clearTimeout(timeout); };
  }, [page, search, filter, revision]);
  async function save() {
    if (saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const tiers = await saveMembershipSettings(draft, settingsVersion.current);
      setDraft(tiers); settingsVersion.current += 1; dirty.current = false;
      setNotice('Đã lưu cấu hình. User và admin áp dụng cùng quyền lợi; booking cũ giữ ưu đãi đã chốt.');
      setRevision(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu cấu hình.'); }
    finally { setSaving(false); }
  }
  const preview = draft.find(t => t.id === selectedTier) ?? draft[0];
  const tiers = draft.map(t => ({ ...t, ...TIER_VISUALS[t.id], minSpend: t.threshold, multiplier: t.pointMultiplier, perks: membershipBenefits(t) }));
  const basePts = simulatorSpend / MEMBERSHIP_POINTS_POLICY.earningBaseVnd;
  const openEditTier = (tier: {id: MembershipTierId}) => { setSelectedTier(tier.id); setEditOpen(true); };
return (<div className="membership-luxury min-h-screen bg-[#0B0F17] text-slate-200 font-sans antialiased selection:bg-[#F59E0B] selection:text-[#070A10] -mx-4 -mt-3 md:-mx-6 -mb-8 overflow-x-hidden"><style>{`.membership-luxury .bg-white { background-color:#0F1522; }.membership-luxury .bg-slate-50 { background-color:#0B0F17; }.membership-luxury .text-slate-900,.membership-luxury .text-slate-800,.membership-luxury .text-slate-700 { color:#e2e8f0; }.membership-luxury .border-slate-200,.membership-luxury .border-slate-100 { border-color:#1e293b; }.membership-luxury input,.membership-luxury select,.membership-luxury textarea {color:#e2e8f0;background-color:#0B0F17;}.membership-luxury button:disabled {opacity:.5;}.membership-luxury [class*="bg-blue-50"] {background-color:#111827;}.membership-luxury .bg-blue-600 {background-color:#fbbf24;color:#070A10;}.membership-luxury .text-blue-600,.membership-luxury .text-blue-700 {color:#fbbf24;}.membership-luxury .border-blue-100,.membership-luxury .border-blue-200 {border-color:#334155;}`}</style><style>{`
        .membership-luxury .text-slate-500,
        .membership-luxury .text-slate-600 { color: #94a3b8; }
        .membership-luxury .membership-tier-settings { box-shadow: none; }
        .membership-luxury .membership-tier-settings [data-expanded="true"] {
          background-color: #141d2c;
          border-color: #42516a;
        }
        .membership-luxury .membership-tier-settings .membership-tier-trigger {
          background-color: transparent;
          transition: background-color 160ms ease, color 160ms ease;
        }
        .membership-luxury .membership-tier-settings .membership-tier-trigger:hover {
          background-color: #202b3d;
        }
        .membership-luxury .membership-tier-settings .membership-tier-trigger:focus-visible {
          box-shadow: inset 0 0 0 2px #64748b;
        }
        .membership-luxury .membership-tier-settings [role="region"] { border-color: #334155; }
        .membership-luxury .membership-tier-settings [role="region"] > div { border-color: #334155; }
        .membership-luxury .membership-tier-settings input:focus {
          border-color: #64748b;
          box-shadow: 0 0 0 2px rgb(148 163 184 / 12%);
        }
        .membership-luxury .membership-tier-settings .membership-tier-badge {
          background-color: #263244;
          color: #cbd5e1;
          border-color: #475569;
        }
        .membership-luxury [data-membership-tier="gold"] .membership-tier-badge {
          background-color: rgb(245 158 11 / 12%); color: #fcd34d; border-color: rgb(245 158 11 / 30%);
        }
        .membership-luxury [data-membership-tier="platinum"] .membership-tier-badge {
          background-color: rgb(56 189 248 / 10%); color: #7dd3fc; border-color: rgb(56 189 248 / 25%);
        }
        .membership-luxury [data-membership-tier="diamond"] .membership-tier-badge {
          background-color: rgb(167 139 250 / 10%); color: #c4b5fd; border-color: rgb(167 139 250 / 25%);
        }
        .membership-luxury button[class*="hover:bg-amber-"]:hover {
          background-color: #3b2c15; color: #fde68a;
          box-shadow: none;
        }
        .membership-luxury button[class*="hover:bg-slate-50"]:hover,
        .membership-luxury button[class*="hover:bg-slate-100"]:hover {
          background-color: #202b3d;
        }
      `}</style>
      {/* Custom Styles for Metallic Cards and Slider */}
      <style>{`
        .card-member {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        .card-silver {
          background: linear-gradient(135deg, #475569 0%, #1e293b 50%, #334155 100%);
          border: 1px solid rgba(226, 232, 240, 0.35);
        }
        .card-gold {
          background: linear-gradient(135deg, #92400e 0%, #451a03 50%, #b45309 100%);
          border: 1px solid rgba(251, 191, 36, 0.5);
        }
        .card-platinum {
          background: linear-gradient(135deg, #1e293b 0%, #090d16 55%, #38bdf8 140%);
          border: 1px solid rgba(56, 189, 248, 0.35);
        }
        .card-diamond {
          background: linear-gradient(135deg, #311042 0%, #0b0f17 55%, #818cf8 140%);
          border: 1px solid rgba(167, 139, 250, 0.45);
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 9999px;
          background: #1e293b;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #f59e0b;
          border: 3px solid #0b0f17;
          box-shadow: 0 0 12px rgba(245, 158, 11, 0.8);
          margin-top: -6px;
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
      `}</style>

      {/* TOP BAR & HORIZONTAL PILL NAVIGATION */}
      <header className="bg-[#070A10] border-b border-slate-800/80 px-6 lg:px-10 pt-5 pb-4 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Top Brand Row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {/* Amber Square Crown Icon */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                <Crown size={22} className="text-[#070A10] stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-serif font-bold text-2xl tracking-tight text-white leading-none">
                    Journi<span className="text-amber-400">Trip</span>
                  </span>
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/35">
                    ADMIN PORTAL
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Loyalty &amp; Membership Management Console
                </p>
              </div>
            </div>

            {/* Right Publish Button */}
            <button
              type="button"
              onClick={save} disabled={saving || loading || !data}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#070A10] font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 shrink-0 cursor-pointer"
            >
              <Sparkles size={16} />
              <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
            </button>
          </div>

          {/* Pill Container Horizontal Navigation Bar */}
          <nav aria-label="Tabs" className="p-1.5 rounded-2xl bg-[#0B0F17]/90 border border-slate-800/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTab("overview")}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                tab === "overview"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <LayoutGrid size={16} />
              <span>Tổng Quan &amp; Thống Kê</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("tiers")}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                tab === "tiers"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <Award size={16} />
              <span>Cấu Hình 5 Hạng Thẻ &amp; Mô Phỏng</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("rewards")}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                tab === "rewards"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <Gift size={16} />
              <span>Kho Quà Đổi Điểm</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("matrix")}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                tab === "matrix"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <Table size={16} />
              <span>Ma Trận Quyền Lợi</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("members")}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                tab === "members"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <Users size={16} />
              <span>Sổ Điểm Hội Viên</span>
            </button>

            <button
              type="button"
              onClick={() => setTab("policies")}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                tab === "policies"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/40 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent font-medium"
              }`}
            >
              <Sliders size={16} />
              <span>Quy Định &amp; Chính Sách</span>
            </button>
          </nav>
        </div>
      </header>

      {/* LUXURY HERO SUB-BANNER */}
      <section aria-label="Hero" className="border-b border-slate-800/80 bg-gradient-to-r from-[#070A10] via-[#0B0F17] to-[#0F1522] px-6 lg:px-10 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-2">
              <Crown size={14} />
              <span>HỆ THỐNG ĐẶC QUYỀN THƯỢNG LƯU JOURNITRIP</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Quản Trị Hạng Thành Viên &amp; <span className="text-amber-400">Đặc Quyền Xứng Tầm</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Điều phối 5 cấp độ hội viên, hệ số tích lũy Pts, kho voucher đổi điểm và chính sách vận hành.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-[#111827] border border-slate-800 text-right">
              <div className="text-[11px] text-slate-400">Tỷ lệ quy đổi chuẩn</div>
              <div className="text-sm font-bold text-amber-400">
                {formatNum(MEMBERSHIP_POINTS_POLICY.earningBaseVnd)}đ = 1 Pts
              </div>
            </div>
            <button
              type="button"
              onClick={() => setRewardOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#070A10] font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>Thêm voucher đổi điểm</span>
            </button>
          </div>
        </div>
      </section>

<main className="max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-8">{error && <p role="alert" className="rounded-xl border border-rose-500/40 p-4 text-rose-300">{error} <button onClick={() => setRevision(v=>v+1)} className="underline">Thử lại</button></p>}{notice && <p role="status" className="rounded-xl border border-emerald-500/40 p-4 text-emerald-300">{notice}</p>}{!data ? <div className="p-16 text-center">{loading && <Loader2 className="mx-auto animate-spin" />}</div> : <>{tab === 'overview' && <section className="space-y-8"><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{[
 ['Tổng Hội Viên',data.memberTotal],['Voucher Cá Nhân Đã Cấp',data.issued],['Voucher Cá Nhân Đã Dùng',data.used],['Phiên Bản Cấu Hình',data.programVersion ?? 1]
].map(([label,value]) => <article key={label} className="p-5 rounded-2xl bg-[#0F1522] border border-slate-800 hover:border-amber-500/40"><div className="flex items-center justify-between mb-3"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span><Crown size={18} className="text-amber-400" /></div><div className="text-2xl font-bold text-white">{Number(value).toLocaleString('vi-VN')}</div><p className="mt-2 text-xs text-slate-400">Cập nhật từ hệ thống</p></article>)}</div><div className="grid grid-cols-1 lg:grid-cols-12 gap-6"><div className="lg:col-span-7 p-6 rounded-2xl bg-[#0F1522] border border-slate-800"><h2 className="font-serif text-xl font-bold text-white mb-6">Phân Bổ Hội Viên Theo 5 Cấp Độ</h2><div className="space-y-4">{tiers.map(t => { const count = data.tierCounts?.[t.id] ?? 0; const pct = data.memberTotal ? count / data.memberTotal * 100 : 0; return <div key={t.id}><div className="mb-2 flex justify-between text-xs"><strong>{t.name}</strong><span>{count} hội viên ({pct.toFixed(1)}%)</span></div><div className="h-2.5 overflow-hidden rounded-full border border-slate-800 bg-[#070A10]"><div className="h-full rounded-full bg-amber-400" style={{width:pct+'%'}} /></div></div>; })}</div></div><div className="lg:col-span-5 p-6 rounded-2xl bg-[#0F1522] border border-slate-800"><h2 className="font-serif text-xl font-bold text-white">Quản Lý Đặc Quyền Hội Viên</h2><p className="mt-3 text-sm leading-6 text-slate-400">Cấu hình quyền lợi, theo dõi ví điểm và voucher theo dữ liệu đang lưu trên hệ thống.</p><button onClick={() => setTab('members')} className="mt-6 rounded-xl border border-amber-500/40 px-4 py-2 text-sm text-amber-400">Xem sổ điểm hội viên</button><button disabled={loading} onClick={() => setRevision(v=>v+1)} className="ml-3 mt-3 text-xs text-slate-400">Tải lại dữ liệu</button></div></div></section>}        {tab === "tiers" && (
          <section className="space-y-8">
            {/* Admin Simulator */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#0F1522] border border-slate-800 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                    <Calculator size={14} />
                    <span>Công Cụ Kiểm Thử Công Thức</span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-white">
                    Bộ Mô Phỏng Tích Điểm Thưởng (Admin Simulator)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Kiểm tra nhanh số điểm Pts khách hàng nhận được ở từng hạng thẻ khi điều chỉnh hệ số nhân.
                  </p>
                </div>
                <div className="px-5 py-3 rounded-xl bg-[#0B0F17] border border-amber-500/30 text-right shrink-0">
                  <span className="text-[11px] text-slate-400 block">
                    Mức chi tiêu giả định
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-amber-400">
                    {formatVND(simulatorSpend)}
                  </span>
                </div>
              </div>

              {/* Slider */}
              <div className="mb-6 space-y-2">
                <input
                  type="range"
                  min={1000000}
                  max={200000000}
                  step={1000000}
                  value={simulatorSpend}
                  onChange={(e) => setSimulatorSpend(Number(e.target.value))}
                  className="w-full"
                  aria-label="Mức chi tiêu giả định"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
                  <span>1.000.000 đ</span>
                  <span>50.000.000 đ</span>
                  <span>100.000.000 đ</span>
                  <span>150.000.000 đ</span>
                  <span>200.000.000 đ</span>
                </div>
              </div>

              {/* 5 Tier Simulated Output Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {tiers.map((tier) => {
                  const earned = membershipEarnedPoints(simulatorSpend, tier.multiplier);
                  const bonus = earned - Math.round(basePts);
                  const isHighlight = tier.id === "gold" || tier.id === "diamond";

                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-xl bg-[#0B0F17] border ${
                        isHighlight ? "border-amber-500/50" : "border-slate-800"
                      } flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">
                          {tier.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {tier.multiplier.toFixed(1)}x
                        </span>
                      </div>
                      <div className="my-1">
                        <span className="text-2xl font-bold text-white">
                          {formatNum(earned)}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">Pts</span>
                      </div>
                      <div className="text-[11px] text-emerald-400 font-medium mt-1">
                        {bonus > 0
                          ? `+${formatNum(bonus)} Pts thưởng hạng`
                          : "Mức tích lũy tiêu chuẩn"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5 Tier Configuration Cards */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-white">
                    Năm Cấp Độ Đặc Quyền Xứng Tầm
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Nhấn "Chỉnh Sửa Hạng" trên từng thẻ để cập nhật cấu hình áp dụng chung với user.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`rounded-2xl ${tier.cardClass} p-5 flex flex-col justify-between shadow-xl transition-transform hover:-translate-y-1`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${tier.badgeColor}`}
                        >
                          {tier.subtitle}
                        </span>
                        <span className="text-xs font-bold text-amber-400">
                          Tích {tier.multiplier.toFixed(1)}x
                        </span>
                      </div>

                      <h3 className="font-serif text-2xl font-bold text-white">
                        {tier.name}
                      </h3>
                      <div className="mt-2 pb-3 border-b border-white/10">
                        <span className="text-[11px] text-slate-300 block">
                          Ngưỡng chi tiêu kích hoạt
                        </span>
                        <span className="text-base font-bold text-amber-300">
                          {tier.minSpend === 0
                            ? "Miễn phí / Mặc định"
                            : "Từ " + formatVND(tier.minSpend)}
                        </span>
                      </div>

                      <ul className="mt-4 space-y-2.5 text-xs text-slate-200">
                        {tier.perks.map((perk, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2
                              size={14}
                              className="text-amber-400 shrink-0 mt-0.5"
                            />
                            <span className="leading-relaxed">{perk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => openEditTier(tier)}
                        className="w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-amber-400 text-white hover:text-[#070A10] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Pencil size={14} />
                        <span>Chỉnh Sửa Hạng</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "members" && (
          <section className="space-y-8">
            {/* Member Directory */}
            <div className="rounded-2xl bg-[#0F1522] border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-white">
                    Danh Sách Hội Viên Thượng Lưu
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tra cứu chi tiêu, ví điểm và lịch sử điều chỉnh của hội viên.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search
                      size={15}
                      className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      placeholder="Tên, mã thẻ, email..."
                      value={search}
                      onChange={(e) => {setSearch(e.target.value);setPage(1);}}
                      className="pl-9 pr-3.5 py-2 rounded-xl bg-[#0B0F17] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-56"
                    />
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => {setFilter(e.target.value);setPage(1);}}
                    className="px-3 py-2 rounded-xl bg-[#0B0F17] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
<option value="all">Tất cả hạng thẻ</option>{data.tiers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-[#070A10]/70 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-5">Hội Viên &amp; Mã Thẻ</th>
                      <th className="py-3.5 px-4">Hạng Hiện Tại</th>
                      <th className="py-3.5 px-4 text-right">Chi Tiêu Tích Lũy</th>
                      <th className="py-3.5 px-4 text-right">Điểm Khả Dụng</th>
                      <th className="py-3.5 px-4">Hạn Xét Hạng</th>
                      <th className="py-3.5 px-5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-sm">
                    {data.items.map((m) => (
                      <tr key={m.userId} className="hover:bg-[#0B0F17]/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-white text-xs sm:text-sm">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            #{m.userId} • {m.email}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${TIER_VISUALS[m.tier as MembershipTierId]?.badgeColor}`}
                          >
                            <Crown size={12} />
                            {data.tiers.find(t=>t.id === m.tier)?.name ?? m.tier}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-slate-200 text-xs sm:text-sm">
                          {formatVND(m.spending)}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-amber-400 text-xs sm:text-sm">
                          {formatNum(m.pointsBalance ?? 0)} Pts
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-400">
                          {m.cycleEnd ? new Date(m.cycleEnd).toLocaleDateString("vi-VN") : "Chưa bắt đầu"}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setMember(m)}
                            className="px-3 py-1.5 rounded-lg bg-[#0B0F17] hover:bg-amber-400 text-amber-400 hover:text-[#070A10] border border-amber-500/40 font-semibold text-xs transition-all cursor-pointer"
                          >
                            Xem / điều chỉnh điểm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

<div className="flex justify-between text-sm"><button disabled={page <= 1 || loading} onClick={() => setPage(v=>v-1)}>Trang trước</button><span>Trang {page} · {data.total} hội viên</span><button disabled={page * 20 >= data.total || loading} onClick={() => setPage(v=>v+1)}>Trang sau</button></div></section>)}      {tab === 'rewards' && <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Kho voucher đổi điểm</h2><p className="mt-2 text-sm text-slate-500">Điểm trừ ngay khi đổi thành công. Voucher không quy đổi thành tiền mặt.</p><button type="button" onClick={() => setRewardOpen(true)} className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300"><Plus size={16} />Thêm voucher</button><div className="mt-5 grid gap-4 md:grid-cols-3">{(data.rewards ?? DEFAULT_MEMBERSHIP_REWARDS).map(r => <article key={r.id} className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><Gift className="text-blue-600" /><h3 className="mt-3 font-bold">{r.title}</h3><p className="mt-2 text-sm font-bold text-blue-600">{r.pointsCost.toLocaleString('vi-VN')} điểm</p><p className="mt-2 text-xs leading-5 text-slate-500">{r.description}</p></article>)}</div></section>}
      {tab === 'policies' && <section className="space-y-4 rounded-2xl border bg-white p-6 text-sm leading-7"><h2 className="text-lg font-bold">Chính sách chung cho user và admin</h2><p>Chu kỳ xét hạng: {MEMBERSHIP_POINTS_POLICY.cycleMonths} tháng kể từ tour đầu tiên hoàn thành và thanh toán đủ. Hạng kỳ trước được giữ trong kỳ mới; cuối kỳ xét lại theo chi tiêu hợp lệ.</p><p>Mỗi {formatVND(MEMBERSHIP_POINTS_POLICY.earningBaseVnd)} thực trả bằng tiền được tích 1 điểm cơ bản, nhân hệ số hạng tại lúc đặt. Điểm làm tròn xuống và không hết hạn theo chu kỳ xét hạng.</p><p>1 điểm = {formatVND(MEMBERSHIP_POINTS_POLICY.valueVnd)}; dùng tối đa {MEMBERSHIP_POINTS_POLICY.maxPaymentPercent}% giá trị sau ưu đãi. Điểm được giữ khi đặt và trừ khi thanh toán thành công. Thanh toán thất bại, hết hạn hoặc hủy đơn chưa trả tiền sẽ giải phóng điểm.</p><p>Khách hủy: điểm hoàn theo tỷ lệ được hoàn của phần dịch vụ hủy. Công ty hủy toàn bộ: hoàn lại điểm đang áp dụng cho booking, tiền hoàn qua quy trình chuyển khoản. Đổi lịch cùng tour giữ điểm trong giới hạn 30% theo giá mới; phần vượt được hoàn khi đổi lịch thành công. Phí hủy và điểm thanh toán không tích điểm thưởng.</p><p>Điều chỉnh điểm cần lý do và được lưu lịch sử. Hoàn tiền sau khi đã tiêu điểm có thể tạo khoản điểm cần bù; điểm tích lũy tiếp theo sẽ bù trước khi có thể sử dụng tiếp.</p></section>}
{tab === 'matrix' && <UserMembershipComparisonTable tiers={draft.map(t => ({ ...t, benefits: membershipBenefits(t) }))} currentTierId="bronze" />}</>}</main>{editOpen && <div role="dialog" aria-modal="true" aria-labelledby="membership-edit-title" className="fixed inset-0 z-40 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><div className="membership-luxury mx-auto my-8 max-w-6xl rounded-2xl border border-slate-700 bg-[#0B0F17] p-5"><div className="mb-5 flex items-center justify-between"><h2 id="membership-edit-title" className="text-lg font-bold text-white">Chỉnh sửa hạng {preview?.name}</h2><button disabled={saving} onClick={() => setEditOpen(false)} aria-label="Đóng cấu hình"><X size={20} /></button></div>{error && <p role="alert" className="mb-4 text-sm text-rose-300">{error}</p>}{notice && <p role="status" className="mb-4 text-sm text-emerald-300">{notice}</p>}      {editOpen && <>
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Phiên bản đang sửa: {settingsVersion.current}. Thay đổi có hiệu lực cho booking mới.</p><div className="flex gap-2"><button disabled={saving} onClick={() => { if (!data) return; dirty.current = false; setDraft(data.tiers); settingsVersion.current = data.programVersion ?? 1; setNotice('Đã tải cấu hình mới nhất vào biểu mẫu.'); }} className="rounded-xl border px-4 py-2 text-sm">Bỏ thay đổi</button><button disabled={saving || loading} onClick={save} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Lưu cấu hình</button></div></div>
        <div className="grid items-start gap-5 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-5"><MembershipTierSettings key={selectedTier} initialTier={selectedTier} tiers={draft} disabled={saving} onSelect={setSelectedTier} onChange={(id,field,value) => { dirty.current = true; setDraft(current => current.map(t => t.id === id ? { ...t, [field]: value } : t)); }} />
          {preview && preview.id !== 'bronze' && <section className="rounded-2xl border bg-white p-5"><h2 className="text-sm font-bold">Voucher thăng hạng {preview.name}</h2><p className="mt-1 text-xs text-slate-500">Cấp một lần cho mỗi mốc đạt được trong chu kỳ; hiệu lực 12 tháng.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs">Loại giảm<select value={preview.discountType} disabled={saving} onChange={e => { dirty.current = true; setDraft(prev => prev.map(t => t.id === preview.id ? { ...t, discountType: e.target.value as 'fixed' | 'percentage', discountValue: e.target.value === 'percentage' ? 3 : 100000, maxDiscount: 100000 } : t)); }} className="mt-1 w-full rounded-lg border p-2"><option value="fixed">Số tiền</option><option value="percentage">Phần trăm</option></select></label>{(['discountValue','maxDiscount','minOrder'] as const).map((field,i) => <label key={field} className="text-xs">{['Giá trị giảm','Giảm tối đa (đ)','Đơn tối thiểu (đ)'][i]}<input type="number" min={0} max={field === "discountValue" && preview.discountType === "percentage" ? 100 : 9999999999} step={1} disabled={saving || (field === 'maxDiscount' && preview.discountType === 'fixed')} value={field === 'maxDiscount' && preview.discountType === 'fixed' ? preview.discountValue : preview[field]} onChange={e => { dirty.current = true; setDraft(prev => prev.map(t => t.id === preview.id ? { ...t, [field]: Number(e.target.value) } : t)); }} className="mt-1 w-full rounded-lg border p-2" /></label>)}</div></section>}</div>
          {preview && <MembershipTierPreview tier={{ ...preview, benefits: membershipBenefits(preview) }} />}
        </div>
      </>}
</div></div>}{member && <MembershipMemberDialog key={member.userId} member={member} onClose={() => {setMember(null);setRevision(v=>v+1);}} />}{rewardOpen && <AdminMembershipRewardDialog onClose={() => setRewardOpen(false)} onCreated={reward => { setData(prev => prev ? { ...prev, rewards: [...(prev.rewards ?? DEFAULT_MEMBERSHIP_REWARDS).filter(r => r.id !== reward.id), reward] } : prev); setRewardOpen(false); setTab('rewards'); setNotice('Đã thêm voucher vào kho đổi điểm.'); setRevision(v=>v+1); }} />}</div>);
}
