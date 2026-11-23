"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import {
  Building2,
  ChevronRight,
  FolderTree,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { AdminSearchInput } from "@/components/common/admin_shared/tables/AdminSearchInput";
import { AdminSearchHighlight } from "@/components/common/admin_shared/tables/AdminSearchHighlight";
import { AdminRowActions } from "@/components/common/admin_shared/tables/AdminRowActions";
import { useAdminContentReadOnly } from "@/components/common/admin_shared/guards/AdminContentPermission";
import { ImageWithFallback } from "@/components/common/dialogs_and_feedback/media/ImageWithFallback";
import { LocationExplorerTree } from "./AdminLocationExplorerTree";
import {
  LocationQuickModal,
  type LocationQuickModalState,
} from "./AdminLocationQuickModal";
import { LocationTypeBadge } from "./AdminLocationTypeBadge";
import { buildLocationManagementTree } from "@/lib/locations/admin/tree";
import {
  collectLocationProvinces,
  collectLocationSpots,
  filterLocationSpots,
  getLocationAdminTreeRows,
  getLocationExplorerPath,
  type LocationQuickPayload,
} from "@/lib/locations/admin/explorer";
import { ADMIN_CONTENT_DENIED, type LocationItem } from "shared";

function formatUpdated(item: LocationItem) {
  const date = item.updated_at ? new Date(item.updated_at) : null;
  return date && Number.isFinite(date.getTime())
    ? {
        date: date.toLocaleDateString("vi-VN", {
          timeZone: "Asia/Bangkok",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        time: date.toLocaleTimeString("vi-VN", {
          timeZone: "Asia/Bangkok",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }
    : null;
}

function FeaturedButton({
  item,
  busy,
  readOnly,
  subtle = false,
  onToggle,
}: {
  item: LocationItem;
  busy: boolean;
  readOnly: boolean;
  subtle?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy || readOnly}
      aria-pressed={!!item.is_featured}
      title={
        readOnly
          ? ADMIN_CONTENT_DENIED
          : item.is_featured
            ? "Bỏ gắn nổi bật"
            : "Đánh dấu nổi bật"
      }
      onClick={onToggle}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus-visible:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 ${item.is_featured ? "border-amber-200 bg-amber-50 text-amber-600" : `border-slate-200/80 bg-slate-50 text-slate-400 hover:border-amber-200 hover:text-amber-600 ${subtle ? "md:opacity-0 md:group-hover:opacity-100" : ""}`}`}
    >
      {busy ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Star
          size={12}
          className={item.is_featured ? "fill-amber-400 text-amber-500" : ""}
        />
      )}
      {item.is_featured ? "NỔI BẬT" : subtle ? "Nổi bật" : "Đánh dấu nổi bật"}
    </button>
  );
}

export function LocationManagementTable({
  items,
  allItems = items,
  loading,
  deletingId,
  featuringIds,
  onDelete,
  onToggleFeatured,
  onSaveQuick,
}: {
  items: LocationItem[];
  allItems?: LocationItem[];
  loading: boolean;
  deletingId: number | null;
  featuringIds: number[];
  onDelete: (item: LocationItem) => void;
  onToggleFeatured: (item: LocationItem) => Promise<void>;
  onSaveQuick: (
    id: number | null,
    payload: LocationQuickPayload,
  ) => Promise<LocationItem | null>;
}) {
  const readOnly = useAdminContentReadOnly();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [treeSearch, setTreeSearch] = useState("");
  const beforeSearch = useRef<{ selectedId: number | null; expanded: Record<number, boolean> } | null>(null);
  const changeTreeSearch = (next: string) => {
    if (next.trim() && !treeSearch.trim()) beforeSearch.current = { selectedId, expanded };
    if (!next.trim() && beforeSearch.current) {
      setSelectedId(beforeSearch.current.selectedId);
      setExpanded(beforeSearch.current.expanded);
      beforeSearch.current = null;
    }
    setTreeSearch(next);
  };
  const [spotSearch, setSpotSearch] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [modal, setModal] = useState<LocationQuickModalState | null>(null);
  const tree = useMemo(
    () => buildLocationManagementTree(allItems, items),
    [allItems, items],
  );
  const path = useMemo(
    () => getLocationExplorerPath(tree, selectedId),
    [tree, selectedId],
  );
  const active = path.at(-1);
  const item = active?.item;
  const countryCode = path.find((node) => node.item.level_id === 3)?.item
    .country_code;
  const treeRows = getLocationAdminTreeRows(
    treeSearch.trim() ? tree : tree.filter(node => node.item.level_id >= 3 && node.item.level_id <= 5),
    (id) => expanded[id] ?? path.some((node) => node.item.location_id === id),
    treeSearch,
  );
  const otherRoots = tree.filter(
    (node) => node.item.level_id < 3 || node.item.level_id === 6,
  );
  const spots = useMemo(
    () => collectLocationSpots(active, path),
    [active, path],
  );
  const provinces = useMemo(() => collectLocationProvinces(active), [active]);
  const filteredSpots = useMemo(
    () =>
      filterLocationSpots(spots, {
        search: spotSearch,
        onlyFeatured,
        provinceId: provinceFilter,
      }),
    [spots, spotSearch, onlyFeatured, provinceFilter],
  );
  const updated = item ? formatUpdated(item) : null;
  const select = (id: number) => {
    setSelectedId(id);
    setProvinceFilter("all");
    setSpotSearch("");
    const nextPath = getLocationExplorerPath(tree, id);
    if (!treeSearch.trim()) setExpanded((previous) => ({
      ...previous,
      ...Object.fromEntries(
        nextPath.map((node) => [node.item.location_id, true]),
      ),
    }));
  };
  const openCreate = (level: number) => {
    if (readOnly || !item) return;
    setModal({ mode: "create", target: item, level, provinces, countryCode });
  };
  const openEdit = (target: LocationItem) => {
    if (!readOnly)
      setModal({
        mode: "edit",
        target,
        level: target.level_id,
        provinces: [],
        countryCode,
      });
  };
  const skeleton = (
    <div className="space-y-3 p-4" aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-[64px] animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
  const canAddAdmin = item?.level_id === 3 || item?.level_id === 4;
  const canAddSpot = !!item && provinces.length > 0 && !readOnly;

  return (
    <section
      className="ui-location-management-explorer flex h-[90dvh] min-h-0 min-w-0 flex-col"
      aria-label="Quản lý địa điểm theo cây phân cấp"
      aria-busy={loading}
    >
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,.45fr)_minmax(0,.55fr)] items-stretch gap-4 lg:grid-cols-[minmax(310px,.58fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
        <aside
          className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
          aria-label="Cây phân cấp hành chính"
        >
          <header className="shrink-0 space-y-3 border-b border-slate-100 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Cây phân cấp hành chính
              </h2>
              {canAddAdmin && (
                <button
                  type="button"
                  disabled={readOnly || loading}
                  title={readOnly ? ADMIN_CONTENT_DENIED : undefined}
                  onClick={() => openCreate(item.level_id + 1)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={13} />
                  {item.level_id === 3 ? "Thêm miền" : "Thêm tỉnh/thành"}
                </button>
              )}
            </div>
            <AdminSearchInput value={treeSearch} onChange={changeTreeSearch} aria-label="Tìm địa điểm ở mọi cấp" placeholder="Tìm quốc gia, miền, tỉnh hoặc điểm tham quan..." />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto">
            {loading ? (
              skeleton
            ) : (
              <LocationExplorerTree
                rows={treeRows}
                search={treeSearch}
                selectedId={item?.location_id}
                onSelect={select}
                onToggle={(id) =>
                  setExpanded((previous) => ({
                    ...previous,
                    [id]: !(
                      previous[id] ??
                      path.some((node) => node.item.location_id === id)
                    ),
                  }))
                }
              />
            )}
            {!loading && !treeSearch.trim() && otherRoots.length > 0 && (
              <details
                className="mx-3 mb-3 border-t border-slate-100 pt-2"
                open={!!item && (item.level_id < 3 || item.level_id === 6)}
              >
                <summary className="cursor-pointer text-[11px] text-slate-400">
                  Cấp địa lý khác ({otherRoots.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {otherRoots.map((node) => (
                    <button
                      key={node.item.location_id}
                      type="button"
                      onClick={() => select(node.item.location_id)}
                      className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-xs ${node.item.location_id === item?.location_id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
                    >
                      {node.item.name}
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </aside>

        <div
          className="flex min-h-0 min-w-0 flex-col overflow-y-auto overscroll-y-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs lg:overflow-hidden"
          aria-label="Địa điểm tham quan trong khu vực đang chọn"
        >
          {item && !loading && (
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
              <nav
                aria-label="Đường dẫn khu vực"
                className="flex flex-wrap items-center gap-1.5"
              >
                {path.map((crumb, index) => (
                  <Fragment key={crumb.item.location_id}>
                    {index > 0 && (
                      <ChevronRight
                        size={14}
                        className="shrink-0 text-slate-300"
                      />
                    )}
                    <button
                      type="button"
                      aria-current={
                        index === path.length - 1 ? "location" : undefined
                      }
                      onClick={() => select(crumb.item.location_id)}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs ${index === path.length - 1 ? "border border-blue-200/80 bg-blue-50 font-bold text-blue-700" : "font-medium text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"}`}
                    >
                      {crumb.item.name}
                    </button>
                  </Fragment>
                ))}
              </nav>
              {updated && (
                <span className="text-[10px] text-slate-400">
                  Cập nhật: {updated.date} · {updated.time}
                </span>
              )}
            </header>
          )}
          {loading ? (
            skeleton
          ) : !item ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-8 text-center">
              <FolderTree size={32} className="shrink-0 text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-700">
                {tree.length
                  ? "Chọn khu vực để xem địa điểm"
                  : "Không tìm thấy địa điểm phù hợp"}
              </h3>
              <p className="text-xs text-slate-400">
                {tree.length
                  ? "Chọn quốc gia, miền hoặc tỉnh/thành phố trong cây bên trái."
                  : "Thử thay đổi từ khóa hoặc bộ lọc."}
              </p>
            </div>
          ) : (
            <>
              <div className="flex shrink-0 flex-col justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50/40 to-blue-50/20 p-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-start gap-4 sm:items-center">
                  <ImageWithFallback
                    src={
                      item.location_images?.[0]?.image_url ||
                      item.featured_image ||
                      undefined
                    }
                    alt={item.name}
                    className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 object-cover shadow-xs"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        title={item.name}
                        className="truncate text-lg font-bold text-slate-900"
                      >
                        {item.name}
                      </h2>
                      <LocationTypeBadge level={item.level_id} />
                      <FeaturedButton
                        item={item}
                        busy={featuringIds.includes(item.location_id)}
                        readOnly={readOnly}
                        onToggle={() => void onToggleFeatured(item)}
                      />
                    </div>
                    <p
                      title={item.note || undefined}
                      className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500"
                    >
                      {item.note || "Chưa có mô tả chi tiết cho địa điểm này."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                      <span className="min-w-0">
                        Slug:{" "}
                        <code
                          title={`/${item.slug}`}
                          className="inline-block max-w-[180px] truncate rounded bg-slate-100 px-1.5 py-0.5 align-middle font-mono text-slate-600"
                        >
                          /{item.slug}
                        </code>
                      </span>
                      <span>
                        <strong className="text-slate-700">
                          {spots.length}
                        </strong>{" "}
                        điểm tham quan trực thuộc
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <button
                    type="button"
                    disabled={!canAddSpot}
                    title={
                      readOnly
                        ? ADMIN_CONTENT_DENIED
                        : !provinces.length
                          ? "Thêm tỉnh/thành phố trước khi thêm điểm tham quan"
                          : undefined
                    }
                    onClick={() => openCreate(6)}
                    className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={15} />
                    Thêm địa điểm
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={readOnly}
                      title={readOnly ? ADMIN_CONTENT_DENIED : undefined}
                      onClick={() => openEdit(item)}
                      className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Pencil size={13} />
                      Sửa thông tin
                    </button>
                    <AdminRowActions
                      label={`Thao tác với ${item.name}`}
                      disabled={deletingId === item.location_id}
                      actions={[
                        {
                          label: "Chỉnh sửa đầy đủ",
                          icon: <Pencil size={15} />,
                          href: `/admin/locations/${item.location_id}`,
                        },
                        {
                          label: "Thiết lập grid nổi bật",
                          icon: <Star size={15} />,
                          href: "/admin/banners?tab=featured",
                        },
                        {
                          label: "Xóa địa điểm",
                          icon: <Trash2 size={15} />,
                          danger: true,
                          onClick: () => onDelete(item),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-700">
                    Địa điểm tham quan ({filteredSpots.length})
                  </h3>
                  <button
                    type="button"
                    aria-pressed={onlyFeatured}
                    onClick={() => setOnlyFeatured((value) => !value)}
                    className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${onlyFeatured ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                  >
                    <Star
                      size={12}
                      className={
                        onlyFeatured
                          ? "fill-amber-400 text-amber-500"
                          : "text-slate-400"
                      }
                    />
                    Chỉ nổi bật
                  </button>
                  {provinces.length > 1 && (
                    <select
                      aria-label="Lọc điểm tham quan theo tỉnh thành"
                      value={provinceFilter}
                      onChange={(event) =>
                        setProvinceFilter(event.target.value)
                      }
                      className="max-w-[200px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 outline-none focus:border-blue-500"
                    >
                      <option value="all">
                        Tất cả tỉnh/thành ({provinces.length})
                      </option>
                      {provinces.map((province) => (
                        <option
                          key={province.location_id}
                          value={province.location_id}
                        >
                          Thuộc {province.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <AdminSearchInput className="w-full sm:w-52" value={spotSearch} onChange={setSpotSearch} aria-label="Tìm điểm tham quan trong khu vực" placeholder="Tìm tên địa điểm, slug..." roundedClassName="rounded-lg" />
              </div>
              <div className="min-h-[160px] flex-1 shrink-0 divide-y divide-slate-100 overflow-y-auto overscroll-y-auto lg:min-h-0 lg:shrink">
                {!filteredSpots.length ? (
                  <div className="px-4 py-16 text-center">
                    <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                      <MapPin size={24} />
                    </span>
                    <p className="text-sm font-semibold text-slate-700">
                      Chưa có địa điểm tham quan nào phù hợp
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Thử xóa bộ lọc hoặc thêm địa điểm mới.
                    </p>
                  </div>
                ) : (
                  filteredSpots.map((spot) => {
                    const date = formatUpdated(spot.item);
                    return (
                      <article
                        key={spot.item.location_id}
                        data-spot-id={spot.item.location_id}
                        className="group flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 transition-colors hover:bg-blue-50/30"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                          <ImageWithFallback
                            src={
                              spot.item.location_images?.[0]?.image_url ||
                              spot.item.featured_image ||
                              undefined
                            }
                            alt={spot.item.name}
                            className="h-12 w-12 shrink-0 rounded-xl border border-slate-200/80 object-cover shadow-xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => openEdit(spot.item)}
                                title={spot.item.name}
                                className="max-w-full cursor-pointer truncate text-left text-[13px] font-semibold text-slate-800 group-hover:text-blue-700 disabled:cursor-default"
                              >
                                <AdminSearchHighlight text={spot.item.name} query={spotSearch || treeSearch} />
                              </button>
                              {item.level_id !== 5 && spot.province && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    select(spot.province!.location_id)
                                  }
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                  <Building2 size={11} />
                                  {spot.province.name}
                                </button>
                              )}
                              <FeaturedButton
                                item={spot.item}
                                busy={featuringIds.includes(
                                  spot.item.location_id,
                                )}
                                readOnly={readOnly}
                                subtle
                                onToggle={() =>
                                  void onToggleFeatured(spot.item)
                                }
                              />
                            </div>
                            <p
                              title={spot.item.note || undefined}
                              className="mt-0.5 truncate text-xs text-slate-500"
                            >
                              {spot.item.note || "Chưa có mô tả"}
                            </p>
                          </div>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-3">
                          <code
                            title={`/${spot.item.slug}`}
                            className="hidden max-w-[115px] truncate rounded-lg bg-slate-100/80 px-2 py-1 text-[10px] text-slate-500 xl:inline-block"
                          >
                            /{spot.item.slug}
                          </code>
                          {date && (
                            <time
                              dateTime={spot.item.updated_at || undefined}
                              className="hidden text-right xl:block"
                            >
                              <span className="block text-[11px] font-medium text-slate-600">
                                {date.date}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {date.time}
                              </span>
                            </time>
                          )}
                          <AdminRowActions
                            label={`Thao tác với ${spot.item.name}`}
                            disabled={deletingId === spot.item.location_id}
                            actions={[
                              {
                                label: "Chỉnh sửa địa điểm",
                                icon: <Pencil size={15} />,
                                onClick: () => openEdit(spot.item),
                              },
                              {
                                label: spot.item.is_featured
                                  ? "Bỏ gắn nổi bật"
                                  : "Gắn nổi bật",
                                icon: <Star size={15} />,
                                disabled: featuringIds.includes(
                                  spot.item.location_id,
                                ),
                                onClick: () => void onToggleFeatured(spot.item),
                              },
                              {
                                label: "Chỉnh sửa đầy đủ",
                                icon: <Pencil size={15} />,
                                href: `/admin/locations/${spot.item.location_id}`,
                              },
                              {
                                label: "Xóa địa điểm",
                                icon: <Trash2 size={15} />,
                                danger: true,
                                onClick: () => onDelete(spot.item),
                              },
                            ]}
                          />
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {modal && (
        <LocationQuickModal
          key={`${modal.mode}-${modal.level}-${modal.target.location_id}`}
          state={modal}
          onClose={() => setModal(null)}
          onSave={onSaveQuick}
          onSaved={(saved) => {
            if (saved.level_id !== 6) {
              setSelectedId(saved.location_id);
              setExpanded((previous) => ({
                ...previous,
                [modal.target.location_id]: true,
                [saved.location_id]: true,
              }));
            }
            if (modal.mode === "create") {
              setSpotSearch("");
              setProvinceFilter("all");
              if (!saved.is_featured) setOnlyFeatured(false);
            }
          }}
        />
      )}
    </section>
  );
}
