> **Cập nhật01/11/2026:** [09-CLOUDINARY-DECISION](09-CLOUDINARY-DECISION.md) thay quyết định Azure-first bằng Cloudinary authenticated. Các mô tả Azure/chưa có Cloudinary dưới đây là lịch sử hoặc thiết kế mở rộng nếu mâu thuẫn09. Xem [LOCAL_RUN](../development/LOCAL_RUN.md) để chạy hiện tại.

# 08 — Contract triển khai và trạng thái kiểm chứng
Ngày30/10/2026. Task hiện tại đã được user yêu cầu thực thi theo thứ tự review. Không phải đã nghiệm thu live.

## Điều chỉnh phạm vi UI — 31/10/2026 (CONFIRMED)
Chủ dự án yêu cầu tạm mở chặn đăng nhập để xem UI trước khi có DB/cloud.
Development mặc định UI preview, không gọi API: login chỉ điều hướng sau validation,
không xác minh tài khoản; profile khách, danh sách rỗng và nhãn xem thử rõ ràng.
Đăng ký/lưu/tạo ảnh không ghi dữ liệu. Backend xác thực không thay đổi.
Đặt frontend/.env.local VITE_UI_PREVIEW=false rồi restart để bật API/session thật.
Production build luôn bắt buộc xác thực thật. Hướng dẫn tại LOCAL_RUN.md.
Đoạn thông báo dài trong layout đã bỏ theo yêu cầu; giữ badge XEM THỬ UI.
Create preview validate prompt rồi chỉ hiện thông báo tại kết quả, không tạo key/pending/API.
Dọn riêng pending ui-preview cũ; không khôi phục pending preview hoặc chặn form vì sessionStorage bị tắt.
Mã job sai định dạng hoặc GET404 hiển thị not_found và link về /app/create.
Lỗi mạng/5xx giữ jobID và chỉ cho đọc lại trạng thái, không tự khởi tạo job khác.
preview/not_found/status_error là trạng thái hiển thị frontend, không thêm trạng thái DB.

## Quyết định được cụ thể hóa trong task
- Auth: Argon2id (memory19456KiB,time2,parallelism1); Zod boundary validation.
- Local session7ngày, HttpOnly, SameSite=Lax; Secure khi HTTPS/production.
- Origin đúng localhost5173 cho unsafe methods. Register/login dùng origin+rate limit10attempts/IP/15phút, process-local cho demo; reset khi server restart.
- Login rotate session bearer; DB chỉ tokenHash và csrfTokenHash. CSRF token ổn định theo session để nhiều tab không vô hiệu nhau.
- GET /api/v1/auth/csrf yêu cầu session, trả csrfToken; POST logout/mutation yêu cầu X-CSRF-Token.
- Token CSRF không là cookie đăng nhập, không log hoặc export. Session cũ thiếu csrfTokenHash phải bootstrap lại.
- Các storage schema fields mới: accountAlias/container/storageRevision/integrity.sha256/storageCleanupAttempts/storageCleanupNextAt; generation thêm savingAttempts.
- Azure Blob private; proxy content/download qua backend; registry chọn adapter theo từng descriptor, không theo default write provider.
- Adapter MVP dùng put(key,Buffer,mime),openRead,delete; put deterministic+conditional-create và xác minh bytes để tránh overwrite mù. head/file-path API trong07 là thiết kế mở rộng chưa triển khai.
- Cookie expiry/CSRF checks, ownership, cursor pagination20/max50, format allowlist PNG/JPEG/WebP,10MiB và4096px.
- Input prompt dùng JS UTF-16 length tối đa2048 ở FE/BE, giữ nguyên nội dung; nếu provider có khác biệt Unicode thì đánh giá trong smoke test.
- DisplayName1–80,title1–120,password8–128, chuẩn hóa email lowercase/trim; password không trim.
- Quota mặc định5/user,20/app/ngàyUTC, cooldown15giây, concurrency1 cho local worker.
- Retry saving tối đa3 lần với checkpoint; hết số lần hoặc kết quả không rõ vào needs_review. Không retry inference. Cleanup cloud có backoff, tối đa5 lần lỗi; sau đó giữ failed để operator đối soát.
- Runtime Node24.x, npm11.x; resolved dependencies xem lockfile; chưa thêm React Router, giữ pathname routing và404/guard.
- Mongoose models có type rõ; chưa tự chạy migration trên DB người dùng.

## Endpoint có code
GET /api/health.
POST /api/v1/auth/register,login,logout; GET /api/v1/auth/me,csrf.
POST /api/v1/generations; GET /api/v1/generations và/:id.
GET /api/v1/images và/:id; PATCH/DELETE /api/v1/images/:id.
GET /api/v1/images/:id/content và/download.
GET /api/v1/usage/me; PATCH /api/v1/users/me; GET /api/v1/stats/me.
Các private APIs require session; mutation require Origin+CSRF.

DTO:
- register201 {success:true,data:{user}}; không tự login.
- login200 {success:true,data:{user,csrfToken}} + HttpOnly cookie.
- logout204.
- POST generation202 {success:true,data:{id,prompt,status,model,createdAt,startedAt,completedAt,durationMs,imageId,error,imageDeleted?}}; Idempotency-Key16–100 chars alnum/_/-.
- job detail dùng cùng job DTO; không lộ lease/checkpoint/storage secrets.
- list {success:true,data:{items,nextCursor}}; cursor base64url createdAt/_id, validate trước query.
- image DTO {id,generationId,title,createdAt,width,height,format,bytes,isFavorite,contentUrl,downloadUrl}; detail thêm prompt/model.
- image content/download stream sau ownership; Cache-Control private,no-store; download attachment tên an toàn.
- rename200,image DTO; delete204 soft-delete, cloud cleanup được theo dõi.
- usage {grantedToday,acceptedToday,remainingToday,resetAt,configured}; remaining min(user,app), không là neurons.
- profile update200 {user}; stats {jobsByDay,jobsByStatus,averageDurationMs,totals:{savedImages,bytes}}.
- errors {success:false,error:{code,message}}. Không tự retry generation từ network error.

## Frontend đã nối (khi VITE_UI_PREVIEW=false hoặc production build)
Login/Register gọi API, SessionGate bảo vệ / và/app/*, menu logout/profile thật.
Create gửi idempotency key, snapshot prompt, poll theo jobID trong URL, dừng terminal/unmount, status-read retry tách create.
Pending request chưa xác định giữ key+prompt trong sessionStorage theo user và tab để explicit retry sau reload; không lưu auth token/password.
History giữ bảng desktop/card mobile và drawer chi tiết; job có imageDeleted phân biệt ảnh đã xóa.
Library/detail/history/settings dùng API, không dùng fixture làm bản ghi tài khoản; pagination cursor, download qua API, rename/delete persist.
Dashboard thống kê và ảnh gần đây thật; gallery cảm hứng vẫn demo có nhãn, yêu thích của gallery chỉ là cục bộ.
Model không gọi khi gõ prompt/mở thư viện/download.

## Bằng chứng đã chạy
- Frontend/backend build.
-31/10 sửa UI preview/job lookup: frontend build đạt;10 kiểm tra handler bằng source thực với API/storage thay thế đạt (preview không gửi/lưu, validation, giữ key khi5xx, clear khi chưa cấu hình, mã sai/404, lỗi mạng và dọn riêng pending preview). Đây là kiểm tra logic cô lập, không phải browser E2E.
- Foundation/provider boundary tests: validation,headers,schema,error/timeout/quota/no automatic inference retry.
- Integration với MongoDB replica set thật tạm: auth,hash,cookie,CSRF,expiry,revoke; duplicate request,quota/active races; private ownership; stream download; rename/delete/history; saving retry không gọi AI lại; uncertain outcome.
- Local durable replica set27027 giữ bản ghi test sau stop/start, đã xóa đúng marker test.
- Course report10.000 metadata: trước index quét10000documents, sau index quét20documents/20keys cho20kết quả. Đây là một lần đo môi trường local, không cam kết latency production.
- Collection $jsonSchema demo từ raw insert từ chối sai type; không khẳng định tất cả collection sản phẩm đã cài validator.
- Không truy cập Azure account/Cloudflare thật; không bật billing, không tạo ảnh live.

## Còn lại trước bảo vệ
1. Tự cấu hình Cloudflare token/Azure identity và container private, một smoke live có đo usage.
2. Browser visual/responsive/keyboard/E2E thật; CUA browser bị tắt trong Work settings ở phiên kiểm tra.
3. Seed/aggregation/$lookup/JSON import-export vận hành toàn bộ dữ liệu: course report hiện là minh chứng riêng, chưa có nút UI/import migration cloud.
4. Không triển khai Cloudinary/migration runner;07 quy định hướng đổi cloud.
5. Orphan/temp retention và công cụ operator xử lý needs_review cần task đối soát tiếp, không tự xóa các checkpoint cần phục hồi.
6. Chỉ phù hợp demo single-process/local worker; chưa tuyên bố hỗ trợ replicas/multi-instance hoặc production SLA.
7. JSON export không thay backup file cloud, không chuyển metadata reference thành bản sao file.
Xem [hướng dẫn local](../development/LOCAL_RUN.md) để chạy từ máy mới.

