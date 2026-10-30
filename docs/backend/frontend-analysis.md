# Phân tích frontend phục vụ thiết kế backend

**Ngày kiểm tra:** 29/10/2026
**Phạm vi:** mã hiện có trong `frontend/src/`, `frontend/package.json`, `backend/src/app.ts`, PRD, Issue #1 và hợp đồng frontend/backend. Tài liệu này ghi bằng chứng mã nguồn; route và hành vi preview không được xem là backend đã hoạt động.

## 1. Tóm tắt cấu trúc

- Frontend dùng React + TypeScript + Vite. Route được chọn thủ công theo `window.location.pathname` trong `frontend/src/App.tsx`; không thấy React Router. Route không khớp sẽ rơi về `DashboardPage`.
- Các page hiện có: Login, Register, Create Image, Library, Image Detail, History, Dashboard và Account Settings. Layout sản phẩm nằm ở `DashboardLayout`; component nghiệp vụ gồm prompt composer, generation panel, gallery, artwork reference và image card.
- `frontend/src/services/` và `frontend/src/hooks/` hiện chỉ có `.gitkeep`. Không thấy client gọi API, Context/store nghiệp vụ, hoặc `localStorage` lưu dữ liệu. Fixture được đặt tại `dashboardData.ts`, `libraryDemoData.ts`, `historyDemoData.ts`.
- Backend hiện chỉ có Express, `express.json()` và `GET /api/health`; chưa có xác thực, route nghiệp vụ, MongoDB, worker, provider hay storage. Dependencies hiện tại chỉ xác nhận Express và công cụ TypeScript.
- Mọi endpoint bên dưới là mapping thiết kế từ Issue #1/PRD và `docs/development/FRONTEND_BACKEND_CONTRACT.md`, không phải endpoint đã triển khai.

## 2. Route và màn hình

| Màn hình | Route thực tế trong App | Hành vi/data hiện có | API/dữ liệu bền vững dự kiến | Mức và ghi chú |
|---|---|---|---|---|
| Login | `/login` | Form email/password; kiểm tra rỗng/định dạng email; focus trường lỗi; hiện/ẩn mật khẩu; submit hợp lệ chỉ hiện thông báo preview. Không tạo phiên, gọi API hay redirect thành công. | `POST /auth/login`, sau đó `GET /auth/me`; lỗi validation và credentials an toàn. | P0 theo Issue/PRD; frontend chưa kết nối. |
| Register | `/register` | Route render `RegisterPage`; là preview cục bộ, chưa gọi API hoặc tạo tài khoản. Form có tên hiển thị, email, mật khẩu và xác nhận theo giao diện. | `POST /auth/register`; phản hồi không chứa hash; email chuẩn hóa/duy nhất. | P0 theo Issue/PRD; `/register` hiện được route rõ ràng dù route bảo vệ chưa có. |
| Create Image | `/app/create` | Textarea prompt, đếm ký tự, ví dụ điền prompt, CTA và trạng thái demo; có thể chuyển trạng thái trong dev. Kết quả minh họa lấy từ artwork cục bộ và được gắn nhãn demo. Search trong dialog ví dụ chỉ lọc fixture. | `GET /usage/me`, `POST /generations` (idempotency key), `GET /generations/:id`; kết quả thật chỉ sau khi file và metadata đã lưu. | P0; chỉ CTA “Tạo ảnh” được phép tạo generation. Một ảnh/request. |
| Library | `/app/library` | Dữ liệu từ `libraryDemoData`; lọc/search, pagination và thao tác rename/delete/download được mô phỏng tại UI, không persist. Fixture/demo được gắn nhãn. | `GET /images`; `GET/PATCH/DELETE /images/:id`; `GET /images/:id/download`. | P0 phần library/quản lý cơ bản. Search, favorite và date filter là P1 theo PRD/Issue. |
| Image Detail | `/app/images/:id` | `:id` hiện là fixture key; xem fixture, lightbox, rename/delete và trạng thái preview. Không truy vấn user hay storage. | `GET /images/:id`, `PATCH /images/:id`, `DELETE /images/:id`, download endpoint; ownership bắt buộc. | P0; route hiện map trực tiếp fixture key, không phải ObjectId/API id đã xác nhận. |
| History | `/app/history` | `historyDemoData` chứa các fixture trạng thái; bảng/card, drawer, lọc trạng thái UI và dùng lại prompt; không đọc job thật. | `GET /generations` phân trang; `GET /generations/:id` cho polling/chi tiết nếu cần. | P0; giữ job lỗi và needs_review dù thư viện chỉ giữ ảnh đã lưu. |
| Dashboard | `/` và fallback mọi path chưa khớp | `DashboardPage` hiển thị gallery/reference artwork và prompt preview; số liệu/ảnh là mẫu. Root không phải Home marketing riêng. | Dashboard thống kê/ảnh gần đây `GET /stats/me` và/hoặc truy vấn library/usage theo quyết định sản phẩm. | Dashboard là P1; route sản phẩm `/app` có trong PRD nhưng hiện chưa map riêng. |
| Account Settings | `/app/settings` | `AccountSettingsPage` hiển thị profile/usage preview, form tên và trạng thái lưu giả bằng timer; không persist. | P1: `GET /auth/me`, `PATCH /users/me`, `GET /usage/me`. | Không có căn cứ cho đổi email/mật khẩu hoặc cài đặt tùy chọn khác. |

### Các hành vi chung được xác nhận

- `DashboardLayout` có điều hướng preview, search chỉ trên fixture, drawer mobile và menu tài khoản hiển thị lời nhắc đây chưa phải phiên đăng nhập. UI không chứng minh authorization.
- Các thông báo loading/error/empty hoặc các trạng thái job ở page hiện là state preview/dev; khi tích hợp, phải lấy trạng thái authoritative từ server và không trình bày fixture như dữ liệu tài khoản.
- Không thấy dữ liệu sản phẩm được lưu trong localStorage hay API service. Không có bằng chứng rằng login/register, create, favorite, rename, delete, download, dashboard stats hoặc settings đã hoạt động với backend.

## 3. Đầu vào, đầu ra và ranh giới tin cậy

| Luồng | Input từ frontend | Kết quả frontend cần | Boundary kiểm tra phía backend |
|---|---|---|---|
| Register/login | display name (register), email, password | Session cookie và user an toàn hoặc lỗi có mã | Chuẩn hóa email, giới hạn độ dài, hash mật khẩu, rate limit; không trả passwordHash. |
| Create generation | prompt và `Idempotency-Key`; không nhận `userId`, model hay provider từ UI | `202` + generation id/status; pollable states; usage mới nhất | Session, prompt length/non-empty, quota atomic, one active job, idempotency per user, server-owned provider/model/settings. |
| Library/history/detail | cursor/page, limit và filter đã được chốt; resource id trên URL | Chỉ tài liệu user hiện tại; stable pagination | Derive user id từ session; validate ObjectId/cursor/filter; exclude soft-deleted images; không truyền query nguyên trạng sang MongoDB. |
| Rename/favorite/delete | title hoặc `isFavorite`; delete confirmation thuộc UI | Updated resource hoặc accepted deletion state | Ownership trong điều kiện update; whitelist field; giới hạn title; audit storage deletion; favorite chỉ khi P1 được bật. |
| Download | resource id | File stream hoặc redirect có kiểm soát | Kiểm tra ownership trước khi lấy file; kiểm soát URL/storage key phía server; không dùng URL tùy ý do client gửi. |
| Profile/usage/stats | tên hiển thị; query range đã giới hạn | profile, quota/reset và thống kê scoped | Session và whitelist; quota không do frontend tự quyết; aggregation có user scope và giới hạn ngày. |

## 4. Đối chiếu phạm vi và câu hỏi

**CONFIRMED** — Issue #1 và PRD đặt P0 cho auth, một prompt/một ảnh, lifecycle, lưu file+metadata, library/detail/download/rename/delete, history gồm lỗi, ownership, quota và idempotency. P1 gồm favorite, tìm/lọc, dashboard stats và profile cơ bản. Business states theo repo là `queued`, `processing`, `saving`, `succeeded`, `failed`, `needs_review`.

**CONFIRMED** — Repo route `/` sang Dashboard preview, `/login` sang Login; các route preview còn lại được khai báo thủ công trong `App.tsx`. Đây không phải xác nhận về route bảo vệ hay đích redirect sau login.

**CONFIRMED (quyết định chủ dự án):** API prefix `/api/v1`; authentication bằng opaque server-side session + HttpOnly cookie, không JWT; MongoDB + Mongoose; Gemini API qua official Node.js SDK `@google/genai`, model cấu hình từ environment; local filesystem cho giai đoạn demo/local-first; giữ năm collections hiện có, không thêm `user_settings`.

**PROPOSAL** — Backend đọc user từ session/cookie đã xác thực; client không gửi `userId`. Tách generation history khỏi thư viện ảnh đã lưu. Dùng P1 APIs chỉ sau khi P0 ổn định.

**CONFIRMED** — `/api/v1`, opaque server-side sessions, Gemini API và local filesystem đã được chủ dự án chọn; endpoint legacy trong PRD/Issue vẫn là lịch sử yêu cầu, không còn là prefix/provider dùng cho triển khai này. Gemini model ID, project access, pricing/quota và image output format vẫn cần xác minh trước khi bật provider.

**OPEN QUESTION** — Session lifetime, cookie SameSite/CSRF/CORS chi tiết theo deployment topology, password hashing package, quota values, max prompt/title/file limits và local MongoDB transaction topology cần được chốt trước từng phần implementation phụ thuộc.

**OPEN QUESTION** — Issue/PRD ghi `/app` là Dashboard P1; mã hiện tại chỉ dùng `/` cho Dashboard và fallback các path chưa biết về Dashboard. Cần xác nhận thời điểm route được nối với xác thực, không suy ra từ preview.

**OPEN QUESTION** — Thư viện tài liệu settings/auth chưa xác nhận đổi mật khẩu, đổi email, xóa tài khoản, preference settings hay verify email. Không đưa các thao tác này vào contract MVP.

## 5. Nguồn đã kiểm tra

- GitHub Issue #1: [Frontend FLUX STUDIO](https://github.com/hieupt-ht/126CQH01-NHOM-14/issues/1)
- `PRD.md`, `docs/project/REQUIREMENTS_SUMMARY.md`, `docs/project/SCOPE_AND_PRIORITIES.md`, `docs/project/OPEN_QUESTIONS.md`
- `docs/development/FRONTEND_BACKEND_CONTRACT.md`
- `frontend/src/App.tsx`, các page trong `frontend/src/pages/`, component nghiệp vụ trong `frontend/src/components/`, `frontend/src/layouts/DashboardLayout.tsx`, `frontend/package.json`
- `backend/src/app.ts`, `backend/package.json`
