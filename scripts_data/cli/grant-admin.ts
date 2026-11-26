import { prisma } from '../../packages/database/src/index';
import { grantAdminRole, listAdmins } from '../services/admin-manager';

async function printAdmins() {
  const admins = await listAdmins();

  console.log('\n========================================================');
  console.log('  DANH SÁCH TÀI KHOẢN QUẢN TRỊ VIÊN HIỆN CÓ (ADMIN)');
  console.log('========================================================');

  if (admins.length === 0) {
    console.log('  (Chưa có tài khoản nào có quyền quản trị viên)');
  } else {
    for (const u of admins) {
      console.log(`  • ID: ${u.userId} | Email: ${u.email} | Tên: ${u.fullName} | Mã: ${u.employeeCode} | Vị trí: ${u.position}`);
    }
  }

  console.log('\n--------------------------------------------------------');
  console.log('  HƯỚNG DẪN SỬ DỤNG:');
  console.log('--------------------------------------------------------');
  console.log('  1. Cấp quyền Admin cho tài khoản ĐÃ CÓ SẴN:');
  console.log('     npm run grant-admin -- <email>');
  console.log('     Ví dụ: npm run grant-admin -- user@example.com\n');
  console.log('  2. Tạo MỚI tài khoản Admin (kèm mật khẩu & họ tên):');
  console.log('     npm run grant-admin -- <email> <mat_khau> "[Họ và tên]"');
  console.log('     Ví dụ: npm run grant-admin -- admin@travol.vn 123456 "Nguyễn Văn Admin"\n');
  console.log('  3. Đổi mật khẩu và cấp lại quyền cho tài khoản:');
  console.log('     npm run grant-admin -- <email> <mat_khau_moi>');
  console.log('========================================================\n');
}

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];
  const fullName = args[2];

  if (!email || email === '--help' || email === '-h') {
    await printAdmins();
    return;
  }

  const result = await grantAdminRole({ email, password, fullName });

  console.log('\n🎉 THÀNH CÔNG! ĐÃ CẤP QUYỀN QUẢN TRỊ VIÊN:');
  console.log('--------------------------------------------------------');
  console.log(`  • Email:     ${result.email}`);
  console.log(`  • Họ tên:    ${result.fullName}`);
  console.log(`  • Mã NV:     ${result.employeeCode}`);
  console.log(`  • Quyền:     Admin (is_staff: true)`);
  console.log('--------------------------------------------------------');
  console.log('  👉 Đăng nhập trang quản trị: http://localhost:3000/admin/login');
  console.log('========================================================\n');
}

main()
  .catch((error) => {
    console.error('\n❌ LỖI TRONG QUÁ TRÌNH CẤP QUYỀN:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
