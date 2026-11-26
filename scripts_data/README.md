# 🚀 JourniTrip Mock Data Studio & Import Tools

Bộ công cụ độc lập phục vụ:
- Sinh dữ liệu mẫu (Tour, Lịch khởi hành, Khách hàng, Booking, Thanh toán, Đánh giá) vào PostgreSQL.
- **Nâng các mức hạng hội viên** (`bronze`, `silver`, `gold`, `platinum`, `diamond`) kèm lịch sử booking & voucher đặc quyền.
- **Cấp quyền Admin** cho tài khoản có sẵn hoặc tạo mới tài khoản quản trị.
- Import dữ liệu nền (34 tỉnh/thành, seasonal showcase).

> **Lưu ý:** Thư mục này độc lập với source code chính (`apps/web`, `apps/api`).

---

## 📁 Cấu trúc thư mục

```text
scripts_data/
├── server.ts                         # Express server giao diện Studio (Port 3500)
├── public/index.html                 # Giao diện Web Studio (4 tab)
├── services/
│   ├── data-generator.ts             # Sinh dữ liệu Tour, Booking & Rollback theo batch
│   ├── membership-upgrader.ts        # Nâng hạng hội viên (5 hạng) + tạo booking & voucher
│   └── admin-manager.ts              # Cấp quyền Admin & tạo hồ sơ nhân viên
└── import_data/
    ├── import-provinces.ts           # Import 34 tỉnh/thành
    ├── import-seasonal-showcase.ts   # Import seasonal showcase (giữ nguyên)
    ├── grant-admin.ts                # CLI cấp quyền Admin
    ├── seed-member-tier.ts           # CLI nâng hạng / seed hội viên theo hạng
    ├── seed-diamond-member.ts        # CLI nhanh tạo hội viên Kim cương
    └── README.md                     # Hướng dẫn chi tiết các script CLI
```

---

## ⚡ Khởi chạy Giao diện Web Studio (Port 3500)

```bash
npm run data:studio
```

Truy cập trình duyệt: **[http://localhost:3500](http://localhost:3500)**

Các tab có sẵn:
1. **⚡ Kịch bản Tour & Booking**: Sinh tour/lịch khởi hành theo tháng, booking, thanh toán, review & phản hồi CSKH.
2. **📦 Lịch sử Đợt & Dọn dẹp**: Xem các đợt đã tạo và thu hồi (rollback) an toàn theo `Batch Tag`.
3. **👑 Hội viên & Nâng hạng**: Chọn user có sẵn hoặc tạo mới, nâng lên bất kỳ hạng nào (`Đồng`, `Bạc`, `Vàng`, `Bạch kim`, `Kim cương`), tự sinh đơn hoàn thành & cấp voucher.
4. **🛡️ Cấp quyền Admin**: Xem danh sách Admin hiện tại và cấp quyền Admin (`is_staff = true`, role `admin`, `employee_profiles`) cho tài khoản bất kỳ.

---

## 🛠️ Các lệnh CLI nhanh

```bash
# Nâng hạng hội viên (bronze | silver | gold | platinum | diamond)
npm run seed:member -- user@example.com gold

# Tạo nhanh hội viên Kim cương mặc định
npm run seed:diamond

# Xem danh sách & cấp quyền Admin
npm run grant-admin
npm run grant-admin -- user@example.com

# Import dữ liệu nền
npm run db:import:provinces
npm run db:import:seasonal
```
