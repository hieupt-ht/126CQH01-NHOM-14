# 09 — Cloudinary cho MVP và tích hợp develop

Ngày01/11/2026. **CONFIRMED**: chủ dự án chọn Cloudinary Free thay Azure Blob cho MVP.
Tài liệu này là nguồn storage hiện hành; thay Azure-first/chưa có Cloudinary ở01–08 và tài liệu lịch sử.
Không thay tên đề tài, FLUX provider, session auth, sáu trạng thái job hoặc phạm vi UI.

## Ràng buộc hiện tại
- FLUX.1 Schnell qua Cloudflare Workers AI; một prompt tạo một ảnh.
- Cloudinary lưu ảnh bằng type **authenticated**, không public upload.
- Backend kiểm tra session/ownership trước stream content/download; signed URL chỉ tạo trong adapter và không trả cho frontend/DB/log.
- MongoDB lưu provider=cloudinary, accountAlias, container=namespace, key=publicId, version và deliveryMode=private; không lưu secret/Base64.
- Session HttpOnly + Argon2id, không chuyển JWT.
- Chưa có migration ảnh Azure thật. Registry giữ contract nhưng runtime chỉ đăng ký Cloudinary; record provider khác báo lỗi an toàn.
- Không tự bật billing/nâng gói. Theo dõi hạn mức Cloudinary và Cloudflare riêng.

## Nối phần code hai nhánh
Giữ Docker/proxy, MongoDB credential tách khỏi URI và Cloudinary SDK/config/service của Hiếu.
Adapter mới dùng service upload/delete này; service cho phép publicId xác định theo namespace/generationId.
Giữ worker/checkpoint/quota/ownership của nhánh tích hợp. Đã bỏ Azure SDK/config wiring khỏi runtime.
Không dùng random publicId cho retry generation: overwrite=false và xác minh bytes đọc từ URL ký.
Nếu timeout sau upload, retry saving giữ cùng publicId; không gọi FLUX lại.
Nếu nội dung cloud khác checkpoint thì từ chối ghi đè và giữ trạng thái để đối soát.
Nếu upload/verify/DB lỗi thì không báo succeeded sớm; checkpoint giữ để phục hồi, tối đa3 lần saving rồi needs_review.
Xóa ảnh dùng soft-delete/pending cloud cleanup, tối đa5 lần lỗi với backoff; lịch sử giữ nguyên.
Không xóa file mù khi commit DB chưa rõ kết quả.

## Cấu hình và giới hạn
Backend không cần cloud credential nếu chưa cấu hình Cloudinary và GENERATION_ENABLED=false.
Nếu điền một phần credential Cloudinary thì startup từ chối cấu hình thiếu để tránh lỗi khó hiểu.
GENERATION_ENABLED=true yêu cầu Cloudflare account/token và đủ Cloudinary cloud name/key/secret.
CLOUDINARY_ACCOUNT_ALIAS mặc định demo-primary; IMAGE_STORAGE_NAMESPACE mặc định flux-studio/local.
CLOUDINARY_TIMEOUT_MS mặc định30000; MAX_IMAGE_UPLOAD_MB mặc định10.
Service upload hỗ trợ cấu hình tới95MiB nhưng worker generation vẫn giới hạn10MiB và4096px, PNG/JPEG/WebP.
SDK có thể buffer một ảnh để xác minh; không buffer toàn thư viện. Giới hạn và concurrency1 phù hợp demo.
Không tự chuyển giữa cloud khi timeout. Không có migration runner hoặc live backup cloud.
Xem [LOCAL_RUN](../development/LOCAL_RUN.md) cho biến mẫu; không cần commit file .env.

## Docker
MongoDB vẫn một node, giữ authentication/volume nhưng bật rs0 để transaction hoạt động.
Keyfile tạo một lần trong named volume mongodb_key, không nằm Git; permissions400 và owner mongodb.
Service mongodb-init khởi tạo rs0 nếu chưa có, chờ PRIMARY; backend chờ init thành công.
Không dùng down -v hoặc xóa volume để chữa lỗi. Nếu volume cũ có dữ liệu, backup trước đổi chế độ.
backend_checkpoints là named volume riêng, bảo toàn checkpoint khi recreate backend.
Dùng hostname mongodb trong network; Compass từ host cần directConnection=true.
Single node không phải high availability. Tài khoản root trong Compose chỉ dành local development,
không là cấu hình production; sau này dùng DB user quyền tối thiểu trong task triển khai riêng.

## Bằng chứng và việc còn lại
- Frontend/backend build đạt. Backend unit:29 test,28 đạt,1 skip do không có MONGODB_TEST_URI; provider/storage giả lập, không dùng credential thật.
- Hai integration test dùng MongoDB replica set tạm đạt: auth, quota, idempotency, ownership, recovery; không gọi cloud thật.
- docker compose config --quiet và node --check init-replica.js đạt;56 tài liệu Markdown không có relative link hỏng.
- Chưa test upload/download/delete live Cloudinary hoặc inference thật.
- Docker Engine chưa chạy trên máy: chỉ kiểm tra cấu trúc Compose, chưa claim container bootstrap thành công.
- Adapter sử dụng signed authenticated original URL; phải smoke test quyền truy cập Free thực tế trước nghiệm thu.
- Bốn file conflict đã ghép nội dung và đánh dấu resolved; merge vẫn đang dở cho đến khi người dùng review/stage đầy đủ và commit. Không commit/push tự động.

## Cải tiến bị hoãn
[POST_COMPLETION_IMPROVEMENTS](../project/POST_COMPLETION_IMPROVEMENTS.md) chỉ là ghi nhớ.
Chỉ triển khai sau nghiệm thu tất cả đề tài gốc và chủ dự án cho phép. Không mở thêm collection/API/UI ở task này.

## Nguồn kỹ thuật
- [Authenticated media](https://cloudinary.com/documentation/control_access_to_media)
- [Upload API, overwrite=false](https://cloudinary.com/documentation/image_upload_api_reference)
- [Signed delivery URL](https://cloudinary.com/documentation/delivery_url_signatures)
- [MongoDB transaction requirements](https://www.mongodb.com/docs/v8.0/core/transactions-production-consideration/)
