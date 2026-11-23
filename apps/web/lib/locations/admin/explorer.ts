import { matchesSearchText, normalizeSearchText, type LocationItem } from "shared";
import type { LocationTreeNode } from "./tree";

export type ScopedLocationSpot = { item: LocationItem; province?: LocationItem; region?: LocationItem };
export type LocationQuickPayload = {
  name: string; slug: string; note: string; is_featured: boolean;
  level_id?: number; parent_id?: number; location_type?: string; country_code?: string | null;
};

export function findLocationNodePath(nodes: LocationTreeNode[], id: number): LocationTreeNode[] | null {
  for (const node of nodes) {
    if (node.item.location_id === id) return [node];
    const path = findLocationNodePath(node.children, id);
    if (path) return [node, ...path];
  }
  return null;
}

export function getLocationExplorerPath(roots: LocationTreeNode[], selectedId: number | null): LocationTreeNode[] {
  return selectedId == null ? [] : findLocationNodePath(roots, selectedId) ?? [];
}

export function collectLocationSpots(node: LocationTreeNode | undefined, path: LocationTreeNode[] = []): ScopedLocationSpot[] {
  if (!node) return [];
  const spots: ScopedLocationSpot[] = [];
  const visit = (current: LocationTreeNode, province?: LocationItem, region?: LocationItem) => {
    if (current.item.level_id === 5) province = current.item;
    if (current.item.level_id === 4) region = current.item;
    if (current.item.level_id === 6) spots.push({ item: current.item, province, region });
    else current.children.forEach(child => visit(child, province, region));
  };
  visit(node, path.find(parent => parent.item.level_id === 5)?.item, path.find(parent => parent.item.level_id === 4)?.item);
  return spots;
}

export function collectLocationProvinces(node: LocationTreeNode | undefined): LocationItem[] {
  if (!node) return [];
  if (node.item.level_id === 5) return [node.item];
  return node.children.flatMap(collectLocationProvinces);
}

export function filterLocationSpots(spots: ScopedLocationSpot[], filters: { search: string; onlyFeatured: boolean; provinceId: string }) {
  return spots.filter(spot => (!filters.onlyFeatured || spot.item.is_featured)
    && (filters.provinceId === "all" || String(spot.province?.location_id) === filters.provinceId)
    && matchesSearchText(filters.search, spot.item.name, spot.item.slug, spot.item.note, spot.province?.name, spot.region?.name));
}

export function getLocationAdminTreeRows(roots: LocationTreeNode[], isExpanded: (id: number) => boolean, search: string) {
  const query = normalizeSearchText(search);
  const matchingBranches = new Set<number>();
  const directMatches = new Set<number>();
  const index = (node: LocationTreeNode, ancestors: string[]): boolean => {
    const path = [...ancestors, node.item.name];
    if (matchesSearchText(query, ...path, node.item.slug, node.item.note)) directMatches.add(node.item.location_id);
    // Visit every child so matches in sibling branches are indexed as well.
    const childMatches = node.children.map(child => index(child, path));
    const matched = directMatches.has(node.item.location_id) || childMatches.some(Boolean);
    if (matched) matchingBranches.add(node.item.location_id);
    return matched;
  };
  if (query) roots.forEach(node => index(node, []));
  const rows: { node: LocationTreeNode; depth: number; hasChildren: boolean; expanded: boolean; matched: boolean; path: string }[] = [];
  const visit = (nodes: LocationTreeNode[], depth: number, ancestors: string[]) => nodes.forEach(node => {
    if ((!query && node.item.level_id === 6) || (query && !matchingBranches.has(node.item.location_id))) return;
    const path = [...ancestors, node.item.name];
    const children = node.children.filter(child => query ? matchingBranches.has(child.item.location_id) : child.item.level_id !== 6);
    const expanded = query ? true : isExpanded(node.item.location_id);
    rows.push({ node, depth, hasChildren: children.length > 0, expanded, matched: Boolean(query) && directMatches.has(node.item.location_id), path: path.join(" → ") });
    if (expanded) visit(children, depth + 1, path);
  });
  visit(roots, 0, []);
  return rows;
}
