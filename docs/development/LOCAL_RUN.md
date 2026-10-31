# Chạy FLUX STUDIO local từ máy mới
Cập nhật31/10/2026. Node24.x, npm11.x; không cần mua VPS/domain.

## 0. Xem giao diện trước, chưa cần DB/cloud (31/10/2026)

CONFIRMED theo yêu cầu chủ dự án: ưu tiên đồng bộ UI và điều hướng trước.
Chỉ chạy frontend:

~~~cmd
cd frontend
npm ci
npm run dev
~~~

Mở http://localhost:5173/login. Nhập email đúng định dạng và mật khẩu bất kỳ
(không dùng mật khẩu thật), bấm Đăng nhập để vào Dashboard.
Đây là mô phỏng điều hướng, không xác minh hay lưu tài khoản/mật khẩu.
Các route /app mở trực tiếp được. Đăng xuất quay về /login.
Thư viện/lịch sử hiển thị trạng thái rỗng; hồ sơ là khách xem thử;
tạo ảnh, đăng ký và lưu thay đổi không gửi API hoặc ghi DB/cloud.
Nhãn XEM THỬ UI được hiển thị trong layout chung.
Không hiển thị đoạn thông báo dài trên mọi trang theo yêu cầu chủ dự án.
Nhấn Tạo ảnh với prompt hợp lệ chỉ báo “Chức năng tạo ảnh sẽ được kết nối sau.”
trong khu vực kết quả, không tạo mã yêu cầu hoặc lưu trạng thái chờ.
Trạng thái chờ cũ của riêng hồ sơ ui-preview được dọn khi mở trang tạo ảnh;
không dọn yêu cầu chưa xác định của tài khoản thật.
Preview chưa có ảnh trong thư viện để nghiệm thu nội dung trang chi tiết.

Khi bắt đầu tích hợp DB, tạo frontend/.env.local với:

~~~env
VITE_UI_PREVIEW=false
~~~

Khởi động lại Vite. Khi đó bắt buộc session và tài khoản thật; làm theo các mục dưới.
Không xóa SessionGate hoặc sửa backend để bỏ kiểm tra tài khoản.
Production build luôn tắt preview, kể cả đặt VITE_UI_PREVIEW=true.
`npm run preview` phục vụ bản production đã build, không phải chế độ UI preview.
Bản build khi triển khai hosting cần reverse proxy /api về backend.
Backend giữ nguyên hash Argon2id và session HttpOnly; frontend không tự hash mật khẩu.

## 1. Hai terminal (chế độ API thật, VITE_UI_PREVIEW=false)
Từ thư mục repo126CQH01-NHOM-14:

Terminal backend:
~~~cmd
cd backend
npm ci
npm run dev:local
~~~
Lệnh này dùng MongoDB thật chạy thành single-node replica set, bind127.0.0.1, port27027.
Dữ liệu lưu backend/data/mongo, không commit. Không xóa thư mục này khi muốn giữ tài khoản.
Lần đầu thư viện tải MongoDB binary từ nguồn MongoDB (bản đã kiểm tra8.2.6 ~781MB trên Windows), cần Internet và dung lượng đĩa.
Nếu port27027/3000 bận, dừng instance của chính dự án hoặc dùng cấu hình MongoDB cài riêng; không kill/xóa dịch vụ không rõ nguồn.
Đây là tiện ích dev/test, không phải database public/production; không expose port ra mạng.
Dùng Ctrl+C để dừng backend. Windows/terminal có thể kết thúc tiến trình đột ngột; local data đã được kiểm tra giữ lại sau restart.
Không chạy hai dev:local đồng thời cùng data directory.

Terminal frontend:
~~~cmd
cd frontend
npm ci
npm run dev
~~~
Mở http://localhost:5173/register, tạo tài khoản, sau đó/login.
Dùng đúng localhost:5173 theo FRONTEND_ORIGIN, không đổi sang127.0.0.1 khi submit form nếu chưa đổi allowed origin.

## 2. API thật khi chưa có cloud
Cần frontend/.env.local VITE_UI_PREVIEW=false như mục1.
Không cần backend/.env để chạy dev:local với cấu hình mặc định.
Đăng ký/login/logout, thư viện rỗng, lịch sử, hồ sơ và thống kê hoạt động với MongoDB.
GENERATION_ENABLED mặc định false. Tạo ảnh trả503 GENERATION_NOT_CONFIGURED, không tạo job/trừ lượt.
Không có ảnh mẫu giả làm kết quả; gallery cảm hứng ở dashboard là ảnh tham chiếu có nhãn riêng.

## 3. MongoDB đã cài sẵn
Tạo backend/.env từ backend/.env.example, đặt MONGODB_URI trỏ replica set của nhóm rồi:
~~~cmd
cd backend
npm run dev
~~~
Không dùng dev:local để kết nối server MongoDB có sẵn; lệnh đó tự tạo instance riêng27027.
Kiểm tra rs healthy/primary và transaction support trước bật job.
MONGOOSE_AUTO_INDEX=true chỉ dành dev; script db:indexes sau build để tạo declared indexes có chủ đích.

## 4. Bật tạo ảnh thật — chỉ khi đã có tài khoản
Tự điền secret trong backend/.env, không gửi vào chat hoặc Git.
~~~env
GENERATION_ENABLED=false
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
AZURE_STORAGE_ACCOUNT_URL=https://YOURACCOUNT.blob.core.windows.net
AZURE_STORAGE_CONTAINER=generated-images
AZURE_STORAGE_ACCOUNT_ALIAS=demo-primary
IMAGE_STORAGE_NAMESPACE=flux-studio/your-machine
DAILY_USER_LIMIT=5
DAILY_APP_LIMIT=20
~~~
Azure: container đã tồn tại và private; backend không tự tạo resource/mua gói.
Dùng Azure CLI đăng nhập đúng tenant/subscription hoặc credential Entra hợp lệ cho DefaultAzureCredential; cấp quyền data upload/read/delete cho phạm vi thích hợp.
Xác minh spending limit,76USD còn lại và ngày hết hạn; không chuyển Pay-As-You-Go. Không cần Azure VM/CDN/private endpoint.
Cloudflare: Workers Free, token Workers AI và model FLUX.1 Schnell được phép dùng.
Mỗi máy/môi trường có IMAGE_STORAGE_NAMESPACE riêng nếu dùng chung cloud, tránh xóa ảnh dùng chung.
Sau khi tự kiểm tra đủ, đặt GENERATION_ENABLED=true và restart backend.
Một lượt smoke thật phải xác nhận: job→ảnh cloud→metadata→mở lại→download→xóa, usage trên dashboard provider.
Chưa có smoke live trong lần triển khai này; không tuyên bố Azure/Cloudflare account đã hoạt động.

## 5. Kiểm thử và báo cáo
~~~cmd
cd backend
npm run build
npm test
npm run test:integration
npm run course:report
~~~
test:integration tạo MongoDB replica set tạm, AI/storage là stub trong test có nhãn; không dùng .env DB/cloud để tạo ảnh thật.
npm test có1 test index theo MONGODB_TEST_URI được skip nếu không cấu hình; integration riêng đã kiểm tra unique/transaction.
course:report tạo10.000 metadata synthetic trong DB tạm, không gọi AI; JSON ở backend/data/course-report.
Frontend: npm run build tại frontend.
Kiểm thử trực quan desktop/mobile và smoke cloud vẫn cần thực hiện.

## 6. Cách kiểm tra khi lỗi
- Mã job sai/không tồn tại (404): trang báo không tìm thấy, chọn Về trang tạo ảnh để bỏ mã job.
- Lỗi mạng khi đọc job: giữ mã job, chỉ tải lại trạng thái; không tự gửi yêu cầu tạo mới.
- Không login được: kiểm tra backend3000 và Mongo27027 đang chạy; không dùng preview5174 thay5173.
-403 Origin: URL frontend phải trùng FRONTEND_ORIGIN.
-403 CSRF: tải lại trang rồi gửi lại; không tự lặp tác vụ có side effect.
-401: đăng nhập lại, session cookie không được thay bằng JWT/localStorage.
-409 đang tạo/quá nhanh: xem history, không spam nút.
-needs_review: không tự gọi lại inference; cần đối soát checkpoint/log lỗi an toàn.
-503 chưa cấu hình: hoàn thiện .env/identity/cloud; request chưa được nhận.

