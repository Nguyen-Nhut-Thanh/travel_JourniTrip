import type { LocationItem } from "shared";

export type LocationTreeNode = {
  item: LocationItem;
  children: LocationTreeNode[];
  matched: boolean;
  descendants: { regions: number; provinces: number; attractions: number };
};

/** Keep ancestors of matches; countries start the displayed geographic tree. */
export function buildLocationManagementTree(allItems: LocationItem[], matches: LocationItem[]): LocationTreeNode[] {
  const byId = new Map(allItems.map(item => [item.location_id, item]));
  const matchOrder = new Map(matches.map((item, index) => [item.location_id, index]));
  const included = new Set<number>();
  const parentOf = (item: LocationItem) => {
    if (item.level_id <= 3 || item.parent_id == null) return undefined;
    const parent = byId.get(item.parent_id);
    // Invalid or missing links stay visible as roots instead of disappearing.
    return parent && parent.level_id >= 3 && parent.level_id < item.level_id ? parent : undefined;
  };
  for (const match of matches) {
    let current: LocationItem | undefined = byId.get(match.location_id);
    while (current && !included.has(current.location_id)) {
      included.add(current.location_id);
      current = parentOf(current);
    }
  }
  const nodes = new Map<number, LocationTreeNode>();
  for (const id of included) {
    nodes.set(id, {
      item: byId.get(id)!,
      children: [],
      matched: matchOrder.has(id),
      descendants: { regions: 0, provinces: 0, attractions: 0 },
    });
  }
  const roots: LocationTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = parentOf(node.item);
    if (parent && nodes.has(parent.location_id)) nodes.get(parent.location_id)!.children.push(node);
    else roots.push(node);
  }
  const rank = new Map<number, number>();
  const summarize = (node: LocationTreeNode): number => {
    let firstChildRank = Infinity;
    for (const child of node.children) {
      firstChildRank = Math.min(firstChildRank, summarize(child));
      node.descendants.regions += child.descendants.regions + Number(child.item.level_id === 4);
      node.descendants.provinces += child.descendants.provinces + Number(child.item.level_id === 5);
      node.descendants.attractions += child.descendants.attractions + Number(child.item.level_id === 6);
    }
    const value = matchOrder.get(node.item.location_id) ?? firstChildRank;
    rank.set(node.item.location_id, value);
    return value;
  };
  roots.forEach(summarize);
  const sort = (siblings: LocationTreeNode[]) => {
    siblings.sort((left, right) => rank.get(left.item.location_id)! - rank.get(right.item.location_id)! || left.item.name.localeCompare(right.item.name, "vi"));
    siblings.forEach(node => sort(node.children));
  };
  sort(roots);
  return roots;
}

