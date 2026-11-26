# 🚀 JourniTrip Mock Data Studio & Import Tools

Bộ công cụ độc lập phục vụ:
- **Import dữ liệu nền & Địa điểm**: 34 tỉnh/thành phố, 3 vùng miền, quốc gia Việt Nam.
- **Import Điểm tham quan (Attractions)**: 81 điểm tham quan nổi bật bao phủ toàn bộ 34 tỉnh/thành (cấp 6) kèm mô tả, ẩm thực & tags AI.
- **Import Đối tác & Nhà cung cấp (Providers / Partners)**: 25 đối tác đa lĩnh vực (Du thuyền, Khách sạn, Hàng không, Xe khách, Đường sắt, Bảo hiểm & Vé vui chơi).
- **Import Khách sạn & Phòng nghỉ (Hotels & Rooms)**: 15 hạng khách sạn tiêu chuẩn 3-5 sao, resort & homestay dùng chung linh hoạt cho mọi tour.
- **Import Phương tiện Vận chuyển (Transports)**: 16 loại phương tiện tiêu chuẩn (xe 7-45 chỗ, limousine, giường nằm, máy bay, tàu hỏa, du thuyền).
- **Import Dữ liệu trải nghiệm**: Seasonal Showcase Tân Cương, Trang phục tour (AI Try-on).
- **Sinh dữ liệu mẫu** (Tour, Lịch khởi hành, Khách hàng, Booking, Thanh toán, Đánh giá) vào PostgreSQL.
- **Nâng các mức hạng hội viên** (`bronze`, `silver`, `gold`, `platinum`, `diamond`) kèm lịch sử booking & voucher đặc quyền.
- **Cấp quyền Admin** cho tài khoản có sẵn hoặc tạo mới tài khoản quản trị.

> **Lưu ý:** Thư mục này độc lập với source code chính (`apps/web`, `apps/api`).

---

## 📁 Cấu trúc thư mục tái cấu trúc

```text
scripts_data/
├── server.ts                             # Express server giao diện Web Studio (Port 3500)
├── public/index.html                     # Giao diện Web Studio (5 tab trực quan)
├── data/
│   ├── provinces.json                    # Bộ dữ liệu chuẩn 34 tỉnh/thành tích hợp sẵn (offline)
│   ├── attractions.json                  # 81 điểm tham quan nổi bật bao phủ 34 tỉnh/thành (cấp 6)
│   ├── partners.json                     # Bộ 25 đối tác chuẩn hóa (Du thuyền, Khách sạn, Xe, Bay...)
│   ├── hotels.json                       # 15 khách sạn cao cấp 3-5 sao & các loại phòng
│   └── transports.json                   # 16 phương tiện vận chuyển (máy bay, xe, tàu hỏa, du thuyền)
├── services/                             # Core Business Services (dùng chung cho Web API & CLI)
│   ├── location-importer.ts              # Service import 34 tỉnh/thành & thống kê địa điểm
│   ├── attraction-importer.ts            # Service import 81 điểm tham quan 34 tỉnh & chi tiết
│   ├── partner-importer.ts               # Service import đối tác & thống kê nhà cung cấp
│   ├── catalog-importer.ts               # Service import khách sạn, phòng nghỉ & phương tiện
│   ├── showcase-costume-importer.ts      # Service import Showcase mùa & Trang phục tour
│   ├── data-generator.ts                 # Sinh dữ liệu Tour, Booking & Rollback theo batch
│   ├── membership-upgrader.ts            # Nâng hạng hội viên (5 hạng) + tạo booking & voucher
│   └── admin-manager.ts                  # Cấp quyền Admin & tạo hồ sơ nhân viên
├── cli/                                  # Các lệnh CLI độc lập
│   ├── import-provinces.ts               # CLI import 34 tỉnh/thành (npm run db:import:provinces)
│   ├── seed-partners.ts                  # CLI import đối tác (npm run seed:partners)
│   ├── seed-hotels.ts                    # CLI import khách sạn & phòng (npm run seed:hotels)
│   ├── seed-transports.ts                # CLI import phương tiện (npm run seed:transports)
│   ├── seed-attractions.ts               # CLI import điểm tham quan 34 tỉnh (npm run seed:attractions)
│   ├── import-seasonal-showcase.ts       # CLI import showcase (npm run db:import:seasonal)
│   ├── seed-tour-costumes.ts             # CLI seed trang phục tour (npm run seed:costumes)
│   ├── grant-admin.ts                    # CLI cấp quyền Admin (npm run grant-admin)
│   ├── seed-member-tier.ts               # CLI nâng hạng / seed hội viên theo hạng
│   └── seed-diamond-member.ts            # CLI nhanh tạo hội viên Kim cương
└── import_data/                          # Thư mục chuyển tiếp tương thích ngược (Forwarding stubs)
    └── README.md
```

---

## ⚡ Khởi chạy Giao diện Web Studio (Port 3500)

```bash
npm run data:studio
```

Truy cập trình duyệt: **[http://localhost:3500](http://localhost:3500)**

Các tab trên giao diện:
1. **🗺️ Dữ liệu nền & Import**:
   - **Địa điểm Việt Nam**: Thống kê thời gian thực (Quốc gia, Vùng miền, 34 tỉnh/thành). Nút nạp 34 tỉnh/thành và Dry Run.
   - **Đối tác & Nhà cung cấp**: Thống kê số lượng theo lĩnh vực (Du thuyền, Khách sạn, Hàng không, Xe, Đường sắt, Bảo hiểm). Nút nạp 25 đối tác chuẩn vào CSDL.
   - **Dữ liệu bổ trợ**: Nạp nhanh Seasonal Showcase Tân Cương & Trang phục tour.
2. **⚡ Kịch bản Tour & Booking**: Sinh tour/lịch khởi hành theo tháng, booking, thanh toán, review & phản hồi CSKH.
3. **📦 Lịch sử Đợt & Dọn dẹp**: Xem các đợt đã tạo và thu hồi (rollback) an toàn theo `Batch Tag`.
4. **👑 Hội viên & Nâng hạng**: Chọn user có sẵn hoặc tạo mới, nâng lên bất kỳ hạng nào (`Đồng`, `Bạc`, `Vàng`, `Bạch kim`, `Kim cương`), tự sinh đơn hoàn thành & cấp voucher.
5. **🛡️ Cấp quyền Admin**: Xem danh sách Admin hiện tại và cấp quyền Admin (`is_staff = true`, role `admin`, `employee_profiles`) cho tài khoản bất kỳ.

---

## 🛠️ Các lệnh CLI nhanh

```bash
# 1. Import địa điểm (34 tỉnh/thành Việt Nam)
npm run db:import:provinces -- --dry-run     # Chạy thử kiểm tra
npm run db:import:provinces                  # Chạy thật vào database

# 2. Import Đối tác & Nhà cung cấp (Providers / Partners)
npm run seed:partners -- --dry-run          # Chạy thử kiểm tra danh sách đối tác
npm run seed:partners                       # Chạy thật vào database (status: 1)
npm run seed:partners -- --inactive         # Nạp với trạng thái Tạm dừng (status: 0)

# 3. Import Khách sạn & Phòng nghỉ (Hotels & Rooms)
npm run seed:hotels -- --dry-run            # Chạy thử kiểm tra 15 khách sạn & mapping vị trí
npm run seed:hotels                         # Chạy thật vào database

# 4. Import Phương tiện Vận chuyển (Transports)
npm run seed:transports -- --dry-run        # Chạy thử kiểm tra 16 phương tiện & mapping đối tác
npm run seed:transports                     # Chạy thật vào database

# 5. Import Điểm tham quan 34 Tỉnh thành (Attractions)
npm run seed:attractions -- --dry-run       # Chạy thử kiểm tra 81 điểm tham quan
npm run seed:attractions                    # Chạy thật vào database
npm run seed:attractions -- --clean         # Dọn dẹp điểm cũ chưa gán tour trước khi nạp

# 6. Import Showcase mùa & Trang phục tour
npm run db:import:seasonal                  # Nạp showcase mùa đông Tân Cương
npm run seed:costumes                       # Nạp trang phục cho tour

# 4. Nâng hạng hội viên (bronze | silver | gold | platinum | diamond)
npm run seed:member -- user@example.com gold
npm run seed:diamond                        # Tạo nhanh hội viên Kim cương mặc định

# 5. Xem danh sách & cấp quyền Admin
npm run grant-admin
npm run grant-admin -- user@example.com
```
