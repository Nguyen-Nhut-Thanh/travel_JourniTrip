import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import type { ServiceLog } from './membership-upgrader';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export const SAMPLE_COSTUMES = [
  {
    name: "Trang phục Nữ Dân tộc H'Mông Hoa",
    category: 'ethnic',
    gender: 'female',
    description: 'Váy xòe xếp ly thổ cẩm dệt tay tinh xảo, áo thêu hoa văn chỉ ngũ sắc và vòng cổ bạc truyền thống Tây Bắc.',
    image_url: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
    prompt_keywords: 'authentic vibrant Hmong ethnic traditional costume, intricately pleated hemp skirt, colorful geometric embroidery, silver necktorc jewelry, hill tribe attire',
    rental_price: 150000,
  },
  {
    name: "Trang phục Nam Dân tộc H'Mông Đen",
    category: 'ethnic',
    gender: 'male',
    description: 'Bộ áo chàm viền chỉ màu xẻ ngực, quần thụng vải thô đen kèm đai lưng thêu và khăn quấn đầu truyền thống.',
    image_url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    prompt_keywords: 'authentic male Hmong indigo dyed linen jacket, wide black trousers, embroidered sash belt, traditional headwear',
    rental_price: 120000,
  },
  {
    name: 'Áo Dài Nhật Bình Triều Nguyễn',
    category: 'ancient',
    gender: 'female',
    description: 'Cổ phục Hoàng Gia Huế với cổ áo hình chữ nhật viền ngũ sắc, họa tiết loan phụng thêu chỉ vàng lộng lẫy.',
    image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
    prompt_keywords: 'Nhat Binh royal court dress Nguyen Dynasty, gold thread embroidered phoenix pattern, rectangular collar, silk scarf headwear, Vietnamese ancient traditional regalia',
    rental_price: 200000,
  },
  {
    name: 'Áo Dài Truyền Thống Dáng Xưa',
    category: 'ao_dai',
    gender: 'unisex',
    description: 'Áo dài lụa tơ tằm mềm mại phối nón lá thanh lịch, biểu tượng văn hóa trường tồn của người Việt Nam.',
    image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    prompt_keywords: 'classic Vietnamese Ao Dai, flowing silk fabric, tailored high mandarin collar, matching wide trousers, graceful posture, natural lighting',
    rental_price: 150000,
  },
  {
    name: 'Áo Bà Ba Nam Bộ Khăn Rằn',
    category: 'traditional',
    gender: 'unisex',
    description: 'Áo bà ba vải đũi nhẹ mát đặc trưng miền Tây sông nước, đi kèm khăn rằn mộc mạc và nón lá duyên dáng.',
    image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    prompt_keywords: 'Vietnamese southern Ao Ba Ba peasant attire, checkered scarf Khan Ran, conical hat Non La, rustic river delta charm',
    rental_price: 90000,
  },
];

export const SAMPLE_SHOWCASE = {
  slug: 'tan-cuong-ky-canh-mua-dong',
  eyebrow: 'TÂN CƯƠNG · KỲ CẢNH MÙA ĐÔNG',
  title: 'Tân Cương',
  subtitle: 'WINTER WONDERLAND OF XINJIANG',
  description:
    'Mùa đông Tân Cương tựa như một xứ sở thần tiên: sương mờ trên hồ Kanas, bóng người lướt trên đường trượt tuyết Altay và khói bếp vương trên những mái nhà gỗ. Nơi đây có vẻ hùng vĩ của núi tuyết Thiên Sơn, hơi ấm của trà sữa bên bếp lửa, không khí lễ hội băng tuyết và sự dịu dàng nơi sâu thẳm mùa đông.',
  image_urls: [
    '/seasonal-showcases/tan-cuong-winter/winter-1.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-2.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-3.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-4.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-5.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-6.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-7.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-8.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-9.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-10.jpg',
    '/seasonal-showcases/tan-cuong-winter/winter-11.jpg',
  ],
  link_to: '/tours?country=xinjiang',
  status: 1,
  display_order: 1,
};

export async function getSupplementaryStats() {
  let showcaseCount = 0;
  let costumeCount = 0;
  let tourCount = 0;

  try {
    showcaseCount = await prisma.seasonal_showcases.count();
  } catch {}

  try {
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tour_costumes'
      );
    `;
    if (tableExists[0]?.exists) {
      costumeCount = await prisma.tour_costumes.count();
    }
  } catch {}

  try {
    tourCount = await prisma.tours.count();
  } catch {}

  return {
    showcaseCount,
    costumeCount,
    tourCount,
  };
}

export async function importSeasonalShowcaseService() {
  const logs: ServiceLog[] = [];
  const log = (level: ServiceLog['level'], message: string) => {
    logs.push({
      level,
      message,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
    });
  };

  log('info', `Bắt đầu nạp Showcase mùa: "${SAMPLE_SHOWCASE.eyebrow}"...`);

  const existing = await prisma.seasonal_showcases.findUnique({
    where: { slug: SAMPLE_SHOWCASE.slug },
    select: { showcase_id: true },
  });

  if (existing) {
    await prisma.seasonal_showcases.update({
      where: { showcase_id: existing.showcase_id },
      data: SAMPLE_SHOWCASE,
    });
    log('success', `Đã cập nhật Showcase thành công (ID: ${existing.showcase_id}).`);
  } else {
    const created = await prisma.seasonal_showcases.create({ data: SAMPLE_SHOWCASE });
    log('success', `Đã tạo mới Showcase thành công (ID: ${created.showcase_id}).`);
  }

  const stats = await getSupplementaryStats();
  return {
    success: true,
    showcase: SAMPLE_SHOWCASE,
    logs,
    stats,
  };
}

export async function seedTourCostumesService(options: { maxTours?: number; costumesPerTour?: number } = {}) {
  const logs: ServiceLog[] = [];
  const log = (level: ServiceLog['level'], message: string) => {
    logs.push({
      level,
      message,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
    });
  };

  const maxTours = options.maxTours || 10;
  const costumesPerTour = options.costumesPerTour || 3;

  log('info', `Bắt đầu nạp trang phục trải nghiệm cho tối đa ${maxTours} tour...`);

  const tours = await prisma.tours.findMany({
    take: maxTours,
    select: { tour_id: true, name: true },
  });

  if (tours.length === 0) {
    log('warn', 'Không tìm thấy tour nào trong database để gắn trang phục.');
    const stats = await getSupplementaryStats();
    return {
      success: false,
      message: 'Không có tour nào trong database. Hãy dùng tab Kịch bản Tour để tạo tour trước!',
      seededCostumes: 0,
      logs,
      stats,
    };
  }

  let totalSeeded = 0;
  try {
    for (const tour of tours) {
      for (const item of SAMPLE_COSTUMES.slice(0, costumesPerTour)) {
        await prisma.tour_costumes.create({
          data: {
            tour_id: tour.tour_id,
            name: item.name,
            category: item.category,
            gender: item.gender,
            description: item.description,
            image_url: item.image_url,
            prompt_keywords: item.prompt_keywords,
            rental_price: item.rental_price,
            is_active: true,
          },
        });
        totalSeeded++;
      }
      log('success', `✓ Đã nạp ${costumesPerTour} trang phục cho tour [${tour.tour_id}] ${tour.name}`);
    }

    log('success', `🎉 Đã nạp thành công tổng cộng ${totalSeeded} trang phục cho ${tours.length} tour.`);
  } catch (err: any) {
    if (err.message && err.message.includes('tour_costumes')) {
      log('warn', 'Bảng "tour_costumes" chưa được tạo trong CSDL hiện tại. Hãy chạy "npm run db:push" để cập nhật schema.');
      const stats = await getSupplementaryStats();
      return {
        success: false,
        message: 'Bảng tour_costumes chưa được tạo trong CSDL (cần chạy npm run db:push).',
        totalSeeded: 0,
        tourCount: tours.length,
        logs,
        stats,
      };
    }
    throw err;
  }
  const stats = await getSupplementaryStats();

  return {
    success: true,
    totalSeeded,
    tourCount: tours.length,
    logs,
    stats,
  };
}
