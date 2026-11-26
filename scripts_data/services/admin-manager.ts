import { config } from 'dotenv';
import { resolve } from 'node:path';
import bcrypt from 'bcryptjs';
import { prisma } from '../../packages/database/src/index';
import type { ServiceLog } from './membership-upgrader';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export interface GrantAdminOptions {
  email: string;
  password?: string;
  fullName?: string;
}

export async function listAdmins() {
  const adminUsers = await prisma.users.findMany({
    where: { is_staff: true },
    include: {
      accounts: {
        select: {
          email: true,
          status: true,
          email_verified: true,
          created_at: true,
        },
      },
      employee_profile: {
        select: {
          employee_code: true,
          position: true,
          status: true,
        },
      },
    },
    orderBy: { user_id: 'asc' },
  });

  return adminUsers.map((u) => ({
    userId: u.user_id,
    email: u.accounts?.email || 'Không có email',
    fullName: u.full_name,
    employeeCode: u.employee_profile?.employee_code || 'N/A',
    position: u.employee_profile?.position || 'Nhân viên',
    status: u.employee_profile?.status || 'active',
  }));
}

export async function grantAdminRole(options: GrantAdminOptions) {
  const logs: ServiceLog[] = [];
  const log = (level: ServiceLog['level'], message: string) => {
    const item: ServiceLog = { level, message, timestamp: new Date().toLocaleTimeString('vi-VN') };
    logs.push(item);
    console.log(`[${item.timestamp}] [${level.toUpperCase()}] ${message}`);
  };

  const email = options.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Vui lòng nhập email tài khoản.');
  }

  log('info', `Đang kiểm tra tài khoản: ${email}...`);

  let account = await prisma.accounts.findUnique({
    where: { email },
    include: {
      users: {
        include: {
          employee_profile: true,
          role_users: true,
        },
      },
    },
  });

  // Đảm bảo vai trò 'admin' tồn tại trong bảng roles
  let adminRole = await prisma.roles.findUnique({
    where: { name: 'admin' },
  });

  if (!adminRole) {
    adminRole = await prisma.roles.create({
      data: {
        name: 'admin',
        description: 'Quản trị viên toàn quyền hệ thống',
      },
    });
    log('info', "Đã khởi tạo vai trò 'admin' trong bảng roles.");
  }

  if (account) {
    log('info', `Tìm thấy tài khoản sẵn có (Account ID: ${account.account_id})`);

    let passwordUpdated = false;
    if (options.password && options.password.trim()) {
      const passwordHash = await bcrypt.hash(options.password.trim(), 10);
      await prisma.accounts.update({
        where: { account_id: account.account_id },
        data: {
          password_hash: passwordHash,
          email_verified: true,
          status: 1,
        },
      });
      passwordUpdated = true;
      log('success', 'Đã cập nhật mật khẩu mới cho tài khoản.');
    } else {
      await prisma.accounts.update({
        where: { account_id: account.account_id },
        data: {
          email_verified: true,
          status: 1,
        },
      });
    }

    let userId: number;
    let resolvedName: string;
    if (account.users) {
      userId = account.users.user_id;
      resolvedName = options.fullName?.trim() || account.users.full_name;
      await prisma.users.update({
        where: { user_id: userId },
        data: {
          is_staff: true,
          ...(options.fullName?.trim() ? { full_name: resolvedName } : {}),
        },
      });
      log('success', `Đã bật quyền is_staff = true cho người dùng '${resolvedName}'.`);
    } else {
      resolvedName = options.fullName?.trim() || 'Quản trị viên';
      const newUser = await prisma.users.create({
        data: {
          account_id: account.account_id,
          full_name: resolvedName,
          is_staff: true,
        },
      });
      userId = newUser.user_id;
      log('success', `Đã tạo hồ sơ người dùng mới với is_staff = true.`);
    }

    const hasRole = await prisma.role_users.findUnique({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: adminRole.role_id,
        },
      },
    });

    if (!hasRole) {
      await prisma.role_users.create({
        data: {
          user_id: userId,
          role_id: adminRole.role_id,
        },
      });
      log('success', "Đã gắn vai trò 'admin' vào bảng role_users.");
    }

    const employeeCode = `ADM${String(userId).padStart(4, '0')}`;
    const employeeProfile = await prisma.employee_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!employeeProfile) {
      await prisma.employee_profiles.create({
        data: {
          user_id: userId,
          employee_code: employeeCode,
          position: 'Quản trị viên',
          status: 'active',
          primary_region: 'north',
          regions: ['north', 'central', 'south'],
          employment_type: 'full_time',
        },
      });
      log('success', `Đã tạo hồ sơ nhân viên quản trị (Mã: ${employeeCode}).`);
    }

    return {
      success: true,
      created: false,
      passwordUpdated,
      userId,
      email,
      fullName: resolvedName,
      employeeCode: employeeProfile?.employee_code || employeeCode,
      logs,
    };
  }

  // Tài khoản chưa tồn tại -> cần mật khẩu để tạo mới
  if (!options.password || !options.password.trim()) {
    throw new Error(`Không tìm thấy tài khoản "${email}". Vui lòng nhập thêm mật khẩu để tạo mới tài khoản Admin.`);
  }

  const passwordHash = await bcrypt.hash(options.password.trim(), 10);
  const fullName = options.fullName?.trim() || 'Quản trị viên hệ thống';

  const newAccount = await prisma.accounts.create({
    data: {
      email,
      password_hash: passwordHash,
      email_verified: true,
      status: 1,
      provider: 'local',
      users: {
        create: {
          full_name: fullName,
          is_staff: true,
          profile_completed: true,
        },
      },
    },
    include: { users: true },
  });

  const userId = newAccount.users!.user_id;

  await prisma.role_users.create({
    data: {
      user_id: userId,
      role_id: adminRole.role_id,
    },
  });

  const employeeCode = `ADM${String(userId).padStart(4, '0')}`;
  await prisma.employee_profiles.create({
    data: {
      user_id: userId,
      employee_code: employeeCode,
      position: 'Quản trị viên',
      status: 'active',
      primary_region: 'north',
      regions: ['north', 'central', 'south'],
      employment_type: 'full_time',
    },
  });

  log('success', `Đã tạo mới tài khoản Admin ${email} (Mã NV: ${employeeCode}).`);

  return {
    success: true,
    created: true,
    passwordUpdated: true,
    userId,
    email,
    fullName,
    employeeCode,
    logs,
  };
}

