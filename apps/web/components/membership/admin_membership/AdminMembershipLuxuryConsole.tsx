"use client";

import { useEffect, useRef, useState } from "react";
import {
  Award,
  Calculator,
  CheckCircle2,
  Crown,
  Gift,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Sliders,
  Sparkles,
  Table,
  Users,
  X,
  Minus,
  Check,
} from "lucide-react";
import {
  DEFAULT_MEMBERSHIP_REWARDS,
  MEMBERSHIP_POINTS_POLICY,
  membershipEarnedPoints,
  membershipBenefits,
  type MembershipAdminList,
  type MembershipTier,
  type MembershipTierId,
} from "shared";
import {
  getAdminMembership,
  saveMembershipSettings,
} from "@/lib/membership/admin/api";
import { formatVND } from "@/lib/utils/currency";
import { MembershipTierSettings } from "./AdminMembershipTierSettings";
import { MembershipTierPreview } from "./AdminMembershipTierPreview";
import { type MemberRow } from "./AdminMembershipMembersTable";
import { AdminMembershipRewardDialog } from "./AdminMembershipRewardDialog";
import { MembershipMemberDialog } from "./AdminMembershipMemberDialog";
import { AdminPagination } from "@/components/common/admin_shared/tables/AdminPagination";

const TIER_VISUALS: Record<
  MembershipTierId,
  {
    subtitle: string;
    cardTag: string;
    cardClass: string;
    tagClass: string;
    multiplierColor: string;
    spendColor: string;
    checkColor: string;
    btnClass: string;
    badgeColor: string;
    bgTone: string;
  }
> = {
  bronze: {
    subtitle: "CLASSIC EXPLORER",
    cardTag: "CLASSIC EXPLORER",
    cardClass:
      "bg-gradient-to-b from-[#161c28] via-[#121722] to-[#0c1017] border-slate-700/60 shadow-md text-white",
    tagClass: "border-slate-600/80 bg-slate-800/80 text-slate-300",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-400",
    btnClass:
      "border-white/15 bg-white/10 hover:bg-white/20 text-white",
    badgeColor: "text-amber-800 bg-amber-50 border-amber-200",
    bgTone: "border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white",
  },
  silver: {
    subtitle: "EXPLORER SILVER",
    cardTag: "EXPLORER SILVER",
    cardClass:
      "bg-gradient-to-b from-[#243042] via-[#1d2737] to-[#151d2a] border-slate-600/60 shadow-md text-white",
    tagClass: "border-slate-500/80 bg-slate-700/80 text-slate-200",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-400",
    btnClass:
      "border-white/15 bg-white/10 hover:bg-white/20 text-white",
    badgeColor: "text-slate-700 bg-slate-100 border-slate-200",
    bgTone: "border-slate-200/80 bg-gradient-to-br from-slate-50/50 to-white",
  },
  gold: {
    subtitle: "PRESTIGE GOLD",
    cardTag: "PRESTIGE GOLD",
    cardClass:
      "bg-gradient-to-b from-[#8c440b] via-[#9a4b0d] to-[#592705] border-amber-500/60 shadow-lg shadow-amber-950/25 text-white",
    tagClass: "border-amber-400/50 bg-amber-900/60 text-amber-200",
    multiplierColor: "text-amber-200",
    spendColor: "text-[#fde047]",
    checkColor: "text-amber-300",
    btnClass:
      "border-amber-300/40 bg-amber-600/35 hover:bg-amber-600/50 text-white",
    badgeColor: "text-yellow-800 bg-yellow-50 border-yellow-200",
    bgTone: "border-yellow-200/80 bg-gradient-to-br from-yellow-50/40 to-white",
  },
  platinum: {
    subtitle: "SIGNATURE PLATINUM",
    cardTag: "SIGNATURE PLATINUM",
    cardClass:
      "bg-gradient-to-b from-[#0d4f77] via-[#083a58] to-[#05263a] border-sky-500/60 shadow-lg shadow-sky-950/25 text-white",
    tagClass: "border-sky-400/50 bg-sky-900/60 text-sky-200",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-300",
    btnClass:
      "border-sky-300/40 bg-sky-600/35 hover:bg-sky-600/50 text-white",
    badgeColor: "text-cyan-800 bg-cyan-50 border-cyan-200",
    bgTone: "border-cyan-200/80 bg-gradient-to-br from-cyan-50/40 to-white",
  },
  diamond: {
    subtitle: "ROYAL DIAMOND",
    cardTag: "ROYAL DIAMOND",
    cardClass:
      "bg-gradient-to-b from-[#4a1078] via-[#350b57] to-[#200636] border-purple-500/60 shadow-lg shadow-purple-950/25 text-white",
    tagClass: "border-purple-400/50 bg-purple-900/60 text-purple-200",
    multiplierColor: "text-amber-400",
    spendColor: "text-[#fcd34d]",
    checkColor: "text-amber-300",
    btnClass:
      "border-purple-300/40 bg-purple-600/35 hover:bg-purple-600/50 text-white",
    badgeColor: "text-purple-800 bg-purple-50 border-purple-200",
    bgTone: "border-purple-200/80 bg-gradient-to-br from-purple-50/40 to-white",
  },
};

const MATRIX_ROWS: {
  label: string;
  value: (t: MembershipTier) => string | boolean;
}[] = [
  { label: "Chi tiêu xét hạng", value: (t) => formatVND(t.threshold) },
  {
    label: "Giảm giá tour",
    value: (t) => (t.tourDiscountPercent ? `${t.tourDiscountPercent}%` : false),
  },
  {
    label: "Hệ số tích điểm",
    value: (t) => `×${t.pointMultiplier.toLocaleString("vi-VN")}`,
  },
  {
    label: "Giảm dịch vụ đi kèm",
    value: (t) =>
      t.serviceDiscountPercent ? `${t.serviceDiscountPercent}%` : false,
  },
  {
    label: "Voucher sinh nhật",
    value: (t) =>
      t.birthdayVoucherAmount ? formatVND(t.birthdayVoucherAmount) : false,
  },
  {
    label: "Voucher thăng hạng",
    value: (t) =>
      t.id === "bronze"
        ? false
        : membershipBenefits(t).find((text) =>
            text.startsWith("Voucher thăng hạng"),
          ) || false,
  },
  {
    label: "Ưu tiên xử lý giữ chỗ",
    value: (t) => t.priorityReservation,
  },
];

const formatNum = (n: number) => n.toLocaleString("vi-VN");
const MEMBERS_PAGE_SIZE = 20;

export function AdminMembershipLuxuryConsole() {
  const [data, setData] = useState<MembershipAdminList | null>(null);
  const [draft, setDraft] = useState<MembershipTier[]>([]);
  const [selectedTier, setSelectedTier] = useState<MembershipTierId>("bronze");
  const [tab, setTab] = useState<
    "overview" | "tiers" | "members" | "rewards" | "matrix" | "policies"
  >("overview");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [member, setMember] = useState<MemberRow | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [simulatorSpend, setSimulatorSpend] = useState(50000000);
  const dirty = useRef(false);
  const settingsVersion = useRef(1);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(
      () => {
        setLoading(true);
        setError("");
        getAdminMembership(page, search, filter, MEMBERS_PAGE_SIZE)
          .then((result) => {
            if (!active) return;
            setData(result);
            if (!dirty.current) {
              setDraft(result.tiers);
              settingsVersion.current = result.programVersion ?? 1;
            }
          })
          .catch((e) => {
            if (active)
              setError(
                e instanceof Error ? e.message : "Không thể tải dữ liệu.",
              );
          })
          .finally(() => {
            if (active) setLoading(false);
          });
      },
      search ? 300 : 0,
    );
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [page, search, filter, revision]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const tiers = await saveMembershipSettings(
        draft,
        settingsVersion.current,
      );
      setDraft(tiers);
      settingsVersion.current += 1;
      dirty.current = false;
      setNotice(
        "Đã lưu cấu hình. User và admin áp dụng cùng quyền lợi; booking cũ giữ ưu đãi đã chốt.",
      );
      setRevision((v) => v + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  }

  const preview = draft.find((t) => t.id === selectedTier) ?? draft[0];
  const tiers = draft.map((t) => ({
    ...t,
    ...TIER_VISUALS[t.id],
    minSpend: t.threshold,
    multiplier: t.pointMultiplier,
    perks: membershipBenefits(t),
  }));
  const basePts = simulatorSpend / MEMBERSHIP_POINTS_POLICY.earningBaseVnd;
  const openEditTier = (tier: { id: MembershipTierId }) => {
    setSelectedTier(tier.id);
    setEditOpen(true);
  };

  return (
    <div className="space-y-3.5 font-sans text-slate-800 antialiased">
      {/* HEADER BANNER - Không bỏ vào thẻ card, hiển thị tự nhiên và kéo sát lên trên */}
      <header className="relative isolate flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075bff] flex items-center justify-center shrink-0">
            <Crown size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#07123e] tracking-tight">
                Quản lý hạng thành viên
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#075bff] border border-blue-100">
                5 Cấp độ hội viên
              </span>
            </div>
            <p className="text-xs text-[#7387aa] mt-0.5">
              Điều phối 5 cấp độ hội viên, hệ số tích lũy Pts, kho voucher đổi
              điểm và chính sách vận hành.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="hidden sm:block px-3 py-1.5 rounded-xl border border-[#e1edfc] bg-white text-right shadow-2xs">
            <div className="text-[10px] font-medium text-[#7387aa]">
              Tỷ lệ quy đổi chuẩn
            </div>
            <div className="text-xs font-bold text-[#075bff]">
              {formatNum(MEMBERSHIP_POINTS_POLICY.earningBaseVnd)}đ = 1 Pts
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRewardOpen(true)}
            className="px-3.5 py-2 rounded-[12px] border border-[#dce7f7] bg-white hover:bg-slate-50 text-slate-700 hover:text-[#075bff] hover:border-[#075bff] font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Thêm voucher</span>
          </button>

          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !data}
            className="px-4 py-2 rounded-[12px] bg-[#075bff] hover:bg-[#064ddd] text-white font-[650] text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? "Đang lưu..." : "Lưu thay đổi"}</span>
          </button>
        </div>
      </header>

      {/* HORIZONTAL PILL TABS */}
      <nav
        aria-label="Tabs"
        className="rounded-[14px] border border-[#e1edfc] bg-white p-1.5 shadow-sm flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        {[
          { id: "overview", label: "Tổng quan & Thống kê", icon: LayoutGrid },
          {
            id: "tiers",
            label: "Cấu hình 5 hạng thẻ & Mô phỏng",
            icon: Award,
          },
          { id: "rewards", label: "Kho quà đổi điểm", icon: Gift },
          { id: "matrix", label: "Ma trận quyền lợi", icon: Table },
          { id: "members", label: "Sổ điểm hội viên", icon: Users },
          { id: "policies", label: "Quy định & Chính sách", icon: Sliders },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as typeof tab)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[10px] text-xs sm:text-sm transition-all cursor-pointer ${
                isActive
                  ? "bg-[#075bff] text-white font-[650] shadow-xs"
                  : "text-slate-600 hover:text-[#0b1747] hover:bg-slate-50 font-medium"
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ERROR & NOTICE ALERTS */}
      {error && (
        <div
          role="alert"
          className="rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-700 flex items-center justify-between"
        >
          <span>{error}</span>
          <button
            onClick={() => setRevision((v) => v + 1)}
            className="underline font-bold"
          >
            Thử lại
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-700 font-medium"
        >
          {notice}
        </div>
      )}

      {/* MAIN TAB CONTENT */}
      {!data ? (
        <div className="rounded-[14px] border border-[#e1edfc] bg-white p-16 text-center shadow-sm">
          {loading && (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#075bff]" />
          )}
          <p className="mt-3 text-xs sm:text-sm text-[#7387aa]">
            Đang tải dữ liệu hạng thành viên...
          </p>
        </div>
      ) : (
        <main className="space-y-4">
          {/* TAB 1: OVERVIEW */}
          {tab === "overview" && (
            <section className="space-y-4">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    label: "Tổng hội viên",
                    value: data.memberTotal,
                    sub: "Hội viên tích lũy trong hệ thống",
                  },
                  {
                    label: "Voucher đã cấp",
                    value: data.issued,
                    sub: "Voucher thăng hạng & sinh nhật",
                  },
                  {
                    label: "Voucher đã dùng",
                    value: data.used,
                    sub: "Áp dụng thành công cho đơn tour",
                  },
                  {
                    label: "Phiên bản cấu hình",
                    value: `v${data.programVersion ?? 1}`,
                    sub: "Đang kích hoạt toàn hệ thống",
                  },
                ].map((item) => (
                  <article
                    key={item.label}
                    className="p-5 rounded-[14px] border border-[#e1edfc] bg-white shadow-sm hover:border-[#b9d7fb] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-[#7387aa] uppercase tracking-wider">
                        {item.label}
                      </span>
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#075bff] flex items-center justify-center">
                        <Crown size={16} />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#0b1747]">
                      {typeof item.value === "number"
                        ? formatNum(item.value)
                        : item.value}
                    </div>
                    <p className="mt-2 text-xs text-[#7387aa]">{item.sub}</p>
                  </article>
                ))}
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 p-5 sm:p-6 rounded-[14px] border border-[#e1edfc] bg-white shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                      <Crown size={16} />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                      Phân bổ hội viên theo 5 cấp độ
                    </h2>
                  </div>
                  <div className="space-y-3.5 pt-1">
                    {tiers.map((t) => {
                      const count = data.tierCounts?.[t.id] ?? 0;
                      const pct = data.memberTotal
                        ? (count / data.memberTotal) * 100
                        : 0;
                      return (
                        <div key={t.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-[#0b1747]">
                              {t.name}
                            </span>
                            <span className="font-semibold text-[#7387aa]">
                              {formatNum(count)} hội viên ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 border border-slate-200/60">
                            <div
                              className="h-full rounded-full bg-[#075bff] transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="lg:col-span-5 p-5 sm:p-6 rounded-[14px] border border-[#e1edfc] bg-white shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                        <Sparkles size={16} />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                        Quản lý đặc quyền hội viên
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm leading-relaxed text-[#7387aa]">
                      Cấu hình quyền lợi hạng, tra cứu ví điểm và voucher theo dữ
                      liệu đang lưu trữ đồng bộ giữa người dùng và ban quản trị.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTab("members")}
                      className="rounded-[12px] bg-[#f0f6ff] text-[#075bff] border border-[#e1edfc] hover:bg-[#e1edfc] font-[650] text-xs sm:text-sm px-4 py-2.5 transition-all cursor-pointer"
                    >
                      Xem sổ điểm hội viên
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setRevision((v) => v + 1)}
                      className="rounded-[12px] border border-[#dce7f7] text-slate-600 hover:text-[#075bff] font-medium text-xs sm:text-sm px-4 py-2.5 transition-all cursor-pointer"
                    >
                      Tải lại dữ liệu
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 2: TIERS CONFIG & SIMULATOR */}
          {tab === "tiers" && (
            <section className="space-y-4">
              {/* Simulator Card */}
              <div className="p-5 sm:p-6 rounded-[14px] border border-[#e1edfc] bg-white shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                        <Calculator size={16} />
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                        Bộ mô phỏng tích điểm thưởng
                      </h2>
                    </div>
                    <p className="text-xs text-[#7387aa]">
                      Kiểm tra nhanh số điểm Pts khách hàng nhận được ở từng hạng
                      khi điều chỉnh hệ số nhân.
                    </p>
                  </div>
                  <div className="px-4 py-2 rounded-xl border border-[#e1edfc] bg-[#f8fbff] text-right shrink-0">
                    <span className="text-[10px] text-[#7387aa] block font-medium">
                      Mức chi tiêu giả định
                    </span>
                    <span className="text-lg sm:text-xl font-extrabold text-[#075bff]">
                      {formatVND(simulatorSpend)}
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-1.5 pt-2">
                  <input
                    type="range"
                    min={1000000}
                    max={200000000}
                    step={1000000}
                    value={simulatorSpend}
                    onChange={(e) => setSimulatorSpend(Number(e.target.value))}
                    className="w-full accent-[#075bff] cursor-pointer"
                    aria-label="Mức chi tiêu giả định"
                  />
                  <div className="flex justify-between text-[11px] text-[#7387aa] font-medium">
                    <span>1 triệu</span>
                    <span>50 triệu</span>
                    <span>100 triệu</span>
                    <span>150 triệu</span>
                    <span>200 triệu</span>
                  </div>
                </div>

                {/* 5 Simulated Output Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
                  {tiers.map((tier) => {
                    const earned = membershipEarnedPoints(
                      simulatorSpend,
                      tier.multiplier,
                    );
                    const bonus = earned - Math.round(basePts);
                    return (
                      <div
                        key={tier.id}
                        className="p-3.5 rounded-xl border border-[#e1edfc] bg-[#f8fbff] flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#0b1747]">
                            {tier.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#075bff] border border-blue-100">
                            {tier.multiplier.toFixed(1)}x
                          </span>
                        </div>
                        <div className="my-1">
                          <span className="text-xl sm:text-2xl font-extrabold text-[#075bff]">
                            {formatNum(earned)}
                          </span>
                          <span className="text-xs text-[#7387aa] ml-1">Pts</span>
                        </div>
                        <div className="text-[11px] text-emerald-600 font-medium mt-1">
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                      <Award size={16} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                        5 Cấp độ đặc quyền hội viên
                      </h2>
                      <p className="text-xs text-[#7387aa]">
                        Nhấn "Chỉnh sửa hạng" trên từng thẻ để cập nhật cấu hình.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={`rounded-[16px] border ${tier.cardClass} p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl`}
                    >
                      <div>
                        {/* Header Tag & Multiplier */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`text-[9.5px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${tier.tagClass}`}
                          >
                            {tier.cardTag}
                          </span>
                          <span className={`text-xs font-black ${tier.multiplierColor}`}>
                            Tích {tier.multiplier.toFixed(1)}x
                          </span>
                        </div>

                        {/* Tier Title */}
                        <h3 className="text-2xl font-black font-serif tracking-tight text-white my-2">
                          {tier.name}
                        </h3>

                        {/* Spend Threshold */}
                        <div className="mt-2 pb-3 border-b border-white/15">
                          <span className="text-[10px] text-white/70 block uppercase tracking-wider font-semibold">
                            Ngưỡng chi tiêu kích hoạt
                          </span>
                          <span className={`text-sm font-extrabold ${tier.spendColor}`}>
                            {tier.minSpend === 0
                              ? "Miễn phí / Mặc định"
                              : "Từ " + formatVND(tier.minSpend)}
                          </span>
                        </div>

                        {/* Perks Bullet List */}
                        <ul className="mt-4 space-y-2 text-xs text-white/90">
                          {tier.perks.map((perk, i) => (
                            <li key={i} className="flex items-start gap-2 text-[11px] leading-[1.45]">
                              <CheckCircle2
                                size={14}
                                className={`${tier.checkColor} shrink-0 mt-0.5`}
                              />
                              <span>{perk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Edit Button */}
                      <div className="mt-6 pt-3 border-t border-white/15">
                        <button
                          type="button"
                          onClick={() => openEditTier(tier)}
                          className={`w-full py-2.5 px-3 rounded-[12px] border ${tier.btnClass} font-[650] text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer`}
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

          {/* TAB 3: REWARDS */}
          {tab === "rewards" && (
            <section className="rounded-[14px] border border-[#e1edfc] bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                    <Gift size={16} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                      Kho voucher đổi điểm
                    </h2>
                    <p className="mt-0.5 text-xs text-[#7387aa]">
                      Điểm trừ ngay khi user đổi thành công. Voucher không quy
                      đổi thành tiền mặt.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRewardOpen(true)}
                  className="rounded-[12px] bg-[#075bff] hover:bg-[#064ddd] px-4 py-2 text-xs sm:text-sm font-[650] text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Plus size={16} />
                  <span>Thêm voucher</span>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3 pt-2">
                {(data.rewards ?? DEFAULT_MEMBERSHIP_REWARDS).map((r) => (
                  <article
                    key={r.id}
                    className="rounded-xl border border-[#e1edfc] bg-[#f8fbff] p-4.5 shadow-xs transition hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                        <Gift className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-xs font-bold text-[#075bff]">
                        {r.pointsCost.toLocaleString("vi-VN")} Pts
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#0b1747]">{r.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-[#7387aa]">
                      {r.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* TAB 4: MATRIX */}
          {tab === "matrix" && (
            <section className="rounded-[14px] border border-[#e1edfc] bg-white p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                  <Table size={16} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                    Ma trận so sánh quyền lợi các hạng
                  </h2>
                  <p className="mt-0.5 text-xs text-[#7387aa]">
                    Bảng đối chiếu toàn diện các đặc quyền áp dụng cho từng cấp độ
                    hội viên.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[14px] border border-[#e1edfc]">
                <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                  <thead className="bg-slate-50/75 border-b border-[#edf2fb]">
                    <tr>
                      <th className="p-4 font-[650] text-[#0b1747]">
                        Quyền lợi đặc quyền
                      </th>
                      {draft.map((t) => (
                        <th
                          key={t.id}
                          className="p-4 font-bold text-[#075bff] text-center"
                        >
                          {t.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2fb]">
                    {MATRIX_ROWS.map((row) => (
                      <tr
                        key={row.label}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <th className="p-4 font-medium text-slate-700 text-left">
                          {row.label}
                        </th>
                        {draft.map((t) => {
                          const val = row.value(t);
                          return (
                            <td
                              key={t.id}
                              className="p-4 leading-5 text-slate-800 text-center font-medium"
                            >
                              {typeof val === "boolean" ? (
                                val ? (
                                  <Check
                                    size={16}
                                    className="text-emerald-600 mx-auto"
                                    aria-label="Có"
                                  />
                                ) : (
                                  <Minus
                                    size={16}
                                    className="text-slate-300 mx-auto"
                                    aria-label="Không"
                                  />
                                )
                              ) : (
                                val
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 5: MEMBERS DIRECTORY */}
          {tab === "members" && (
            <section className="rounded-[14px] border border-[#e1edfc] bg-white shadow-sm overflow-hidden space-y-4">
              <div className="p-5 border-b border-[#edf2fb] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                    <Users size={16} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                      Danh sách sổ điểm hội viên
                    </h2>
                    <p className="mt-0.5 text-xs text-[#7387aa]">
                      Tra cứu chi tiêu, ví điểm và lịch sử tích lũy của khách
                      hàng.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative">
                    <Search
                      size={15}
                      className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                    />
                    <input
                      type="text"
                      placeholder="Tìm tên, mã, email..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="pl-9 pr-3.5 py-2 rounded-lg border border-[#dce7f7] bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#075bff] w-56"
                    />
                  </div>

                  <select
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-lg border border-[#dce7f7] bg-white text-xs text-slate-700 focus:outline-none focus:border-[#075bff] cursor-pointer"
                  >
                    <option value="all">Tất cả hạng thẻ</option>
                    {data.tiers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[820px]">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-[#edf2fb] text-[11px] uppercase tracking-wider text-[#7387aa] font-[650]">
                      <th className="py-3.5 px-5">Hội viên &amp; Mã</th>
                      <th className="py-3.5 px-4">Hạng hiện tại</th>
                      <th className="py-3.5 px-4 text-right">
                        Chi tiêu tích lũy
                      </th>
                      <th className="py-3.5 px-4 text-right">Điểm khả dụng</th>
                      <th className="py-3.5 px-4">Hạn xét hạng</th>
                      <th className="py-3.5 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf2fb] text-xs sm:text-sm">
                    {data.items.map((m) => (
                      <tr
                        key={m.userId}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-[#0b1747]">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-[#7387aa]">
                            #{m.userId} • {m.email}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${TIER_VISUALS[m.tier as MembershipTierId]?.badgeColor}`}
                          >
                            <Crown size={12} />
                            {data.tiers.find((t) => t.id === m.tier)?.name ??
                              m.tier}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                          {formatVND(m.spending)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#075bff]">
                          {formatNum(m.pointsBalance ?? 0)} Pts
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#7387aa]">
                          {m.cycleEnd
                            ? new Date(m.cycleEnd).toLocaleDateString("vi-VN")
                            : "Chưa bắt đầu"}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => setMember(m)}
                            className="px-3 py-1.5 rounded-lg bg-[#f0f6ff] hover:bg-[#075bff] text-[#075bff] hover:text-white border border-[#e1edfc] font-semibold text-xs transition-all cursor-pointer"
                          >
                            Xem / Điều chỉnh
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-[#edf2fb]">
                <AdminPagination
                  currentPage={page}
                  totalPages={Math.max(
                    1,
                    Math.ceil(data.total / MEMBERS_PAGE_SIZE),
                  )}
                  totalItems={data.total}
                  pageSize={MEMBERS_PAGE_SIZE}
                  itemLabel="hội viên"
                  showSinglePage
                  onPageChange={setPage}
                />
              </div>
            </section>
          )}

          {/* TAB 6: POLICIES */}
          {tab === "policies" && (
            <section className="rounded-[14px] border border-[#e1edfc] bg-white p-5 sm:p-6 shadow-sm space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700">
              <div className="flex items-center gap-2 pb-2 border-b border-[#edf2fb]">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
                  <Sliders size={16} />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[#0b1747]">
                  Chính sách vận hành hạng thành viên &amp; điểm thưởng
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="p-4 rounded-xl border border-[#e1edfc] bg-[#f8fbff] space-y-1">
                  <h3 className="font-bold text-sm text-[#0b1747]">
                    1. Chu kỳ xét hạng
                  </h3>
                  <p className="text-xs text-[#7387aa]">
                    Chu kỳ xét hạng: {MEMBERSHIP_POINTS_POLICY.cycleMonths} tháng
                    kể từ tour đầu tiên hoàn thành và thanh toán đủ. Hạng kỳ
                    trước được giữ trong kỳ mới; cuối kỳ xét lại theo chi tiêu hợp
                    lệ.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#e1edfc] bg-[#f8fbff] space-y-1">
                  <h3 className="font-bold text-sm text-[#0b1747]">
                    2. Tỷ lệ tích lũy
                  </h3>
                  <p className="text-xs text-[#7387aa]">
                    Mỗi {formatVND(MEMBERSHIP_POINTS_POLICY.earningBaseVnd)} thực
                    trả bằng tiền được tích 1 điểm cơ bản, nhân hệ số hạng tại lúc
                    đặt. Điểm làm tròn xuống và không hết hạn theo chu kỳ xét
                    hạng.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#e1edfc] bg-[#f8fbff] space-y-1">
                  <h3 className="font-bold text-sm text-[#0b1747]">
                    3. Giá trị điểm &amp; thanh toán
                  </h3>
                  <p className="text-xs text-[#7387aa]">
                    1 điểm = {formatVND(MEMBERSHIP_POINTS_POLICY.valueVnd)}; dùng
                    tối đa {MEMBERSHIP_POINTS_POLICY.maxPaymentPercent}% giá trị
                    sau ưu đãi. Điểm được giữ khi đặt và trừ khi thanh toán thành
                    công.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-[#e1edfc] bg-[#f8fbff] space-y-1">
                  <h3 className="font-bold text-sm text-[#0b1747]">
                    4. Quy định hoàn hủy &amp; đổi lịch
                  </h3>
                  <p className="text-xs text-[#7387aa]">
                    Khách hủy: hoàn điểm theo tỷ lệ hoàn dịch vụ. Công ty hủy:
                    hoàn 100% điểm. Đổi lịch cùng tour giữ điểm trong giới hạn
                    30% giá mới. Phí hủy không tính tích điểm.
                  </p>
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* DIALOG: EDIT TIER MODAL */}
      {editOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="membership-edit-title"
          className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs flex items-center justify-center"
        >
          <div className="mx-auto my-8 w-full max-w-5xl rounded-[14px] border border-[#e1edfc] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#edf2fb]">
              <h2
                id="membership-edit-title"
                className="text-lg font-bold text-[#0b1747]"
              >
                Chỉnh sửa hạng {preview?.name}
              </h2>
              <button
                disabled={saving}
                onClick={() => setEditOpen(false)}
                aria-label="Đóng cấu hình"
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#7387aa]">
                Phiên bản đang sửa: v{settingsVersion.current}. Thay đổi có hiệu
                lực cho booking mới.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={saving}
                  onClick={() => {
                    if (!data) return;
                    dirty.current = false;
                    setDraft(data.tiers);
                    settingsVersion.current = data.programVersion ?? 1;
                    setNotice("Đã tải lại cấu hình mới nhất vào biểu mẫu.");
                  }}
                  className="rounded-lg border border-[#dce7f7] bg-white hover:bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Bỏ thay đổi
                </button>
                <button
                  disabled={saving || loading}
                  onClick={save}
                  className="flex items-center gap-2 rounded-[12px] bg-[#075bff] hover:bg-[#064ddd] px-4 py-2 text-xs font-[650] text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Lưu cấu hình
                </button>
              </div>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[1.7fr_1fr]">
              <div className="space-y-4">
                <MembershipTierSettings
                  key={selectedTier}
                  initialTier={selectedTier}
                  tiers={draft}
                  disabled={saving}
                  onSelect={setSelectedTier}
                  onChange={(id, field, value) => {
                    dirty.current = true;
                    setDraft((current) =>
                      current.map((t) =>
                        t.id === id ? { ...t, [field]: value } : t,
                      ),
                    );
                  }}
                />

                {preview && preview.id !== "bronze" && (
                  <section className="rounded-[14px] border border-[#e1edfc] bg-white p-5 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-[#0b1747]">
                      Voucher thăng hạng {preview.name}
                    </h3>
                    <p className="text-xs text-[#7387aa]">
                      Cấp một lần cho mỗi mốc đạt được trong chu kỳ; hiệu lực 12
                      tháng.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Loại giảm
                        <select
                          value={preview.discountType}
                          disabled={saving}
                          onChange={(e) => {
                            dirty.current = true;
                            setDraft((prev) =>
                              prev.map((t) =>
                                t.id === preview.id
                                  ? {
                                      ...t,
                                      discountType: e.target.value as
                                        | "fixed"
                                        | "percentage",
                                      discountValue:
                                        e.target.value === "percentage"
                                          ? 3
                                          : 100000,
                                      maxDiscount: 100000,
                                    }
                                  : t,
                              ),
                            );
                          }}
                          className="mt-1 w-full rounded-lg border border-[#dce7f7] bg-white p-2 text-xs text-slate-800 outline-none focus:border-[#075bff]"
                        >
                          <option value="fixed">Số tiền</option>
                          <option value="percentage">Phần trăm</option>
                        </select>
                      </label>
                      {(
                        ["discountValue", "maxDiscount", "minOrder"] as const
                      ).map((field, i) => (
                        <label
                          key={field}
                          className="text-xs font-semibold text-slate-700"
                        >
                          {
                            [
                              "Giá trị giảm",
                              "Giảm tối đa (đ)",
                              "Đơn tối thiểu (đ)",
                            ][i]
                          }
                          <input
                            type="number"
                            min={0}
                            max={
                              field === "discountValue" &&
                              preview.discountType === "percentage"
                                ? 100
                                : 9999999999
                            }
                            step={1}
                            disabled={
                              saving ||
                              (field === "maxDiscount" &&
                                preview.discountType === "fixed")
                            }
                            value={
                              field === "maxDiscount" &&
                              preview.discountType === "fixed"
                                ? preview.discountValue
                                : preview[field]
                            }
                            onChange={(e) => {
                              dirty.current = true;
                              setDraft((prev) =>
                                prev.map((t) =>
                                  t.id === preview.id
                                    ? { ...t, [field]: Number(e.target.value) }
                                    : t,
                                ),
                              );
                            }}
                            className="mt-1 w-full rounded-lg border border-[#dce7f7] bg-white p-2 text-xs text-slate-800 outline-none focus:border-[#075bff]"
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {preview && (
                <MembershipTierPreview
                  tier={{ ...preview, benefits: membershipBenefits(preview) }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIALOG: MEMBER DETAILS & ADJUST POINTS */}
      {member && (
        <MembershipMemberDialog
          key={member.userId}
          member={member}
          onClose={() => {
            setMember(null);
            setRevision((v) => v + 1);
          }}
        />
      )}

      {/* DIALOG: REWARD CREATION */}
      {rewardOpen && (
        <AdminMembershipRewardDialog
          onClose={() => setRewardOpen(false)}
          onCreated={(reward) => {
            setData((prev) =>
              prev
                ? {
                    ...prev,
                    rewards: [
                      ...(prev.rewards ?? DEFAULT_MEMBERSHIP_REWARDS).filter(
                        (r) => r.id !== reward.id,
                      ),
                      reward,
                    ],
                  }
                : prev,
            );
            setRewardOpen(false);
            setTab("rewards");
            setNotice("Đã thêm voucher vào kho đổi điểm.");
            setRevision((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}
