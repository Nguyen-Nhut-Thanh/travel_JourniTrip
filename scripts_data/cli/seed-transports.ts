import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { importTransports } from '../services/catalog-importer';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log('\n========================================================');
    console.log('  IMPORT PHƯƠNG TIỆN VẬN CHUYỂN (TRANSPORTS)');
    console.log('========================================================');
    console.log('  Cách dùng:');
    console.log('    npm run seed:transports [-- [--dry-run] [--file path]]');
    console.log('\n  Tùy chọn:');
    console.log('    --dry-run       Kiểm tra dữ liệu mà không ghi vào database');
    console.log('    --file <path>   Nạp từ file JSON tùy chỉnh');
    console.log('    (Mặc định)      Nạp từ scripts_data/data/transports.json');
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
  console.log('  🚀 BẮT ĐẦU IMPORT PHƯƠNG TIỆN VẬN CHUYỂN VÀO DATABASE');
  console.log('========================================================');

  const result = await importTransports({
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
    console.log(`  • Tổng số phương tiện hợp lệ: ${result.totalParsed}`);
    console.log(`    - Hàng không (flight): ${result.breakdown.flight || 0}`);
    console.log(`    - Ô tô / Xe khách (car): ${result.breakdown.car || 0}`);
    console.log(`    - Đường sắt (train):   ${result.breakdown.train || 0}`);
    console.log(`    - Tàu thuyền (boat):   ${result.breakdown.boat || 0}`);
  } else {
    console.log('  📊 KẾT QUẢ IMPORT VÀO DATABASE:');
    console.log(`  • Phương tiện tạo mới: +${result.transportsCreated}`);
    console.log(`  • Phương tiện cập nhật: ${result.transportsUpdated}`);
    console.log(`  • Phân loại: ${result.breakdown.flight || 0} bay, ${result.breakdown.car || 0} ô tô, ${result.breakdown.train || 0} tàu hỏa, ${result.breakdown.boat || 0} tàu thủy`);
    console.log(`  • Tổng số phương tiện hiện có: ${result.stats.transports.totalCount}`);
  }
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('Lỗi khi chạy import phương tiện:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
