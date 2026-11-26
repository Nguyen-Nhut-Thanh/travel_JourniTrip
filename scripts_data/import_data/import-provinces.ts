import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "database";

config({ path: resolve(__dirname, "../../.env") });

const PROVINCES_URL = "https://huynhminhvangit.github.io/vn-region-api/data/provinces.json";
// Bộ 34 tỉnh/thành sau sáp nhập. Miền Trung bao gồm Tây Nguyên.
// Đơn vị hợp nhất được phân miền theo tỉnh/thành mang tên hiện tại.
const regions = [
  { name: "Miền Bắc", slug: "mien-bac", codes: "01 04 08 11 12 14 15 19 20 22 24 25 31 33 37" },
  { name: "Miền Trung", slug: "mien-trung", codes: "38 40 42 44 46 48 51 52 56 66 68" },
  { name: "Miền Nam", slug: "mien-nam", codes: "75 79 80 82 86 91 92 96" }
] as const;

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeProvinces(raw: unknown) {
  if (!Array.isArray(raw)) throw new Error("Nguồn dữ liệu phải là một mảng tỉnh/thành.");
  const codes = new Set<string>();
  const names = new Set<string>();
  const slugs = new Set<string>();
  const provinces = raw.map((item: unknown) => {
    if (!item || typeof item !== "object") throw new Error("Bản ghi tỉnh/thành không hợp lệ.");
    const p = item as Record<string, unknown>;
    if ((typeof p.code !== "string" && typeof p.code !== "number") || typeof p.name !== "string") {
      throw new Error("Tỉnh/thành phải có code và name hợp lệ.");
    }
    const code = String(p.code).padStart(2, "0");
    const region = regions.find((r) => r.codes.split(" ").includes(code));
    const name = p.name.replace(/^(Thành phố trực thuộc trung ương|Thành phố|Tỉnh)\s+/i, "").trim();
    const slug = typeof p.slug === "string" && p.slug.trim() ? p.slug.trim() : slugify(name);
    if (!region || !name || !slug || name.length > 255 || slug.length > 255) {
      throw new Error(`Tỉnh/thành không hợp lệ hoặc chưa có mapping miền: ${code} (${name}).`);
    }
    if (codes.has(code) || names.has(name) || slugs.has(slug)) throw new Error(`Dữ liệu trùng: ${code} (${name}).`);
    codes.add(code); names.add(name); slugs.add(slug);
    return { code, name, slug, region };
  });
  if (provinces.length !== 34) throw new Error(`Cần đủ bộ 34 tỉnh/thành, nhận được ${provinces.length}. Kiểm tra nguồn dữ liệu trước khi import.`);
  return provinces;
}

async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf("--file");
  const dryRun = args.includes("--dry-run");
  if (args.some((arg, i) => arg !== "--dry-run" && arg !== "--file" && !(fileIndex >= 0 && i === fileIndex + 1)) ||
      (fileIndex >= 0 && (!args[fileIndex + 1] || args[fileIndex + 1].startsWith("--")))) {
    throw new Error("Cách dùng: npm run db:import:provinces -- [--dry-run] [--file đường-dẫn.json]");
  }
  let raw: unknown;
  if (fileIndex >= 0) {
    raw = JSON.parse((await readFile(resolve(args[fileIndex + 1]), "utf8")).replace(/^\uFEFF/, ""));
  } else {
    const response = await fetch(PROVINCES_URL, { signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Không tải được tỉnh/thành: HTTP ${response.status}`);
    raw = await response.json();
  }
  const provinces = normalizeProvinces(raw);
  for (const region of regions) {
    console.log(`${region.name}: ${provinces.filter((p) => p.region.slug === region.slug).length} tỉnh/thành`);
  }
  if (dryRun) {
    console.log("Dữ liệu hợp lệ: 34 tỉnh/thành. Chạy thử, chưa ghi vào CSDL.");
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("Thiếu DATABASE_URL trong môi trường hoặc .env ở thư mục gốc.");

  await prisma.$transaction(async (tx) => {
    for (const level of [
      { level_id: 3, name: "Country", description: "Quốc gia" },
      { level_id: 4, name: "Subcountry Region", description: "Vùng / Miền" },
      { level_id: 5, name: "Province / State", description: "Tỉnh / Thành phố" }
    ]) {
      await tx.geographic_levels.upsert({ where: { level_id: level.level_id }, update: { name: level.name, description: level.description }, create: level });
    }

    // Tìm theo cả hai khóa unique, giữ nguyên ID và các quan hệ/ảnh hiện có.
    async function saveLocation(data: { name: string; slug: string; location_type: string; level_id: number; parent_id: number | null; country_code: string }) {
      const matches = await tx.locations.findMany({ where: { OR: [{ slug: data.slug }, { name: data.name }] } });
      if (matches.length > 1) throw new Error(`Tên và slug đang thuộc hai địa điểm khác nhau: ${data.name}.`);
      const existing = matches[0];
      if (existing?.country_code && existing.country_code !== "VN") throw new Error(`Địa điểm trùng thuộc quốc gia khác: ${data.name}.`);
      return existing
        ? tx.locations.update({ where: { location_id: existing.location_id }, data })
        : tx.locations.create({ data });
    }

    const vietnam = await saveLocation({ name: "Việt Nam", slug: "viet-nam", location_type: "country", level_id: 3, parent_id: null, country_code: "VN" });
    for (const region of regions) {
      const parent = await saveLocation({ name: region.name, slug: region.slug, location_type: "subcountry_region", level_id: 4, parent_id: vietnam.location_id, country_code: "VN" });
      for (const province of provinces.filter((p) => p.region.slug === region.slug)) {
        await saveLocation({ name: province.name, slug: province.slug, location_type: "province_state", level_id: 5, parent_id: parent.location_id, country_code: "VN" });
      }
    }
  }, { timeout: 60_000 });
  console.log("Hoàn tất import 34 tỉnh/thành theo cấu trúc Việt Nam → 3 miền → tỉnh/thành.");
}

main().catch((error: unknown) => {
  console.error(`Import tỉnh/thành thất bại: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
