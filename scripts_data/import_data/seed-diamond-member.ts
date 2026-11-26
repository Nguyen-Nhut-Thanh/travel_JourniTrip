import { prisma } from '../../packages/database/src/index';
import { upgradeMemberTier } from '../services/membership-upgrader';

async function main() {
  const args = process.argv.slice(2);
  const email = args[0] || 'diamond@travol.vn';
  const password = args[1] || '123456';
  const fullName = args[2] || 'Lê Hoàng Kim Cương (VIP)';

  const result = await upgradeMemberTier({
    email,
    targetTier: 'diamond',
    password,
    fullName,
  });

  console.log('\n========================================================');
  console.log('  🎉 HOÀN TẤT KHỞI TẠO TÀI KHOẢN KIM CƯƠNG THÀNH CÔNG!');
  console.log('========================================================');
  console.log(`  • Email đăng nhập:  ${result.email}`);
  console.log(`  • Mật khẩu:         ${password}`);
  console.log(`  • Hạng thành viên:  KIM CƯƠNG (DIAMOND) 👑`);
  console.log(`  • Chi tiêu thực tế: ${result.spending.toLocaleString('vi-VN')} đ`);
  console.log(`  • Vouchers đã cấp:  ${result.vouchersIssued.join(', ') || 'Không có'}`);
  console.log('--------------------------------------------------------');
  console.log('  👉 Đăng nhập tại:   http://localhost:3000/login');
  console.log('  👉 Xem trang VIP:   http://localhost:3000/account/membership');
  console.log('  👉 Xem ví voucher:  http://localhost:3000/account/wallet');
  console.log('========================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ LỖI KHỞI TẠO TÀI KHOẢN:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
