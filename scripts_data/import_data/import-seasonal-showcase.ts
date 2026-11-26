import { config } from "dotenv";
import { resolve } from "node:path";
import { prisma } from "database";

config({ path: resolve(process.cwd(), ".env") });

const showcase = {
  slug: "tan-cuong-ky-canh-mua-dong",
  eyebrow: "TÂN CƯƠNG · KỲ CẢNH MÙA ĐÔNG",
  title: "Tân Cương",
  subtitle: "WINTER WONDERLAND OF XINJIANG",
  description:
    "Mùa đông Tân Cương tựa như một xứ sở thần tiên: sương mờ trên hồ Kanas, bóng người lướt trên đường trượt tuyết Altay và khói bếp vương trên những mái nhà gỗ. Nơi đây có vẻ hùng vĩ của núi tuyết Thiên Sơn, hơi ấm của trà sữa bên bếp lửa, không khí lễ hội băng tuyết và sự dịu dàng nơi sâu thẳm mùa đông.",
  image_urls: [
    "/seasonal-showcases/tan-cuong-winter/winter-1.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-2.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-3.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-4.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-5.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-6.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-7.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-8.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-9.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-10.jpg",
    "/seasonal-showcases/tan-cuong-winter/winter-11.jpg"
  ],
  link_to: "/tours?country=xinjiang",
  status: 1,
  display_order: 1
};

async function importSeasonalShowcase(): Promise<void> {
  await prisma.$connect();

  const existing = await prisma.seasonal_showcases.findUnique({
    where: { slug: showcase.slug },
    select: { showcase_id: true }
  });

  if (existing) {
    await prisma.seasonal_showcases.update({
      where: { showcase_id: existing.showcase_id },
      data: showcase
    });
    console.log(`Đã cập nhật showcase: ${showcase.eyebrow}`);
  } else {
    await prisma.seasonal_showcases.create({ data: showcase });
    console.log(`Đã thêm showcase: ${showcase.eyebrow}`);
  }
}

importSeasonalShowcase()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Import showcase thất bại: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
