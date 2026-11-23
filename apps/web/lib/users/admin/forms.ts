import { normalizeSearchText } from "shared";
import type { UserItem } from 'shared';

export function matchesUserSearch(user: UserItem, search: string) {
  const normalizedSearch = normalizeSearchText(search.trim());
  if(!normalizedSearch) return true;

  return (
    normalizeSearchText(user.full_name).includes(normalizedSearch) ||
    normalizeSearchText((user.accounts?.email || "")).includes(normalizedSearch)
  );
}
