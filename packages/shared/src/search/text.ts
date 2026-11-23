/** Normalize Vietnamese text without changing stored/displayed values. */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Every search word may match a different field (for example a name and code). */
export function matchesSearchText(query: string, ...values: unknown[]): boolean {
  const text = normalizeSearchText(values.filter(value => value != null).join(" "));
  const normalized = normalizeSearchText(query);
  if (text.includes(normalized)) return true;
  // Separate words may span fields, but "an giang" must not match "Hà Giang"
  // just because both "an" and "giang" occur inside the same word.
  return normalized.split(" ").every(word => {
    let index = text.indexOf(word);
    while (index >= 0) {
      if (index === 0 || !/[a-z0-9]/.test(text[index - 1])) return true;
      index = text.indexOf(word, index + 1);
    }
    return false;
  });
}

export function getSearchHighlightRanges(value: string, query: string): [number, number][] {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  if (!words.length) return [];
  let text = "";
  const offsets: { start: number; end: number }[] = [];
  let position = 0;
  for (const character of value) {
    const normalized = character.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase();
    if (!normalized && offsets.length) offsets[offsets.length - 1].end = position + character.length;
    for (const part of normalized.split("")) {
      text += part;
      offsets.push({ start: position, end: position + character.length });
    }
    position += character.length;
  }
  const ranges: [number, number][] = [];
  for (const word of words) {
    let start = text.indexOf(word);
    while (start >= 0) {
      ranges.push([offsets[start].start, offsets[start + word.length - 1].end]);
      start = text.indexOf(word, start + word.length);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}
