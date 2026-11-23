"use client";

import { LocationManagementHeader } from "@/components/locations/location_management/AdminLocationManagementHeader";
import { LocationManagementStats } from "@/components/locations/location_management/AdminLocationManagementStats";
import { LocationManagementFilters } from "@/components/locations/location_management/AdminLocationManagementFilters";
import { LocationManagementTable } from "@/components/locations/location_management/AdminLocationManagementTable";

import { ConfirmDialog } from "@/components/common/dialogs_and_feedback/dialogs/ConfirmDialog";
import {
  deleteAdminLocation,
  getAdminLocationLevels,
  getAdminLocations,
  saveAdminLocation,
  updateAdminLocation,
} from "@/lib/locations/admin/api";
import {
  DEFAULT_LOCATION_FILTERS,
  filterManagedLocations,
} from "@/lib/locations/admin/management";
import { useToast } from "@/lib/notifications/useToast";
import type { LocationQuickPayload } from "@/lib/locations/admin/explorer";
import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LocationItem, LocationLevel } from "shared";

export default function AdminLocationsPage() {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [items, setItems] = useState<LocationItem[]>([]);
  const [levels, setLevels] = useState<LocationLevel[]>([]);
  const [filters, setFilters] = useState({ ...DEFAULT_LOCATION_FILTERS });
  const [pendingDelete, setPendingDelete] = useState<LocationItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const deleting = useRef(false);
  const [featuringIds, setFeaturingIds] = useState<number[]>([]);
  const featuring = useRef(new Set<number>());

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const [locations, levelData] = await Promise.all([
        getAdminLocations<LocationItem>(),
        getAdminLocationLevels<LocationLevel>(),
      ]);
      setItems(locations.items ?? []);
      setLevels(levelData);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const toggleFeatured = async (item: LocationItem) => {
    if (featuring.current.has(item.location_id)) return;
    featuring.current.add(item.location_id);
    setFeaturingIds([...featuring.current]);
    try {
      const saved = await updateAdminLocation<LocationItem>(item.location_id, { is_featured: !item.is_featured });
      setItems(current => current.map(location => location.location_id === item.location_id ? { ...location, ...saved } : location));
      success(saved.is_featured ? "Đã gắn nổi bật" : "Đã bỏ gắn nổi bật");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái nổi bật.");
    } finally {
      featuring.current.delete(item.location_id);
      setFeaturingIds([...featuring.current]);
    }
  };

  const saveQuick = async (id: number | null, payload: LocationQuickPayload): Promise<LocationItem | null> => {
    try {
      const saved = await saveAdminLocation<LocationItem>(id, payload);
      const existing = id == null ? undefined : items.find(location => location.location_id === id);
      const parent = items.find(location => location.location_id === saved.parent_id);
      const location: LocationItem = { ...existing, ...saved, locations: parent ? { name: parent.name } : existing?.locations };
      setItems(current => id == null ? [...current, location] : current.map(item => item.location_id === id ? { ...item, ...location } : item));
      success(id == null ? "Đã thêm địa điểm" : "Đã cập nhật địa điểm");
      return location;
    } catch (error) {
      showError(error instanceof Error ? error.message : "Không thể lưu địa điểm.");
      return null;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting.current) return;
    const id = pendingDelete.location_id;
    deleting.current = true;
    setDeletingId(id);
    try {
      await deleteAdminLocation(id);
      setItems((current) => current.filter((item) => item.location_id !== id));
      setPendingDelete(null);
      success("Đã xóa địa điểm thành công");
    } catch (error) {
      setPendingDelete(null);
      showError(
        error instanceof Error
          ? error.message
          : "Không thể xóa địa điểm. Vui lòng thử lại.",
      );
    } finally {
      deleting.current = false;
      setDeletingId(null);
    }
  };
  const filtered = useMemo(
    () => filterManagedLocations(items, filters),
    [items, filters],
  );
  const regions = useMemo(
    () =>
      items
        .filter((item) => item.level_id === 4)
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [items],
  );

  return (
    <div className="ui-location-management-page min-w-0 space-y-3 text-[#15284d]">
      <div className="shrink-0 space-y-3">
      <LocationManagementHeader />
      <LocationManagementStats items={items} loading={loading} />
      <details className="group">
        <summary className="w-fit cursor-pointer text-xs font-semibold text-[#6481ae] hover:text-[#075bff]">Bộ lọc nâng cao{Object.entries(filters).some(([key, value]) => value !== DEFAULT_LOCATION_FILTERS[key as keyof typeof DEFAULT_LOCATION_FILTERS]) ? " · Đang áp dụng" : ""}</summary>
        <div className="mt-2">
          <LocationManagementFilters value={filters} onChange={setFilters} levels={levels} regions={regions} />
        </div>
      </details>
      </div>
      {failed ? (
        <div
          role="alert"
          className="ui-location-management-error flex items-center justify-between gap-3 rounded-[14px] border border-rose-200 bg-rose-50/80 p-4 text-xs text-rose-700 shadow-2xs"
        >
          <span>Không thể tải danh sách địa điểm.</span>
          <button
            type="button"
            className="font-bold underline hover:no-underline cursor-pointer"
            onClick={() => void load()}
          >
            Tải lại
          </button>
        </div>
      ) : (
        <LocationManagementTable
          key={JSON.stringify(filters)}
          items={filtered}
          allItems={items}
          loading={loading}
          deletingId={deletingId}
          featuringIds={featuringIds}
          onDelete={setPendingDelete}
          onToggleFeatured={toggleFeatured}
          onSaveQuick={saveQuick}
        />
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        icon={<Trash2 size={28} />}
        title="Xác nhận xóa địa điểm"
        description={
          pendingDelete
            ? `Địa điểm "${pendingDelete.name}" sẽ bị xóa vĩnh viễn nếu không còn liên kết dữ liệu. Hệ thống sẽ chặn khi địa điểm còn địa điểm con, được tour sử dụng hoặc có khách sạn liên kết.`
            : ""
        }
        confirmLabel={deletingId !== null ? "Đang xóa..." : "Xóa địa điểm"}
        cancelLabel="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting.current) setPendingDelete(null);
        }}
      />
    </div>
  );
}
