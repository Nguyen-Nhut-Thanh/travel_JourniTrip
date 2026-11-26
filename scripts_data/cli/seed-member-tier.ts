import { prisma } from '../../packages/database/src/index';
import {
  TIER_DEFINITIONS,
  upgradeMemberTier,
  type MembershipTierId,
} from '../services/membership-upgrader';

function printHelp() {
  console.log('\n========================================================');
  console.log('  CÔNG CỤ SEED / NÂNG HẠNG HỘI VIÊN (MEMBERSHIP TIER)');
  console.log('========================================================');
  console.log('  Cách dùng:');
  console.log('    npm run seed:member -- <email> <tier> [mat_khau] [ho_ten] [--reset]');
  console.log('\n  Các mức hạng hỗ trợ (<tier>):');
  for (const tier of Object.values(TIER_DEFINITIONS)) {
    console.log(
      `    • ${tier.id.padEnd(9)} (${tier.name}) — Ngưỡng: ${tier.threshold.toLocaleString('vi-VN')} đ`,
    );
  }
  console.log('\n  Ví dụ:');
  console.log('    npm run seed:member -- khachhang@gmail.com gold');
  console.log('    npm run seed:member -- vip@travol.vn diamond 123456 "Lê Hoàng Kim Cương"');
  console.log('    npm run seed:member -- khachhang@gmail.com silver --reset');
  console.log('========================================================\n');
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    printHelp();
    return;
  }

  const resetSpending = rawArgs.includes('--reset');
  const positional = rawArgs.filter((a) => !a.startsWith('--'));

  const email = positional[0] || 'diamond@travol.vn';
  const tierInput = (positional[1] || 'diamond').toLowerCase() as MembershipTierId;
  const password = positional[2];
  const fullName = positional[3];

  if (!TIER_DEFINITIONS[tierInput]) {
    throw new Error(
      `Hạng "${tierInput}" không hợp lệ. Chỉ hỗ trợ: ${Object.keys(TIER_DEFINITIONS).join(', ')}`,
    );
  }

  const result = await upgradeMemberTier({
    email,
    targetTier: tierInput,
    password,
    fullName,
    resetSpending,
  });

  console.log('\n========================================================');
  console.log(`  🎉 CẬP NHẬT HỘI VIÊN HẠNG ${result.tier.toUpperCase()} THÀNH CÔNG!`);
  console.log('========================================================');
  console.log(`  • Email:      ${result.email}`);
  console.log(`  • Họ tên:     ${result.fullName}`);
  console.log(`  • Hạng:       ${result.tier.toUpperCase()} 👑`);
  console.log(`  • Chi tiêu:   ${result.spending.toLocaleString('vi-VN')} đ`);
  console.log(`  • Vouchers:   ${result.vouchersIssued.join(', ') || 'Không có'}`);
  console.log('--------------------------------------------------------');
  console.log('  👉 Đăng nhập: http://localhost:3000/login');
  console.log('  👉 Trang VIP: http://localhost:3000/account/membership');
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ LỖI NÂNG HẠNG HỘI VIÊN:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
