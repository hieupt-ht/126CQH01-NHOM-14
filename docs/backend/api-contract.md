> **Chốt01/11:** Cloudinary authenticated là storage MVP, không bắt buộc credential khi generation tắt và chưa cấu hình cloud. [Quyết định hiện hành](../technical-baseline/09-CLOUDINARY-DECISION.md) thay các lựa chọn provider cũ bên dưới.

> **Implementation30/10:** Endpoint/DTO/cookie/schema thực thi mới được ghi tại [08-IMPLEMENTATION-STATUS](../technical-baseline/08-IMPLEMENTATION-STATUS.md). Đọc08 trước các proposal/lịch sử bên dưới.

> **Cập nhật 30/10/2026:** Đọc [baseline kỹ thuật mới](../technical-baseline/README.md) trước. Các lựa chọn Gemini/local làm storage cuối trong nội dung bên dưới là lịch sử và đã được thay bởi hướng FLUX/cloud. API/schema tương thích vẫn được giữ; Azure Blob private đã chốt, có adapter/migration để đổi Cloudinary theo baseline07. Không dùng đề xuất cũ để tự bật dịch vụ hoặc sửa code.

# REST API Contract — bản thiết kế đề xuất

**Trạng thái:** thiết kế tài liệu, chưa triển khai nghiệp vụ. API prefix `/api/v1`, opaque server-side session, Gemini provider qua official `@google/genai`, model environment-configured và Cloudinary authenticated image storage là **CONFIRMED** theo quyết định chủ dự án. PRD và contract cũ có endpoint `/api/...` và FLUX/Cloudflare; API coordination contract được đồng bộ sang `/api/v1`, còn PRD giữ nguyên làm nguồn nghiệp vụ lịch sử. Không gọi provider hay kết nối dịch vụ trong task này.

## 1. Quy ước chung

- Base URL: `/api/v1`. Mọi endpoint trong bảng là relative path dưới prefix này. JSON UTF-8; thời gian ISO-8601 UTC. Không nhận `userId`, provider, model, quota hoặc secret từ client.
- Auth: opaque server-side session qua HttpOnly cookie; không dùng JWT. `Secure` bật trên HTTPS, `SameSite=Lax` là baseline đề xuất. Mọi route cá nhân cần session hợp lệ trừ register/login. CORS allowlist credentials và CSRF protection cần tuân theo deployment origin; cấu hình chi tiết còn OPEN QUESTION.
- Session-authenticated unsafe methods yêu cầu origin validation và synchronizer CSRF token qua `X-CSRF-Token` (lấy token từ session-bound API bootstrap). Cả register/login cũng giới hạn Origin và rate limit. **PROPOSAL:** expose `GET /auth/csrf` cùng API để cấp token; chốt triển khai gắn với origin topology và frontend contract.
- Phân trang cursor ổn định theo `(createdAt, _id)`; `limit` mặc định 20, tối đa 50. Không nhận Mongo filter/sort tùy ý. Search/date filters/favorite chỉ P1.
- Thành công generation là async: `POST` trả `202 Accepted`, không phải xác nhận ảnh đã tạo. Chỉ `succeeded` sau khi file và metadata lưu được.
- Tất cả resource read/update/delete/download kiểm tra ownership server-side. Missing và not-owned có cùng `404` response để tránh enumeration.

### Response envelopes

```json
{ "success": true, "data": {} }
```

```json
{ "success": false, "error": { "code": "INVALID_PROMPT", "message": "Mô tả chưa hợp lệ.", "fields": { "prompt": "Bắt buộc." } } }
```

Không trả stack trace, hash mật khẩu, provider secret, storage credential, nội dung file Base64 hoặc internal URL. Các mã lỗi giữ ổn định; message là tiếng Việt thân thiện.

## 2. P0 endpoints

### Auth

| Method / endpoint | Auth | Request | Thành công | Lỗi chính | Consumer |
|---|---|---|---|---|---|
| `POST /auth/register` | Public + Origin check + rate limit | `{ "displayName": "Linh", "email": "linh@example.test", "password": "..." }` | `201` `{ user: { id, displayName, email, createdAt } }`; không tự đăng nhập | `400 VALIDATION_ERROR`, `409 EMAIL_IN_USE`, `429 RATE_LIMITED` | RegisterPage |
| `POST /auth/login` | Public + Origin check + rate limit | `{ "email": "linh@example.test", "password": "..." }` | `200` `{ user: { id, displayName, email } }` + session cookie | `400 VALIDATION_ERROR`, `401 INVALID_CREDENTIALS`, `429 RATE_LIMITED` | LoginPage |
| `POST /auth/logout` | Session | Không body | `204`; revoke session và expire cookie | `401 UNAUTHENTICATED` | App shell / logout |
| `GET /auth/me` | Session | — | `200` `{ user: { id, displayName, email, createdAt } }` | `401 UNAUTHENTICATED` | Layout, Settings |

`passwordHash` is never returned/logged; hash with a reputable password-hashing library. Registration does not implicitly sign in. The specific hashing package and cookie lifetime are OPEN QUESTION until dependency and deployment review.

Register/login validation phải cùng chuẩn email/password đã chốt; password hash ở server. Không có change-password hoặc email-verification endpoint trong scope đã xác nhận.

### Generation và usage

| Method / endpoint | Auth | Request | Response | Lỗi chính | Consumer |
|---|---|---|---|---|---|
| `POST /generations` | Session + quota/rate limit | Header `Idempotency-Key`; body `{ "prompt": "Một thành phố xanh lúc bình minh" }` | `202` `{ generation: { id, status: "queued", createdAt }, usage: { remaining, resetsAt } }` | `400 INVALID_PROMPT`, `401`, `409 IDEMPOTENCY_KEY_REUSED`/`GENERATION_IN_PROGRESS`, `429 DAILY_LIMIT_REACHED`/`PROVIDER_QUOTA_EXCEEDED` | CreateImagePage |
| `GET /generations/:id` | Session + owner | — | `200` `{ generation: { id, prompt, status, createdAt, startedAt, completedAt, error: safeError|null, image: savedImageSummary|null } }` | `401`, `404`, `409 RESULT_UNCERTAIN` nếu cần biểu đạt qua status thì ưu tiên `200` với `needs_review` | Create status/result, History detail |
| `GET /generations` | Session | `?cursor=&limit=`; filter status/date chỉ sau khi được chốt | `200` `{ items: [...], nextCursor }`; mọi status gồm queued/processing/saving/succeeded/failed/needs_review | `400 INVALID_CURSOR`, `401` | HistoryPage |
| `GET /usage/me` | Session | — | `200` `{ used, remaining, limit, resetsAt, activeGenerationId }` với nguồn chính sách server | `401` | Create panel, Settings, Dashboard |

Generation chỉ nhận prompt. Client không gửi `userId`, provider/model/steps/count/dimensions. `Idempotency-Key` cùng user/key/body trả cùng generation; cùng key nhưng payload khác là `409`. Timeout/mất kết nối phía client phải tra cứu trạng thái/idempotency hiện có, không tạo generation thứ hai tự động. Polling kết thúc ở terminal state và dừng khi không còn màn hình cần theo dõi.

Acceptance must atomically coordinate idempotency resolution, daily quota reservation and one-active-generation-per-user before accepting a new job. Same key/same fingerprint returns the existing job without a second quota reservation; same key/different fingerprint is `409`. Do not call Gemini if auth, quota or active-job checks fail. Provider timeout/uncertain outcome becomes `needs_review`; no blind retry. Reset date uses UTC per PRD; actual per-user/app quota values remain OPEN QUESTION/configuration. A successful state requires both durable file and image metadata.

### Library, detail, management và download

| Method / endpoint | Auth | Request | Response | Lỗi chính | Consumer |
|---|---|---|---|---|---|
| `GET /images` | Session + owner scope | `?cursor=&limit=` | `200` `{ items: [{ id, title, thumbnailUrl, createdAt, width, height, format }], nextCursor }`; chỉ ảnh đã lưu, chưa xóa | `400 INVALID_CURSOR`, `401` | LibraryPage |
| `GET /images/:id` | Session + owner | — | `200` `{ image: { id, title, prompt, createdAt, storage metadata, generation: { id, model, status } } }` | `401`, `404` | ImageDetailPage |
| `GET /images/:id/content` | Session + owner | — | `200` private inline image stream; validated MIME and `nosniff` | `401`, `404`, `409 FILE_NOT_READY`, `503 STORAGE_UNAVAILABLE` | Library/detail image rendering |
| `PATCH /images/:id` | Session + owner | `{ "title": "Tên mới" }` | `200` `{ image: ... }` | `400 VALIDATION_ERROR`, `401`, `404` | Detail / Library rename |
| `DELETE /images/:id` | Session + owner | — | `202` `{ deletion: { status: "pending" } }`; ảnh bị ẩn khỏi library ngay, xóa vật lý có thể còn pending | `401`, `404` | Detail / Library delete |
| `GET /images/:id/download` | Session + owner | — | `200` file stream với MIME, `Content-Disposition: attachment`, `Content-Length` chính xác | `401`, `404`, `409 FILE_NOT_READY`, `503 STORAGE_UNAVAILABLE` | Detail / Library |

`PATCH isFavorite` bị hoãn P1, dù dùng chung resource endpoint. Private image bytes and downloads are streamed from API only after ownership check; no public static directory, public URL, signed URL, storage credential, or client-selected path. `GET /images/:id/content` formalizes private inline delivery required by Library and Detail. A hard delete only follows successful or reconciled file cleanup; history remains.

### Gemini provider and Cloudinary storage boundary

- Server only uses official Google Gen AI JavaScript SDK (`@google/genai`); provider key remains server environment (`GEMINI_API_KEY`) and model is selected by `GEMINI_IMAGE_MODEL`. One prompt produces one image. No frontend provider call and no user-provided model/settings.
- Google documentation currently demonstrates JavaScript image output using `@google/genai`; its model reference marks `gemini-3-pro-image` as supporting image generation. This verifies that a Gemini image-generation model exists, not that this project has access or that this exact model is selected. Keep `GEMINI_IMAGE_MODEL` unset/explicitly configured until access and terms are confirmed. No free tier, price, quota, output format or dimensions are assumed. Billing must not be enabled by this contract, and implementation must not issue a paid API call without separate authorization. Sources: [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation), [Gemini 3 Pro image model capability](https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image).
- Save provider output to server temp storage, validate decoded bytes against configured size limit, allowed image MIME signatures, and readable dimensions; then move to opaque random filename under `IMAGE_STORAGE_DIR` (`backend/data/images` local default). DB stores a relative key only. Exact maximum bytes/dimensions remain OPEN QUESTION.
- Cloudinary credentials remain server-only. Upload to authenticated delivery with opaque public IDs and dynamic `asset_folder`; store Cloudinary identifiers in image metadata. The configured Cloudinary account must use dynamic folders before upload. Authenticated content/download delivery remains owner-scoped behind the application API.
- Provider failure cleans temporary files. Uncertain provider result is `needs_review`, never automatic re-generation. Metadata failure after file write is recoverable/reconciled without a second provider inference. Image deletion is soft-delete first, then retryable physical cleanup tracked in `storageDeletionStatus`.

## 3. P1 endpoints sau khi P0 ổn định

| Method / endpoint | Request/response đề xuất | Consumer |
|---|---|---|
| `PATCH /users/me` | Request `{ "displayName": "Tên mới" }`; response `200 { user: ... }`; whitelist field, không cho sửa email/password qua endpoint này | AccountSettingsPage |
| `PATCH /images/:id` favorite | `{ "isFavorite": true }` hoặc gộp với title theo whitelist; response ảnh đã cập nhật | Library / Detail |
| `GET /images` query | `search`, `favorite`, `from`, `to`, cursor; giới hạn độ dài, escape literal search và whitelist date | Library |
| `GET /stats/me` | `200 { totals: { savedImages, acceptedToday }, jobsByDay: [...], jobsByStatus: [...], averageDurationMs }`; aggregation scope theo user | DashboardPage |

P1 không được chặn P0; dashboard/settings preview hiện tại không phải dữ liệu thật. Không thiết kế endpoint riêng cho `user_settings` đến khi có preference đã duyệt.

## 4. HTTP status và error mapping

| Status | Dùng cho |
|---:|---|
| `200` | Read/update thành công; generation state read |
| `201` | Tài khoản được tạo |
| `202` | Generation được nhận hoặc xóa file đang chờ xử lý |
| `204` | Logout thành công |
| `400` | Body/query/cursor không hợp lệ |
| `401` | Chưa xác thực hoặc credential không đúng (không phân biệt email có tồn tại) |
| `404` | Không tồn tại hoặc không thuộc user hiện tại |
| `409` | Idempotency key cùng payload khác, active generation conflict, trạng thái không cho phép thao tác |
| `413` | Request vượt giới hạn body nếu áp dụng |
| `429` | User/app quota hoặc rate limit; `Retry-After` khi biết thời điểm thử lại |
| `500` | Lỗi không dự kiến qua error handler tập trung, thông điệp an toàn |
| `503` | Storage/provider tạm không sẵn sàng nếu request đồng bộ bị ảnh hưởng; job async vẫn phản ánh status đã persist |

Các error code theo contract hiện có cần giữ nhất quán: `INVALID_PROMPT`, `UNAUTHENTICATED`, `NOT_FOUND`, `DAILY_LIMIT_REACHED`, `GENERATION_IN_PROGRESS`, `PROVIDER_QUOTA_EXCEEDED`, `GENERATION_FAILED`, `RESULT_UNCERTAIN`, `STORAGE_FAILED`. Chỉ thêm mã khi có consumer và ngữ nghĩa rõ.

## 5. Còn cần chốt trước implementation

- **CONFIRMED:** `/api/v1`; opaque server-side HttpOnly session, no JWT; Google AI Studio/Gemini through official Node SDK; model via environment; Cloudinary authenticated storage; private API delivery; five collections; one prompt → one image and all PRD lifecycle/idempotency/quota/ownership/history invariants.
- **PROPOSAL:** `SameSite=Lax`, Secure under HTTPS, exact-origin CORS, origin checks plus synchronizer CSRF token; `GET /auth/csrf`; `IMAGE_STORAGE_DIR` local default; `GET /images/:id/content`; default cursor limit 20/max 50.
- **OPEN QUESTION:** concrete session lifetime, password hash library, exact cookie/CORS/CSRF bootstrap details by deployment topology; exact Gemini model ID/access/availability and verified response MIME/dimensions; quota values, prompt/title constraints, file size/dimension ceiling; persistent production storage/backup and retention/purge policy. Do not add guessed values or enable billing while unanswered.
