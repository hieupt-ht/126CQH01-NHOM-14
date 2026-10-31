> **Cập nhật 30/10/2026:** Đọc [baseline kỹ thuật mới](../technical-baseline/README.md) trước. Các lựa chọn Gemini/local làm storage cuối trong nội dung bên dưới là lịch sử và đã được thay bởi hướng FLUX/cloud. API/schema tương thích vẫn được giữ; Azure Blob private đã chốt, có adapter/migration để đổi Cloudinary theo baseline07. Không dùng đề xuất cũ để tự bật dịch vụ hoặc sửa code.

# Kế hoạch triển khai Backend theo phase

**Trạng thái:** kế hoạch tài liệu, backend chưa triển khai nghiệp vụ. Scaffold hiện tại có Express, TypeScript strict, ES Modules, `express.json()` và `GET /api/health`; chưa có MongoDB, auth, provider, worker hoặc storage. Các phase dưới đây giữ toàn bộ invariant PRD: một prompt/một ảnh; lifecycle `queued → processing → saving → succeeded` hoặc `failed`/`needs_review`; idempotency; daily quota; tối đa một generation active/user; image ownership/private delivery; history khác library; lỗi an toàn.

## Phase 1 — Backend foundation + MongoDB connection

**Mục tiêu:** cấu hình server đáng tin cậy và kết nối MongoDB mà chưa triển khai nghiệp vụ generation.

- **Files/modules dự kiến:** `backend/src/config/env.ts`, `backend/src/config/database.ts`, `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/middlewares/error-handler.ts`, `backend/src/modules/health/`; cập nhật `.env.example`, scripts/docs run instructions. Giữ package layout nhỏ, không tạo layer rỗng.
- **Dependencies:** scaffold hiện có (`express`, TypeScript). Mongoose được xác nhận làm ODM; chỉ thêm dependency khi Phase 1 được phép bắt đầu. Không thêm framework/queue/storage dependency tùy ý.
- **APIs:** `GET /api/health` giữ liveness; có thể phân biệt readiness của database bằng response an toàn, không lộ URI/host/credentials. Mount prefix `/api/v1` cho các API nghiệp vụ ở phase sau.
- **Collections:** chưa tạo domain collection/model. MongoDB connection được quản lý tập trung; chưa seed/migrate dữ liệu.
- **Acceptance:** env được validate khi startup; server fail-fast nếu cấu hình bắt buộc sai; connection close khi shutdown; health/readiness không tiết lộ secret; không có API nghiệp vụ giả.
- **Kiểm thử:** config valid/missing/invalid; app boot/shutdown; health liveness và readiness khi DB available/unavailable bằng test database cô lập; không dùng production URI.
- **Rủi ro:** local transaction support phụ thuộc MongoDB replica set; nếu phase sau cần transaction phải xác nhận dev/test environment hỗ trợ replica set trước khi chọn thuật toán reservation.

## Phase 2 — Authentication + sessions

**Mục tiêu:** register/login/logout/current user với opaque server-side session, không JWT.

- **Files/modules dự kiến:** `backend/src/modules/auth/{routes,controller,service,validation}.ts`, `backend/src/modules/users/`, `backend/src/modules/sessions/`, `backend/src/middlewares/{require-session,csrf}.ts`, auth DTOs/errors; session/user schema implementation.
- **Dependencies:** Mongoose from Phase 1; reputable password hash dependency and any cookie/validation library selected after review. Package selection is still OPEN QUESTION. Do not store raw session token; token generation uses Node cryptographic randomness and DB stores token hash.
- **APIs:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`; CSRF bootstrap endpoint and exact CORS configuration must be confirmed before integration. Login rotates/creates session; logout revokes it; public auth routes are origin-checked and rate-limited.
- **Collections:** `users`, `sessions`; unique canonical email index, unique session token-hash index, user/expiry and TTL indexes. TTL cleanup does not replace `expiresAt` verification on every request.
- **Acceptance:** password hash only, no hash/credential in response/log; session cookie `HttpOnly`, `Secure` on HTTPS and SameSite policy per confirmed deployment; authenticated user derives only from session; disabled/expired/revoked session rejected; csrf checks protect unsafe cookie-authenticated actions.
- **Kiểm thử:** registration validation/duplicate email race; credential errors do not enumerate accounts; login/logout/session expiry/revocation; unauthorized route; cookie flags; CSRF and origin rejection; password hash verification.
- **Rủi ro:** session fixation, CSRF/CORS mismatch across local ports, TTL lag, password-hash dependency/security settings, account enumeration and brute-force rate-limit storage.

## Phase 3 — Generations + Gemini provider + image storage

**Mục tiêu:** nhận job async, đảm bảo quota/idempotency/active-job invariant, gọi Gemini ở server và lưu đúng một private image.

- **Files/modules dự kiến:** `backend/src/modules/generations/`, `backend/src/modules/usage/`, `backend/src/providers/google-genai/`, `backend/src/storage/local-filesystem/`, `backend/src/workers/generation-worker.ts`, `backend/src/config/{provider,storage}.ts`; generation/dailyUsage schema/indexes; reconciliation task/command nếu đã có runner được duyệt.
- **Dependencies:** Mongoose; official Google Gen AI SDK `@google/genai`; password/session packages từ Phase 2. Không thêm queue broker nếu chưa được duyệt; nếu worker chạy trong process thì ghi rõ single-process/local-demo boundary. Không cài dependency trong task tài liệu này.
- **APIs:** `POST /api/v1/generations` (`Idempotency-Key`, prompt only); `GET /api/v1/generations/:id`; `GET /api/v1/usage/me`. Provider/model chỉ server config: `GEMINI_API_KEY`, `GEMINI_IMAGE_MODEL`. Không API request tới provider khi chưa được cho phép hoặc khi billing/quota chưa xác minh.
- **Collections:** `generations`, `dailyUsage`, `users.activeGenerationId`; tạo `images` record chỉ trong saving khi có file. Unique `(userId, requestKey)`, history/worker indexes, unique usage scope/date và unique image generation.
- **Acceptance:** canonical fingerprint giải quyết duplicate trước reserve; cùng key/body trả cùng job và không trừ quota lần hai; key khác body conflict; atomic quota + one-active-job; state transition hợp lệ; một prompt tạo tối đa một image; `succeeded` sau file và metadata; timeout/outcome uncertain thành `needs_review`, không gọi lại; lỗi file/DB không tạo ảnh giả; file temp/orphan được dọn hoặc reconciliation-track.
- **Kiểm thử:** prompt invalid không tạo job/provider call; replay idempotency; key collision body mismatch; đồng thời quota/active-generation; state transition/lease recovery; provider success, rejection, timeout/uncertainty; MIME/signature/size/dimension validation; disk full/write/rename/DB metadata failure; restart và orphan reconciliation. Mock provider chỉ trong test, đánh dấu rõ.
- **Rủi ro:** provider model access/pricing/quota thay đổi; không giả định free tier; billing/API cost; provider response không rõ; MongoDB transaction support; disk capacity/lost files; in-process worker chết cùng app; memory spike khi giữ base64/ảnh lớn.

## Phase 4 — Library + Image Detail + History

**Mục tiêu:** đọc và quản lý resource đã persist, phân quyền mọi thao tác, giữ semantics riêng giữa ảnh và generation.

- **Files/modules dự kiến:** mở rộng `backend/src/modules/images/`, `generations/`, `storage/local-filesystem/`; cursor codec/validation dùng chung nếu thực sự cần; cleanup/reconciliation service. Không tạo một API/domain layer mới nếu module hiện có đáp ứng.
- **Dependencies:** Phase 2 session/ownership middleware và Phase 3 image metadata/private storage. Không cần gọi Gemini trong phase này.
- **APIs:** `GET /api/v1/images`; `GET /api/v1/images/:id`; `GET /api/v1/images/:id/content`; `GET /api/v1/images/:id/download`; `PATCH /api/v1/images/:id` rename; `DELETE /api/v1/images/:id`; `GET /api/v1/generations` history. Search/favorite/date filtering là P1.
- **Collections:** `images` và owner-scoped `generations`; deletion fields/status trên images; không xóa generation history khi ảnh bị xóa.
- **Acceptance:** library chỉ ảnh đã persist và chưa soft-delete; history gồm queued/processing/saving/succeeded/failed/needs_review và vẫn hiển thị job khi ảnh bị xóa; all queries filter theo session user; missing/not-owned trả cùng 404; content/download stream private sau ownership check; delete ẩn ngay khỏi library, file deletion retryable; mở thư viện/detail/download không gọi AI.
- **Kiểm thử:** cross-user read/rename/delete/content/download IDOR; cursor ordering/invalid cursor; soft-delete/history retention; filename/content headers/nosniff; missing file; storage unavailable; cleanup retry idempotency; zero provider calls cho read endpoints.
- **Rủi ro:** local path traversal/symlink, MIME sniffing, browser caching/private cache headers, download filename injection, cleanup race với concurrent read và filesystem không chia sẻ giữa instances.

## Phase 5 — Frontend integration + P1 features

**Mục tiêu:** nối frontend theo contract đã khóa, sau đó bật các feature P1 trong giới hạn Issue/PRD.

- **Files/modules dự kiến:** backend `users`/`stats` và mở rộng `images` query; frontend service/hooks/pages chỉ khi task frontend được giao riêng. Không sửa frontend trong task finalize tài liệu này.
- **Dependencies:** P0 Phase 1–4 đã nghiệm thu; frontend dùng `credentials: include` theo origin/cookie policy; exact allowed origins và CSRF token exchange phải đồng bộ hai phía.
- **APIs:** các P0 API qua `/api/v1`; sau P0 mới mở `PATCH /api/v1/users/me`, favorite/search/date filter trên `/api/v1/images`, `GET /api/v1/stats/me`. Không thêm đổi email/mật khẩu/settings chưa xác nhận.
- **Collections:** `users`, `images`, `generations`, `dailyUsage`; không tạo `user_settings` cho displayName; indexes P1 chỉ sau đo truy vấn.
- **Acceptance:** frontend hiển thị trạng thái server-authoritative, không coi mock là dữ liệu thật; loading/error/empty/queued/processing/saving/succeeded/failed/needs_review; retry chỉ theo idempotency policy; P1 không thay đổi quota/ownership/lifecycle P0.
- **Kiểm thử:** contract tests frontend/backend; cookie + CSRF + CORS ở browser; end-to-end auth → generate → library/detail/history/download/delete; P1 scoping/filter/stats; accessibility/responsive checks do frontend task owner thực hiện.
- **Rủi ro:** credentialed CORS deployment mismatch, stale demo fixtures, polling quá mức, P1 query/index ảnh hưởng performance và deploy chưa có persistent filesystem.

## Invariants áp dụng xuyên suốt

- Một accepted generation là một prompt và tối đa một output image; không thêm multi-image.
- State machine giữ nguyên `queued → processing → saving → succeeded`; lỗi sang `failed`, kết quả không rõ sang `needs_review`.
- Same user + `Idempotency-Key` + same canonical payload không tạo job/inference/quota reservation lần hai; same key + different payload là conflict.
- Daily quota là server-authoritative theo ngày UTC như PRD; quota values là config chưa chốt. Một user tối đa một active generation. Reservation/release phải nguyên tử/idempotent; chỉ release khi chắc chắn chưa gửi provider, còn đã gửi hoặc outcome không rõ thì lượt vẫn tính.
- `succeeded` đòi file và metadata persist; provider timeout không phải căn cứ retry inference.
- Images/library và generations/history là hai resource khác nhau. Mọi read/update/delete/content/download check ownership từ session.
- Safe errors không lộ stack, password hash, API key, raw prompt ngoài nơi cần thiết, storage path/credential hoặc Base64 image.

## Decisions và trạng thái

- **CONFIRMED:** Node.js + Express + TypeScript; MongoDB + Mongoose; `/api/v1`; opaque server-side session/HttpOnly cookie, no JWT; Google AI Studio/Gemini API via official `@google/genai`; model via environment; local filesystem local-first; five collections; no `user_settings` without a real need.
- **PROPOSAL:** cookie `SameSite=Lax`, Secure on production HTTPS, origin allowlist + CSRF synchronizer token, local path `backend/data/images`, private API content stream, default cursor `20`/max `50`.
- **OPEN QUESTION:** exact session TTL/hash package/CSRF bootstrap for deployment origins; exact Gemini model ID/access/pricing/quotas and verified output; numeric daily quotas and prompt/title/file/dimension limits; local dev MongoDB replica-set setup; production durable storage/backup and file retention policy.

Phase ordering does not authorize starting any implementation, installing dependencies, connecting a database, creating credentials, or calling Gemini; each requires an implementation task within the confirmed scope.
