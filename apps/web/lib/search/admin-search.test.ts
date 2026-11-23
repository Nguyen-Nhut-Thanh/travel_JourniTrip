import assert from "node:assert/strict";
import test from "node:test";
import { getMatchingTourSchedules, getSearchHighlightRanges, matchesSearchText, normalizeSearchText, type LocationItem, type ToursPageTour } from "shared";
import { buildLocationManagementTree } from "../locations/admin/tree";
import { collectLocationSpots, filterLocationSpots, getLocationAdminTreeRows, getLocationExplorerPath } from "../locations/admin/explorer";
import { DEFAULT_TOUR_FILTERS, filterManagedTours } from "../tours/admin/management";
import { filterTourSchedules } from "../schedules/admin/tour-schedules";

const place = (location_id: number, name: string, level_id: number, parent_id?: number): LocationItem => ({ location_id, name, level_id, parent_id, slug: normalizeSearchText(name).replaceAll(" ", "-") });
const places = [place(1, "Việt Nam", 3), place(2, "Miền Nam", 4, 1), place(3, "An Giang", 5, 2), place(4, "Núi Cấm", 6, 3),
  place(5, "Miền Bắc", 4, 1), place(6, "Hà Giang", 5, 5), place(7, "Núi Cấm", 6, 6), place(8, "Rừng Tràm", 6, 3)];
const tree = buildLocationManagementTree(places, places);

test("Vietnamese search ignores case, accents and extra whitespace across fields", () => {
  assert.equal(normalizeSearchText("  ĐÀ  NẴNG  "), "da nang");
  assert.ok(matchesSearchText("NUI CAM an giang", "Núi Cấm", "An Giang"));
  assert.ok(matchesSearchText("ĐÀ NẴNG", "Đà Nẵng"));
  assert.equal(matchesSearchText("nui cam", "Núi Bà"), false);
  assert.ok(matchesSearchText(" ", null));
});

test("search reaches grandchildren of collapsed nodes and preserves their ancestor paths", () => {
  const rows = getLocationAdminTreeRows(tree, () => false, "nui cam an giang");
  assert.deepEqual(rows.map(row => row.node.item.location_id), [1, 2, 3, 4]);
  assert.ok(rows.every(row => row.expanded));
  assert.equal(rows.at(-1)?.path, "Việt Nam → Miền Nam → An Giang → Núi Cấm");
  assert.equal(rows.at(-1)?.matched, true);
  assert.deepEqual(getLocationExplorerPath(tree, 4).map(node => node.item.location_id), [1, 2, 3, 4]);
});

test("duplicate child names show separate paths and unrelated branches disappear", () => {
  const rows = getLocationAdminTreeRows(tree, () => false, "NÚI CẤM");
  const results = rows.filter(row => row.node.item.level_id === 6);
  assert.equal(results.length, 2);
  assert.notEqual(results[0].path, results[1].path);
  assert.ok(!rows.some(row => row.node.item.location_id === 8));
  assert.equal(getLocationAdminTreeRows(tree, () => true, "không tồn tại").length, 0);
});

test("matching a parent exposes descendants; clearing search respects normal expansion", () => {
  assert.deepEqual(getLocationAdminTreeRows(tree, () => false, "an giang").filter(row => row.node.item.level_id === 6).map(row => row.node.item.location_id), [4, 8]);
  assert.deepEqual(getLocationAdminTreeRows(tree, () => false, "").map(row => row.node.item.location_id), [1]);
  assert.deepEqual(getLocationAdminTreeRows(tree, id => [1, 2].includes(id), "").map(row => row.node.item.location_id), [1, 2, 3, 5]);
  const spots = collectLocationSpots(tree[0]);
  assert.deepEqual(filterLocationSpots(spots, { search: "nui cam an giang", onlyFeatured: false, provinceId: "all" }).map(spot => spot.item.location_id), [4]);
});

test("schedule code finds its parent tour before pagination, including hidden or old schedules", () => {
  const tours: ToursPageTour[] = Array.from({ length: 15 }, (_, index) => ({ tour_id: index + 1, name: `Tour ${index + 1}`, code: `T${index + 1}`,
    duration_days: 3, duration_nights: 2, base_price: 1000, status: 1, tour_type: "domestic", schedule_summaries: [] }));
  tours[14] = { ...tours[14], name: "Khám phá Đà Nẵng", schedule_summaries: [{ tour_schedule_id: 987, code: "DN-987" }, { tour_schedule_id: 988, code: null }] };
  for (const search of ["dn-987", "#987", "#988", "DA NANG DN-987"]) {
    const result = filterManagedTours(tours, { ...DEFAULT_TOUR_FILTERS, search });
    assert.deepEqual(result.map(tour => tour.tour_id), [15]);
    assert.equal(getMatchingTourSchedules(result[0], search).length, 1);
  }
  assert.equal(getMatchingTourSchedules(tours[14], "da nang").length, 0);
  assert.equal(filterManagedTours(tours, { ...DEFAULT_TOUR_FILTERS, search: "DN-987", status: "hidden" }).length, 0);
});

test("the schedule list itself searches the displayed code", () => {
  const schedule = { tour_schedule_id: 987, code: "DN-987", start_date: "2099-01-01T00:00:00Z", end_date: "2099-01-02T00:00:00Z", price: 1, quota: 10, status: 0 };
  assert.equal(filterTourSchedules([schedule], { search: "dn-987", pickup: "all", time: "all", status: "all" }).length, 1);
});

test("highlights preserve original Vietnamese, combining marks and emoji offsets", () => {
  for (const text of ["Núi Cấm", "Núi Cấm", "🏔️ Núi Cấm"]) {
    const ranges = getSearchHighlightRanges(text, "nui cam");
    assert.equal(ranges.length, 2);
    assert.equal(normalizeSearchText(ranges.map(([start, end]) => text.slice(start, end)).join(" ")), "nui cam");
  }
  assert.deepEqual(getSearchHighlightRanges("Núi Cấm", ""), []);
});
