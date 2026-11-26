import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { importSeasonalShowcaseService } from '../services/showcase-costume-importer';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  console.log('\n========================================================');
  console.log('  IMPORT SEASONAL SHOWCASE (TÂN CƯƠNG MÙA ĐÔNG)');
  console.log('========================================================');

  const result = await importSeasonalShowcaseService();

  for (const l of result.logs) {
    const icon = l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '!' : '•';
    console.log(`  ${icon} [${l.timestamp}] ${l.message}`);
  }

  console.log('--------------------------------------------------------');
  console.log(`  • Tiêu đề:  ${result.showcase.eyebrow}`);
  console.log(`  • Slug:     ${result.showcase.slug}`);
  console.log(`  • Hình ảnh: ${result.showcase.image_urls.length} ảnh`);
  console.log(`  • Tổng số showcase trong DB: ${result.stats.showcaseCount}`);
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Import showcase thất bại:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
