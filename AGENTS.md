# FLUX STUDIO — Project Rules

## Baseline mới nhất — 30/10/2026

Đọc `docs/technical-baseline/README.md` và sổ quyết định trước các tài liệu cũ bên dưới.
Yêu cầu mới của chủ dự án: FLUX.1 Schnell qua Cloudflare, cloud lưu ảnh, MongoDB local replica set, FE/BE chạy máy nhóm, ngân sách dịch vụ 0 đồng trong hạn mức.
Azure Blob private đã chốt, dùng Azure for Students hiện có. Đọc `docs/technical-baseline/07-STORAGE-PORTABILITY.md`: tách adapter, registry theo từng record, giữ private/ID/ownership khi chuyển Cloudinary. Không triển khai cả hai provider ở MVP; không đổi cloud chỉ bằng replace URL.
Các câu CONFIRMED về Gemini/local-final-storage phía dưới giữ như lịch sử, không còn là chỉ dẫn triển khai. Local checkpoint tạm vẫn có thể dùng cho recovery.
Không áp dụng skill `gemini-image-generation` cho FLUX; không cài `@google/genai` theo tài liệu cũ. Phần không xung đột (API prefix, session, 5 collections, UI, security, lifecycle) giữ nguyên.
Bộ baseline là tài liệu, không phải bằng chứng runtime đã đổi; các PROPOSAL về package/limits/auth policy cần duyệt khi triển khai.

Đã có task tích hợp: đọc `docs/technical-baseline/08-IMPLEMENTATION-STATUS.md` cho contract cụ thể, dependency được chọn và giới hạn test; hướng dẫn máy mới tại `docs/development/LOCAL_RUN.md`. Không coi phần hiện trạng cũ phía dưới là endpoint hiện tại.

## 1. Project context

- Product: FLUX STUDIO, website tạo và quản lý ảnh từ mô tả tự do.
- Verified local stack: React + Vite + Tailwind CSS + TypeScript ở `frontend/`; Node.js + Express + TypeScript + ES Modules ở `backend/`.
- Backend foundation đã có scaffold cho Node.js + Express + TypeScript, Mongoose, cấu hình môi trường, kết nối MongoDB, health/error handling và 5 model. Điều này không chứng minh MongoDB đã kết nối thành công hoặc các luồng nghiệp vụ đã hoạt động.
- Kiến trúc backend đã xác nhận: MongoDB + Mongoose, Google Gemini API qua official `@google/genai`, local filesystem cho demo và `/api/v1`. Authentication, provider calls, generation workflow và image delivery vẫn cần được triển khai theo phase đã duyệt.
- Canonical product requirements: GitHub Issue #1 và `PRD.md` trong repository.
- Canonical visual requirements: `writing-block.md`, Rule `FLUX-UI-001`, theme `Midnight Aurora`.

Không coi scaffold hiện tại là bằng chứng rằng database, authentication, provider AI hoặc storage đã hoạt động.

## 2. Source of truth and reading order

Trước mỗi task, kiểm tra `git status`, diff hiện có và cấu trúc liên quan. Với task UI, layout, màu, component hoặc UX, bắt buộc đọc toàn bộ `writing-block.md` trước khi sửa code.

Áp dụng nguồn theo thứ tự:

1. GitHub Issue #1: phạm vi màn hình, route, P0/P1, hành vi và nghiệm thu.
2. `writing-block.md`: token, tone, bố cục thị giác và accessibility.
3. `PRD.md`: kiến trúc, domain, API đề xuất, dữ liệu và rủi ro.
4. `docs/`: bản tóm tắt và workflow đã chuẩn hóa; không được vượt qua nguồn gốc.

Nếu nguồn mâu thuẫn, giữ cả hai, ghi vào `docs/project/OPEN_QUESTIONS.md` và hỏi xác nhận. Không tự sửa `writing-block.md`, không đổi token, không biến đề xuất thành yêu cầu đã chốt.

Phân loại mọi quyết định trong báo cáo là `CONFIRMED`, `PROPOSAL` hoặc `OPEN QUESTION`.

## 3. Scope and architecture

- Hoàn thành P0 trước P1. Tính năng ngoài MVP không được tự thêm.
- Mỗi lần tạo chỉ tạo một ảnh; chỉ CTA “Tạo ảnh” được khởi tạo generation.
- Tái sử dụng layout, component và token chung; tránh abstraction khi chưa có nhu cầu lặp lại.
- Frontend không được tự quyết định quyền, quota, model, secret hoặc trạng thái thành công.
- Backend lấy user từ session đã xác thực, kiểm tra ownership và quota trên mọi API.
- Thống nhất API contract trong `docs/development/FRONTEND_BACKEND_CONTRACT.md` trước khi chia task.

## 4. Code quality and maintainability

- Giữ TypeScript strict, tên biến/hàm mô tả đúng nghiệp vụ, module có một trách nhiệm chính.
- Validate ở boundary; không truyền nguyên body/query vào MongoDB. Lỗi trả về mã an toàn, không stack trace hoặc secret.
- Idempotency, lease, checkpoint và upsert phải được dùng đúng nơi; không dùng retry mù cho tác vụ tạo ảnh.
- Không tạo dữ liệu giả và không trình bày mock như dữ liệu thật. Mock phải được gắn nhãn rõ.
- Không thêm dependency, đổi cấu trúc, đổi provider hoặc chạy migration nếu task chưa cho phép.

## 5. UI and UX rules

- `writing-block.md` là single source of truth cho palette và visual language. Không hardcode màu ngoài token root, không tạo theme khác.
- Giữ tone Midnight Aurora: nền navy tối, surface tối, accent tím–xanh–cyan có kiểm soát; artwork là điểm nhấn.
- Layout phải responsive, không overflow ngang; interactive control phải dùng được bằng keyboard và có focus rõ.
- Luôn xử lý loading, empty, error, success, queued, processing, saving, failed và needs_review khi màn hình liên quan.
- Không tạo control giả: không thêm search, light mode, bell, style dropdown, multi-image hoặc Advanced nếu backend/Issue chưa xác nhận.
- Ảnh phải được hiển thị đúng khung, không phủ filter làm sai màu artwork.

## 5.1. Image asset rules

- Trước mọi task liên quan ảnh/visual, đọc `docs/design-system/IMAGE_ASSET_WORKFLOW.md` để biết quy trình kiểm tra asset, tìm kiếm, xác minh nguồn gốc và gắn nhãn demo.
- Không trình bày stock/reference/placeholder như ảnh thật do FLUX API tạo; không đổi token FLUX-UI-001 để phù hợp ảnh sai chủ đề.

## 5.2. Animation and motion rules

- Read `docs/design-system/MOTION_AND_ICON_RULES.md` for tasks involving motion, transitions, loading, dialogs, drawers, tabs or route changes.
- Inspect existing animation patterns and dependencies first; prefer CSS and do not add a package without explicit approval.
- Motion must serve interaction feedback, hierarchy or UI state. Keep it short, smooth and non-disruptive; avoid layout shift, flashing, shaking, strong parallax and continuous decorative motion.
- Respect `prefers-reduced-motion`, keyboard focus and semantic status text. Motion must not be the only way to communicate a state.

## 5.3. Icon system rules

- Read `docs/design-system/MOTION_AND_ICON_RULES.md` for tasks that add or replace icons.
- Prefer the existing repository icon set; do not install a new icon library or mix incompatible icon styles without approval.
- Choose icons by meaning, with consistent stroke/fill, size, alignment, contrast and hit area.
- Do not use emoji as the primary icon for navigation, forms or product controls. Icon-only buttons require an accessible name and visible focus state.
- Do not draw complex SVG when an existing icon provides the same meaning; do not use color alone to communicate state.

## 6. Security and user data

- Secret API key, session secret, database URL và storage credential chỉ ở server/environment; không commit secret thật.
- Mật khẩu phải hash bằng thư viện uy tín; session cookie phải HttpOnly và cấu hình Secure khi chạy HTTPS.
- Kiểm tra authentication, authorization và ownership ở backend; ObjectId không thay thế authorization.
- Không log mật khẩu, token, API key, Base64 ảnh hoặc prompt ngoài nơi thực sự cần.
- Không để frontend truyền `userId` tùy ý để quyết định phạm vi truy vấn.

## 7. Business state invariants

`queued → processing → saving → succeeded`; lỗi có thể chuyển `failed`; kết quả không xác định chuyển `needs_review`.

- Chỉ báo thành công khi file và metadata đã lưu được.
- Nhấn nhiều lần hoặc gửi lại cùng `Idempotency-Key` không tạo job/khấu trừ quota lần hai.
- Timeout hoặc mất kết nối sau khi gửi provider không đủ căn cứ để tạo lại job.
- Thư viện chỉ hiển thị ảnh đã lưu; lịch sử giữ cả job lỗi và ảnh đã xóa.
- Không gọi AI khi mở thư viện, chi tiết, tải ảnh hoặc chỉ đang gõ prompt.

## 8. Skills and documentation

Skills trong `.agents/skills/` là workflow chuyên biệt; `AGENTS.md` là quy tắc nền. Skill không được nới scope, lặp lại toàn bộ PRD hoặc ghi đè rule này.

- Mọi backend task phải đọc `docs/development/BACKEND_RULES.md` và tài liệu domain/API được trỏ từ đó.
- Chọn skill theo phần việc: `express-api-development`, `mongodb-mongoose`, `authentication-session`, `gemini-image-generation`, `backend-testing`. Dùng `backend-api` để giữ contract nghiệp vụ, ownership, quota, idempotency và safe errors; skill Express không thay thế các quy tắc đó.

- `frontend-design`: thiết kế theo token và ảnh tham chiếu.
- `create-page`: xây page đã có route/nghiệp vụ xác nhận.
- `create-component`: xây component tái sử dụng có contract rõ.
- `backend-api`: phát triển API an toàn, không bịa endpoint/schema.
- `express-api-development`: route/controller/service và HTTP boundary đã được contract xác nhận.
- `mongodb-mongoose`: schema, index, query và persistence theo database design.
- `authentication-session`: auth/session cookie và CSRF khi chi tiết deployment đã được chốt.
- `gemini-image-generation`: tích hợp Gemini server-side theo model, quyền truy cập và chi phí đã xác minh.
- `backend-testing`: kiểm thử backend an toàn, cô lập database/provider và đúng invariant.
- `api-integration`: nối frontend/backend theo contract và trạng thái job.
- `ui-review`: review UI bằng bằng chứng so với nguồn thiết kế.
- `code-review`: review correctness, security, regression và scope.
- `pr-preparation`: chuẩn bị PR, kiểm thử và báo cáo giới hạn.

Khi skill cần nguồn chi tiết, đọc tài liệu liên quan trong `docs/`. Cơ chế discovery và cách gọi được ghi trong `docs/development/AGENT_SKILLS.md`. Không coi việc file nằm trong `.agents/skills/` là bằng chứng đủ cho mọi runtime; xem tài liệu đó để biết cách kích hoạt theo từng công cụ.

## 9. Team collaboration

- Ba thành viên cùng đọc `AGENTS.md`, `PRD.md`, `writing-block.md` và docs chung trong cùng repository.
- Trước khi sửa file, kiểm tra `git status` và diff; giữ nguyên thay đổi chưa commit của người khác.
- Tránh sửa đồng thời file chung; mỗi endpoint/màn hình có một owner và một reviewer chéo.
- Không tự commit, push, merge, reset hoặc checkout phá hủy. Không xóa file chưa rõ quyền sở hữu.
- Nếu scope hoặc contract chưa rõ, ghi câu hỏi và dừng phần phụ thuộc thay vì tự mở rộng.

## 10. Verification and reporting

Sau thay đổi, chạy kiểm tra phù hợp với phạm vi: link/path, validator skill, typecheck/build/test/lint hoặc visual check nếu có. Chỉ báo “đã kiểm tra” khi đã thực sự chạy.

Báo cáo phải nêu: file tạo/cập nhật, nguồn đã đọc, quyết định `CONFIRMED/PROPOSAL/OPEN QUESTION`, kiểm tra đã chạy, giới hạn còn lại và xác nhận không có thay đổi ngoài scope.

## 10.1. Existing UI reference rules

- Resolve Home/Login versus Dashboard/Login terminology against the repository before coding. In
  the current source, `/` renders `DashboardPage` and `/login` renders `LoginPage`; this is
  implementation evidence, not permission to add an unconfirmed route.
- Before implementing a new screen, read `docs/design-system/IMPLEMENTED_UI_REFERENCE.md` and
  inspect the cited source files. Reuse its measured token, typography, spacing, breakpoint,
  component, image and motion patterns.
- Treat screenshot/reference/demo imagery and local preview data as reference only. Keep the
  `reference/demo` label and do not claim authenticated records, generated output or provider
  state without a confirmed contract.
- If the implemented preview conflicts with a canonical product/design rule, record an
  `OPEN QUESTION`; do not silently redesign the existing screen in a new feature task.

## 11. Current setup-task boundary

Task thiết lập rules/skills/docs chỉ được tạo hoặc cập nhật `AGENTS.md`, `.agents/skills/` và tài liệu hướng dẫn trong `docs/`. Không triển khai màn hình React, component sản phẩm, API nghiệp vụ, MongoDB/FLUX integration, dữ liệu demo, dependency mới hoặc sửa `writing-block.md`.
