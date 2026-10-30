# Thiết kế MongoDB đề xuất

**Trạng thái:** thiết kế tài liệu, chưa tạo database/schema/model/index. Không có dữ liệu thật hoặc migration trong task này.

## 1. Nguyên tắc thiết kế

- MongoDB lưu tài khoản, generation job, metadata ảnh, phiên và bộ đếm quota. File nhị phân nằm trong storage; document chỉ giữ storage key và metadata cần truy vấn.
- Phân quyền bằng `userId` lấy từ phiên backend. Mọi truy vấn ảnh/job người dùng đều scope theo `userId`; ObjectId không thay thế authorization.
- `generations` là lịch sử của mọi lần yêu cầu; `images` chỉ có bản ghi kết quả đã lưu thành công và chưa bị ẩn. Generation thành công có thể còn trong history sau khi ảnh bị xóa.
- Đề xuất 5 collections: `users`, `sessions`, `generations`, `images`, `dailyUsage`. Không tạo `user_settings` riêng ở MVP: dữ liệu P1 đã biết chỉ là display name, có thể để trong `users`; chưa có preference settings đã xác nhận.
- **CONFIRMED:** dùng opaque server-side session qua HttpOnly cookie; không dùng JWT. Collection `sessions` lưu hash token, không lưu token cookie thô. Chi tiết `SameSite`, origins/CORS, CSRF và thời hạn session phụ thuộc topology deploy và vẫn là OPEN QUESTION.
- **CONFIRMED:** image file lưu local filesystem trong giai đoạn demo/local-first; ảnh riêng tư chỉ được phục vụ qua endpoint có authentication và ownership check. Không expose thư mục lưu file như static/public directory.
- **CONFIRMED:** provider là Google AI Studio / Gemini API qua official Node.js SDK `@google/genai`; model lấy từ `GEMINI_IMAGE_MODEL`. Không gọi API trực tiếp từ frontend. Tên model triển khai cụ thể và khả năng/tier/quota của project phải được xác minh trước khi bật.

## 2. Collections

### 2.1 `users`

**Mục đích:** tài khoản, trạng thái tài khoản và thông tin quota/active job cần atomic update.

| Field | Type | Required | Default/constraint |
|---|---|---:|---|
| `_id` | ObjectId | Có | MongoDB generated |
| `displayName` | string | Có | Trim; 1–80 ký tự (giới hạn đề xuất) |
| `email` | string | Có | Trim + lowercase; unique |
| `passwordHash` | string | Có | Hash do thư viện uy tín tạo; không trả/log |
| `status` | string enum | Có | `active` mặc định; `disabled` |
| `activeGenerationId` | ObjectId \| null | Có | `null`; tối đa một job hoạt động/user theo PRD |
| `lastGenerationAt` | Date \| null | Có | `null`; phục vụ khoảng cách nhận job |
| `createdAt`, `updatedAt` | Date | Có | Tự quản lý timestamps |

**Index:** unique `{ email: 1 }`; index `{ status: 1 }` chỉ khi vận hành cần lọc tài khoản. Không lưu quota cá nhân cố định trong document nếu policy cần thay đổi theo cấu hình.

**Validation:** email canonicalized trước khi insert; unique index là bảo vệ cuối cùng trước race; mật khẩu plaintext không được persist; displayName được whitelist update; `activeGenerationId` tham chiếu generation của cùng user.

**Document mẫu (giá trị minh họa):**

```json
{
  "_id": "671000000000000000000001",
  "displayName": "Linh Nguyễn",
  "email": "linh@example.test",
  "passwordHash": "<password-hash-redacted>",
  "status": "active",
  "activeGenerationId": null,
  "lastGenerationAt": null,
  "createdAt": "2026-10-29T03:00:00.000Z",
  "updatedAt": "2026-10-29T03:00:00.000Z"
}
```

### 2.2 `sessions`

**Mục đích:** phiên đăng nhập server-side nếu nhóm chốt session-cookie. Không phải thiết kế JWT đã được xác nhận.

| Field | Type | Required | Default/constraint |
|---|---|---:|---|
| `_id` | ObjectId | Có | MongoDB generated |
| `userId` | ObjectId | Có | Ref `users._id` |
| `tokenHash` | string | Có | Hash opaque token; raw token chỉ nằm trong cookie client |
| `createdAt` | Date | Có | Thời điểm tạo |
| `expiresAt` | Date | Có | TTL expiration |
| `lastSeenAt` | Date | Có | Cập nhật có throttle |

**Indexes:** unique `{ tokenHash: 1 }`; `{ userId: 1, expiresAt: 1 }`; TTL `{ expiresAt: 1 }` với `expireAfterSeconds: 0`. TTL cleanup không thay thế kiểm tra `expiresAt` trên mỗi request.

**Validation/bảo mật:** random token cryptographically secure đủ entropy; chỉ lưu hash; cookie `HttpOnly`, `Secure` ở production HTTPS, `SameSite=Lax` là baseline đề xuất; rotate khi login; logout revoke session. Dùng origin allowlist, CORS credentials chỉ cho origin đã cấu hình và synchronizer CSRF token (`X-CSRF-Token`) cho unsafe methods; endpoint/kiểu cấp token và policy chính xác cần chốt cùng deployment origins.

**Document mẫu:**

```json
{
  "_id": "671000000000000000000002",
  "userId": "671000000000000000000001",
  "tokenHash": "<sha256-or-keyed-hash-of-random-token>",
  "createdAt": "2026-10-29T03:10:00.000Z",
  "expiresAt": "2026-11-05T03:10:00.000Z",
  "lastSeenAt": "2026-10-29T03:10:00.000Z"
}
```

### 2.3 `generations`

**Mục đích:** source of truth cho request/job, lifecycle, idempotency, quota reservation, lease/checkpoint và lịch sử kể cả failed/needs_review.

| Field | Type | Required | Default/enum |
|---|---|---:|---|
| `_id` | ObjectId | Có | ID job trả cho client |
| `userId` | ObjectId | Có | Ref user; immutable |
| `requestKey` | string | Có | `Idempotency-Key`; scoped unique theo user |
| `requestFingerprint` | string | Có | Hash canonical validated input; phát hiện dùng lại key với body khác |
| `originalPrompt` | string | Có | Prompt người dùng sau trim biên; giữ nội dung/dấu/ý phủ định |
| `submittedPrompt` | string | Có | Prompt thực sự gửi provider; bằng original nếu không có xử lý được duyệt |
| `provider`, `model` | string | Có | Snapshot server-side đã dùng; không lấy từ client |
| `settings` | object | Có | Tham số đã kiểm chứng, ví dụ `steps`; snapshot không nhận tùy ý từ body |
| `status` | string enum | Có | `queued` mặc định; `processing`, `saving`, `succeeded`, `failed`, `needs_review` |
| `imageId` | ObjectId \| null | Có | `null` đến khi metadata ảnh được persist |
| `lease` | object \| null | Có | `owner`, `expiresAt`, `heartbeatAt`, nếu worker claim job |
| `checkpoint` | object \| null | Có | Bước lưu/provider đã xác nhận và tham chiếu file tạm an toàn; không chứa Base64 lớn |
| `error` | object \| null | Có | `{ code, safeMessage, stage, occurredAt }`; không lưu/return stack hoặc secret |
| `quotaReservation` | object | Có | `{ dateKey, userReserved, appReserved, releasedAt }` để đối soát atomic reservation |
| `createdAt` | Date | Có | Thời điểm nhận job |
| `startedAt`, `completedAt` | Date \| null | Có | Thời điểm worker bắt đầu/kết thúc |
| `durationMs` | number \| null | Có | Thời gian được đo server-side |

**Indexes:** unique `{ userId: 1, requestKey: 1 }`; history `{ userId: 1, createdAt: -1, _id: -1 }`; worker scan `{ status: 1, createdAt: 1 }`; lease recovery có thể cần `{ status: 1, "lease.expiresAt": 1 }` sau khi kiểm chứng truy vấn.

**Validation/invariants:** chỉ backend thay đổi state theo transition cho phép; prompt có nội dung và nằm trong giới hạn provider đã xác minh; một ảnh/job; request trùng cùng fingerprint trả cùng job, cùng key khác fingerprint trả conflict; timeout provider không tự tạo job mới; `succeeded` chỉ khi file và image metadata đã lưu; lease/checkpoint có TTL/quy tắc khôi phục rõ.

**Document mẫu:**

```json
{
  "_id": "671000000000000000000010",
  "userId": "671000000000000000000001",
  "requestKey": "d22f8c2b-2d7c-4ddd-b934-4e3942180310",
  "requestFingerprint": "<sha256>",
  "originalPrompt": "Một thành phố xanh lúc bình minh",
  "submittedPrompt": "Một thành phố xanh lúc bình minh",
  "provider": "<server-configured-provider>",
  "model": "<server-configured-model>",
  "settings": { "steps": 4 },
  "status": "succeeded",
  "imageId": "671000000000000000000020",
  "lease": null,
  "checkpoint": { "stage": "metadata_saved", "storageKey": "<opaque-key>" },
  "error": null,
  "quotaReservation": { "dateKey": "2026-10-29", "userReserved": true, "appReserved": true, "releasedAt": null },
  "createdAt": "2026-10-29T03:12:00.000Z",
  "startedAt": "2026-10-29T03:12:02.000Z",
  "completedAt": "2026-10-29T03:12:10.000Z",
  "durationMs": 8000
}
```

### 2.4 `images`

**Mục đích:** thư viện chỉ gồm ảnh có file và metadata đã lưu; metadata có thể mở lại mà không gọi AI.

| Field | Type | Required | Default/constraint |
|---|---|---:|---|
| `_id` | ObjectId | Có | Public resource id; không phải quyền truy cập |
| `userId` | ObjectId | Có | Ref user; immutable |
| `generationId` | ObjectId | Có | Ref generation duy nhất tạo ra ảnh |
| `title` | string | Có | Backend tạo mặc định từ prompt hoặc tên generic; giới hạn/rename rule cần chốt |
| `storage` | object | Có | `{ provider, key, version?, deliveryMode }`; không nhận URL client tùy ý |
| `width`, `height` | number | Có | Số nguyên dương từ metadata file/provider thực tế |
| `format` | string enum | Có | Định dạng thực tế như `png`, `jpeg`, `webp` sau allowlist |
| `bytes` | number | Có | Số byte thực tế, dương và có giới hạn |
| `isFavorite` | boolean | Có | `false`; chỉ expose API ở P1 |
| `deletedAt` | Date \| null | Có | `null`; soft-delete để giữ liên kết history |
| `storageDeletionStatus` | string enum | Có | `not_requested`, `pending`, `deleted`, `failed`; track retry dọn file |
| `createdAt`, `updatedAt` | Date | Có | Timestamps |

**Indexes:** unique `{ generationId: 1 }` (đúng invariant một ảnh/job); library `{ userId: 1, deletedAt: 1, createdAt: -1, _id: -1 }`; P1 favorites/filter có thể dùng `{ userId: 1, deletedAt: 1, isFavorite: 1, createdAt: -1 }` nếu `explain` xác nhận lợi ích.

**Validation/invariants:** bản ghi chỉ insert/upsert trong bước `saving`; owner phải khớp generation owner; mọi read/modify/download filter cả `_id` và `userId`; soft-delete loại ảnh khỏi library nhưng không xóa generation; không trả storage credential/private origin ra client. Public URL của storage là OPEN QUESTION về privacy; ưu tiên proxy/authenticated delivery nếu yêu cầu cần riêng tư.

**Document mẫu:**

```json
{
  "_id": "671000000000000000000020",
  "userId": "671000000000000000000001",
  "generationId": "671000000000000000000010",
  "title": "Thành phố lúc bình minh",
  "storage": { "provider": "<configured-storage>", "key": "<opaque-key>", "deliveryMode": "server-proxy" },
  "width": 1024,
  "height": 1024,
  "format": "png",
  "bytes": 842100,
  "isFavorite": false,
  "deletedAt": null,
  "storageDeletionStatus": "not_requested",
  "createdAt": "2026-10-29T03:12:10.000Z",
  "updatedAt": "2026-10-29T03:12:10.000Z"
}
```

### 2.5 `dailyUsage`

**Mục đích:** reservation/counter atomic theo ngày cho hạn mức user và toàn ứng dụng. Giá trị quota là server configuration, chưa phải confirmed limit.

| Field | Type | Required | Default/constraint |
|---|---|---:|---|
| `_id` | ObjectId | Có | MongoDB generated |
| `scopeType` | string enum | Có | `user` hoặc `application` |
| `scopeId` | string | Có | User ObjectId dạng chuỗi hoặc hằng app scope |
| `dateKey` | string | Có | Ngày theo timezone policy đã chốt, format `YYYY-MM-DD` |
| `reservedRequests` | number | Có | `0`; integer không âm; đếm request được nhận theo policy |
| `updatedAt` | Date | Có | Timestamp |

**Index:** unique `{ scopeType: 1, scopeId: 1, dateKey: 1 }`.

**Validation:** reserve bằng conditional atomic update/transaction phù hợp cấu hình MongoDB; không cho vượt quota do đồng thời; cùng Idempotency-Key không tăng bộ đếm lần hai. Một job mới chỉ được nhận khi user chưa có active generation; claim phải phối hợp an toàn với `users.activeGenerationId`. Quota date key theo ngày UTC theo PRD (reset 00:00 UTC / 07:00 giờ Việt Nam); limit per-user/application vẫn là server configuration và giá trị cuối cùng OPEN QUESTION. Nếu chắc chắn chưa gửi request tới provider thì được release lượt đúng một lần; sau khi đã gửi provider, giữ lượt dù job lỗi hoặc kết quả không rõ. Mọi reservation/release idempotent; không tính lại lần gửi provider khi kết quả không rõ.

**Document mẫu:**

```json
{
  "_id": "671000000000000000000030",
  "scopeType": "user",
  "scopeId": "671000000000000000000001",
  "dateKey": "2026-10-29",
  "reservedRequests": 2,
  "updatedAt": "2026-10-29T03:12:00.000Z"
}
```

## 3. Quan hệ và truy vấn thường gặp

```text
users 1 ── N sessions
users 1 ── N generations
users 1 ── N images
generations 1 ── 0..1 images (unique images.generationId)
users 1 ── N dailyUsage (mỗi ngày một document cho scope user)
```

- History: `generations.find({ userId }).sort({ createdAt: -1, _id: -1 })`; gồm cả failed/needs_review và vẫn tồn tại sau khi xóa ảnh.
- Library: `images.find({ userId, deletedAt: null })`; chỉ ảnh đã lưu, stable sort/pagination.
- Detail/download: lookup có đồng thời `_id` và `userId`; không tìm theo id đơn lẻ rồi mới dựa frontend.
- Generation result: generation giữ `imageId`; image giữ `generationId`, do đó có thể xác định ảnh bị xóa mà vẫn hiển thị lịch sử job.
- Dashboard P1: aggregation luôn match `userId` trước group; thống kê job và ảnh là metric khác nhau.

## 4. Quyết định chưa chốt

**CONFIRMED:** opaque server-side session, HttpOnly cookie, không JWT; Gemini API qua official `@google/genai`, model cấu hình bằng env; local filesystem cho demo/local-first; prefix `/api/v1`; 5 collections hiện tại; không tạo `user_settings`.

**PROPOSAL:** session cookie `SameSite=Lax`, Secure ở production HTTPS; origin allowlist + CSRF synchronizer token/header cho unsafe methods; private content/download proxy qua API; thư mục file mặc định `backend/data/images` và có thể override bằng `IMAGE_STORAGE_DIR`.

**OPEN QUESTION:** deployment origin/topology và chính sách CORS/CSRF chi tiết; session lifetime và password-hashing package; Gemini model ID cụ thể, model access/billing/quota và output MIME/dimensions; mức quota; prompt/title limits; max file size; policy retention/purge file; production hosting có filesystem bền vững và backup hay không.

### 5. Local image storage design

- **Path:** `IMAGE_STORAGE_DIR` cấu hình server-side; local default là `backend/data/images`. Dùng thư mục con `tmp/` và `objects/` để checkpoint file tạm khác file đã commit vào library. Thêm thư mục runtime vào ignore rules khi backend implementation được phép; không commit ảnh người dùng.
- **Filename:** tên file opaque, random (UUIDv4 hoặc cryptographic random key), không chứa prompt, email, user name hay client path. Extension chỉ được chọn từ MIME bytes đã xác minh (`png`, `jpeg`, `webp`); DB giữ storage key tương đối, không path tuyệt đối.
- **Validation:** decode bytes từ output SDK; áp dụng configured maximum bytes trước khi ghi; MIME allowlist và magic-byte/signature validation phải đồng nhất; parser phải đọc được kích thước/dimensions hợp lệ. Không tin MIME/filename do provider/client khai báo đơn lẻ. **OPEN QUESTION:** max bytes và dimension ceiling cần chốt theo model, memory budget và disk budget trước implementation.
- **Access:** không dùng `express.static` cho private images. Inline content và download đều qua API, lookup `{_id, userId, deletedAt:null}` trước khi stream; `Content-Type` từ MIME đã validate, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`, attachment filename an toàn cho download. Không nhận storage key hoặc filesystem path từ client. OS directory/file permissions must restrict read/write to the backend service account; API authorization remains mandatory.
- **Failure/cleanup:** provider failure trước khi có kết quả không tạo image record và dọn temp. Nếu provider outcome không chắc chắn, đặt `needs_review`, không gọi lại model; giữ checkpoint/file tạm cần thiết cho reconciliation. Khi file đã được rename vào object area nhưng DB metadata thất bại, không báo `succeeded`; giữ job ở trạng thái recoverable hoặc dọn file orphan qua reconciliation idempotent, tuyệt đối không gọi lại provider chỉ để sửa lỗi DB.
- **Deletion lifecycle:** `DELETE /images/:id` soft-delete/ẩn khỏi library trước, giữ generation history; đặt file deletion pending và dọn file vật lý qua retryable cleanup. Khi file không còn tồn tại, đánh dấu deleted; nếu unlink lỗi, giữ failed/pending để retry/operator xử lý. Chỉ hard-delete metadata theo retention policy đã duyệt.
- **Deployment limit:** local filesystem chỉ phù hợp demo/single-instance. Ephemeral disks, restart/deploy, replicas, autoscaling and container replacement may lose or split files; shared durable volume, backup/restore, capacity monitoring and single-writer/locking strategy are not guaranteed. Production deployment needs a persistent shared volume or separately approved private object storage, plus reconciliation/backup plan.
