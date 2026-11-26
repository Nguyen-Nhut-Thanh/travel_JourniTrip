# Thư mục `import_data`

Các script CLI phục vụ import dữ liệu nền, cấp quyền quản trị và nâng hạng hội viên. Chạy từ thư mục gốc dự án (`d:\travel_v1`).

> **Mẹo:** Bạn cũng có thể thao tác nâng hạng hội viên và cấp quyền Admin trực tiếp qua giao diện web tại `npm run data:studio` (`http://localhost:3500`).

---

## 1. Import 34 tỉnh/thành phố (`import-provinces.ts`)

```sh
npm run db:import:provinces -- --dry-run
npm run db:import:provinces
```

Dùng bộ **34 tỉnh/thành sau sáp nhập** (15 miền Bắc, 11 miền Trung gồm Tây Nguyên, 8 miền Nam). Hỗ trợ truyền file JSON cục bộ:

```sh
npm run db:import:provinces -- --file ./provinces.json --dry-run
npm run db:import:provinces -- --file ./provinces.json
```

---

## 2. Import Seasonal Showcase (`import-seasonal-showcase.ts`)

```sh
npm run db:import:seasonal
```

---

## 3. Nâng hạng & Seed Hội viên (`seed-member-tier.ts` / `seed-diamond-member.ts`)

Hỗ trợ cả 5 hạng: `bronze` (0đ), `silver` (5tr), `gold` (15tr), `platinum` (30tr), `diamond` (60tr).

```sh
# Xem hướng dẫn
npm run seed:member -- --help

# Nâng hạng cho tài khoản có sẵn hoặc tạo mới
npm run seed:member -- user@example.com gold
npm run seed:member -- vip@travol.vn diamond 123456 "Lê Hoàng Kim Cương"

# Reset chi tiêu về đúng ngưỡng của hạng mới
npm run seed:member -- user@example.com silver --reset

# Lệnh nhanh tạo tài khoản Kim cương mặc định
npm run seed:diamond
```

---

## 4. Cấp quyền Quản trị viên (`grant-admin.ts`)

```sh
# Xem danh sách Admin hiện có
npm run grant-admin

# Cấp quyền Admin cho tài khoản đã có
npm run grant-admin -- user@example.com

# Tạo mới tài khoản Admin
npm run grant-admin -- admin@travol.vn 123456 "Nguyễn Văn Admin"
```
