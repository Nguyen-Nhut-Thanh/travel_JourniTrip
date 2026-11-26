# 📁 Thư mục `import_data` (Legacy Forwarders)

Thư mục này hiện đóng vai trò **chuyển tiếp tương thích ngược** (forwarding stubs) tới thư mục chuẩn mới:
- Các lệnh CLI thực thi nằm tại: `scripts_data/cli/`
- Các logic cốt lõi (Services) nằm tại: `scripts_data/services/`
- Bộ dữ liệu cục bộ: `scripts_data/data/`

Bạn có thể tiếp tục chạy các lệnh quen thuộc từ thư mục gốc dự án:
```bash
# 1. Import 34 tỉnh/thành phố (Địa điểm)
npm run db:import:provinces -- --dry-run
npm run db:import:provinces

# 2. Import Seasonal Showcase & Costumes
npm run db:import:seasonal
npm run seed:costumes

# 3. Nâng hạng & Seed Hội viên
npm run seed:member -- user@example.com gold
npm run seed:diamond

# 4. Quản trị viên
npm run grant-admin
```

> **Mẹo:** Bạn có thể thao tác trực quan tất cả các tính năng trên qua Giao diện Web Studio:
> `npm run data:studio` (truy cập **http://localhost:3500**).
