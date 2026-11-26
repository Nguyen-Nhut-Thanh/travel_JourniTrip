import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { importPartners } from '../services/partner-importer';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log('\n========================================================');
    console.log('  IMPORT ĐỐI TÁC / NHÀ CUNG CẤP (PROVIDERS / PARTNERS)');
    console.log('========================================================');
    console.log('  Cách dùng:');
    console.log('    npm run seed:partners [-- [--dry-run] [--file path] [--inactive]]');
    console.log('\n  Tùy chọn:');
    console.log('    --dry-run       Kiểm tra dữ liệu mà không ghi vào database');
    console.log('    --file <path>   Nạp từ file JSON tùy chỉnh');
    console.log('    --inactive      Để trạng thái mặc định là Tạm dừng (status: 0)');
    console.log('    (Mặc định)      Nạp từ scripts_data/data/partners.json với status: 1 (Đang hợp tác)');
    console.log('========================================================\n');
    return;
  }

  const fileIndex = args.indexOf('--file');
  const dryRun = args.includes('--dry-run');
  const isInactive = args.includes('--inactive');
  let customFilePath: string | undefined;

  if (fileIndex >= 0 && args[fileIndex + 1] && !args[fileIndex + 1].startsWith('--')) {
    customFilePath = args[fileIndex + 1];
  }

  console.log('\n========================================================');
  console.log('  🚀 BẮT ĐẦU IMPORT ĐỐI TÁC / NHÀ CUNG CẤP VÀO DATABASE');
  console.log('========================================================');

  const result = await importPartners({
    dryRun,
    statusMode: isInactive ? 'inactive' : 'active',
    customFilePath,
  });

  for (const l of result.logs) {
    const icon = l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '!' : '•';
    console.log(`  ${icon} [${l.timestamp}] ${l.message}`);
  }

  console.log('\n--------------------------------------------------------');
  if (result.dryRun) {
    console.log('  🔍 KẾT QUẢ KIỂM TRA (DRY RUN):');
    console.log(`  • Tổng số đối tác hợp lệ: ${result.totalParsed}`);
    console.log(`    - Du thuyền:  ${result.breakdown.boat || 0}`);
    console.log(`    - Khách sạn:  ${result.breakdown.hotel || 0}`);
    console.log(`    - Hàng không: ${result.breakdown.airline || 0}`);
    console.log(`    - Ô tô:       ${result.breakdown.car || 0}`);
    console.log(`    - Đường sắt:  ${result.breakdown.train || 0}`);
    console.log(`    - Dịch vụ khác: ${result.breakdown.other || 0}`);
    console.log('  👉 Chạy thật: bỏ cờ --dry-run để ghi vào Database.');
  } else {
    console.log('  🎉 IMPORT THÀNH CÔNG VÀO DATABASE:');
    console.log(`  • Đã tạo mới:  ${result.createdCount} đối tác`);
    console.log(`  • Đã cập nhật: ${result.updatedCount} đối tác`);
    console.log(`  • Tổng đối tác trong DB hiện tại: ${result.stats.totalCount} (Hoạt động: ${result.stats.activeCount})`);
  }
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Import đối tác thất bại:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
