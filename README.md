# FLUX STUDIO —126CQH01-NHOM-14

Ứng dụng tạo và quản lý ảnh: React/TypeScript, Node.js/Express, MongoDB replica set, FLUX qua Cloudflare và Azure Blob private.

## 1. Xem giao diện — chưa cần DB/cloud (mặc định development)

Yêu cầu Node24.x và npm11.x. Từ thư mục repo:

```cmd
cd frontend
npm ci
npm run dev
```

Mở http://localhost:5173/login. Nhập email đúng định dạng và mật khẩu bất kỳ
(không dùng mật khẩu thật), bấm Đăng nhập để vào Dashboard.
Đây là mô phỏng điều hướng, không xác minh/lưu tài khoản và không gọi backend.
Thư viện/lịch sử rỗng, hồ sơ khách và nhãn XEM THỬ UI; đăng xuất về Login.
Tạo ảnh chỉ hiện thông báo tại khu vực kết quả, không khóa prompt hoặc lưu yêu cầu chờ.
Chưa có bản ghi ảnh để xem thử nội dung trang chi tiết; không coi đây là nghiệm thu toàn bộ UI.

## 2. Dùng API thật — cần MongoDB

Tạo `frontend/.env.local` với `VITE_UI_PREVIEW=false`, rồi khởi động lại Vite.
Mở hai terminal riêng, mỗi terminal bắt đầu từ thư mục repo.

Backend:
```cmd
cd backend
npm ci
npm run dev:local
```
Frontend:
```cmd
cd frontend
npm ci
npm run dev
```

Mở http://localhost:5173/register rồi đăng nhập. Backend3000, MongoDB dev27027 (loopback), dữ liệu backend/data/mongo.
Lần đầu tải MongoDB binary khoảng781MB trên Windows; không cần cài MongoDB/Docker riêng cho tiện ích dev này.
Không chạy nhiều dev:local cùng lúc. Không public database dev ra mạng.

Trong chế độ này, đăng ký/login/logout, thư viện/lịch sử, hồ sơ và thống kê dùng database thật.
Tạo ảnh mặc định tắt; chưa cấu hình cloud thì không nhận job/trừ lượt.
Khi muốn quay lại xem UI, đặt `VITE_UI_PREVIEW=true` rồi restart Vite.

## 3. Tạo ảnh thật — cần cấu hình riêng

API thật không tự bật dịch vụ AI/cloud. Cần Cloudflare token, Azure identity và container private;
làm theo [LOCAL_RUN](docs/development/LOCAL_RUN.md). Chưa kiểm thử live Cloudflare/Azure.
Production build (`npm run build`/`npm run preview`) luôn tắt UI preview và cần backend/API thật.
Khi triển khai bản build lên hosting cần reverse proxy `/api` tới backend.

## Tài liệu

- [Hướng dẫn chạy và cấu hình cloud](docs/development/LOCAL_RUN.md).
- [Baseline kỹ thuật](docs/technical-baseline/README.md).
- [Contract và giới hạn implementation](docs/technical-baseline/08-IMPLEMENTATION-STATUS.md).
- [Đổi nhà cung cấp storage](docs/technical-baseline/07-STORAGE-PORTABILITY.md).
- [Báo cáo thực nghiệm metadata synthetic](docs/evidence/2026-10-30-course-report.json).

Azure/Cloudflare chưa được kiểm thử live vì chưa có credential/identity. Không commit .env, token hoặc dữ liệu runtime.

## Kiểm tra

Tại backend: npm run build, npm test, npm run test:integration, npm run course:report.
Tại frontend: npm run build.
Integration dùng MongoDB test tạm và provider/storage stub; không tiêu hao neurons hoặc Azure credit.
Health: GET /api/health. Product APIs: /api/v1. Chưa có Cloudinary adapter/migration runner hoặc UI import/export.
