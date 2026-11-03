# Bàn giao Định — Thư viện, Chi tiết, Lịch sử và minh chứng MongoDB

Ngày 02/11/2026. **CONFIRMED** theo [bình luận phân công hiện hành #17](https://github.com/hieupt-ht/126CQH01-NHOM-14/issues/17#issuecomment-6560294331).
Reviewer: Hiếu; Vũ kiểm tra đồng bộ giao diện. Đây là hoàn thiện implementation sẵn có,
chưa phải nghiệm thu Cloudflare/Cloudinary live hoặc xác nhận review chéo đã xong.

## Nền code và nguồn đã đối chiếu

- Trước khi sửa: working tree sạch, local `develop` ở `9674f7a`.
- `git fetch origin --prune` xác định local chậm 7 commit; không có remote branch `dev`.
- `git pull --ff-only origin develop` cập nhật tới `eab802f`, gồm PR18/19/20.
- Nhánh làm việc: `codex/library-history-integration`; chủ dự án yêu cầu commit/push sau khi kiểm tra lại vào02/11. PR và review chéo chưa hoàn tất.
- Nguồn: AGENTS.md, Issue1/17 và bình luận mới, writing-block.md, PRD,
  baseline08/09, BACKEND_RULES, FRONTEND_BACKEND_CONTRACT, backend api-contract/database-design/
  implementation-plan, LOCAL_RUN, QUALITY_CHECKLIST và bộ design-system về reference/token/
  layout/accessibility/image/motion/component.
- Skills: api-integration, backend-api, frontend-design, create-component,
  express-api-development, mongodb-mongoose và backend-testing.

## Phần đã hoàn thiện (CONFIRMED)

### Ghép develop và xử lý conflict PR21 — 03/11/2026

- Đã đọc5 commit mới trên `origin/develop` đến `a743c82` (PR22/23): sửa init replica,
  cập nhật usage sau generation và bắt buộc đăng nhập thật trong mọi môi trường.
- Conflict duy nhất ở `frontend/src/services/resources.ts`: giữ `refreshKey` từ develop
  cùng AbortController, data theo resource path và callback reload ổn định của PR21.
  Không chọn bỏ toàn bộ một phía; giữ nguyên các thay đổi khác từ develop.
- Bổ sung regression trong browser script: POST nhận job thật trên DB tạm làm sidebar đổi0/5→1/5;
  fixture kết quả terminal làm số ảnh44→45 sau polling, không cần refresh trang.
  Không chạy worker/inference; kết quả terminal là synthetic DB fixture, không phải output FLUX.
  Các thao tác library/detail/history vẫn0POST generation; chỉ CTA kiểm thử mới gửi1POST, providerCalls=0.
- Chạy lại FE/BE build, unit34 đạt/1skip (thiếu MONGODB_TEST_URI), integration7 đạt/0skip,
  browser360/768/1280/1536px và sidebar refresh regression đạt; không lỗi JavaScript.
  `node --check backend/scripts/docker/init-replica.js` đạt; chưa chạy Docker bootstrap/cloud live.
- UI preview đã bị tắt trên develop; các hướng dẫn bật preview trước đây trong tài liệu này là lịch sử.
  Xử lý conflict trên nhánh PR; chưa merge PR vào develop hoặc main.

- Thư viện dùng ImageCard với file thật qua API; hiển thị model từ generation cùng owner,
  thời điểm và kích thước. Menu xem/tải/đổi tên/xóa dùng semantic HTML và keyboard.
- Rename/delete dùng chung ImageActionDialog với Chi tiết, kiểm tra tên1–120,
  chặn submit trùng trong khi gửi, xác nhận xóa kèm ảnh/tên, Escape/focus trap/focus return.
  Thông báo xóa chỉ nói ẩn khỏi thư viện và giữ lịch sử.
- PrivateImage giữ metadata khi lỗi file, có nút chỉ tải lại file, không gọi generation.
  Chi tiết/lightbox hiển thị đủ ảnh bằng object-fit:contain, giữ palette hiện hành.
- Cursor/back stack nằm trong URL danh sách; link Chi tiết giữ returnTo và scroll.
  Quay lại/refresh không mất trang. ReturnTo chỉ nhận hai route danh sách nội bộ.
- Chi tiết có link `/app/history?job=<id>`; drawer đọc job thật, tải lại lỗi bằng GET,
  polling chỉ khi active và dừng khi terminal/lỗi/unmount. Mobile cũng mở được drawer.
- useResource hủy GET khi rời/chuyển resource, không hiển thị trang cũ dưới cursor mới,
  giữ data khi refresh cùng resource; reload callback ổn định cho polling.
- API cursor kiểm tra canonical base64url, cấu trúc date/id và giới hạn; cursor rỗng/sai trả400.
  Danh sách ảnh join model theo batch tối đa50 generation cùng owner, không N+1 hoặc đổi schema.
- Stream giữ private/no-store, nosniff, MIME, disposition và Content-Length metadata;
  lỗi mở file trả503 an toàn, lỗi giữa stream ngắt tải, không log SDK payload.
- Giữ nguyên owner scope, soft-delete/history/quota và cleanup do worker hiện có quản lý.
  Không sửa auth, worker/provider/storage adapter, package/lockfile, Compose hoặc design tokens.

File triển khai: `frontend/src/pages/{library,detail,history}/`,
`frontend/src/components/library/{ImageCard,PrivateImage,ImageActionDialog}`,
`frontend/src/components/ui/dialogFocus.ts`, `frontend/src/services/{resources,listNavigation}.ts`,
`backend/src/modules/product/routes.ts`, `backend/src/scripts/course-report.ts`.
File kiểm chứng mới: hai script test được mô tả dưới đây, snapshot JSON và tài liệu contract/bàn giao này.

## Kiểm chứng đã chạy

Môi trường: Windows x64, Node24.21.0, MongoDB8.2.6 một replica-set node tạm.
Dependencies backend được cài bằng `npm ci --no-audit --no-fund` từ lockfile hiện hữu;
không thêm hoặc nâng dependency.

| Lệnh | Kết quả |
|---|---|
| `cd frontend; npm run build` | Đạt TypeScript/Vite |
| `cd backend; npm run build` | Đạt TypeScript |
| `cd backend; npm test` | 34 đạt, 1 skip do thiếu MONGODB_TEST_URI |
| `cd backend; npm run test:integration` | 7 đạt, 0 skip; replica set tạm riêng |
| `cd backend; npm run course:report` | Đạt explain/aggregation/$lookup/validator/transaction assertions |
| Browser script bên dưới | API thật + DB tạm + storage stub, Edge headless; không gọi cloud |

Test mới `backend/tests/integration/library-history.test.ts` bao phủ:
45 record cùng timestamp, cursor không mất/trùng, default20/max50, query/cursor sai;
401 và IDOR mọi read/update/delete/content/download/job, missing/not-owned cùng404,
CSRF sai, model DTO không lộ storage, headers/bytes file, lỗi mở và ngắt stream,
rename persist, reject field ngoài whitelist, soft-delete giữ quota/history và failed/needs_review.

Browser script `backend/tests/browser/library-history.ts` chạy từ `backend/`:

```powershell
# Dùng Playwright đã có trên máy, không thêm vào dependency ứng dụng.
$env:PLAYWRIGHT_MODULE = '<đường dẫn tuyệt đối tới package playwright đã cài>'
$env:PLAYWRIGHT_CHANNEL = 'msedge' # hoặc bỏ nếu đã cài Chromium của Playwright
node --import tsx tests/browser/library-history.ts
```

Script tự mở API và Vite test ở loopback5187, dùng DB mới `flux_library_browser_test`,
không đọc credential ứng dụng và không khởi chạy worker. Dừng sau test, DB tạm được dọn.
Ảnh fixture do sharp tạo một màu, nhãn kiểm thử, không phải output FLUX.
Kiểm tra login, cursor refresh, scroll return, rename sau refresh, tải bytes,
modal Tab/Escape/focus, fallback/retry file, deep link job, delete/history;
check overflow tại360/768/1280/1536 với reduced-motion.
Artifacts ảnh chụp/download/report ở `backend/data/library-history-browser/` (gitignored).

## Minh chứng học phần

[Snapshot đo ngày02/11](../backend/evidence/library-history-course-2026-11-02.json)
được rút từ báo cáo chạy thật, không chứa dữ liệu người dùng/credential.

- 10.000 metadata synthetic trong collections `course_*` trên replica set tạm riêng;
  không seed vào 5 collections ứng dụng, không tạo file cloud.
- Trước index: quét10.000 document/0key cho20 kết quả; sau index:
  quét20document/20key cho20 kết quả. Latency lần đo12ms/3ms chỉ mô tả môi trường này.
- Aggregation của owner:143 failed,857 succeeded; đây là status tổng hợp để thực nghiệm.
- `$lookup` images→generations kiểm tra generationId và cùng owner,20 kết quả hợp lệ.
- Transaction qua hai collection: commit1 record và counter1;
  cố ý lỗi ở transaction kế tiếp giữ counter1, không có record bị rollback.
- Raw BSON sai type bị collection validator từ chối. Không tuyên bố đã cài validator
  cho toàn bộ collection sản phẩm.
- 5 collections sản phẩm vẫn là users/sessions/generations/images/dailyUsage.
  Nhúng storage/error/lease vì nhỏ và đọc cùng document; tham chiếu userId/generationId
  để tránh mảng lịch sử không giới hạn. Unique email/request/generation/quota giữ tính duy nhất;
  compound index phục vụ library/history; TTL sessions chỉ dọn rác, auth vẫn kiểm tra expiry.

## Giới hạn và việc cần nhóm xác nhận

### D2 — Đồng bộ displayName/name, 02/11/2026 (CONFIRMED)

Đã rà PRD, docs và code: `name` của user chỉ còn trong bảng collection PRD lịch sử;
schema, auth DTO, profile PATCH và payload frontend hiện dùng `displayName`.
Đã thêm ghi chú ngay tại PRD, bảng ánh xạ trong database-design và dẫn chiếu trong
api-contract, FRONTEND_BACKEND_CONTRACT và baseline08.
Nguồn bằng chứng và đường dẫn code nằm tại [bảng ánh xạ](../backend/database-design.md#user-display-name-contract).
D2 chỉ đổi6 file Markdown; không sửa source/schema/dependency hoặc chạy database/migration.
Kiểm tra: diff/whitespace, relative links/anchors và đối chiếu field với source hiện hành.
Không chạy lại build/test runtime vì không có thay đổi code.

### Các mục còn lại

- **CONFIRMED — D5, 02/11:** đã hoàn thành [đối chiếu import/export](D5_METADATA_IMPORT_EXPORT_AUDIT.md).
  PRD hiện không có tiêu chí import/export bắt buộc; Định cho biết chưa có yêu cầu riêng từ leader/giảng viên.
  Code chỉ xuất báo cáo thực nghiệm, chưa có CLI round-trip metadata. Đã hoàn thành phần đối chiếu, chờ Hiếu xác nhận đủ phạm vi D5;
  không tuyên bố công cụ đã chạy. Nếu phát sinh yêu cầu, chốt phạm vi và áp dụng schema/ownership/chống trùng,
  loại secret, tách cloud backup theo bản đối chiếu trước khi triển khai. Không tự thêm UI/API.
- **OPEN QUESTION:** Hiếu review API/DB, Vũ xác minh UI; chưa đánh dấu issue hoàn tất.
- Chưa smoke test Cloudinary Free authenticated/unsigned URL và FLUX live; không có request cloud,
  không load test Free tier hoặc claim fixture là ảnh thật do FLUX tạo.
- Chưa kiểm chứng toàn bộ trình duyệt/screen reader hoặc deployment production;
  kiểm thử browser hiện tại dùng Edge trên máy local, reduced-motion.
- Không triển khai P1 tìm/lọc/yêu thích, migration, operator UI hoặc cải tiến sau đề tài.
  Các phần auth/hạ tầng của Hiếu và worker/provider/Dashboard của Vũ giữ nguyên ownership.
