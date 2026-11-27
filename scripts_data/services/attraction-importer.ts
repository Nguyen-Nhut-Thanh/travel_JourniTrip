import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import type { ServiceLog } from './membership-upgrader';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export const LOCAL_ATTRACTIONS_PATH = resolve(__dirname, '../data/attractions.json');

export interface RawAttractionItem {
  province_slug?: string;
  province_name?: string;
  name: string;
  slug?: string;
  description?: string | null;
  highlights?: string | null;
  best_time?: string | null;
  cuisine?: string | null;
  tags?: string | null;
  image_url?: string | null;
  is_featured?: boolean;
}

export interface AttractionStats {
  totalCount: number;
  featuredCount: number;
  provincesCount: number;
  byProvince: Array<{
    province_id: number;
    province_name: string;
    province_slug: string;
    count: number;
  }>;
}

export async function getAttractionStats(): Promise<AttractionStats> {
  const [totalCount, featuredCount, byParentRaw] = await Promise.all([
    prisma.locations.count({ where: { level_id: 6, country_code: 'VN' } }),
    prisma.locations.count({ where: { level_id: 6, country_code: 'VN', is_featured: true } }),
    prisma.locations.groupBy({
      by: ['parent_id'],
      where: { level_id: 6, country_code: 'VN', parent_id: { not: null } },
      _count: { location_id: true },
    }),
  ]);

  const parentIds = byParentRaw.map((b) => b.parent_id!).filter(Boolean);
  const provinces = await prisma.locations.findMany({
    where: { location_id: { in: parentIds } },
    select: { location_id: true, name: true, slug: true },
  });

  const provinceMap = new Map(provinces.map((p) => [p.location_id, p]));

  const byProvince = byParentRaw.map((b) => {
    const prov = provinceMap.get(b.parent_id!);
    return {
      province_id: b.parent_id!,
      province_name: prov?.name || `Tỉnh ID ${b.parent_id}`,
      province_slug: prov?.slug || '',
      count: b._count.location_id,
    };
  });

  byProvince.sort((a, b) => b.count - a.count || a.province_name.localeCompare(b.province_name));

  return {
    totalCount,
    featuredCount,
    provincesCount: byProvince.length,
    byProvince,
  };
}

export interface ImportAttractionsOptions {
  dryRun?: boolean;
  cleanPrevious?: boolean;
  customFilePath?: string;
}

export interface ImportAttractionsResult {
  success: boolean;
  dryRun: boolean;
  totalParsed: number;
  createdCount: number;
  updatedCount: number;
  logs: ServiceLog[];
  stats: AttractionStats;
}

export async function ensureAttractionLevel(addLog: (level: ServiceLog['level'], msg: string) => void) {
  const existingLevel = await prisma.geographic_levels.findFirst({
    where: { level_id: 6 },
  });

  if (!existingLevel) {
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO geographic_levels (level_id, name, description, created_at, updated_at)
        VALUES (6, 'Attraction', 'Điểm tham quan', NOW(), NOW())
        ON CONFLICT (level_id) DO NOTHING;
      `);
      addLog('info', 'Đã khởi tạo cấp độ địa lý level_id = 6 (Attraction - Điểm tham quan).');
    } catch (e: any) {
      addLog('warn', `Kiểm tra level_id 6: ${e.message}`);
    }
  }
}

export async function importAttractions(options: ImportAttractionsOptions = {}): Promise<ImportAttractionsResult> {
  const { dryRun = false, cleanPrevious = false, customFilePath } = options;
  const logs: ServiceLog[] = [];

  function addLog(level: ServiceLog['level'], message: string) {
    logs.push({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      level,
      message,
    });
  }

  addLog('info', `Bắt đầu quá trình nạp điểm tham quan (${dryRun ? 'CHẾ ĐỘ THỬ NGHIỆM - DRY RUN' : 'GHI VÀO CSDL'})...`);

  const filePath = customFilePath && customFilePath.trim() ? resolve(customFilePath.trim()) : LOCAL_ATTRACTIONS_PATH;

  if (!existsSync(filePath)) {
    throw new Error(`Không tìm thấy file dữ liệu điểm tham quan tại: ${filePath}`);
  }

  addLog('info', `Đang đọc file JSON: ${filePath}`);
  const content = await readFile(filePath, 'utf-8');
  let rawList: RawAttractionItem[];

  try {
    rawList = JSON.parse(content);
    if (!Array.isArray(rawList)) {
      throw new Error('Dữ liệu điểm tham quan Việt Nam phải là một mảng. Với international-locations.json, dùng npm run db:import:international.');
    }
  } catch (err: any) {
    throw new Error(`Lỗi phân tích file JSON điểm tham quan: ${err.message}`);
  }

  addLog('info', `Đã tìm thấy ${rawList.length} điểm tham quan trong file dữ liệu.`);

  // Đảm bảo cấp độ 6 tồn tại trong geographic_levels
  if (!dryRun) {
    await ensureAttractionLevel(addLog);
  }

  // Tùy chọn dọn dẹp điểm tham quan cũ chưa gán vào tour nào
  if (cleanPrevious && !dryRun) {
    try {
      const inUseAttractions = await prisma.tour_schedule_attractions.findMany({
        select: { location_id: true },
      });
      const inUseIds = new Set(inUseAttractions.map((a) => a.location_id));
      const allAttractions = await prisma.locations.findMany({
        where: { level_id: 6, country_code: 'VN' },
        select: { location_id: true },
      });
      const toDelete = allAttractions.filter((a) => !inUseIds.has(a.location_id)).map((a) => a.location_id);
      if (toDelete.length > 0) {
        await prisma.destinations_detail.deleteMany({ where: { location_id: { in: toDelete } } });
        await prisma.location_images.deleteMany({ where: { location_id: { in: toDelete } } });
        await prisma.locations.deleteMany({ where: { location_id: { in: toDelete } } });
        addLog('info', `Đã dọn dẹp ${toDelete.length} điểm tham quan cũ chưa gán vào tour.`);
      }
    } catch (e: any) {
      addLog('warn', `Bỏ qua dọn dẹp điểm tham quan cũ: ${e.message}`);
    }
  }

  // Lấy toàn bộ tỉnh/thành phố (level_id = 5) để mapping
  const provinces = await prisma.locations.findMany({
    where: { level_id: 5, country_code: 'VN' },
    select: { location_id: true, slug: true, name: true },
  });

  const slugMap = new Map<string, number>();
  const nameMap = new Map<string, number>();

  provinces.forEach((p) => {
    if (p.slug) slugMap.set(p.slug.toLowerCase().trim(), p.location_id);
    if (p.name) nameMap.set(p.name.toLowerCase().trim(), p.location_id);
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const raw of rawList) {
    if (!raw.name || !raw.name.trim()) {
      addLog('warn', 'Bỏ qua một điểm tham quan vì không có tên.');
      continue;
    }

    const name = raw.name.trim();

    // Tìm parent_id (tỉnh thành)
    let parentId: number | undefined;
    if (raw.province_slug && slugMap.has(raw.province_slug.toLowerCase().trim())) {
      parentId = slugMap.get(raw.province_slug.toLowerCase().trim());
    } else if (raw.province_name && nameMap.has(raw.province_name.toLowerCase().trim())) {
      parentId = nameMap.get(raw.province_name.toLowerCase().trim());
    } else if (raw.province_name) {
      for (const [pName, id] of nameMap.entries()) {
        if (pName.includes(raw.province_name.toLowerCase().trim()) || raw.province_name.toLowerCase().includes(pName)) {
          parentId = id;
          break;
        }
      }
    }

    if (!parentId) {
      addLog('warn', `Không tìm thấy tỉnh/thành tương ứng cho "${name}" (slug: ${raw.province_slug}). Bỏ qua.`);
      continue;
    }

    const slug = raw.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const note = raw.description?.trim() || null;
    const isFeatured = Boolean(raw.is_featured);
    const imageUrl = raw.image_url?.trim() || null;

    if (dryRun) {
      createdCount++;
      addLog('info', `[DRY-RUN] Giả lập nạp: "${name}" (${slug}) thuộc tỉnh ID ${parentId}`);
      continue;
    }

    // Tìm xem địa điểm đã tồn tại chưa
    const existing = await prisma.locations.findFirst({
      where: {
        OR: [
          { slug },
          { name, parent_id: parentId },
        ],
      },
    });

    if (existing && (existing.country_code !== 'VN' || existing.level_id !== 6 || existing.location_type !== 'attraction')) {
      throw new Error(`Slug đã thuộc quốc gia hoặc cấp địa điểm khác: ${slug}.`);
    }

    let targetLocationId: number;

    if (existing) {
      const updated = await prisma.locations.update({
        where: { location_id: existing.location_id },
        data: {
          name,
          slug,
          location_type: 'attraction',
          level_id: 6,
          parent_id: parentId,
          country_code: 'VN',
          note,
          is_featured: isFeatured,
          featured_image: imageUrl || existing.featured_image,
        },
      });
      targetLocationId = updated.location_id;
      updatedCount++;
      addLog('info', `Cập nhật điểm tham quan: "${name}"`);
    } else {
      const created = await prisma.locations.create({
        data: {
          name,
          slug,
          location_type: 'attraction',
          level_id: 6,
          parent_id: parentId,
          country_code: 'VN',
          note,
          is_featured: isFeatured,
          featured_image: imageUrl,
        },
      });
      targetLocationId = created.location_id;
      createdCount++;
      addLog('success', `Tạo mới điểm tham quan: "${name}"`);
    }

    // Upsert destinations_detail
    if (raw.highlights || raw.best_time || raw.cuisine || raw.tags) {
      const existingDetail = await prisma.destinations_detail.findUnique({
        where: { location_id: targetLocationId },
      });

      if (existingDetail) {
        await prisma.destinations_detail.update({
          where: { detail_id: existingDetail.detail_id },
          data: {
            highlights: raw.highlights?.trim() || existingDetail.highlights,
            best_time: raw.best_time?.trim() || existingDetail.best_time,
            cuisine: raw.cuisine?.trim() || existingDetail.cuisine,
            tags: raw.tags?.trim() || existingDetail.tags,
          },
        });
      } else {
        await prisma.destinations_detail.create({
          data: {
            location_id: targetLocationId,
            highlights: raw.highlights?.trim() || null,
            best_time: raw.best_time?.trim() || null,
            cuisine: raw.cuisine?.trim() || null,
            tags: raw.tags?.trim() || null,
          },
        });
      }
    }

    // Upsert location_images
    if (imageUrl) {
      const existingImg = await prisma.location_images.findFirst({
        where: { location_id: targetLocationId, is_cover: 1 },
      });

      if (existingImg) {
        await prisma.location_images.update({
          where: { image_id: existingImg.image_id },
          data: { image_url: imageUrl, sort_order: 1 },
        });
      } else {
        await prisma.location_images.create({
          data: {
            location_id: targetLocationId,
            image_url: imageUrl,
            is_cover: 1,
            sort_order: 1,
          },
        });
      }
    }
  }

  const finalStats = await getAttractionStats();
  addLog(
    'success',
    `Hoàn tất nạp điểm tham quan! Tạo mới: ${createdCount}, Cập nhật: ${updatedCount} trên ${finalStats.provincesCount} tỉnh thành (Tổng cộng: ${finalStats.totalCount} điểm).`
  );

  return {
    success: true,
    dryRun,
    totalParsed: rawList.length,
    createdCount,
    updatedCount,
    logs,
    stats: finalStats,
  };
}
