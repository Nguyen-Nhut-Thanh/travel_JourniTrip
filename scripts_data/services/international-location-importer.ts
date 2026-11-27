import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PrismaClient } from '../../packages/database/src/index';
import type { ServiceLog } from './membership-upgrader';
import {
  INTERNATIONAL_LEVELS, normalizeInternationalLocations, summarizeInternationalLocations,
} from './international-location-data';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export const LOCAL_INTERNATIONAL_LOCATIONS_PATH = resolve(__dirname, '../data/international-locations.json');

export async function readInternationalLocations(customFilePath?: string) {
  const filePath = customFilePath?.trim() ? resolve(customFilePath.trim()) : LOCAL_INTERNATIONAL_LOCATIONS_PATH;
  const text = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
  return normalizeInternationalLocations(JSON.parse(text));
}

export async function getInternationalLocationStats() {
  const data = await readInternationalLocations();
  const expected = summarizeInternationalLocations(data);
  const { prisma } = await import('../../packages/database/src/index');
  const rows = await prisma.locations.findMany({
    where: { slug: { in: [...data.locations, ...data.attractions].map(l => l.slug) } },
    select: { slug: true, level_id: true, country_code: true, location_type: true },
  });
  const expectedBySlug = new Map([
    ...data.locations,
    ...data.attractions.map(a => ({ ...a, level_id: 6, location_type: 'attraction' })),
  ].map(l => [l.slug, l]));
  const validRows = rows.filter(row => {
    const target = expectedBySlug.get(row.slug)!;
    return row.level_id === target.level_id && row.country_code === target.country_code && row.location_type === target.location_type;
  });
  return {
    expected,
    imported: {
      countries: validRows.filter(l => l.level_id === 3).length,
      regions: validRows.filter(l => l.level_id === 4).length,
      provinces: validRows.filter(l => l.level_id === 5).length,
      attractions: validRows.filter(l => l.level_id === 6).length,
      totalLocations: validRows.length,
    },
  };
}

export async function importInternationalLocations(options: {
  dryRun?: boolean;
  customFilePath?: string;
  client?: Pick<PrismaClient, '$transaction'>;
} = {}) {
  const data = await readInternationalLocations(options.customFilePath);
  const summary = summarizeInternationalLocations(data);
  const dryRun = options.dryRun === true;
  const logs: ServiceLog[] = [];
  const log = (level: ServiceLog['level'], message: string) => {
    logs.push({ level, message, timestamp: new Date().toLocaleTimeString('vi-VN') });
  };
  log('success', `Dữ liệu hợp lệ: ${summary.countries} quốc gia, ${summary.regions} vùng, ${summary.provinces} tỉnh/thành, ${summary.attractions} điểm tham quan.`);

  if (dryRun) {
    log('info', 'Chạy thử hoàn tất: đã kiểm tra file, slug và cây địa điểm; không kết nối hoặc ghi CSDL. Xung đột với dữ liệu đang có sẽ được kiểm tra khi import.');
    return { success: true, dryRun, summary, createdCount: 0, updatedCount: 0, logs };
  }

  const client = options.client ?? (await import('../../packages/database/src/index')).prisma;
  const counts = await client.$transaction(async tx => {
    const existingRows = await tx.locations.findMany({
      where: { slug: { in: [...data.locations, ...data.attractions].map(l => l.slug) } },
    });
    const existingBySlug = new Map(existingRows.map(l => [l.slug, l]));
    // Check every conflicting slug before changing any record.
    for (const item of [
      ...data.locations,
      ...data.attractions.map(a => ({ ...a, level_id: 6, location_type: 'attraction' })),
    ]) {
      const existing = existingBySlug.get(item.slug);
      if (existing && (existing.country_code !== item.country_code || existing.level_id !== item.level_id || existing.location_type !== item.location_type)) {
        throw new Error(`Slug đã thuộc quốc gia hoặc cấp địa điểm khác: ${item.slug}.`);
      }
    }
    for (const { location_type: _, ...level } of INTERNATIONAL_LEVELS) {
      await tx.geographic_levels.upsert({ where: { level_id: level.level_id }, update: {}, create: level });
    }
    let createdCount = 0;
    let updatedCount = 0;
    const ids = new Map<string, number>();
    async function saveLocation(item: {
      name: string; slug: string; level_id: number; location_type: string;
      parent_id: number | null; country_code: string; note: string | null;
      is_featured?: boolean; featured_image?: string;
    }) {
      const existing = existingBySlug.get(item.slug);
      if (existing && existing.parent_id !== item.parent_id) {
        throw new Error(`Địa điểm đã có cha khác trong CSDL: ${item.slug}.`);
      }
      const saved = await tx.locations.upsert({ where: { slug: item.slug }, update: item, create: item });
      if (existing) updatedCount++; else createdCount++;
      ids.set(item.slug, saved.location_id);
      return saved.location_id;
    }
    for (const location of data.locations) {
      const { parent_slug, ...fields } = location;
      await saveLocation({ ...fields, parent_id: parent_slug === null ? null : ids.get(parent_slug)! });
    }
    for (const attraction of data.attractions) {
      const locationId = await saveLocation({
        name: attraction.name, slug: attraction.slug, location_type: 'attraction', level_id: 6,
        parent_id: ids.get(attraction.province_slug)!, country_code: attraction.country_code,
        note: attraction.description, is_featured: attraction.is_featured,
        ...(attraction.image_url ? { featured_image: attraction.image_url } : {}),
      });
      const details = {
        highlights: attraction.highlights ?? undefined, best_time: attraction.best_time ?? undefined,
        cuisine: attraction.cuisine ?? undefined, tags: attraction.tags ?? undefined,
      };
      await tx.destinations_detail.upsert({
        where: { location_id: locationId }, update: details, create: { location_id: locationId, ...details },
      });
      if (attraction.image_url) {
        const cover = await tx.location_images.findFirst({
          where: { location_id: locationId, OR: [{ is_cover: 1 }, { sort_order: 1 }] },
          orderBy: { is_cover: 'desc' },
        });
        if (cover) {
          await tx.location_images.update({ where: { image_id: cover.image_id }, data: { image_url: attraction.image_url, is_cover: 1 } });
        } else {
          await tx.location_images.create({ data: { location_id: locationId, image_url: attraction.image_url, is_cover: 1, sort_order: 1 } });
        }
      }
    }
    return { createdCount, updatedCount };
  }, { timeout: 120_000 });
  log('success', `Import hoàn tất: tạo mới ${counts.createdCount}, cập nhật ${counts.updatedCount} địa điểm. Giữ nguyên ID khi import lại.`);
  return { success: true, dryRun, summary, ...counts, logs };
}
