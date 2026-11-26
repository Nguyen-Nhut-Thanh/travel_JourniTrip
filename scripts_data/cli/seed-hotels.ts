import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { importHotels } from '../services/catalog-importer';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log('\n========================================================');
    console.log('  IMPORT KHÁCH SẠN & PHÒNG NGHỈ (HOTELS & ROOMS)');
    console.log('========================================================');
    console.log('  Cách dùng:');
    console.log('    npm run seed:hotels [-- [--dry-run] [--file path]]');
    console.log('\n  Tùy chọn:');
    console.log('    --dry-run       Kiểm tra dữ liệu mà không ghi vào database');
    console.log('    --file <path>   Nạp từ file JSON tùy chỉnh');
    console.log('    (Mặc định)      Nạp từ scripts_data/data/hotels.json');
    console.log('========================================================\n');
    return;
  }

  const fileIndex = args.indexOf('--file');
  const dryRun = args.includes('--dry-run');
  let customFilePath: string | undefined;

  if (fileIndex >= 0 && args[fileIndex + 1] && !args[fileIndex + 1].startsWith('--')) {
    customFilePath = args[fileIndex + 1];
  }

  console.log('\n========================================================');
  console.log('  🚀 BẮT ĐẦU IMPORT KHÁCH SẠN & PHÒNG NGHỈ VÀO DATABASE');
  console.log('========================================================');

  const result = await importHotels({
    dryRun,
    customFilePath,
  });

  for (const l of result.logs) {
    const icon = l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '!' : '•';
    console.log(`  ${icon} [${l.timestamp}] ${l.message}`);
  }

  console.log('\n--------------------------------------------------------');
  if (result.dryRun) {
    console.log('  🔍 KẾT QUẢ KIỂM TRA (DRY RUN):');
    console.log(`  • Khách sạn hợp lệ: ${result.totalParsed}`);
    console.log(`  • Loại phòng:       ${result.roomsCreated}`);
  } else {
    console.log('  📊 KẾT QUẢ IMPORT VÀO DATABASE:');
    console.log(`  • Khách sạn mới:    +${result.hotelsCreated}`);
    console.log(`  • Khách sạn update:  ${result.hotelsUpdated}`);
    console.log(`  • Loại phòng mới:   +${result.roomsCreated}`);
    console.log(`  • Loại phòng update: ${result.roomsUpdated}`);
    console.log(`  • Tổng số khách sạn hiện có: ${result.stats.hotels.totalCount}`);
    console.log(`  • Tổng số loại phòng hiện có: ${result.stats.rooms.totalCount}`);
  }
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('Lỗi khi chạy import khách sạn:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
