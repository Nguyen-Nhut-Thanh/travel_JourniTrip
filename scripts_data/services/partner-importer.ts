import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import type { ServiceLog } from './membership-upgrader';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export const LOCAL_PARTNERS_PATH = resolve(__dirname, '../data/partners.json');

export interface RawPartnerItem {
  name: string;
  type?: string;
  description?: string | null;
  contact_info?: string | null;
  contactInfo?: string | null;
  status?: number;
  isActive?: boolean;
}

export interface NormalizedPartner {
  name: string;
  type: string;
  contact_info: string | null;
  status: number;
}

export function normalizePartnerType(type?: string): string {
  const t = (type || 'other').trim().toLowerCase();
  if (t === 'cruise' || t === 'boat' || t === 'ship' || t === 'tau_thuyen') return 'boat';
  if (t === 'hotel' || t === 'resort' || t === 'khach_san') return 'hotel';
  if (t === 'airline' || t === 'flight' || t === 'hang_khong' || t === 'plane') return 'airline';
  if (t === 'car' || t === 'bus' || t === 'coach' || t === 'taxi' || t === 'oto') return 'car';
  if (t === 'train' || t === 'railway' || t === 'duong_sat') return 'train';
  return 'other';
}

export function normalizePartner(raw: RawPartnerItem, defaultStatus = 1): NormalizedPartner {
  if (!raw || typeof raw !== 'object' || !raw.name?.trim()) {
    throw new Error('Dữ liệu đối tác không hợp lệ: thiếu tên đối tác (name).');
  }

  const name = raw.name.trim();
  const type = normalizePartnerType(raw.type);

  // Gộp description và contactInfo nếu có
  let contact_info = raw.contact_info || raw.contactInfo || null;
  if (raw.description && raw.description.trim()) {
    if (contact_info && contact_info.trim()) {
      contact_info = `${raw.description.trim()} • ${contact_info.trim()}`;
    } else {
      contact_info = raw.description.trim();
    }
  }

  let status = defaultStatus;
  if (typeof raw.status === 'number') {
    status = raw.status === 1 ? 1 : 0;
  } else if (typeof raw.isActive === 'boolean') {
    // Mặc định nạp dữ liệu mẫu ta để active (1) để hệ thống sử dụng được ngay
    status = raw.isActive ? 1 : defaultStatus;
  }

  return {
    name,
    type,
    contact_info: contact_info ? contact_info.slice(0, 1000) : null,
    status,
  };
}

export interface PartnerStats {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  byType: {
    boat: number;
    hotel: number;
    airline: number;
    car: number;
    train: number;
    other: number;
  };
}

export async function getPartnerStats(): Promise<PartnerStats> {
  const [totalCount, activeCount, inactiveCount, byTypeRaw] = await Promise.all([
    prisma.providers.count(),
    prisma.providers.count({ where: { status: 1 } }),
    prisma.providers.count({ where: { status: 0 } }),
    prisma.providers.groupBy({
      by: ['type'],
      _count: { provider_id: true },
    }),
  ]);

  const byType = {
    boat: 0,
    hotel: 0,
    airline: 0,
    car: 0,
    train: 0,
    other: 0,
  };

  byTypeRaw.forEach((item) => {
    const t = item.type as keyof typeof byType;
    if (byType[t] !== undefined) {
      byType[t] = item._count.provider_id;
    } else {
      byType.other += item._count.provider_id;
    }
  });

  return {
    totalCount,
    activeCount,
    inactiveCount,
    byType,
  };
}

export interface ImportPartnerOptions {
  dryRun?: boolean;
  statusMode?: 'active' | 'original' | 'inactive';
  customFilePath?: string;
}

export interface ImportPartnerResult {
  success: boolean;
  dryRun: boolean;
  totalParsed: number;
  createdCount: number;
  updatedCount: number;
  breakdown: Record<string, number>;
  logs: ServiceLog[];
  stats: PartnerStats;
}

export async function importPartners(
  options: ImportPartnerOptions = {},
): Promise<ImportPartnerResult> {
  const logs: ServiceLog[] = [];
  const log = (level: ServiceLog['level'], message: string) => {
    logs.push({
      level,
      message,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
    });
  };

  const dryRun = Boolean(options.dryRun);
  const statusMode = options.statusMode || 'active';
  const defaultStatus = statusMode === 'inactive' ? 0 : 1;

  log('info', `Bắt đầu quá trình ${dryRun ? 'CHẠY THỬ (Dry Run)' : 'IMPORT THỰC TẾ'} đối tác / nhà cung cấp...`);

  let filePath = LOCAL_PARTNERS_PATH;
  if (options.customFilePath) {
    filePath = resolve(options.customFilePath);
  }

  if (!existsSync(filePath)) {
    throw new Error(`Không tìm thấy file dữ liệu đối tác: ${filePath}`);
  }

  log('info', `Đang đọc file đối tác: ${filePath}`);
  const fileContent = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '');
  const rawList: unknown = JSON.parse(fileContent);

  if (!Array.isArray(rawList)) {
    throw new Error('Dữ liệu đối tác phải là một mảng JSON các đối tượng.');
  }

  const partners: NormalizedPartner[] = rawList.map((item) => normalizePartner(item, defaultStatus));
  log('success', `Đã chuẩn hóa thành công ${partners.length} đối tác.`);

  const breakdown: Record<string, number> = {
    boat: 0,
    hotel: 0,
    airline: 0,
    car: 0,
    train: 0,
    other: 0,
  };

  partners.forEach((p) => {
    breakdown[p.type] = (breakdown[p.type] || 0) + 1;
  });

  log('info', `Phân loại: Du thuyền (${breakdown.boat || 0}), Khách sạn (${breakdown.hotel || 0}), Hàng không (${breakdown.airline || 0}), Ô tô (${breakdown.car || 0}), Đường sắt (${breakdown.train || 0}), Dịch vụ khác (${breakdown.other || 0})`);

  if (dryRun) {
    log('success', 'Chế độ Dry Run: Toàn bộ danh sách đối tác hợp lệ. Chưa có thay đổi nào ghi vào CSDL.');
    const currentStats = await getPartnerStats();
    return {
      success: true,
      dryRun: true,
      totalParsed: partners.length,
      createdCount: 0,
      updatedCount: 0,
      breakdown,
      logs,
      stats: currentStats,
    };
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const p of partners) {
    const existing = await prisma.providers.findUnique({
      where: { name: p.name },
      select: { provider_id: true },
    });

    if (existing) {
      await prisma.providers.update({
        where: { provider_id: existing.provider_id },
        data: {
          type: p.type,
          contact_info: p.contact_info,
          status: p.status,
        },
      });
      updatedCount++;
    } else {
      await prisma.providers.create({
        data: {
          name: p.name,
          type: p.type,
          contact_info: p.contact_info,
          status: p.status,
        },
      });
      createdCount++;
    }
  }

  log('success', `🎉 HOÀN TẤT IMPORT ĐỐI TÁC! Đã tạo mới: ${createdCount}, Cập nhật: ${updatedCount} đối tác.`);
  const statsAfter = await getPartnerStats();

  return {
    success: true,
    dryRun: false,
    totalParsed: partners.length,
    createdCount,
    updatedCount,
    breakdown,
    logs,
    stats: statsAfter,
  };
}
