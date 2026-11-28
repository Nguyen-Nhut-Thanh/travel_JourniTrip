# 🚀 JourniTrip Mock Data Studio & Import Tools

Bộ công cụ độc lập phục vụ:
- **Import dữ liệu nền & Địa điểm**: 34 tỉnh/thành phố, 3 vùng miền, quốc gia Việt Nam.
- **Import địa điểm nước ngoài**: 15 quốc gia/điểm đến, 63 vùng, 180 tỉnh/thành hoặc khu vực tương đương và 601 điểm tham quan trong một file JSON.
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
│   ├── international-locations.json      # Cây địa điểm và điểm tham quan nước ngoài (cấp 3–6)
│   ├── attractions.json                  # 81 điểm tham quan nổi bật bao phủ 34 tỉnh/thành (cấp 6)
│   ├── partners.json                     # Bộ 25 đối tác chuẩn hóa (Du thuyền, Khách sạn, Xe, Bay...)
│   ├── hotels.json                       # 15 khách sạn cao cấp 3-5 sao & các loại phòng
│   └── transports.json                   # 16 phương tiện vận chuyển (máy bay, xe, tàu hỏa, du thuyền)
├── services/                             # Core Business Services (dùng chung cho Web API & CLI)
│   ├── location-importer.ts              # Service import 34 tỉnh/thành & thống kê địa điểm
│   ├── international-location-data.ts    # Kiểm tra schema, slug, cấp địa lý và mã quốc gia
│   ├── international-location-importer.ts # Import nước ngoài trong một transaction
│   ├── attraction-importer.ts            # Service import 81 điểm tham quan 34 tỉnh & chi tiết
│   ├── partner-importer.ts               # Service import đối tác & thống kê nhà cung cấp
│   ├── catalog-importer.ts               # Service import khách sạn, phòng nghỉ & phương tiện
│   ├── showcase-costume-importer.ts      # Service import Showcase mùa & Trang phục tour
│   ├── data-generator.ts                 # Sinh dữ liệu Tour, Booking & Rollback theo batch
│   ├── membership-upgrader.ts            # Nâng hạng hội viên (5 hạng) + tạo booking & voucher
│   └── admin-manager.ts                  # Cấp quyền Admin & tạo hồ sơ nhân viên
├── cli/                                  # Các lệnh CLI độc lập
│   ├── import-provinces.ts               # CLI import 34 tỉnh/thành (npm run db:import:provinces)
│   ├── import-international-locations.ts # CLI import trọn bộ địa điểm nước ngoài
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

### Địa điểm nước ngoài

Bộ dữ liệu có **859 nút địa điểm**, tăng từ 187 nút. Cây phân cấp: **Quốc gia → Khu vực/Miền → Tỉnh/Thành hoặc địa hạt tương đương → Điểm tham quan**.

| Quốc gia | Khu vực/miền | Tỉnh/thành hoặc tương đương | Điểm tham quan |
| --- | ---: | ---: | ---: |
| Nhật Bản | 10 | 47 | 155 |
| Trung Quốc | 7 | 31 | 131 |
| Pháp | 13 | 53 | 168 |
| Hàn Quốc | 6 | 16 | 81 |
| 11 quốc gia/điểm đến khác | 27 | 33 | 66 |
| **Tổng** | **63** | **180** | **601** |

Ví dụ: Nhật Bản → Kanto → Kanagawa → Hồ Ashi; Trung Quốc → Tây Nam Trung Quốc → Vân Nam → Thành cổ Lệ Giang; Pháp → Île-de-France → Yvelines (Versailles) → Cung điện Versailles; Hàn Quốc → Vùng thủ đô Hàn Quốc → Gyeonggi → Thành Hwaseong ở Suwon.

Nhật Bản có đủ 47 tỉnh theo phân vùng du lịch JNTO. Trung Quốc bao phủ 31 tỉnh/khu tự trị/đô thị của phần đại lục; Đài Loan tiếp tục dùng mã TW riêng. Pháp bao phủ 13 vùng chính quốc với 53 địa hạt/cụm đô thị được tuyển chọn. Hàn Quốc dùng sáu vùng du lịch, gộp Jeonnam–Gwangju theo phân loại của VISITKOREA. Đây là danh mục du lịch tuyển chọn, không phải toàn bộ đơn vị hành chính hoặc mọi điểm tham quan. Phạm vi và nguồn tham khảo nằm trong `import_notes`, `sources` của JSON; thống kê từng nước nằm ở `summary.by_country`.

Mỗi điểm có mô tả tiếng Việt, điểm nổi bật, gợi ý mùa, ẩm thực địa phương và từ khóa. `image_url` để `null` khi chưa có ảnh đúng địa điểm được xác minh. Mùa tham quan không thay thế lịch mở cửa hoặc điều kiện thực tế khi lập tour.

```bash
# Kiểm tra JSON, slug và cây cha–con offline; không kết nối hoặc ghi database
npm run db:import:international -- --dry-run

# Import toàn bộ quốc gia, vùng, tỉnh/thành và điểm tham quan
npm run db:import:international

# Dùng file tùy chỉnh có cùng schema_version = 1.0.0
npm run db:import:international -- --file ./scripts_data/data/international-locations.json
```

Cũng có thể vào tab **Dữ liệu nền & Import → Import địa điểm nước ngoài** trên Web Studio để chạy thử hoặc import.

Importer kiểm tra toàn bộ file trước khi ghi, sắp xếp cha trước con, ánh xạ `parent_slug` / `province_slug` sang ID và giữ `country_code` ở mọi cấp. Dữ liệu điểm tham quan được lưu vào `locations`, `destinations_detail` và `location_images` khi có ảnh. Chạy lại cập nhật theo slug và giữ nguyên ID; ảnh đang có được giữ nếu file không cung cấp ảnh mới. Toàn bộ lần import nằm trong một transaction; nếu trùng slug với quốc gia/cấp khác hoặc cây trong database khác với file, lần import sẽ thất bại và rollback. Chạy thử chỉ xác thực file, không kiểm tra xung đột trong database.

Các lệnh Việt Nam tiếp tục dùng `provinces.json` và `attractions.json`. Thống kê Việt Nam và tùy chọn `seed:attractions -- --clean` chỉ áp dụng cho dữ liệu có `country_code = VN`.

Kiểm tra importer bằng database giả lập, không ghi database thật:

```bash
npx tsx --test scripts_data/services/international-location-importer.test.ts
```

### Dữ liệu Việt Nam và các danh mục khác

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
