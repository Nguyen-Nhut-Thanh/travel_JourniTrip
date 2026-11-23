import { getLocationLevelLabel } from "@/lib/locations/admin/hierarchy";

const styles: Record<number, string> = {
  3: "border-blue-200/80 bg-blue-50 text-blue-700",
  4: "border-cyan-200/80 bg-cyan-50 text-cyan-700",
  5: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
  6: "border-violet-200/80 bg-violet-50 text-violet-700",
};

export function LocationTypeBadge({ level }: { level: number }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[level] || "border-slate-200 bg-slate-50 text-slate-600"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{getLocationLevelLabel(level)}</span>;
}
