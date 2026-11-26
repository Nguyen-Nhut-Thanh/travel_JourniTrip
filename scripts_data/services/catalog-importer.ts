import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import type { ServiceLog } from './membership-upgrader';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export const LOCAL_HOTELS_PATH = resolve(__dirname, '../data/hotels.json');
export const LOCAL_TRANSPORTS_PATH = resolve(__dirname, '../data/transports.json');

// ==========================================
// Types: Khách sạn & Loại phòng
// ==========================================
export interface RawRoomTypeItem {
  name: string;
  base_price: number | string;
  extra_price?: number | string;
  breakfast_included?: boolean;
  description?: string | null;
  status?: number;
}

export interface RawHotelItem {
  name: string;
  location_slug?: string;
  location_name?: string;
  star_rating?: number;
  address: string;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  status?: number;
  rooms?: RawRoomTypeItem[];
}

// ==========================================
// Types: Phương tiện vận chuyển
// ==========================================
export interface RawTransportItem {
  name: string;
  transport_type: string; // flight, car, train, boat
  capacity: number;
  provider_name: string;
  description?: string | null;
  status?: number;
}

// ==========================================
// Types: Thống kê Catalog
// ==========================================
export interface CatalogStats {
  hotels: {
    totalCount: number;
    activeCount: number;
    byStar: Record<number, number>;
  };
  rooms: {
    totalCount: number;
    activeCount: number;
  };
  transports: {
    totalCount: number;
    activeCount: number;
    byType: {
      flight: number;
      car: number;
      train: number;
      boat: number;
      other: number;
    };
  };
}

export async function getCatalogStats(): Promise<CatalogStats> {
  const [
    hotelTotal,
    hotelActive,
    hotelStarsRaw,
    roomTotal,
    roomActive,
    transportTotal,
    transportActive,
    transportTypesRaw,
  ] = await Promise.all([
    prisma.hotels.count(),
    prisma.hotels.count({ where: { status: 1 } }),
    prisma.hotels.groupBy({
      by: ['star_rating'],
      _count: { hotel_id: true },
    }),
    prisma.hotel_room_types.count(),
    prisma.hotel_room_types.count({ where: { status: 1 } }),
    prisma.transports.count(),
    prisma.transports.count({ where: { status: 1 } }),
    prisma.transports.groupBy({
      by: ['transport_type'],
      _count: { transport_id: true },
    }),
  ]);

  const byStar: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  hotelStarsRaw.forEach((item) => {
    byStar[item.star_rating] = item._count.hotel_id;
  });

  const byType = {
    flight: 0,
    car: 0,
    train: 0,
    boat: 0,
    other: 0,
  };

  transportTypesRaw.forEach((item) => {
    const t = item.transport_type as keyof typeof byType;
    if (byType[t] !== undefined) {
      byType[t] = item._count.transport_id;
    } else {
      byType.other += item._count.transport_id;
    }
  });

  return {
    hotels: {
      totalCount: hotelTotal,
      activeCount: hotelActive,
      byStar,
    },
    rooms: {
      totalCount: roomTotal,
      activeCount: roomActive,
    },
    transports: {
      totalCount: transportTotal,
      activeCount: transportActive,
      byType,
    },
  };
}

// ==========================================
// Import Khách sạn & Phòng
// ==========================================
export interface ImportHotelsOptions {
  dryRun?: boolean;
  cleanPrevious?: boolean;
  customFilePath?: string;
}

export interface ImportHotelsResult {
  success: boolean;
  dryRun: boolean;
  totalParsed: number;
  hotelsCreated: number;
  hotelsUpdated: number;
  roomsCreated: number;
  roomsUpdated: number;
  logs: ServiceLog[];
  stats: CatalogStats;
}

export async function importHotels(options: ImportHotelsOptions = {}): Promise<ImportHotelsResult> {
  const { dryRun = false, cleanPrevious = true, customFilePath } = options;
  const logs: ServiceLog[] = [];

  function addLog(level: ServiceLog['level'], message: string) {
    logs.push({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      level,
      message,
    });
  }

  addLog('info', `Bắt đầu quá trình nạp khách sạn & phòng nghỉ (${dryRun ? 'CHẾ ĐỘ THỬ NGHIỆM - DRY RUN' : 'GHI VÀO CSDL'})...`);

  const filePath = customFilePath && customFilePath.trim() ? resolve(customFilePath.trim()) : LOCAL_HOTELS_PATH;

  if (!existsSync(filePath)) {
    throw new Error(`Không tìm thấy file dữ liệu khách sạn tại: ${filePath}`);
  }

  addLog('info', `Đang đọc file JSON: ${filePath}`);
  const content = await readFile(filePath, 'utf-8');
  let rawList: RawHotelItem[];

  try {
    rawList = JSON.parse(content);
    if (!Array.isArray(rawList)) {
      throw new Error('Dữ liệu JSON khách sạn phải là một mảng.');
    }
  } catch (err: any) {
    throw new Error(`Lỗi phân tích file JSON khách sạn: ${err.message}`);
  }

  addLog('info', `Đã tìm thấy ${rawList.length} khách sạn trong file dữ liệu.`);

  // Dọn dẹp khách sạn cũ chưa gán tour nếu cleanPrevious = true
  if (cleanPrevious && !dryRun) {
    try {
      const inUse = await prisma.tour_schedule_hotels.findMany({ select: { hotel_id: true } });
      const inUseIds = new Set(inUse.map((i) => i.hotel_id));
      const allHotels = await prisma.hotels.findMany({ select: { hotel_id: true } });
      const toDelete = allHotels.filter((h) => !inUseIds.has(h.hotel_id)).map((h) => h.hotel_id);
      if (toDelete.length > 0) {
        await prisma.hotel_room_types.deleteMany({ where: { hotel_id: { in: toDelete } } });
        await prisma.hotels.deleteMany({ where: { hotel_id: { in: toDelete } } });
        addLog('info', `Đã dọn dẹp ${toDelete.length} khách sạn cũ chưa được gán tour để nạp danh mục chung.`);
      }
    } catch (e: any) {
      addLog('warn', `Bỏ qua dọn dẹp khách sạn cũ: ${e.message}`);
    }
  }

  // Truy vấn toàn bộ locations để map location_id nhanh
  const allLocations = await prisma.locations.findMany({
    select: { location_id: true, slug: true, name: true },
  });

  const slugMap = new Map<string, number>();
  const nameMap = new Map<string, number>();

  allLocations.forEach((loc) => {
    if (loc.slug) slugMap.set(loc.slug.toLowerCase().trim(), loc.location_id);
    if (loc.name) nameMap.set(loc.name.toLowerCase().trim(), loc.location_id);
  });

  let hotelsCreated = 0;
  let hotelsUpdated = 0;
  let roomsCreated = 0;
  let roomsUpdated = 0;

  for (const raw of rawList) {
    if (!raw.name || !raw.name.trim()) {
      addLog('warn', 'Bỏ qua một khách sạn vì không có tên.');
      continue;
    }

    const hotelName = raw.name.trim();

    // Tìm location_id phù hợp
    let targetLocationId: number | undefined;
    if (raw.location_slug && slugMap.has(raw.location_slug.toLowerCase().trim())) {
      targetLocationId = slugMap.get(raw.location_slug.toLowerCase().trim());
    } else if (raw.location_name && nameMap.has(raw.location_name.toLowerCase().trim())) {
      targetLocationId = nameMap.get(raw.location_name.toLowerCase().trim());
    } else {
      // Tìm tương đối theo tên địa phương
      for (const [locName, id] of nameMap.entries()) {
        if (raw.address && raw.address.toLowerCase().includes(locName)) {
          targetLocationId = id;
          break;
        }
      }
    }

    if (!targetLocationId) {
      // Mặc định lấy địa điểm đầu tiên nếu không khớp
      targetLocationId = allLocations[0]?.location_id;
      addLog('warn', `Không tìm thấy tỉnh/thành cho "${hotelName}". Gán tạm địa điểm ID ${targetLocationId}.`);
    }

    const starRating = Math.max(1, Math.min(5, Number(raw.star_rating) || 3));
    const address = raw.address?.trim() || 'Việt Nam';
    const phone = raw.phone?.trim() ? raw.phone.trim().slice(0, 15) : null;
    const email = raw.email?.trim() ? raw.email.trim().slice(0, 150) : null;
    const description = raw.description?.trim() || null;
    const status = raw.status !== undefined ? Number(raw.status) : 1;

    if (dryRun) {
      hotelsCreated++;
      if (raw.rooms && Array.isArray(raw.rooms)) {
        roomsCreated += raw.rooms.length;
      }
      addLog('info', `[DRY-RUN] Giả lập nạp: ${hotelName} (${starRating} sao) tại location_id ${targetLocationId}`);
      continue;
    }

    // Upsert Hotel
    const existingHotel = await prisma.hotels.findFirst({
      where: { name: hotelName },
    });

    let currentHotelId: number;

    if (existingHotel) {
      const updated = await prisma.hotels.update({
        where: { hotel_id: existingHotel.hotel_id },
        data: {
          location_id: targetLocationId,
          star_rating: starRating,
          address,
          phone,
          email,
          description,
          status,
        },
      });
      currentHotelId = updated.hotel_id;
      hotelsUpdated++;
      addLog('info', `Cập nhật khách sạn: ${hotelName} (${starRating}★)`);
    } else {
      const created = await prisma.hotels.create({
        data: {
          name: hotelName,
          location_id: targetLocationId,
          star_rating: starRating,
          address,
          phone,
          email,
          description,
          status,
        },
      });
      currentHotelId = created.hotel_id;
      hotelsCreated++;
      addLog('success', `Tạo mới khách sạn: ${hotelName} (${starRating}★)`);
    }

    // Upsert Rooms
    if (raw.rooms && Array.isArray(raw.rooms)) {
      for (const room of raw.rooms) {
        if (!room.name || !room.name.trim()) continue;
        const roomName = room.name.trim();
        const basePrice = Number(room.base_price) || 0;
        const extraPrice = Number(room.extra_price) || 0;
        const breakfastIncluded = Boolean(room.breakfast_included);
        const roomDesc = room.description?.trim() || null;
        const roomStatus = room.status !== undefined ? Number(room.status) : 1;

        const existingRoom = await prisma.hotel_room_types.findFirst({
          where: {
            hotel_id: currentHotelId,
            name: roomName,
          },
        });

        if (existingRoom) {
          await prisma.hotel_room_types.update({
            where: { room_type_id: existingRoom.room_type_id },
            data: {
              base_price: basePrice,
              extra_price: extraPrice,
              breakfast_included: breakfastIncluded,
              description: roomDesc,
              status: roomStatus,
            },
          });
          roomsUpdated++;
        } else {
          await prisma.hotel_room_types.create({
            data: {
              hotel_id: currentHotelId,
              name: roomName,
              base_price: basePrice,
              extra_price: extraPrice,
              breakfast_included: breakfastIncluded,
              description: roomDesc,
              status: roomStatus,
            },
          });
          roomsCreated++;
        }
      }
    }
  }

  const finalStats = await getCatalogStats();
  addLog(
    'success',
    `Hoàn thành nạp khách sạn! Khách sạn: +${hotelsCreated} mới, ${hotelsUpdated} cập nhật | Loại phòng: +${roomsCreated} mới, ${roomsUpdated} cập nhật.`
  );

  return {
    success: true,
    dryRun,
    totalParsed: rawList.length,
    hotelsCreated,
    hotelsUpdated,
    roomsCreated,
    roomsUpdated,
    logs,
    stats: finalStats,
  };
}

// ==========================================
// Import Phương tiện vận chuyển
// ==========================================
export interface ImportTransportsOptions {
  dryRun?: boolean;
  cleanPrevious?: boolean;
  customFilePath?: string;
}

export interface ImportTransportsResult {
  success: boolean;
  dryRun: boolean;
  totalParsed: number;
  transportsCreated: number;
  transportsUpdated: number;
  breakdown: Record<string, number>;
  logs: ServiceLog[];
  stats: CatalogStats;
}

export async function importTransports(options: ImportTransportsOptions = {}): Promise<ImportTransportsResult> {
  const { dryRun = false, cleanPrevious = true, customFilePath } = options;
  const logs: ServiceLog[] = [];

  function addLog(level: ServiceLog['level'], message: string) {
    logs.push({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
      level,
      message,
    });
  }

  addLog('info', `Bắt đầu quá trình nạp phương tiện (${dryRun ? 'CHẾ ĐỘ THỬ NGHIỆM - DRY RUN' : 'GHI VÀO CSDL'})...`);

  const filePath = customFilePath && customFilePath.trim() ? resolve(customFilePath.trim()) : LOCAL_TRANSPORTS_PATH;

  if (!existsSync(filePath)) {
    throw new Error(`Không tìm thấy file dữ liệu phương tiện tại: ${filePath}`);
  }

  addLog('info', `Đang đọc file JSON: ${filePath}`);
  const content = await readFile(filePath, 'utf-8');
  let rawList: RawTransportItem[];

  try {
    rawList = JSON.parse(content);
    if (!Array.isArray(rawList)) {
      throw new Error('Dữ liệu JSON phương tiện phải là một mảng.');
    }
  } catch (err: any) {
    throw new Error(`Lỗi phân tích file JSON phương tiện: ${err.message}`);
  }

  addLog('info', `Đã tìm thấy ${rawList.length} phương tiện trong file dữ liệu.`);

  // Dọn dẹp phương tiện cũ chưa gán tour nếu cleanPrevious = true
  if (cleanPrevious && !dryRun) {
    try {
      const inUse = await prisma.tour_schedule_transports.findMany({ select: { transport_id: true } });
      const inUseTours = await prisma.tours.findMany({ select: { transport_id: true } });
      const inUseIds = new Set([...inUse.map((i) => i.transport_id), ...inUseTours.map((t) => t.transport_id)]);
      const allTrans = await prisma.transports.findMany({ select: { transport_id: true } });
      const toDelete = allTrans.filter((t) => !inUseIds.has(t.transport_id)).map((t) => t.transport_id);
      if (toDelete.length > 0) {
        await prisma.transports.deleteMany({ where: { transport_id: { in: toDelete } } });
        addLog('info', `Đã dọn dẹp ${toDelete.length} phương tiện cũ chưa được gán tour để nạp danh mục chung.`);
      }
    } catch (e: any) {
      addLog('warn', `Bỏ qua dọn dẹp phương tiện cũ: ${e.message}`);
    }
  }

  // Truy vấn toàn bộ đối tác (providers) để mapping provider_id
  const allProviders = await prisma.providers.findMany({
    select: { provider_id: true, name: true, type: true },
  });

  const providerMap = new Map<string, number>();
  allProviders.forEach((p) => {
    providerMap.set(p.name.toLowerCase().trim(), p.provider_id);
  });

  let transportsCreated = 0;
  let transportsUpdated = 0;
  const breakdown: Record<string, number> = {
    flight: 0,
    car: 0,
    train: 0,
    boat: 0,
    other: 0,
  };

  for (const raw of rawList) {
    if (!raw.name || !raw.name.trim()) {
      addLog('warn', 'Bỏ qua một phương tiện vì không có tên.');
      continue;
    }

    const transportName = raw.name.trim();
    const transportType = (raw.transport_type || 'car').toLowerCase().trim();
    const capacity = Math.max(1, Number(raw.capacity) || 10);
    const description = raw.description?.trim() || null;
    const status = raw.status !== undefined ? Number(raw.status) : 1;

    // Tìm provider_id
    let providerId: number | undefined;
    if (raw.provider_name && providerMap.has(raw.provider_name.toLowerCase().trim())) {
      providerId = providerMap.get(raw.provider_name.toLowerCase().trim());
    } else if (raw.provider_name) {
      // Tìm gần đúng theo tên
      const targetQuery = raw.provider_name.toLowerCase().trim();
      for (const [pName, id] of providerMap.entries()) {
        if (pName.includes(targetQuery) || targetQuery.includes(pName)) {
          providerId = id;
          break;
        }
      }
    }

    if (!providerId) {
      // Thử tìm provider cùng loại
      const fallbackProvider = allProviders.find((p) => p.type === transportType) || allProviders[0];
      if (fallbackProvider) {
        providerId = fallbackProvider.provider_id;
        addLog('warn', `Không tìm thấy đối tác "${raw.provider_name}". Gán tạm đối tác "${fallbackProvider.name}" (ID ${providerId}).`);
      } else {
        throw new Error('Chưa có đối tác (providers) nào trong CSDL! Vui lòng import đối tác trước.');
      }
    }

    const typeKey = breakdown[transportType] !== undefined ? transportType : 'other';
    breakdown[typeKey] = (breakdown[typeKey] || 0) + 1;

    if (dryRun) {
      transportsCreated++;
      addLog('info', `[DRY-RUN] Giả lập nạp: ${transportName} (${transportType}, ${capacity} chỗ) - Đối tác ID ${providerId}`);
      continue;
    }

    const existingTransport = await prisma.transports.findFirst({
      where: { name: transportName },
    });

    if (existingTransport) {
      await prisma.transports.update({
        where: { transport_id: existingTransport.transport_id },
        data: {
          transport_type: transportType,
          capacity,
          provider_id: providerId,
          description,
          status,
        },
      });
      transportsUpdated++;
      addLog('info', `Cập nhật phương tiện: ${transportName} (${transportType})`);
    } else {
      await prisma.transports.create({
        data: {
          name: transportName,
          transport_type: transportType,
          capacity,
          provider_id: providerId,
          description,
          status,
        },
      });
      transportsCreated++;
      addLog('success', `Tạo mới phương tiện: ${transportName} (${transportType}, ${capacity} chỗ)`);
    }
  }

  const finalStats = await getCatalogStats();
  addLog(
    'success',
    `Hoàn thành nạp phương tiện! Tạo mới: ${transportsCreated}, Cập nhật: ${transportsUpdated} phương tiện (${breakdown.flight} bay, ${breakdown.car} ô tô, ${breakdown.train} tàu hỏa, ${breakdown.boat} tàu thủy).`
  );

  return {
    success: true,
    dryRun,
    totalParsed: rawList.length,
    transportsCreated,
    transportsUpdated,
    breakdown,
    logs,
    stats: finalStats,
  };
}
