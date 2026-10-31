# 04 — API và hợp đồng frontend

Cập nhật31/10/2026. Tóm tắt code hiện có; [08](08-IMPLEMENTATION-STATUS.md)
là nguồn chính cho DTO, policy và bằng chứng kiểm thử. Chạy máy nhóm theo [LOCAL_RUN](../development/LOCAL_RUN.md).

## Quy ước
CONFIRMED prefix /api/v1; response success/data hoặc success:false/error:{code,message}.
ID public là string; time ISO UTC. Async 202 không có nghĩa succeeded.
Auth: session cookie HttpOnly; user từ backend, không localStorage JWT.
Mọi image/job cá nhân scope theo user. Missing/not-owned cùng 404.

| Method | Path dưới /api/v1 | Mức |
|---|---|---|
| POST | /auth/register, /auth/login, /auth/logout | P0 |
| GET | /auth/me, /auth/csrf | P0 |
| POST | /generations | P0, Idempotency-Key |
| GET | /generations/:id, /generations | P0 |
| GET | /images, /images/:id | P0 |
| PATCH | /images/:id — title | P0 |
| DELETE | /images/:id | P0 |
| GET | /images/:id/content, /images/:id/download | P0 |
| GET | /usage/me | P0 |
| PATCH | /users/me — displayName | P1 |
| GET | /stats/me | P1 |

ST-07 đã chốt private. GET /images/:id/content đã có code stream sau session/ownership.
GET /auth/csrf yêu cầu session, token ổn định theo session; login trả token cùng HttpOnly cookie.
Không thêm import/export endpoint trong MVP chưa được giao.

## Payload và DTO tối thiểu
POST /generations chỉ { prompt: string }, reject unknown userId/model/count/steps.
202 data dùng job DTO; yêu cầu mới có status queued, replay trả trạng thái hiện tại cùng id, không reserve mới.
Job data gồm id,prompt,status,model,createdAt,startedAt,completedAt,durationMs,imageId,error; error chỉ code/message an toàn.
List data { items:[], nextCursor:null }; cursor opaque, limit default20/max50, stable createdAt+_id.
Image data gồm id,title,generationId,createdAt,width,height,format,bytes,isFavorite,contentUrl,downloadUrl; detail thêm prompt/model.
Hai URL là relative API paths theo imageId; không trả cloud key/SAS/credential. Đổi cloud không đổi API path/ID.
DTO đầy đủ và khác biệt giữa create/detail/list ở08; không trả nguyên Mongoose document.
List history gồm cả ảnh deleted; library loại deleted.

## Lỗi
400 VALIDATION_ERROR / INVALID_CURSOR; 401 UNAUTHENTICATED / INVALID_CREDENTIALS.
404 NOT_FOUND; 409 IDEMPOTENCY_CONFLICT / GENERATION_IN_PROGRESS.
429 DAILY_LIMIT_REACHED / RATE_LIMITED; lỗi provider mapped an toàn, không raw response.
RESULT_UNCERTAIN là trạng thái terminal needs_review khi đã nhận job.
Không dùng cùng một mã cho network polling fail và generation failed.

## Auth đã có code (chế độ API thật)
Cookie cùng site qua Vite /api proxy; frontend credentials:include.
Session 7 ngày, SameSite=Lax, Secure khi HTTPS; local HTTP development Secure=false.
Opaque token random, DB chỉ tokenHash; expiry kiểm tra mỗi request dù TTL chưa dọn.
Synchronizer CSRF token + Origin allowlist cho unsafe request; login/register có origin/rate-limit.
Password policy8–128 ký tự, không trim mật khẩu; displayName1–80, title1–120.
Argon2id memory19456KiB,time2,parallelism1; unit/integration đã chạy, không coi đó là nghiệm thu browser/cloud live.

## Frontend integration
Route /login, /register; / và/app dashboard; /app/create/library/images/:id/history/settings.
Đường dẫn không tồn tại hoặc malformed có trang404. SessionGate bảo vệ / và/app/* ở API thật.
Development mặc định UI preview: không gọi backend, login mô phỏng; VITE_UI_PREVIEW=false rồi restart để dùng API thật.
Production build luôn tắt preview. Không bỏ xác thực backend theo chế độ frontend.
Services API tập trung; state thật thay fixture/timer, không để demo tự thành succeeded.
Poll job active mỗi3giây; dừng terminal/unmount/lỗi mạng. Lỗi mạng giữ jobID và cho tải lại trạng thái thủ công.
Mã job sai định dạng hoặc GET404 có trạng thái not_found và link về trang tạo ảnh; không tự POST.
Trong UI preview, Tạo ảnh chỉ validate và hiện thông báo ở kết quả, không key/pending/API; dọn riêng pending ui-preview cũ.
preview/not_found/status_error chỉ là trạng thái frontend, không thay sáu trạng thái job trong DB.
Prompt tối đa2048 theo endpoint, backend validate lại; thống nhất cách đếm Unicode qua contract test.
Không tự rewrite/translate/cắt prompt.
Rename/delete/library/detail phải đọc lại dữ liệu server, không là các bản state độc lập.
Download qua backend ownership check; không fetch URL tùy ý từ request.
Mọi loading/empty/error/quota/session-expired và 6 trạng thái job có nội dung rõ.
Design giữ writing-block.md và token, không sửa palette trong task tích hợp.

