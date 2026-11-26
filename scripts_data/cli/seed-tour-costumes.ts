import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { seedTourCostumesService } from '../services/showcase-costume-importer';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  console.log('\n========================================================');
  console.log('  SEED SAMPLE TOUR COSTUMES (TRANG PHỤC TRẢI NGHIỆM TOUR)');
  console.log('========================================================');

  const result = await seedTourCostumesService({ maxTours: 10, costumesPerTour: 3 });

  for (const l of result.logs) {
    const icon = l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '!' : '•';
    console.log(`  ${icon} [${l.timestamp}] ${l.message}`);
  }

  console.log('--------------------------------------------------------');
  if (result.success) {
    console.log(`  🎉 Đã seed thành công ${result.totalSeeded} trang phục cho ${result.tourCount} tour!`);
    console.log(`  • Tổng số bản ghi trang phục trong DB: ${result.stats.costumeCount}`);
  } else {
    console.log(`  ⚠️ ${result.message}`);
  }
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Seed trang phục thất bại:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
