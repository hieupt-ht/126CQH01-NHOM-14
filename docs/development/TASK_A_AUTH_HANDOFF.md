# Task A — Auth and environment handoff

Ngày kiểm tra: 02/11/2026. Nhánh: `feature/auth`.

## Trạng thái ban đầu

Working tree sạch trước khi bắt đầu. Repo đã có auth JWT, session MongoDB, Argon2id, env validation, Compose replica set, API client và SessionGate. Không tạo lại các module này.

## Thay đổi

- `backend/src/modules/auth/auth.ts`: verifier chỉ chấp nhận `sub` là Mongo ObjectId 24 ký tự hex và `jti` là 64 ký tự hex, khớp định dạng ID được tạo bởi luồng login. Từ chối claim sai trước khi truy vấn session.
- `frontend/src/pages/auth/RegisterPage.tsx`: đăng ký API thành công điều hướng đến `/login`.
- `backend/tests/auth-jwt.test.ts`: thêm kiểm tra claim, chuẩn hóa dữ liệu đăng ký và xác nhận password không bị trim.
- `backend/tests/foundation.test.ts`: xác nhận backend chấp nhận generation tắt khi thiếu credentials cloud và từ chối bật generation khi thiếu credentials.
- `backend/tests/integration/auth.test.ts`: thêm validation, Origin, CSRF sai, Secure cookie, concurrent email uniqueness và giới hạn login/register.
- Tài liệu này ghi lại contract, kết quả kiểm chứng và hướng dẫn bàn giao.

Không sửa `.env`, Compose, models, worker, storage adapter, product routes hoặc giao diện/styles. Compose hiện tại đã đáp ứng rs0/keyfile/volume/init/backend dependency; không cần thay đổi.

## Auth contract cho frontend

Base URL local: `/api/v1`. API client phải dùng `credentials: "include"`; không đọc/lưu JWT trong frontend storage.

### Đăng ký

`POST /api/v1/auth/register`

```json
{ "displayName": "Tên hiển thị", "email": "person@example.test", "password": "tối thiểu 8 ký tự" }
```

Thành công `201`:

```json
{ "success": true, "data": { "user": { "id": "<object-id>", "displayName": "Tên hiển thị", "email": "person@example.test", "createdAt": "<iso-date>" } } }
```

Email được trim/lowercase; displayName 1–80 ký tự; password 8–128 ký tự, giữ nguyên cả khoảng trắng đầu/cuối. Register không tạo session. Thành công chuyển người dùng sang `/login`.

### Đăng nhập và khôi phục session

`POST /api/v1/auth/login` nhận `{ "email": "...", "password": "..." }`. Thành công `200` trả `{success:true,data:{user,csrfToken}}` và cookie `flux_session` (HttpOnly, SameSite=Lax, 7 ngày; Secure theo cấu hình HTTPS/production). JWT không nằm trong JSON. Session lưu hash `jti` và hash CSRF trong MongoDB.

Sai email hoặc mật khẩu trả `401 INVALID_CREDENTIALS` với cùng thông báo. Login/Register kiểm tra Origin và bị giới hạn 10 request/IP/15 phút trong process hiện tại.

`GET /api/v1/auth/me` yêu cầu cookie hợp lệ, JWT đúng claim và session active. Trả `{success:true,data:{user}}`; thiếu hoặc revoked trả `401 UNAUTHENTICATED`.

`GET /api/v1/auth/csrf` yêu cầu session đang hoạt động; trả `{success:true,data:{csrfToken}}`. Token giữ ổn định theo session để nhiều tab cùng dùng.

`POST /api/v1/auth/logout` yêu cầu Origin đúng và `X-CSRF-Token`; trả `204`, revoke session ngay và hết hạn cookie. Dùng `/login` khi nhận 401 ở route được bảo vệ; lỗi mạng không đồng nghĩa session đã bị revoke.

Error envelope: `{ "success": false, "error": { "code": "...", "message": "..." } }`. Mã auth chính: `VALIDATION_ERROR`, `EMAIL_IN_USE`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `ORIGIN_NOT_ALLOWED`, `CSRF_INVALID`, `RATE_LIMITED`.

### Chạy và kiểm tra luồng FE thật

Trong file `.env` local (không commit), đặt `VITE_UI_PREVIEW=false`, rồi chạy `docker compose up -d frontend`. Mở `/register`, tạo user local, đăng nhập, reload để xác nhận `/auth/me`, sau đó đăng xuất. Không nhập mật khẩu thật vào môi trường demo. Production không dùng preview auth.

## Environment và Docker

- `JWT_SECRET` bắt buộc, tối thiểu 32 byte; không có fallback. Chỉ backend nhận biến này. Root `.env.example` và `backend/.env.example` chỉ có placeholder.
- `GENERATION_ENABLED=false` cho phép auth chạy khi thiếu Cloudflare/Cloudinary credentials. Điền một phần bộ Cloudinary bị từ chối; bật generation yêu cầu đủ Cloudflare account/token và Cloudinary cloud/key/secret.
- MongoDB dùng `mongodb:27017`, auth credential tách riêng khỏi URI, replica set `rs0`; keyfile và database ở named volumes. `mongodb-init` chờ PRIMARY trước khi backend khởi động.
- `docker compose config --quiet` đạt. Stack được build và chạy trên volumes repo hiện có, không xóa/tạo lại volume.

## Kết quả kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `backend`: `npm run build` | PASS |
| `backend`: `npm test` | PASS: 33; SKIP: 1 test cần `MONGODB_TEST_URI` |
| `backend`: `npm run test:integration` | PASS: 2 test suites trên MongoDB replica set cô lập |
| `frontend`: `npm run build` | PASS |
| `docker compose config --quiet` | PASS |
| `docker compose up --build -d`, `docker compose ps` | PASS; backend và MongoDB healthy |
| `rs.status()` | PASS; `set=rs0`, `myState=1` (PRIMARY) |
| Transaction | PASS; commit tồn tại, rollback không tồn tại |
| Restart MongoDB | PASS; commit marker còn sau restart; marker test được xóa riêng, không drop database/volume |
| HTTP API trên Compose thật | PASS; register 201, login 200 + HttpOnly/CSRF, `/me` 200, `/csrf` cùng token, logout 204 và cookie cũ `/me` trả 401. Tài khoản test cùng session được xóa theo email/ObjectId riêng sau kiểm tra. |
| Browser E2E | UNVERIFIED; browser host trả `The browser access host is unavailable`, native app pipe không khả dụng. Không tuyên bố đã chạy browser. |

Lần chạy integration đầu bị timeout trong lúc `mongodb-memory-server` tải MongoDB 8.2.6 (740 MB). Sau khi binary tải xong, chạy lại `npm run test:integration` và cả hai suite đạt trong 11.3 giây. Không gọi Cloudflare, FLUX hoặc Cloudinary thật.

## Bàn giao và giới hạn

- **Vũ:** dùng đúng DTO/endpoint ở trên; giữ `credentials: include`; login lấy `csrfToken` từ response; mutation gửi `X-CSRF-Token`; `GET /auth/csrf` bootstrap khi cần. 401 ở session gate dẫn `/login`; register dẫn `/login`; logout xóa client auth state sau 204. Browser visual/E2E cần chạy lại khi browser host khả dụng.
- **Định:** review auth verifier, form redirect và các test trong diff; kiểm chứng MongoDB transaction/PRIMARY đã chạy trên Compose local với marker test độc lập.
- Rate limit hiện là process-local; chỉ phù hợp local/demo, không phải distributed production throttling.
- Exact production origin và JWT signing-key rotation tiếp tục là `OPEN QUESTION` theo tài liệu hiện hành.
- Không commit, push, merge hoặc sửa tài liệu lịch sử.

## Task A checklist

- [x] rs0 PRIMARY, transaction commit/rollback và persistence sau MongoDB restart được kiểm tra.
- [x] Không xóa volume hoặc dữ liệu người dùng.
- [x] Env validation generation off/on và partial Cloudinary có kiểm tra.
- [x] Register/login/me/csrf/logout API thật và session revocation được kiểm tra.
- [x] JWT tamper, `alg=none`/HS384, issuer/audience/expiry/claim, CSRF/Origin, duplicate race, user disabled, session revoke và rate limit có coverage integration/unit.
- [x] FE/BE build; backend test suites đạt (một test cần URI riêng được skip).
- [x] Không có secret/passwordHash trong response test; không gọi provider live.
- [ ] Browser đăng ký → đăng nhập → reload → đăng xuất: chưa xác minh do browser host không khả dụng.
- [x] Handoff cho Vũ và Định được ghi tại tài liệu này.
