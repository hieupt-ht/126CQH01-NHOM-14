# Chạy FLUX STUDIO trên máy mới

Cập nhật01/11/2026. Cách đơn giản nhất để chạy toàn bộ ứng dụng là Docker Compose. Hướng dẫn này dành cho môi trường local development, không phải production.

## Cần chuẩn bị

- Git để clone repository.
- Docker Desktop đang chạy trên Windows/macOS, hoặc Docker Engine và Compose plugin trên Linux.
- Các cổng `5173`, `3000` và `27017` chưa được chương trình khác sử dụng.

> **Chỉ muốn xem giao diện:** có thể chạy riêng frontend bằng Node.js 24 và npm 11. Xem mục [Chỉ chạy frontend](#chỉ-chạy-frontend).

## 1. Lấy mã nguồn và tạo cấu hình local

Clone repository bằng URL GitHub của nhóm, rồi mở terminal tại thư mục gốc, nơi có `compose.yaml`:

```powershell
Copy-Item .env.example .env
```

Mở `.env` và thay `MONGO_INITDB_ROOT_PASSWORD` bằng mật khẩu riêng cho MongoDB local. Đặt một giá trị bí mật riêng cho `JWT_SECRET`, dài ít nhất 32 byte. Có thể tạo giá trị ngẫu nhiên bằng PowerShell:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Chép chuỗi vừa tạo vào `JWT_SECRET` trong `.env`. Không gửi file này qua chat hoặc commit lên Git. `.env` đã được Git bỏ qua.

Các biến Cloudflare và Cloudinary có thể để trống cho lần chạy đầu. `GENERATION_ENABLED=false` giữ tạo ảnh tắt; team không cần gửi API request tới dịch vụ AI/storage để khởi động ứng dụng. Compose mặc định bật UI preview, nên đăng nhập lúc này chỉ chuyển trang để xem giao diện, không xác thực tài khoản.

## 2. Chạy toàn bộ ứng dụng bằng Docker

Tại thư mục gốc repository:

```powershell
docker compose up --build
```

Lần đầu Docker cần tải image và cài dependencies nên có thể mất vài phút. Khi các container khởi động xong, mở <http://localhost:5173>. Backend chạy ở cổng `3000`; MongoDB chạy replica set local ở cổng `27017`.

Docker Compose khởi động frontend, backend và MongoDB; tự tạo MongoDB keyfile trong named volume và khởi tạo replica set. Dữ liệu database và checkpoint được giữ qua lần dừng/chạy lại.

Để chạy nền, dùng `docker compose up --build -d`; xem trạng thái bằng `docker compose ps` và log bằng `docker compose logs -f`. Dừng bằng `docker compose down` hoặc nhấn `Ctrl+C` trong terminal đang chạy Compose. **Không dùng `docker compose down -v`** nếu muốn giữ dữ liệu local.

## 3. Bật đăng nhập và API thật (tùy chọn)

UI preview không gọi backend cho luồng đăng nhập. Để dùng đăng ký/đăng nhập và dữ liệu MongoDB thật:

1. Thêm `VITE_UI_PREVIEW=false` vào `.env` ở thư mục gốc.
2. Khởi động lại frontend để nhận cấu hình: `docker compose up --build -d frontend`.
3. Mở lại <http://localhost:5173/register>, tạo tài khoản local rồi đăng nhập.

Tạo ảnh vẫn bị tắt khi `GENERATION_ENABLED=false`; yêu cầu tạo ảnh sẽ không tạo job hoặc trừ quota. Bật generation cần cấu hình đủ Cloudflare Workers AI và Cloudinary trong `.env`, kiểm tra giới hạn dịch vụ, rồi mới đặt `GENERATION_ENABLED=true`. Xem [quyết định Cloudinary](../technical-baseline/09-CLOUDINARY-DECISION.md) và [hướng dẫn Docker chi tiết](DOCKER_SETUP.md).

## Chỉ chạy frontend

Nếu chỉ cần xem giao diện preview, không cần Docker, backend hay database. Cài Node.js 24.x và npm 11.x, sau đó chạy:

```powershell
cd frontend
npm ci
npm run dev
```

Mở <http://localhost:5173/login>. Đăng nhập ở chế độ preview chỉ mô phỏng điều hướng; tài khoản và mật khẩu không được xác minh hay lưu. Tạo ảnh, đăng ký và lưu thay đổi chưa gửi API hoặc ghi database trong chế độ này.

## Gặp lỗi thường thấy

- **Docker báo thiếu biến trong `.env`:** kiểm tra đã copy `.env.example` thành `.env` và điền MongoDB username/password cùng `JWT_SECRET`.
- **Cổng đang được sử dụng:** dừng ứng dụng đang dùng cổng `5173`, `3000` hoặc `27017`, rồi chạy lại Compose.
- **Container chưa sẵn sàng:** xem `docker compose ps` và `docker compose logs -f mongodb-init backend`.
- **Đăng nhập không gọi backend:** kiểm tra `VITE_UI_PREVIEW=false` trong `.env`, rồi recreate frontend.
- **Lỗi Origin:** dùng đúng URL `http://localhost:5173`, không đổi sang `127.0.0.1` khi chưa đổi `FRONTEND_ORIGIN`.
- **MongoDB đã có dữ liệu:** giá trị `MONGO_INITDB_ROOT_*` không đổi mật khẩu của database đã khởi tạo. Không xóa volume để chữa lỗi; xem [Docker local](DOCKER_SETUP.md) và hỏi người phụ trách dữ liệu trước khi xử lý.

## Trạng thái và giới hạn

Docker local dùng một MongoDB replica set node, phù hợp phát triển/demo, không phải high availability hay production. Generation/cloud live chưa được xác minh trong hướng dẫn này. Không có thao tác nào ở đây yêu cầu commit `.env` hoặc gửi credential ra ngoài.
