"use client";

import { ChevronDown, ChevronRight, MapPin, Star } from "lucide-react";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { getLocationLevelLabel } from "@/lib/locations/admin/hierarchy";
import type { getLocationAdminTreeRows } from "@/lib/locations/admin/explorer";
import { AdminSearchHighlight } from "@/components/common/admin_shared/tables/AdminSearchHighlight";

export function LocationExplorerTree({ rows, selectedId, onSelect, onToggle, search = "" }: {
  rows: ReturnType<typeof getLocationAdminTreeRows>;
  selectedId?: number;
  onSelect: (id: number) => void;
  onToggle: (id: number) => void;
  search?: string;
}) {
  return <div className="space-y-1 p-2.5">
    {!rows.length && <p role="status" className="py-12 text-center text-xs text-slate-400">Không tìm thấy địa điểm phù hợp.</p>}
    {rows.map(({ node, depth, hasChildren, expanded, path }) => {
      const item = node.item;
      const active = item.location_id === selectedId;
      return <div key={item.location_id} data-location-id={item.location_id} data-depth={depth} style={{ paddingLeft: depth * 22 + 10 }} className={`group relative flex items-center gap-2 rounded-xl py-2.5 pr-3 transition-colors ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100/80"}`}>
        {depth > 0 && <span aria-hidden="true" className={`-mt-2 h-4 w-3 shrink-0 rounded-bl-md border-b-2 border-l-2 ${active ? "border-blue-300/70" : "border-slate-200"}`} />}
        {hasChildren ? <button type="button" aria-label={`${expanded ? "Thu gọn" : "Mở"} ${item.name}`} aria-expanded={expanded} onClick={() => onToggle(item.location_id)} className={`grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 ${active ? "text-white hover:bg-blue-500" : "text-slate-500 hover:bg-slate-200"}`}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button> : <span className="w-5 shrink-0" />}
        <button type="button" aria-pressed={active} onClick={() => onSelect(item.location_id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300">
          <ImageWithFallback src={item.location_images?.[0]?.image_url || item.featured_image || undefined} alt={item.name} className={`h-8 w-8 shrink-0 rounded-lg border object-cover ${active ? "border-blue-400" : "border-slate-200/80"}`} />
          <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5"><strong title={path} className="truncate text-[13px] font-semibold"><AdminSearchHighlight text={item.name} query={search} /></strong>{item.is_featured && <Star size={12} aria-label="Nổi bật" className={`shrink-0 ${active ? "fill-amber-300 text-amber-300" : "fill-amber-400 text-amber-500"}`} />}</span><span title={search ? path : `/${item.slug}`} className={`mt-0.5 block truncate text-[10px] font-medium ${active ? "text-blue-100" : "text-slate-400"}`}>{search ? path : `${getLocationLevelLabel(item.level_id)} · /${item.slug}`}</span></span>
          <span title={`${node.descendants.attractions} điểm tham quan`} className={`ml-1 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${active ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"}`}><MapPin size={12} className="opacity-75" />{node.descendants.attractions}</span>
        </button>
      </div>;
    })}
  </div>;
}
