import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import type { ServiceLog } from './membership-upgrader';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export const PROVINCES_URL = 'https://huynhminhvangit.github.io/vn-region-api/data/provinces.json';
export const LOCAL_PROVINCES_PATH = resolve(__dirname, '../data/provinces.json');

// Bộ 34 tỉnh/thành sau sáp nhập. Miền Trung bao gồm Tây Nguyên.
// Đơn vị hợp nhất được phân miền theo tỉnh/thành mang tên hiện tại.
export const REGIONS = [
  { name: 'Miền Bắc', slug: 'mien-bac', codes: '01 04 08 11 12 14 15 19 20 22 24 25 31 33 37' },
  { name: 'Miền Trung', slug: 'mien-trung', codes: '38 40 42 44 46 48 51 52 56 66 68' },
  { name: 'Miền Nam', slug: 'mien-nam', codes: '75 79 80 82 86 91 92 96' }
] as const;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface NormalizedProvince {
  code: string;
  name: string;
  slug: string;
  region: (typeof REGIONS)[number];
  description?: string;
}

export function normalizeProvinces(raw: unknown): NormalizedProvince[] {
  if (!Array.isArray(raw)) throw new Error('Nguồn dữ liệu phải là một mảng tỉnh/thành.');
  const codes = new Set<string>();
  const names = new Set<string>();
  const slugs = new Set<string>();

  const provinces = raw.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Bản ghi tỉnh/thành không hợp lệ.');
    const p = item as Record<string, unknown>;
    if ((typeof p.code !== 'string' && typeof p.code !== 'number') || typeof p.name !== 'string') {
      throw new Error('Tỉnh/thành phải có code và name hợp lệ.');
    }
    const code = String(p.code).padStart(2, '0');
    const region = REGIONS.find((r) => r.codes.split(' ').includes(code));
    const name = p.name.replace(/^(Thành phố trực thuộc trung ương|Thành phố|Tỉnh)\s+/i, '').trim();
    const slug = typeof p.slug === 'string' && p.slug.trim() ? p.slug.trim() : slugify(name);
    const description = typeof p.description === 'string' && p.description.trim()
      ? p.description.trim()
      : typeof p.note === 'string' && p.note.trim()
        ? p.note.trim()
        : undefined;

    if (!region || !name || !slug || name.length > 255 || slug.length > 255) {
      throw new Error(`Tỉnh/thành không hợp lệ hoặc chưa có mapping miền: ${code} (${name}).`);
    }
    if (codes.has(code) || names.has(name) || slugs.has(slug)) {
      throw new Error(`Dữ liệu trùng: ${code} (${name}).`);
    }
    codes.add(code);
    names.add(name);
    slugs.add(slug);
    return { code, name, slug, region, description };
  });

  if (provinces.length !== 34) {
    throw new Error(`Cần đủ bộ 34 tỉnh/thành, nhận được ${provinces.length}. Kiểm tra nguồn dữ liệu trước khi import.`);
  }
  return provinces;
}

export interface LocationStats {
  totalLocations: number;
  countryCount: number;
  regionCount: number;
  provinceCount: number;
  otherCount: number;
  isVietnamPresent: boolean;
  importedRegions: string[];
  importedProvinceCount: number;
  targetProvinceCount: number;
  status: 'empty' | 'partial' | 'ready';
}

export async function getLocationStats(): Promise<LocationStats> {
  const [totalLocations, countryCount, regionCount, provinceCount] = await Promise.all([
    prisma.locations.count(),
    prisma.locations.count({ where: { location_type: 'country' } }),
    prisma.locations.count({ where: { location_type: 'subcountry_region' } }),
    prisma.locations.count({ where: { location_type: 'province_state' } }),
  ]);

  const vietnam = await prisma.locations.findFirst({
    where: { slug: 'viet-nam' },
    select: { location_id: true },
  });

  const regionsFound = await prisma.locations.findMany({
    where: { location_type: 'subcountry_region' },
    select: { name: true },
  });

  const otherCount = totalLocations - (countryCount + regionCount + provinceCount);
  const targetProvinceCount = 34;

  let status: 'empty' | 'partial' | 'ready' = 'empty';
  if (provinceCount >= targetProvinceCount && countryCount > 0 && regionCount >= 3) {
    status = 'ready';
  } else if (totalLocations > 0) {
    status = 'partial';
  }

  return {
    totalLocations,
    countryCount,
    regionCount,
    provinceCount,
    otherCount,
    isVietnamPresent: Boolean(vietnam),
    importedRegions: regionsFound.map((r) => r.name),
    importedProvinceCount: provinceCount,
    targetProvinceCount,
    status,
  };
}

export interface ImportLocationOptions {
  dryRun?: boolean;
  source?: 'local' | 'remote' | 'custom';
  customFilePath?: string;
}

export interface ImportLocationResult {
  success: boolean;
  dryRun: boolean;
  totalProvinces: number;
  createdCount: number;
  updatedCount: number;
  regionsBreakdown: { name: string; count: number }[];
  logs: ServiceLog[];
  stats: LocationStats;
}

export async function importLocations(
  options: ImportLocationOptions = {},
): Promise<ImportLocationResult> {
  const logs: ServiceLog[] = [];
  const log = (level: ServiceLog['level'], message: string) => {
    logs.push({
      level,
      message,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
    });
  };

  const dryRun = Boolean(options.dryRun);
  const source = options.source || 'local';

  log('info', `Bắt đầu quá trình ${dryRun ? 'CHẠY THỬ (Dry Run)' : 'IMPORT THỰC TẾ'} địa điểm Việt Nam...`);

  let raw: unknown;
  let sourceDescription = '';

  if (source === 'custom' && options.customFilePath) {
    const filePath = resolve(options.customFilePath);
    log('info', `Đang đọc file tùy chỉnh: ${filePath}`);
    sourceDescription = `File tùy chỉnh: ${filePath}`;
    const fileContent = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
    raw = JSON.parse(fileContent);
  } else if (source === 'remote') {
    log('info', `Đang tải bộ dữ liệu từ API: ${PROVINCES_URL}`);
    try {
      const response = await fetch(PROVINCES_URL, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      raw = await response.json();
      sourceDescription = 'API online (huynhminhvangit.github.io)';
      log('success', 'Tải dữ liệu từ API online thành công.');
    } catch (err: any) {
      log('warn', `Không tải được từ API online (${err.message}). Chuyển sang nguồn dữ liệu cục bộ dự phòng.`);
      if (existsSync(LOCAL_PROVINCES_PATH)) {
        const fileContent = (await readFile(LOCAL_PROVINCES_PATH, 'utf8')).replace(/^\uFEFF/, '');
        raw = JSON.parse(fileContent);
        sourceDescription = 'File cục bộ dự phòng (provinces.json)';
      } else {
        throw new Error(`Không tải được từ API online và không tìm thấy file cục bộ: ${LOCAL_PROVINCES_PATH}`);
      }
    }
  } else {
    // Mặc định: Local JSON tích hợp sẵn
    if (existsSync(LOCAL_PROVINCES_PATH)) {
      log('info', `Đang tải bộ 34 tỉnh/thành từ file cục bộ: ${LOCAL_PROVINCES_PATH}`);
      const fileContent = (await readFile(LOCAL_PROVINCES_PATH, 'utf8')).replace(/^\uFEFF/, '');
      raw = JSON.parse(fileContent);
      sourceDescription = 'Bộ dữ liệu chuẩn cục bộ (scripts_data/data/provinces.json)';
    } else {
      log('warn', 'Không tìm thấy file cục bộ, tự động tải online từ GitHub...');
      const response = await fetch(PROVINCES_URL, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      raw = await response.json();
      sourceDescription = 'API online (huynhminhvangit.github.io)';
    }
  }

  const provinces = normalizeProvinces(raw);
  log('success', `Đã chuẩn hóa và kiểm tra hợp lệ 34 tỉnh/thành phố (${sourceDescription}).`);

  const regionsBreakdown = REGIONS.map((region) => {
    const count = provinces.filter((p) => p.region.slug === region.slug).length;
    log('info', `• ${region.name}: ${count} tỉnh/thành`);
    return { name: region.name, count };
  });

  if (dryRun) {
    log('success', 'Chế độ Dry Run: Toàn bộ dữ liệu 34 tỉnh/thành hợp lệ. Chưa có thay đổi nào ghi vào CSDL.');
    const currentStats = await getLocationStats();
    return {
      success: true,
      dryRun: true,
      totalProvinces: provinces.length,
      createdCount: 0,
      updatedCount: 0,
      regionsBreakdown,
      logs,
      stats: currentStats,
    };
  }

  let createdCount = 0;
  let updatedCount = 0;

  log('info', 'Bắt đầu nạp cấp bậc địa lý (Geographic Levels: Country, Region, Province)...');
  await prisma.$transaction(
    async (tx) => {
      // 1. Cập nhật Geographic Levels
      for (const level of [
        { level_id: 3, name: 'Country', description: 'Quốc gia' },
        { level_id: 4, name: 'Subcountry Region', description: 'Vùng / Miền' },
        { level_id: 5, name: 'Province / State', description: 'Tỉnh / Thành phố' },
      ]) {
        await tx.geographic_levels.upsert({
          where: { level_id: level.level_id },
          update: { name: level.name, description: level.description },
          create: level,
        });
      }
      log('info', 'Đã đồng bộ Geographic Levels (Cấp 3, 4, 5).');

      // Helper lưu location
      async function saveLocation(data: {
        name: string;
        slug: string;
        location_type: string;
        level_id: number;
        parent_id: number | null;
        country_code: string;
        note?: string | null;
      }) {
        const matches = await tx.locations.findMany({
          where: { OR: [{ slug: data.slug }, { name: data.name }] },
        });

        if (matches.length > 1) {
          throw new Error(`Tên và slug đang thuộc hai địa điểm khác nhau: ${data.name}.`);
        }

        const existing = matches[0];
        if (existing?.country_code && existing.country_code !== 'VN') {
          throw new Error(`Địa điểm trùng thuộc quốc gia khác: ${data.name}.`);
        }

        if (existing) {
          updatedCount++;
          return tx.locations.update({
            where: { location_id: existing.location_id },
            data,
          });
        } else {
          createdCount++;
          return tx.locations.create({ data });
        }
      }

      // 2. Quốc gia: Việt Nam
      const vietnam = await saveLocation({
        name: 'Việt Nam',
        slug: 'viet-nam',
        location_type: 'country',
        level_id: 3,
        parent_id: null,
        country_code: 'VN',
        note: 'Quốc gia hình chữ S tươi đẹp với hơn 3.260 km bờ biển, nền văn hóa ngàn năm văn hiến và cảnh quan thiên nhiên kỳ vĩ trải dài khắp 3 miền.',
      });
      log('success', `Đồng bộ Quốc gia: Việt Nam (ID: ${vietnam.location_id})`);

      const REGION_NOTES: Record<string, string> = {
        'mien-bac': 'Cái nôi văn hóa lịch sử lâu đời, đặc trưng với 4 mùa rõ rệt, núi non hùng vĩ Tây Bắc - Đông Bắc và châu thổ sông Hồng trù phú.',
        'mien-trung': 'Dải đất duyên hải miền Trung và cao nguyên Tây Nguyên nắng gió, sở hữu chuỗi di sản thế giới, bãi biển tuyệt mỹ và văn hóa cồng chiêng đặc sắc.',
        'mien-nam': 'Vùng đất trù phú với đồng bằng sông Cửu Long sông nước miệt vườn cây trái quanh năm và vùng kinh tế Đông Nam Bộ năng động hiện đại.',
      };

      // 3. Vùng / Miền & Tỉnh / Thành
      for (const region of REGIONS) {
        const parentRegion = await saveLocation({
          name: region.name,
          slug: region.slug,
          location_type: 'subcountry_region',
          level_id: 4,
          parent_id: vietnam.location_id,
          country_code: 'VN',
          note: REGION_NOTES[region.slug] || null,
        });

        const regionProvinces = provinces.filter((p) => p.region.slug === region.slug);
        for (const prov of regionProvinces) {
          await saveLocation({
            name: prov.name,
            slug: prov.slug,
            location_type: 'province_state',
            level_id: 5,
            parent_id: parentRegion.location_id,
            country_code: 'VN',
            note: prov.description || null,
          });
        }
        log('success', `Đã đồng bộ ${region.name} (${regionProvinces.length} tỉnh/thành)`);
      }
    },
    { timeout: 60_000 },
  );

  log('success', `🎉 HOÀN TẤT IMPORT! Đã tạo mới: ${createdCount}, Cập nhật: ${updatedCount} bản ghi.`);
  const statsAfter = await getLocationStats();

  return {
    success: true,
    dryRun: false,
    totalProvinces: provinces.length,
    createdCount,
    updatedCount,
    regionsBreakdown,
    logs,
    stats: statsAfter,
  };
}
