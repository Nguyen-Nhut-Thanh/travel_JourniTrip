import { importInternationalLocations } from '../services/international-location-importer';
import type { PrismaClient } from '../../packages/database/src/index';

let client: PrismaClient | undefined;

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Import quốc gia → vùng → tỉnh/thành → điểm tham quan nước ngoài.');
    console.log('npm run db:import:international -- [--dry-run] [--file <path>]');
    console.log('--dry-run: kiểm tra file offline, không kết nối hoặc ghi CSDL.');
    console.log('Mặc định: scripts_data/data/international-locations.json');
    return;
  }
  let customFilePath: string | undefined;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--file') {
      const value = args[++i];
      if (!value || value.startsWith('-')) throw new Error('--file yêu cầu đường dẫn JSON.');
      customFilePath = value;
    } else throw new Error(`Tùy chọn không hợp lệ: ${args[i]}. Dùng --help để xem hướng dẫn.`);
  }
  if (!dryRun) client = (await import('../../packages/database/src/index')).prisma;
  const result = await importInternationalLocations({ dryRun, customFilePath, client });
  for (const entry of result.logs) console.log(`[${entry.level}] ${entry.message}`);
}

main().catch(error => {
  console.error('Import địa điểm nước ngoài thất bại:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(async () => {
  await client?.$disconnect();
});
