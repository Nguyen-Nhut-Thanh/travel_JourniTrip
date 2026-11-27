import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import type { PrismaClient } from '../../packages/database/src/index';
import { normalizeInternationalLocations } from './international-location-data';
import {
  importInternationalLocations, LOCAL_INTERNATIONAL_LOCATIONS_PATH,
} from './international-location-importer';

const fullData = JSON.parse(readFileSync(LOCAL_INTERNATIONAL_LOCATIONS_PATH, 'utf8'));
function fixture() {
  return {
    schema_version: '1.0.0',
    locations: structuredClone(fullData.locations.filter((l: { slug: string }) => ['nhat-ban', 'jp-kanto', 'jp-tokyo'].includes(l.slug))),
    attractions: structuredClone(fullData.attractions.slice(0, 1)),
  };
}

async function fixturePath(t: TestContext, data: unknown, bom = false) {
  const directory = await mkdtemp(join(tmpdir(), 'international-location-test-'));
  const path = join(directory, 'locations.json');
  await writeFile(path, (bom ? '\uFEFF' : '') + JSON.stringify(data), 'utf8');
  t.after(async () => { await unlink(path); await rmdir(directory); });
  return path;
}

interface Location {
  location_id: number; name: string; slug: string; level_id: number;
  location_type: string; country_code: string | null; parent_id: number | null;
  note: string | null; featured_image: string | null; is_featured: boolean;
}
interface Detail {
  location_id: number; highlights?: string; best_time?: string; cuisine?: string; tags?: string;
}
interface Image {
  image_id: number; location_id: number; image_url: string; is_cover: number; sort_order: number;
}

// Prisma delegates expose virtual method descriptors; replace through their setter.
function replaceMethod(t: TestContext, target: object, key: string, replacement: Function) {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, replacement);
  t.after(() => { Reflect.set(target, key, original); });
}

// Model transaction commits/rollbacks and the unique slug key without a real database.
function memoryDatabase() {
  let state = { locations: [] as Location[], details: new Map<number, Detail>(), images: [] as Image[], levels: [] as number[] };
  let transactions = 0;
  let failDetails = false;
  const client = {
    async $transaction<T>(callback: (tx: object) => Promise<T>) {
      transactions++;
      const pending = structuredClone(state);
      const tx = {
        locations: {
          async findMany({ where }: { where: { slug: { in: string[] } } }) {
            return pending.locations.filter(l => where.slug.in.includes(l.slug));
          },
          async upsert({ where, update, create }: { where: { slug: string }; update: Partial<Location>; create: Partial<Location> }) {
            const existing = pending.locations.find(l => l.slug === where.slug);
            if (existing) { Object.assign(existing, update); return existing; }
            const row = { featured_image: null, is_featured: false, ...create, location_id: Math.max(0, ...pending.locations.map(l => l.location_id)) + 1 } as Location;
            pending.locations.push(row);
            return row;
          },
        },
        geographic_levels: {
          async upsert({ where }: { where: { level_id: number } }) {
            if (!pending.levels.includes(where.level_id)) pending.levels.push(where.level_id);
          },
        },
        destinations_detail: {
          async upsert({ where, update, create }: { where: { location_id: number }; update: Partial<Detail>; create: Detail }) {
            if (failDetails) throw new Error('Simulated detail write failure');
            const values = Object.fromEntries(Object.entries(update).filter(([, value]) => value !== undefined));
            pending.details.set(where.location_id, { ...(pending.details.get(where.location_id) ?? create), ...values });
          },
        },
        location_images: {
          async findFirst({ where }: { where: { location_id: number } }) {
            return pending.images.filter(i => i.location_id === where.location_id && (i.is_cover === 1 || i.sort_order === 1)).sort((a, b) => b.is_cover - a.is_cover)[0] ?? null;
          },
          async update({ where, data }: { where: { image_id: number }; data: Partial<Image> }) {
            Object.assign(pending.images.find(i => i.image_id === where.image_id)!, data);
          },
          async create({ data }: { data: Omit<Image, 'image_id'> }) {
            pending.images.push({ ...data, image_id: pending.images.length + 1 });
          },
        },
      };
      const result = await callback(tx);
      state = pending;
      return result;
    },
  } as unknown as Pick<PrismaClient, '$transaction'>;
  return { client, get state() { return state; }, get transactions() { return transactions; }, failDetails() { failDetails = true; } };
}

test('offline dry-run validates all 187 locations without opening a transaction', async () => {
  const db = memoryDatabase();
  const result = await importInternationalLocations({ dryRun: true, client: db.client });
  assert.deepEqual(result.summary, { countries: 15, regions: 37, provinces: 45, attractions: 90, totalLocations: 187 });
  assert.equal(db.transactions, 0);
  assert.equal(result.createdCount, 0);
});

test('normalization orders parents and rejects invalid cross-country references and duplicate slugs', () => {
  const shuffled = fixture();
  shuffled.locations.reverse();
  assert.deepEqual(normalizeInternationalLocations(shuffled).locations.map(l => l.level_id), [3, 4, 5]);
  const foreignParent = fixture();
  foreignParent.locations[2].country_code = 'KR';
  assert.throws(() => normalizeInternationalLocations(foreignParent), /cha sai cấp hoặc khác quốc gia/);
  const foreignAttraction = fixture();
  foreignAttraction.attractions[0].country_code = 'KR';
  assert.throws(() => normalizeInternationalLocations(foreignAttraction), /Tỉnh\/thành/);
  const duplicate = fixture();
  duplicate.attractions[0].slug = 'jp-tokyo';
  assert.throws(() => normalizeInternationalLocations(duplicate), /Trùng slug/);
});

test('rejects malformed schema, missing parents, VN codes, invalid images and column overflow', () => {
  assert.throws(() => normalizeInternationalLocations([]), /object/);
  assert.throws(() => normalizeInternationalLocations({ ...fixture(), schema_version: '2.0.0' }), /schema_version/);
  const missing = fixture(); missing.locations[2].parent_slug = 'missing';
  assert.throws(() => normalizeInternationalLocations(missing), /cha sai cấp/);
  const wrongLevel = fixture(); wrongLevel.locations[2].location_type = 'country';
  assert.throws(() => normalizeInternationalLocations(wrongLevel), /level_id/);
  const domestic = fixture(); domestic.locations[0].country_code = 'VN';
  assert.throws(() => normalizeInternationalLocations(domestic), /country_code/);
  const image = fixture(); image.attractions[0].image_url = 'javascript:alert(1)';
  assert.throws(() => normalizeInternationalLocations(image), /http\/https/);
  const longText = fixture(); longText.attractions[0].best_time = 'x'.repeat(256);
  assert.throws(() => normalizeInternationalLocations(longText), /best_time/);
});

test('imports the complete dataset and updates it without duplicating IDs or touching VN', async () => {
  const db = memoryDatabase();
  db.state.locations.push({ location_id: 900, name: 'Việt Nam', slug: 'viet-nam', level_id: 3, location_type: 'country', country_code: 'VN', parent_id: null, note: 'Giữ nguyên', featured_image: null, is_featured: false });
  const first = await importInternationalLocations({ client: db.client });
  assert.equal(first.createdCount, 187);
  const ids = db.state.locations.map(l => [l.slug, l.location_id]);
  const second = await importInternationalLocations({ client: db.client });
  assert.equal(second.createdCount, 0);
  assert.equal(second.updatedCount, 187);
  assert.deepEqual(db.state.locations.map(l => [l.slug, l.location_id]), ids);
  assert.equal(db.state.locations.find(l => l.slug === 'viet-nam')!.note, 'Giữ nguyên');
  assert.equal(db.state.details.size, 90);
  assert.equal(db.state.images.length, 0);
  for (const child of db.state.locations.filter(l => l.parent_id !== null)) {
    const parent = db.state.locations.find(l => l.location_id === child.parent_id)!;
    assert.equal(child.level_id, parent.level_id + 1);
    assert.equal(child.country_code, parent.country_code);
  }
});

test('maps attraction descriptions, details and optional images; preserves an existing photo on null', async t => {
  const db = memoryDatabase();
  const raw = fixture(); raw.attractions[0].image_url = 'https://example.com/sensoji.jpg';
  await importInternationalLocations({ customFilePath: await fixturePath(t, raw, true), client: db.client });
  const attraction = db.state.locations.find(l => l.level_id === 6)!;
  assert.equal(attraction.note, raw.attractions[0].description);
  assert.equal(attraction.featured_image, raw.attractions[0].image_url);
  assert.equal(db.state.details.get(attraction.location_id)!.cuisine, raw.attractions[0].cuisine);
  assert.equal(db.state.images.length, 1);
  raw.attractions[0].image_url = null;
  await importInternationalLocations({ customFilePath: await fixturePath(t, raw), client: db.client });
  assert.equal(db.state.locations.find(l => l.level_id === 6)!.featured_image, 'https://example.com/sensoji.jpg');
  assert.equal(db.state.images.length, 1);
  raw.attractions[0].image_url = 'https://example.com/sensoji-new.jpg';
  await importInternationalLocations({ customFilePath: await fixturePath(t, raw), client: db.client });
  assert.equal(db.state.images.length, 1);
  assert.equal(db.state.images[0].image_url, raw.attractions[0].image_url);
});

test('a database failure rolls back every level and location', async t => {
  const db = memoryDatabase(); db.failDetails();
  await assert.rejects(importInternationalLocations({ client: db.client, customFilePath: await fixturePath(t, fixture()) }), /Simulated detail/);
  assert.equal(db.state.locations.length, 0);
  assert.equal(db.state.levels.length, 0);
});

test('rejects an existing slug with a different country, level or parent and keeps all data', async t => {
  const path = await fixturePath(t, fixture());
  for (const change of [{ country_code: 'VN' }, { level_id: 4 }, { parent_id: 123 }]) {
    const db = memoryDatabase();
    db.state.locations.push({ location_id: 10, name: 'Địa điểm đang có', slug: 'nhat-ban', level_id: 3, location_type: 'country', country_code: 'JP', parent_id: null, note: 'Không sửa', featured_image: null, is_featured: false, ...change });
    const before = structuredClone(db.state);
    await assert.rejects(importInternationalLocations({ client: db.client, customFilePath: path }), /Slug đã thuộc|cha khác/);
    assert.deepEqual(db.state, before);
  }
});

test('Vietnam statistics stay empty when no VN records exist, regardless of international data', async t => {
  const { prisma } = await import('../../packages/database/src/index');
  const { getLocationStats } = await import('./location-importer');
  replaceMethod(t, prisma.locations, 'count', async (args: { where: { country_code: string } }) => {
    assert.equal(args.where.country_code, 'VN');
    return 0;
  });
  replaceMethod(t, prisma.locations, 'findFirst', async (args: { where: { country_code: string } }) => {
    assert.equal(args.where.country_code, 'VN');
    return null;
  });
  replaceMethod(t, prisma.locations, 'findMany', async (args: { where: { country_code: string } }) => {
    assert.equal(args.where.country_code, 'VN');
    return [];
  });
  const result = await getLocationStats();
  assert.equal(result.status, 'empty');
  assert.equal(result.provinceCount, 0);
});

test('Vietnam attraction cleanup selects and deletes only VN records', async t => {
  const { prisma } = await import('../../packages/database/src/index');
  const { importAttractions } = await import('./attraction-importer');
  const customFilePath = await fixturePath(t, []);
  replaceMethod(t, prisma.geographic_levels, 'findFirst', async () => ({ level_id: 6 }));
  replaceMethod(t, prisma.tour_schedule_attractions, 'findMany', async () => []);
  replaceMethod(t, prisma.locations, 'findMany', async (args: { where: { level_id?: number; country_code?: string } }) => {
    if (args.where.level_id !== undefined) assert.equal(args.where.country_code, 'VN');
    if (args.where.level_id === 6) {
      const records = [{ location_id: 1, country_code: 'VN' }, { location_id: 2, country_code: 'JP' }];
      return records.filter(row => row.country_code === args.where.country_code);
    }
    return [];
  });
  const deleted: number[][] = [];
  const captureDelete = async (args: { where: { location_id: { in: number[] } } }) => {
    deleted.push(args.where.location_id.in);
    return { count: args.where.location_id.in.length };
  };
  replaceMethod(t, prisma.destinations_detail, 'deleteMany', captureDelete);
  replaceMethod(t, prisma.location_images, 'deleteMany', captureDelete);
  replaceMethod(t, prisma.locations, 'deleteMany', captureDelete);
  replaceMethod(t, prisma.locations, 'count', async (args: { where: { country_code: string } }) => {
    assert.equal(args.where.country_code, 'VN'); return 0;
  });
  replaceMethod(t, prisma.locations, 'groupBy', async (args: { where: { country_code: string } }) => {
    assert.equal(args.where.country_code, 'VN'); return [];
  });
  await importAttractions({ customFilePath, cleanPrevious: true });
  assert.deepEqual(deleted, [[1], [1], [1]]);
});
