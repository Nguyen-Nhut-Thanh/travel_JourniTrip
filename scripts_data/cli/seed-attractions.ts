import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { importAttractions } from '../services/attraction-importer';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log('\n========================================================');
    console.log('  IMPORT ĐIỂM THAM QUAN (ATTRACTIONS) CHO 34 TỈNH THÀNH');
    console.log('========================================================');
    console.log('  Cách dùng:');
    console.log('    npm run seed:attractions [-- [--dry-run] [--clean] [--file path]]');
    console.log('\n  Tùy chọn:');
    console.log('    --dry-run       Kiểm tra dữ liệu mà không ghi vào database');
    console.log('    --clean         Dọn dẹp các điểm tham quan cũ chưa gán vào tour');
    console.log('    --file <path>   Nạp từ file JSON tùy chỉnh');
    console.log('    (Mặc định)      Nạp từ scripts_data/data/attractions.json');
    console.log('========================================================\n');
    return;
  }

  const fileIndex = args.indexOf('--file');
  const dryRun = args.includes('--dry-run');
  const cleanPrevious = args.includes('--clean');
  let customFilePath: string | undefined;

  if (fileIndex >= 0 && args[fileIndex + 1] && !args[fileIndex + 1].startsWith('--')) {
    customFilePath = args[fileIndex + 1];
  }

  console.log('\n========================================================');
  console.log('  🚀 BẮT ĐẦU IMPORT ĐIỂM THAM QUAN VÀO DATABASE');
  console.log('========================================================');

  const result = await importAttractions({
    dryRun,
    cleanPrevious,
    customFilePath,
  });

  for (const l of result.logs) {
    const icon = l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '!' : '•';
    console.log(`  ${icon} [${l.timestamp}] ${l.message}`);
  }

  console.log('\n--------------------------------------------------------');
  if (result.dryRun) {
    console.log('  🔍 KẾT QUẢ KIỂM TRA (DRY RUN):');
    console.log(`  • Tổng số điểm tham quan hợp lệ: ${result.totalParsed}`);
  } else {
    console.log('  📊 KẾT QUẢ IMPORT VÀO DATABASE:');
    console.log(`  • Điểm tham quan mới:    +${result.createdCount}`);
    console.log(`  • Điểm tham quan update:  ${result.updatedCount}`);
    console.log(`  • Tổng điểm tham quan:    ${result.stats.totalCount} (Nổi bật: ${result.stats.featuredCount})`);
    console.log(`  • Số tỉnh/thành có điểm:  ${result.stats.provincesCount}/34 tỉnh`);
  }
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('Lỗi khi chạy import điểm tham quan:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
