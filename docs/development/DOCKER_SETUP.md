# Docker local — MongoDB replica set và Cloudinary

Cập nhật01/11/2026. Chỉ dành local demo/development, không phải cấu hình production.
Giữ hạ tầng Docker của Hiếu và tích hợp worker/session của nhóm. Nguồn storage: [09](../technical-baseline/09-CLOUDINARY-DECISION.md).

## Chuẩn bị
Docker Desktop/Engine đang chạy, Compose plugin mới, các cổng5173/3000/27017 không bị chiếm.
Nếu chỉ xem UI: không cần Docker/backend/DB; chạy frontend npm run dev theo [LOCAL_RUN](LOCAL_RUN.md).
Docker dùng official mongo:8.0.32-noble và Node24. Không xóa volume dữ liệu hiện có.

Tạo file `.env` riêng ở repo root bằng editor. Không gửi lên Git hoặc chat:

~~~env
MONGO_INITDB_ROOT_USERNAME=flux_dev
MONGO_INITDB_ROOT_PASSWORD=REPLACE_WITH_YOUR_OWN_LOCAL_PASSWORD
MONGO_DATABASE=flux_studio
MONGODB_HOST_PORT=27017
FRONTEND_ORIGIN=http://localhost:5173
VITE_UI_PREVIEW=true
GENERATION_ENABLED=false
~~~

Các giá trị trên là tên/placeholder, không phải credential dùng chung. Không giữ password placeholder.
Compose truyền MongoDB password tách URI. Chưa cần Cloudinary khi chỉ demo tài khoản/DB.
Để dùng auth/API thật, đổi VITE_UI_PREVIEW=false trong root .env rồi recreate frontend.
frontend/.env.local áp dụng khi chạy Vite ngoài Docker; Compose truyền env riêng trong container.
Khi bật tạo ảnh, thêm biến Cloudflare/Cloudinary theo LOCAL_RUN rồi đặt GENERATION_ENABLED=true.
Không đưa provider key vào bất kỳ biến VITE_* nào.

## Khởi động

~~~cmd
docker compose config --quiet
docker compose up --build
~~~

Không xuất nguyên docker compose config ra chat vì nội dung có thể gồm secret đã nội suy.
Services:
- mongodb-key: tạo keyfile một lần trong mongodb_key, quyền400, không in key.
- mongodb: auth + rs0, volume mongodb_data giữ nguyên.
- mongodb-init: xác thực, khởi tạo rs0 nếu chưa có, đợi PRIMARY; chạy lại không reset DB.
- backend: đợi init thành công, giữ checkpoint ở backend_checkpoints, port3000.
- frontend: Vite dev/proxy backend, port5173, preview mặc định true.

Nếu volume cũ đã có dữ liệu: backup trước thay đổi; password phải khớp user đã tạo trong DB.
MONGO_INITDB_* không đổi password của database đã tồn tại. Không sửa bằng cách xóa volume.
Nếu rs0 đã có cấu hình hostname khác, kiểm tra cấu hình với người phụ trách; script không tự reconfig.
MongoDB healthcheck ping không đủ chứng minh transaction; mongodb-init mới kiểm tra PRIMARY.

## Kiểm tra và dừng

~~~cmd
docker compose ps
docker compose logs mongodb-init
docker compose exec backend npm run build
docker compose exec frontend npm run build
docker compose exec backend npm test
docker compose down
~~~

Không chạy down -v: xóa cả DB/keyfile/checkpoint là mất dữ liệu.
Không chạy dev:local bên trong Docker: lệnh đó dành MongoDB dev riêng ngoài Docker.
Khi manifest/lockfile đổi phải rebuild và bảo đảm node_modules container được cập nhật;
không xóa các named volume dữ liệu để cập nhật dependency.

Compass từ Windows: mongodb://127.0.0.1:27017/?directConnection=true&replicaSet=rs0&authSource=admin,
nhập username/password qua form Compass. Backend trong Docker dùng hostname mongodb:27017.
Không mở MongoDB ra Internet; port host chỉ bind127.0.0.1. Backend/frontend là cấu hình dev,
chỉ chạy trên mạng tin cậy; không dùng Compose này làm production.

## Trạng thái kiểm chứng
Docker Engine chưa sẵn sàng ở phiên triển khai nên chưa test container build/khởi tạo/transaction Docker.
Kiểm tra Compose --quiet không xác nhận Docker startup thành công. Replica set integration ngoài Docker
đã có test tạm riêng; cloud calls vẫn giả lập. Cần smoke Docker có PRIMARY và transaction trước nghiệm thu.
