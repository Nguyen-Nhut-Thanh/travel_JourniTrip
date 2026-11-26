# JourniTrip

JourniTrip là nền tảng đặt tour du lịch, kết hợp website dành cho khách hàng, trang quản trị vận hành và dịch vụ AI hỗ trợ tư vấn. Dự án tổ chức theo mô hình monorepo, sử dụng npm Workspaces và Turborepo để quản lý các ứng dụng cùng thư viện dùng chung.

## Chức năng chính

- **Khám phá tour:** tìm kiếm, lọc tour, xem lịch trình, lịch khởi hành, giá, dịch vụ, điểm đón và đánh giá; lưu tour yêu thích.
- **Đặt tour:** tạo booking, chọn dịch vụ bổ sung, áp dụng voucher, thanh toán qua VNPay và theo dõi đơn trong tài khoản.
- **Tài khoản và hội viên:** đăng ký, đăng nhập, xác minh email, đăng nhập Google, quản lý hồ sơ, hạng thành viên và ví quyền lợi.
- **Tư vấn và hỗ trợ:** chatbot AI, gợi ý và so sánh tour, tìm kiếm bằng hình ảnh, thử trang phục bằng AI; trò chuyện với nhân viên qua Socket.IO.
- **Quản trị:** quản lý tour, lịch khởi hành, booking, khách hàng, nhân sự và phân công chuyến đi; quản lý địa điểm, danh mục dịch vụ, bài viết, banner, ưu đãi và thống kê.
- **Dữ liệu phát triển:** nhập danh mục, sinh dữ liệu mẫu và cấp quyền quản trị bằng CLI hoặc Data Studio.

Các chức năng tích hợp cần thông tin dịch vụ tương ứng trong cấu hình môi trường.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Website | Next.js 15, React 19, TypeScript, Tailwind CSS 4 |
| API | NestJS 11, JWT, Socket.IO |
| Cơ sở dữ liệu | PostgreSQL, Prisma 6 |
| AI | Python, FastAPI, LangChain, FAISS, API tương thích OpenAI |
| Tích hợp | Google OAuth, Google Maps, Cloudinary, SMTP, VNPay |
| Quản lý monorepo | npm Workspaces, Turborepo |

## Cấu trúc dự án

```text
.
├── apps/
│   ├── web/                 # Website khách hàng và trang quản trị
│   ├── api/                 # API nghiệp vụ NestJS
│   └── ai/                  # FastAPI, chỉ mục tìm kiếm và kiểm thử Python
├── packages/
│   ├── database/            # Prisma schema, migration và client dùng chung
│   └── shared/              # Kiểu dữ liệu và hợp đồng dùng chung
├── scripts_data/
│   ├── cli/                 # Lệnh import, seed và cấp quyền
│   ├── data/                # Dữ liệu JSON phục vụ nhập danh mục
│   ├── services/            # Logic dùng chung cho CLI và Data Studio
│   ├── public/              # Giao diện Data Studio
│   └── server.ts            # Máy chủ Data Studio
├── .env.example             # Mẫu cấu hình môi trường
├── package.json             # Workspaces và các lệnh tại thư mục gốc
└── turbo.json               # Cấu hình tác vụ Turborepo
```

## Yêu cầu môi trường

- Node.js 22 LTS hoặc mới hơn.
- npm 11.5.2 theo trường `packageManager` trong `package.json`.
- Python 3.11 trở lên, có `pip` và `venv`, để chạy dịch vụ AI.
- PostgreSQL đang chạy và một database dành cho dự án.

Các lệnh dưới đây chạy tại thư mục gốc repository. Ví dụ khởi tạo dùng PowerShell.

## Cài đặt lần đầu

### 1. Cài dependency và tạo cấu hình

```powershell
npm install
Copy-Item .env.example .env
```

Nếu đã có `.env`, giữ lại cấu hình hiện tại. Chỉnh tối thiểu `DATABASE_URL` để kết nối PostgreSQL và thay `JWT_SECRET` bằng secret riêng. Cập nhật các URL nếu không dùng địa chỉ mặc định.

Web, API, Prisma, dịch vụ AI và công cụ nhập dữ liệu dùng chung `.env` ở gốc. Không cần tạo `.env` hoặc `.env.local` trong từng workspace. Biến đã đặt trong shell hoặc môi trường triển khai được ưu tiên hơn giá trị trong file.

### 2. Khởi tạo database phát triển mới

Tạo một database trống trong PostgreSQL, cập nhật `DATABASE_URL`, rồi chạy:

```powershell
npm run db:generate
npm run db:push
npm run build --workspace=shared
npm run build --workspace=database
```

`db:push` đồng bộ cấu trúc theo `packages/database/prisma/schema.prisma`; lệnh này không tạo dữ liệu mẫu. Hai bước build tạo các package dùng chung trước khi chạy riêng ứng dụng hoặc kiểm tra kiểu dữ liệu.

**Với database đã có dữ liệu:** kiểm tra schema, lịch sử migration và các bước chuyển đổi dữ liệu trước khi cập nhật. Các file SQL nằm trong `packages/database/prisma/migrations/`. Không dùng `db:push` thay cho migration có bước backfill dữ liệu; sao lưu trước khi thay đổi cấu trúc database đang sử dụng.

### 3. Cài môi trường AI

```powershell
npm run setup --workspace=ai
```

Lệnh tạo môi trường ảo tại `apps/ai/.venv` và cài thư viện trong `apps/ai/requirements.txt`. Nếu cần chỉ định Python khi tạo môi trường:

```powershell
$env:AI_PYTHON = "C:\duong-dan\python.exe"
npm run setup --workspace=ai
```

Điền `OPENAI_API_KEY`, `OPENAI_BASE_URL` và các model phù hợp với nhà cung cấp bạn sử dụng. Thay các giá trị mẫu trong `.env.example` bằng cấu hình thực tế.

### 4. Chạy ứng dụng

```powershell
npm run dev
```

Lệnh chạy web, API, dịch vụ AI và các package ở chế độ phát triển. Có thể chạy riêng trong các terminal:

```powershell
npm run dev:web
npm run dev:api
npm run dev:ai
```

| Dịch vụ | Địa chỉ mặc định |
| --- | --- |
| Website | http://localhost:3000 |
| Đăng nhập quản trị | http://localhost:3000/admin/login |
| API nghiệp vụ | http://localhost:4000 |
| Kiểm tra dịch vụ AI | http://localhost:8000/health |
| Tài liệu FastAPI | http://localhost:8000/docs |
| Data Studio, khi chạy riêng | http://localhost:3500 |

Web chuyển các yêu cầu HTTP `/api/*` sang NestJS qua `API_INTERNAL_URL`. Kết nối Socket.IO sử dụng địa chỉ API công khai đã cấu hình cho trình duyệt.

## Cấu hình các dịch vụ

Xem cấu hình cơ bản tại [`.env.example`](.env.example).

| Nhóm | Biến môi trường |
| --- | --- |
| PostgreSQL | `DATABASE_URL` |
| Xác thực | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| API và website | `API_HOST`, `API_PORT`, `API_INTERNAL_URL`, `API_PUBLIC_URL`, `FRONTEND_PUBLIC_URL`, `CORS_ORIGINS` |
| API phía trình duyệt | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_URL` |
| Google | `GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| Lưu ảnh | `CLOUDINARY_NAME`, `CLOUDINARY_KEY`, `CLOUDINARY_SECRET` |
| Email | `MAIL_HOST`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM_EMAIL`, `MAIL_FROM_NAME` |
| Thanh toán | `VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_PAYMENT_URL`, `VNP_RETURN_URL`, `VNP_EXPIRE_MINUTES` |
| AI | `AI_HOST`, `AI_PORT`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_CHAT_MODEL`, `OPENAI_EMBEDDING_MODEL` |

Một số luồng AI dùng thêm các biến chưa liệt kê đầy đủ trong `.env.example`:

- `AI_INTERNAL_URL`: địa chỉ FastAPI cho luồng chatbot được proxy qua NestJS.
- `AI_SERVICE_URL`: địa chỉ FastAPI cho luồng diễn giải yêu cầu, so sánh tour và thử trang phục.
- `AI_SERVICE_TOKEN`: token dùng chung giữa NestJS và FastAPI cho các endpoint nội bộ có xác thực.
- `OPENAI_TRYON_MODEL`: model tạo ảnh cho chức năng thử trang phục.

Khi chạy AI cùng máy, có thể đặt cả `AI_INTERNAL_URL` và `AI_SERVICE_URL` thành `http://127.0.0.1:8000`.

Các biến có tiền tố `NEXT_PUBLIC_` được đưa vào trình duyệt, chỉ chứa thông tin công khai. Không commit `.env` hoặc khóa dịch vụ. Khởi động lại ứng dụng sau khi sửa `.env`; với bản production, build lại web khi thay đổi biến `NEXT_PUBLIC_`.

VNPay mặc định dùng sandbox. Đăng ký URL IPN dạng `<FRONTEND_PUBLIC_URL>/api/payment/vnpay-ipn` với VNPay và cấu hình URL trả về tương ứng.

## Dữ liệu ban đầu và tài khoản quản trị

Sau khi database sẵn sàng, nhập các danh mục cần dùng:

```powershell
npm run db:import:provinces
npm run seed:partners
npm run seed:hotels
npm run seed:transports
npm run seed:attractions
```

Các lệnh này nhập danh mục nền; dùng Data Studio để sinh thêm tour, lịch khởi hành, khách hàng và booking mẫu:

```powershell
npm run data:studio
```

Mở http://localhost:3500 và chọn thao tác cần thực hiện. Công cụ ghi vào database trong `DATABASE_URL`, nên dùng database phát triển riêng.

Cấp quyền quản trị cho tài khoản đã đăng ký:

```powershell
npm run grant-admin -- user@example.com
```

Để xem cú pháp tạo tài khoản quản trị mới và các tùy chọn khác:

```powershell
npm run grant-admin -- --help
```

Xem chi tiết tại [hướng dẫn Data Studio và import](scripts_data/README.md) và [hướng dẫn dữ liệu bổ sung](scripts_data/import_data/README.md).

## Các lệnh thường dùng

| Lệnh | Mục đích |
| --- | --- |
| `npm run dev` | Chạy toàn bộ workspace ở chế độ phát triển |
| `npm run build` | Build các workspace có tác vụ build |
| `npm run typecheck` | Kiểm tra kiểu TypeScript |
| `npm run db:generate` | Sinh lại Prisma Client sau khi sửa schema |
| `npm run db:push` | Đồng bộ schema cho database phát triển |
| `npm run ai:index` | Tạo chỉ mục FAISS từ dữ liệu tour |
| `npm run test --workspace=ai` | Chạy bộ kiểm thử Python của dịch vụ AI |
| `npm run data:studio` | Mở công cụ quản lý dữ liệu phát triển |
| `npm run db:import:seasonal` | Nhập dữ liệu giới thiệu theo mùa |
| `npm run seed:costumes` | Tạo dữ liệu trang phục cho tour |

Trước khi kiểm tra TypeScript trên máy mới, chạy `db:generate` và build `shared`, `database` theo hướng dẫn cài đặt. Bộ kiểm thử Python cần môi trường AI đã được cài.

## Chạy bản đã build

```powershell
npm run build
```

Sau khi build thành công, chạy mỗi dịch vụ trong một terminal hoặc trình quản lý tiến trình:

```powershell
# Website
npm run start --workspace=web

# API NestJS
node apps/api/dist/main.js

# Dịch vụ AI
npm run start --workspace=ai
```

`npm run build` build các workspace TypeScript/Next.js; dependency Python vẫn được cài bằng bước setup AI. Dừng các tiến trình dev trước khi dùng lại cùng cổng.

## Xử lý lỗi thường gặp

- **Không kết nối được PostgreSQL:** kiểm tra dịch vụ PostgreSQL, database đã tạo, tài khoản và `DATABASE_URL`.
- **Thiếu Prisma Client hoặc kiểu dữ liệu chưa cập nhật:** chạy `npm run db:generate`, rồi build lại `database` và `shared`. Nếu gặp `EPERM` trên Windows, dừng các tiến trình đang giữ Prisma engine trước khi sinh lại client.
- **Không tìm thấy module `shared` hoặc `database`:** chạy hai lệnh build package ở bước cài đặt trước khi chạy riêng API.
- **AI báo thiếu dependency:** chạy `npm run setup --workspace=ai`; kiểm tra phiên bản Python và đường dẫn `AI_PYTHON` nếu có.
- **Chatbot hoặc so sánh tour không phản hồi:** kiểm tra tiến trình AI, khóa/model của nhà cung cấp, `AI_INTERNAL_URL`, `AI_SERVICE_URL` và token nội bộ tương ứng.
- **Web không gọi được API hoặc chat không kết nối:** kiểm tra API cổng 4000, `API_INTERNAL_URL`, các biến API công khai và `CORS_ORIGINS`.
- **Turbopack gặp lỗi khi phát triển:** thử `npm run dev:webpack --workspace=web`.
