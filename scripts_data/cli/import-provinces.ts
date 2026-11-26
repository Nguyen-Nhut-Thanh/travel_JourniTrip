import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';
import { importLocations } from '../services/location-importer';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

async function main() {
  const args = process.argv.slice(2);
  const isHelp = args.includes('--help') || args.includes('-h');

  if (isHelp) {
    console.log('\n========================================================');
    console.log('  IMPORT 34 TỈNH/THÀNH PHỐ VIỆT NAM VÀO DATABASE');
    console.log('========================================================');
    console.log('  Cách dùng:');
    console.log('    npm run db:import:provinces [-- [--dry-run] [--file path] [--remote]]');
    console.log('\n  Tùy chọn:');
    console.log('    --dry-run       Kiểm tra dữ liệu mà không ghi vào database');
    console.log('    --file <path>   Nạp từ file JSON tùy chỉnh');
    console.log('    --remote        Tải trực tiếp từ GitHub VN Region API');
    console.log('    (Mặc định)      Nạp từ file cục bộ tích hợp sẵn (scripts_data/data/provinces.json)');
    console.log('========================================================\n');
    return;
  }

  const fileIndex = args.indexOf('--file');
  const dryRun = args.includes('--dry-run');
  const isRemote = args.includes('--remote');
  let customFilePath: string | undefined;

  if (fileIndex >= 0 && args[fileIndex + 1] && !args[fileIndex + 1].startsWith('--')) {
    customFilePath = args[fileIndex + 1];
  }

  const source = customFilePath ? 'custom' : isRemote ? 'remote' : 'local';

  console.log('\n========================================================');
  console.log(`  🚀 BẮT ĐẦU IMPORT 34 TỈNH/THÀNH (Nguồn: ${source.toUpperCase()})`);
  console.log('========================================================');

  const result = await importLocations({
    dryRun,
    source,
    customFilePath,
  });

  for (const l of result.logs) {
    const icon = l.level === 'success' ? '✓' : l.level === 'error' ? '✗' : l.level === 'warn' ? '!' : '•';
    console.log(`  ${icon} [${l.timestamp}] ${l.message}`);
  }

  console.log('\n--------------------------------------------------------');
  if (result.dryRun) {
    console.log('  🔍 KẾT QUẢ KIỂM TRA (DRY RUN):');
    console.log(`  • Tổng số tỉnh/thành: ${result.totalProvinces} (Hợp lệ 100%)`);
    for (const b of result.regionsBreakdown) {
      console.log(`    - ${b.name}: ${b.count} tỉnh/thành`);
    }
    console.log('  👉 Chạy thật: bỏ cờ --dry-run để ghi vào Database.');
  } else {
    console.log('  🎉 IMPORT THÀNH CÔNG VÀO DATABASE:');
    console.log(`  • Đã tạo mới:  ${result.createdCount} bản ghi`);
    console.log(`  • Đã cập nhật: ${result.updatedCount} bản ghi`);
    console.log(`  • Tổng địa điểm hiện tại: ${result.stats.totalLocations}`);
    console.log(`    - Quốc gia:   ${result.stats.countryCount}`);
    console.log(`    - Vùng miền:  ${result.stats.regionCount}`);
    console.log(`    - Tỉnh/thành: ${result.stats.provinceCount}/${result.stats.targetProvinceCount}`);
  }
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Import tỉnh/thành thất bại:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
