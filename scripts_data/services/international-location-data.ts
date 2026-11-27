export const INTERNATIONAL_LEVELS = [
  { level_id: 3, name: 'Country', description: 'Quốc gia', location_type: 'country' },
  { level_id: 4, name: 'Subcountry Region', description: 'Vùng / Miền', location_type: 'subcountry_region' },
  { level_id: 5, name: 'Province / State', description: 'Tỉnh / Thành phố', location_type: 'province_state' },
  { level_id: 6, name: 'Attraction', description: 'Điểm tham quan', location_type: 'attraction' },
] as const;

export interface InternationalLocation {
  name: string;
  slug: string;
  location_type: string;
  level_id: number;
  parent_slug: string | null;
  country_code: string;
  note: string | null;
}

export interface InternationalAttraction {
  name: string;
  slug: string;
  province_slug: string;
  country_code: string;
  description: string | null;
  highlights: string | null;
  best_time: string | null;
  cuisine: string | null;
  tags: string | null;
  image_url: string | null;
  is_featured: boolean;
}

export interface InternationalLocationData {
  locations: InternationalLocation[];
  attractions: InternationalAttraction[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} phải là một object.`);
  }
  return value as Record<string, unknown>;
}

function required(value: unknown, label: string, max = 255): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new Error(`${label} phải là chuỗi không rỗng, tối đa ${max} ký tự.`);
  }
  return value.trim();
}

function optional(value: unknown, label: string, max?: number): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || (max !== undefined && value.trim().length > max)) {
    throw new Error(`${label} không hợp lệ.`);
  }
  return value.trim() || null;
}

export function normalizeInternationalLocations(raw: unknown): InternationalLocationData {
  const bundle = record(raw, 'Dữ liệu địa điểm nước ngoài');
  if (bundle.schema_version !== '1.0.0') throw new Error('Chỉ hỗ trợ schema_version = 1.0.0.');
  if (!Array.isArray(bundle.locations) || !bundle.locations.length || !Array.isArray(bundle.attractions)) {
    throw new Error('File phải có mảng locations không rỗng và mảng attractions.');
  }

  const slugs = new Set<string>();
  const countryCodes = new Set<string>();
  function slug(value: unknown): string {
    const result = required(value, 'slug');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new Error(`Slug không hợp lệ: ${result}.`);
    if (slugs.has(result)) throw new Error(`Trùng slug: ${result}.`);
    slugs.add(result);
    return result;
  }
  function countryCode(value: unknown): string {
    const code = required(value, 'country_code', 2);
    if (!/^[A-Z]{2}$/.test(code) || code === 'VN') {
      throw new Error(`country_code nước ngoài không hợp lệ: ${code}.`);
    }
    return code;
  }

  const locations = bundle.locations.map((value): InternationalLocation => {
    const item = record(value, 'Địa điểm');
    const level = INTERNATIONAL_LEVELS.find(l => l.level_id === item.level_id && l.level_id < 6);
    if (!level || item.location_type !== level.location_type) {
      throw new Error(`Cặp level_id / location_type không hợp lệ: ${String(item.slug)}.`);
    }
    const code = countryCode(item.country_code);
    if (level.level_id === 3) {
      if (item.parent_slug !== null) throw new Error('Quốc gia phải có parent_slug = null.');
      if (countryCodes.has(code)) throw new Error(`Trùng quốc gia: ${code}.`);
      countryCodes.add(code);
    }
    return {
      name: required(item.name, 'name'), slug: slug(item.slug),
      location_type: level.location_type, level_id: level.level_id,
      parent_slug: level.level_id === 3 ? null : required(item.parent_slug, 'parent_slug'),
      country_code: code, note: optional(item.note, 'note'),
    };
  }).sort((a, b) => a.level_id - b.level_id);

  const bySlug = new Map(locations.map(l => [l.slug, l]));
  for (const location of locations) {
    if (location.parent_slug === null) continue;
    const parent = bySlug.get(location.parent_slug);
    if (!parent || parent.level_id !== location.level_id - 1 || parent.country_code !== location.country_code) {
      throw new Error(`Địa điểm cha sai cấp hoặc khác quốc gia: ${location.slug}.`);
    }
  }

  const attractions = bundle.attractions.map((value): InternationalAttraction => {
    const item = record(value, 'Điểm tham quan');
    const code = countryCode(item.country_code);
    const provinceSlug = required(item.province_slug, 'province_slug');
    const province = bySlug.get(provinceSlug);
    if (!province || province.level_id !== 5 || province.country_code !== code) {
      throw new Error(`Tỉnh/thành của điểm tham quan không hợp lệ: ${String(item.slug)}.`);
    }
    if (item.is_featured !== undefined && typeof item.is_featured !== 'boolean') {
      throw new Error(`is_featured phải là boolean: ${String(item.slug)}.`);
    }
    const imageUrl = optional(item.image_url, 'image_url');
    if (imageUrl) {
      let url: URL;
      try { url = new URL(imageUrl); } catch { throw new Error(`image_url không hợp lệ: ${String(item.slug)}.`); }
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('image_url chỉ hỗ trợ http/https.');
    }
    return {
      name: required(item.name, 'name'), slug: slug(item.slug), province_slug: provinceSlug,
      country_code: code, description: optional(item.description, 'description'),
      highlights: optional(item.highlights, 'highlights'), best_time: optional(item.best_time, 'best_time', 255),
      cuisine: optional(item.cuisine, 'cuisine'), tags: optional(item.tags, 'tags'),
      image_url: imageUrl, is_featured: item.is_featured === true,
    };
  });
  return { locations, attractions };
}

export function summarizeInternationalLocations(data: InternationalLocationData) {
  return {
    countries: data.locations.filter(l => l.level_id === 3).length,
    regions: data.locations.filter(l => l.level_id === 4).length,
    provinces: data.locations.filter(l => l.level_id === 5).length,
    attractions: data.attractions.length,
    totalLocations: data.locations.length + data.attractions.length,
  };
}
