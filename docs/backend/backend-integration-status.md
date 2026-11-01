# Backend Integration Status

**Ngày kiểm tra:** 2026-11-01

**Ghi chú trạng thái:** Đây là snapshot trước yêu cầu đổi auth sang JWT trong cùng ngày. JWT đã được triển khai sau snapshot này; dòng trạng thái lịch sử bên dưới chỉ mô tả commit được audit, không phải trạng thái code hiện tại.

**Commit:** `9674f7a` (`feature/backend-architecture`, cùng commit với `develop` và `origin/develop`)

**Phạm vi:** kiểm tra source/config/test và trạng thái môi trường read-only; không gọi Cloudflare/Cloudinary thật, không ghi hoặc xóa dữ liệu MongoDB.

## 1. Tổng quan

Backend có code cho session authentication, generation worker, Cloudflare FLUX provider, Cloudinary storage adapter, image/history/profile APIs và MongoDB persistence. Tuy vậy, **chưa xác minh được backend hoạt động end-to-end ở môi trường hiện tại**: Docker Compose không có container của project đang chạy, không có MongoDB/backend listener ở các port cấu hình, và dependency đã khai báo trong lockfile nhưng thiếu trong `backend/node_modules`.

Frontend và backend có wiring cho API thật, nhưng Docker Compose mặc định đặt `VITE_UI_PREVIEW=true`; generation mặc định tắt với `GENERATION_ENABLED=false`. Vì vậy trạng thái mặc định phục vụ UI preview, không phải luồng tạo ảnh thật.

Không có module nào được đánh dấu `COMPLETED`, do build/integration/live database chưa xác minh thành công trong môi trường này. “UNVERIFIED” nghĩa là có code nhưng chưa chạy được phép kiểm tra cần thiết; không đồng nghĩa code chưa tồn tại.

## 2. Docker và MongoDB replica set

### Trạng thái môi trường

- `docker compose config --quiet`: **PASS** — Compose YAML và biến interpolation bắt buộc hợp lệ với `.env` hiện có. Không hiển thị/đọc giá trị secret.
- `docker compose ps`: **không có container** trong project Compose này.
- `docker ps`: chỉ thấy container `danang_postgres` (`postgres:15`); không có MongoDB hoặc backend container.
- Listener trên các port kiểm tra: chỉ thấy frontend tại `localhost:5173`; không thấy backend `3000`, MongoDB `27017` hoặc local MongoDB `27027`.
- `backend/.env` và `backend/data/mongo` không tồn tại. Root `.env` có mặt và được Compose dùng để resolve cấu hình, nhưng giá trị không được đọc/in ra.

### Thiết kế trong source

- [compose.yaml](../../compose.yaml) cấu hình MongoDB với `--replSet rs0`, authentication, keyfile, persistent data volume và `mongodb-init` chờ node thành `PRIMARY`.
- [init-replica.js](../../backend/scripts/docker/init-replica.js) xác thực bằng tài khoản admin, khởi tạo/kiểm tra replica set `rs0` và chờ `isWritablePrimary`.
- Service `mongodb-key` tạo keyfile trong named volume, đặt owner `mongodb`, mode `400`; MongoDB mount key volume read-only. Đây mới là kiểm tra source/config, chưa xác minh file/key permissions bên trong container đang chạy.
- Backend Compose URI có `replicaSet=rs0`, `authSource=admin`; username/password được truyền qua biến môi trường riêng. `docker compose config --quiet` không chứng minh credentials đúng hoặc backend đã kết nối.
- Server kiểm tra writable replica set khi bật generation. Startup mở MongoDB trước khi listen; `GET /api/health` trả liveness `{status:"ok"}`, không chủ động ping DB ở mỗi lần health check.

**Kết luận runtime:** trạng thái replica set, `PRIMARY`, authentication, keyfile mount/permissions và backend MongoDB connection đều **UNVERIFIED** vì MongoDB/backend container không chạy. Không có dữ liệu/volume nào bị sửa.

### Transaction rollback

Không chạy được transaction rollback test. Integration tests trong source dùng `MongoMemoryReplSet` riêng, provider/storage stub và teardown riêng, nhưng package runtime `mongodb-memory-server` hiện không có trong `node_modules`; Docker MongoDB cũng không chạy. Source generation service có gọi `mongoose.connection.transaction()` cho reservation/commit/release, nhưng chưa có test riêng trong lần kiểm tra này chứng minh rollback sau lỗi. Không ghi lên DB nhóm để thay thế.

## 3. Trạng thái modules

| Module | Trạng thái | Bằng chứng và giới hạn |
|---|---|---|
| Register / Login / Authentication | **UNVERIFIED** | Có route và session server-side, Argon2id, cookie HttpOnly, CSRF/origin check và rate limit trong `backend/src/modules/auth/auth.ts`. Integration test có trong repo nhưng không chạy được do thiếu `argon2` và Mongo test dependency. |
| JWT Authentication | **MISSING — theo chủ đích** | Contract hiện hành dùng opaque server-side session; không dùng JWT. Đây không phải thiếu sót so với kiến trúc đã xác nhận. |
| Cloudflare FLUX generation | **UNVERIFIED** | Có provider FLUX.1 Schnell và worker/checkpoint/idempotency/quota trong `backend/src/providers/cloudflare.ts` và `backend/src/modules/generations/service.ts`. Provider unit tests dùng stub đã chạy; live API không được gọi. `GENERATION_ENABLED` mặc định `false`. |
| Cloudinary configuration và upload | **PARTIAL** | Config/service/adapter có code; mock tests xác nhận authenticated upload, MIME/signature/size validation, owner folder, stable ID và uncertain upload handling. Chưa kiểm tra credential/account thật hoặc upload live. |
| MongoDB image persistence | **UNVERIFIED** | Worker upload ảnh rồi transactionally upsert `images` metadata và đánh dấu generation thành công. Replica set test được viết nhưng không khởi chạy do dependency thiếu. |
| Image Library | **UNVERIFIED** | `GET /images` owner-scoped, chỉ lấy ảnh chưa soft-delete; frontend Library gọi API trong chế độ thật. Integration test chưa chạy. |
| Image Details | **UNVERIFIED** | `GET /images/:id`, content và download kiểm tra owner trước khi stream; frontend detail route dùng API. Runtime/test chưa xác minh. |
| Image History | **UNVERIFIED** | `GET /generations` và `GET /generations/:id` giữ trạng thái job, kể cả ảnh đã xóa; frontend History gọi API. Integration test chưa chạy. |
| Delete Image | **UNVERIFIED** | API tìm record theo `_id + userId`, soft-delete và đặt cleanup pending. Worker xóa qua storage adapter và retry/backoff. Không có thao tác xóa Cloudinary thật trong audit. |
| User Profile | **UNVERIFIED** | `GET /auth/me` và `PATCH /users/me` có code; Account Settings gọi các endpoint tương ứng. Runtime/test chưa xác minh. |
| P1 image favorite/search/date filters | **MISSING** | `PATCH /images/:id` hiện chỉ whitelist `title`; query danh sách chỉ nhận `limit` và `cursor`. Các filter/favorite được tài liệu contract xếp P1. |

## 4. Cloudinary

- Dependency `cloudinary` có trong package và lockfile. `configureCloudinary` lấy cấu hình từ environment, ép HTTPS và chỉ khởi tạo khi đủ cloud name/API key/API secret. Giá trị secret không được đọc/in ra.
- Các biến được đọc bởi backend: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_TIMEOUT_MS`, `CLOUDINARY_ACCOUNT_ALIAS`, `IMAGE_STORAGE_NAMESPACE`, `MAX_IMAGE_UPLOAD_MB`.
- Giới hạn mặc định là **10 MiB**; validator cho phép cấu hình 1–95 MiB. Service kiểm tra kích thước và chữ ký PNG/JPEG/WebP trước upload. Cloudinary unit test với fake SDK đã xác nhận trường hợp vượt giới hạn không gọi upload.
- Generation worker truyền `userId` lấy từ job đã xác thực vào adapter. Upload dùng `asset_folder` theo user và category; delivery mode là `authenticated`; `overwrite:false`; ID ổn định theo generation để phục hồi saving không tạo asset khác.
- User-facing `DELETE /images/:id` kiểm tra ownership trong MongoDB trước khi soft-delete. Worker cleanup chỉ lấy record đã soft-delete/pending và gọi adapter nội bộ; `deleteImage(publicId)` tự nó chỉ validate public ID, không xác minh user, nên không được expose như API trực tiếp.
- Adapter sinh signed URL nội bộ rồi backend stream file; không trả URL ký hoặc credential về frontend. Xóa ảnh là cleanup bất đồng bộ, không phải xóa cloud đồng bộ trong HTTP request.
- Đã chạy mock tests cho config/upload/delete idempotent, ownership folder, format/size và timeout. **Chưa** gọi Cloudinary thật hoặc xác minh quyền `authenticated` trên tài khoản Free.

## 5. API và frontend integration

### Luồng source hiện có

`Frontend (API mode) → /api/v1 Express → GenerationService → Cloudflare FLUX → Cloudinary authenticated → MongoDB image/generation metadata → owner-scoped API stream → Frontend`.

Luồng này có trong source nhưng **chưa được xác minh end-to-end hiện tại**. Khi `VITE_UI_PREVIEW=true`, `uiPreview.ts` phục vụ chế độ preview thay cho API thật. Khi API mode bật nhưng `GENERATION_ENABLED=false` hoặc thiếu Cloudflare/Cloudinary config, generation trả lỗi cấu hình và không nhận job.

### Endpoint source và trạng thái xác minh

Các endpoint dưới đây được mount trong `backend/src/app.ts` và `/api/v1`; không endpoint nào được xác minh qua server live vì backend không chạy.

| Nhóm | Endpoint có code | Auth / persistence / frontend |
|---|---|---|
| Health | `GET /api/health` | Public liveness; không phải DB readiness probe. Route chưa live-test trong lượt này. |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `GET /auth/csrf` | Register/login public kèm origin/rate limit; các endpoint còn lại session-protected. Session/user lưu MongoDB. Frontend login/register/session gate có API client. |
| Generation | `POST /generations`, `GET /generations`, `GET /generations/:id`, `GET /usage/me` | Product router yêu cầu session; mutation cần Origin + CSRF. Generation POST cần `Idempotency-Key`; chỉ hoạt động khi generation config bật. Frontend Create/History gọi API trong API mode. |
| Library/detail | `GET /images`, `GET /images/:id`, `GET /images/:id/content`, `GET /images/:id/download` | Session + owner scope; ảnh lấy từ MongoDB, nội dung được stream từ Cloudinary riêng tư. Frontend Library/Detail/Download có wiring. |
| Image management | `PATCH /images/:id`, `DELETE /images/:id` | Session + Origin + CSRF + owner scope. PATCH hiện đổi title; DELETE soft-delete rồi worker cleanup. |
| Profile/stats | `PATCH /users/me`, `GET /stats/me` | Session + owner scope, truy vấn MongoDB; Settings/Dashboard có API usage. |

Không phát hiện product route nào thiếu session guard: `createProductRouter` áp dụng `requireOrigin` + `requireSession` toàn router và CSRF cho unsafe methods. Register/login là public theo thiết kế; health cũng public. Read/list/profile/generation route có Mongo query trong code. Chưa xác minh bằng request thật.

### Contract drift cần xử lý

Baseline mới trong [09-CLOUDINARY-DECISION.md](../technical-baseline/09-CLOUDINARY-DECISION.md) và [08-IMPLEMENTATION-STATUS.md](../technical-baseline/08-IMPLEMENTATION-STATUS.md) xác nhận FLUX/Cloudflare + Cloudinary và mô tả code hiện tại. Một số tài liệu cũ vẫn mâu thuẫn:

- `docs/backend/api-contract.md` và `docs/development/FRONTEND_BACKEND_CONTRACT.md` còn mô tả Gemini; API contract vẫn ghi là thiết kế chưa triển khai.
- `docs/backend/database-design.md` còn giữ quyết định Gemini ở phần nguyên tắc/decision, dù các phần storage đã cập nhật Cloudinary.
- `docs/backend/implementation-plan.md` còn ghi backend chưa có auth/provider/storage và các phase Gemini/local storage.
- Phần lịch sử trong `AGENTS.md` cũng còn câu Gemini/local storage; baseline 01/11 ở đầu file nói rõ các câu đó là lịch sử.

Khi triển khai tiếp, dùng baseline 08/09 làm nguồn hiện trạng và đồng bộ các tài liệu cũ trước khi lấy chúng làm contract cho feature mới.

## 6. Code quality, build và test

Runtime local: Node `v24.14.1`, npm `11.11.0`, khớp `engines` Node 24.x / npm 11.x. Không có lint script trong `backend/package.json`.

| Lệnh | Kết quả |
|---|---|
| `docker compose config --quiet` | **PASS** |
| `npm ls --package-lock-only --depth=0` (backend) | **PASS** — lockfile ghi đủ các dependency khai báo |
| `npm ls --depth=0` (backend) | **FAIL** — `argon2`, `mongodb-memory-server`, `sharp`, `zod` thiếu trong `node_modules` |
| `npm run build` (frontend) | **PASS** |
| `npm run build` (backend) | **FAIL** — thiếu các dependency trên; sau đó TypeScript báo lỗi suy luận `unknown` và Mongoose overload ở routes. Cần cài đúng dependency từ lockfile rồi chạy lại để tách lỗi môi trường khỏi lỗi type thật. |
| `npm test` (backend) | **FAIL** — 14 test pass; `foundation.test.ts` không load được vì thiếu `argon2` |
| `npm run test:integration` (backend) | **FAIL trước assertion** — hai test file không load được vì thiếu `mongodb-memory-server` và `sharp`; không test transaction/rollback nào chạy |
| `npm run lint` | **Không khả dụng** — project chưa khai báo script lint |

Mock tests đã thực sự chạy được trong `npm test`: Cloudinary config/service/adapter, Cloudflare provider boundary, env validation và provider/storage error cases. Chúng không chứng minh cloud account hoặc MongoDB đang hoạt động. `npm ci` không chạy trong audit này; không sửa package hay lockfile.

## 7. Lỗi và phần chưa xác minh

1. **Blocker môi trường test:** dependency trong lockfile chưa được cài đầy đủ; backend compile/integration chưa pass.
2. **Blocker runtime:** MongoDB/backend Compose stack chưa chạy; không xác nhận được Primary, auth, keyfile, server health hoặc API responses.
3. **Transaction rollback:** chưa chạy do thiếu Mongo test dependency và không có Mongo container; chỉ thấy transaction usage trong source.
4. **Cloud:** không dùng credential thật; Cloudflare inference, Cloudinary upload/download/delete live chưa xác minh.
5. **Frontend:** API client/route wiring có code, nhưng Compose mặc định bật preview. Chưa chạy browser E2E ở `VITE_UI_PREVIEW=false`.
6. **Contract drift:** tài liệu backend cũ chưa đồng bộ FLUX/Cloudinary với baseline hiện hành.

Không sửa Docker/schema/dependency, không kết nối MongoDB, không gọi cloud, không ghi/xóa dữ liệu và không xóa volume trong lượt kiểm tra này.

## 8. Thứ tự task đề xuất

### P0 — trước feature tiếp theo

1. Khôi phục `backend/node_modules` từ lockfile bằng quy trình cài đặt đã được nhóm duyệt; không cập nhật version ngoài lockfile. Chạy lại backend build, unit và integration tests.
2. Khởi động Docker Compose theo hướng dẫn nhóm khi chủ máy xác nhận đúng `.env`; kiểm tra `rs.status()`, một `PRIMARY`, authentication/keyfile, backend startup và health. Không dùng lệnh xóa volume.
3. Chạy transaction rollback trên replica set **test riêng**, dùng collection/database riêng và xác nhận document không tồn tại sau abort; không nhắm vào DB dev dùng chung.
4. Bật `VITE_UI_PREVIEW=false` trong local test rồi xác minh register/login/logout, profile, list/library/history và ownership bằng browser/API. Generation vẫn để tắt cho tới khi được phép test cloud.
5. Đồng bộ `api-contract.md`, `database-design.md`, `implementation-plan.md` và `FRONTEND_BACKEND_CONTRACT.md` với baseline 08/09 trước khi dùng làm contract cho task mới.
6. Chỉ thực hiện Cloudflare/Cloudinary live smoke test sau khi được chủ dự án cho phép và xác nhận giới hạn ngân sách; test phải dùng namespace/account test và không xóa tài nguyên không thuộc test.

### P1 — sau khi P0 ổn định

1. Hoàn thiện và kiểm thử favorite/search/date filters theo contract P1 đã được xác nhận.
2. Thêm lint script/tooling chỉ sau khi dependency/tool choice được duyệt.
3. Chạy browser responsive/keyboard/E2E và ghi evidence cho API mode.

Các cải tiến ngoài phạm vi gốc trong `docs/project/POST_COMPLETION_IMPROVEMENTS.md` vẫn hoãn đến khi nghiệm thu toàn bộ phạm vi gốc và có cho phép riêng.
