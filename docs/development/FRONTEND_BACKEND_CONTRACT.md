> **Chốt01/11:** Cloudinary authenticated là storage MVP, không bắt buộc credential khi generation tắt và chưa cấu hình cloud. [Quyết định hiện hành](../technical-baseline/09-CLOUDINARY-DECISION.md) thay các lựa chọn provider cũ bên dưới.

> **Implementation30/10:** Endpoint/DTO/cookie/schema thực thi mới được ghi tại [08-IMPLEMENTATION-STATUS](../technical-baseline/08-IMPLEMENTATION-STATUS.md). Đọc08 trước các proposal/lịch sử bên dưới.

> **Cập nhật 30/10/2026:** Đọc [baseline kỹ thuật mới](../technical-baseline/README.md) trước. Các lựa chọn Gemini/local làm storage cuối trong nội dung bên dưới là lịch sử và đã được thay bởi hướng FLUX/cloud. API/schema tương thích vẫn được giữ; Azure Blob private đã chốt, có adapter/migration để đổi Cloudinary theo baseline07. Không dùng đề xuất cũ để tự bật dịch vụ hoặc sửa code.

# Frontend/Backend Contract

## Thiết lập tạo ảnh và giao diện — 04/11/2026 (CONFIRMED)

Chủ dự án yêu cầu chế độ sáng/tối, khung hình và chủ đề theo ảnh mẫu; bỏ control
số lượng ảnh. Một lượt vẫn tạo một ảnh. Đây là phạm vi bổ sung theo yêu cầu trực
tiếp, thay phần hoãn các control này trong tài liệu cũ.

- `POST /api/v1/generations` nhận `{prompt, aspectRatio?, style?}`. Tỷ lệ:
  `auto` (mặc định), `1:1`, `16:9`, `9:16`, `4:3`, `3:4`. Chủ đề/phong cách:
  `none` (mặc định), `watercolor`, `cinematic`, `photographic`, `illustration`, `anime`.
  Field lạ, enum sai và số lượng ảnh đều bị từ chối400.
- Job DTO trả `aspectRatio` và `style`; record cũ thiếu settings tương ứng đọc
  thành `auto`/`none`. Lưu lựa chọn trong `generations.settings` hiện có, không
  thêm collection/migration. `originalPrompt` giữ nguyên; chỉ dẫn phong cách
  được backend thêm vào `submittedPrompt`, kiểm tra tổng độ dài2048 trước quota.
- Fingerprint gồm prompt+tỷ lệ+style khi có lựa chọn khác mặc định; cùng key đổi
  lựa chọn trả409. Request cũ/giá trị mặc định giữ fingerprint nguyên văn cũ.
  FE giữ key và toàn bộ payload trong sessionStorage khi chưa rõ kết quả, khóa
  lựa chọn trong lúc gửi/active/chờ kiểm tra lại và khôi phục lựa chọn từ job DTO.
- Theo lựa chọn trực tiếp của chủ dự án, **giữ toàn bộ ảnh, thêm viền trắng**:
  FLUX không nhận tham số kích thước chưa được tài liệu hóa. Worker giữ checkpoint
  bytes gốc; mỗi lần saving tạo canvas PNG đúng tỷ lệ bằng extend, không crop,
  stretch hoặc phóng to pixel gốc. Giữ giới hạn4096px/10MiB, lưu metadata/integrity
  theo file cuối; retry saving không thêm inference. `auto` giữ nguyên bytes.
- Light/dark dùng preference localStorage `flux.theme`, mặc định dark, không gọi
  API, không thay màu artwork; light palette tập trung trong token root theo yêu
  cầu này. Không đổi `writing-block.md` hoặc token dark gốc.

Giới hạn: chủ đề là chỉ dẫn văn bản, không bảo đảm model bám100%; tỷ lệ là khung
có viền sau xử lý, không phải ảnh được FLUX render trực tiếp ở kích thước đó.
Máy đang chạy cần restart backend để nhận contract mới; không tự commit/push.

## Hạn mức cá nhân — 04/11/2026 (CONFIRMED)

Theo yêu cầu chủ dự án, `DAILY_USER_LIMIT` mặc định20 lượt/người/ngày UTC.
`DAILY_APP_LIMIT` giữ20 lượt/ngày cho toàn ứng dụng, không phải20 lượt dành
riêng cho từng người. Backend kiểm tra cả hai; quota đã dùng hôm nay giữ nguyên,
không reset hoặc hoàn lượt. Giá trị môi trường có thể ghi đè các mặc định này.

## Prompt tiếng Việt — thử nghiệm local 04/11/2026 (CONFIRMED)

Theo yêu cầu sửa prompt tiếng Việt của chủ dự án, bật thử bản dịch ở local.
`PROMPT_TRANSLATION_ENABLED=true` được truyền từ `.env` gốc qua Compose;
mặc định false, production vẫn bị chặn. API vẫn nhận `{prompt}` và trả prompt
gốc; không đổi endpoint/DTO/schema. Khi bật, text có dấu Việt (cả NFC/NFD)
được dịch bằng M2M100 trước transaction tạo job, lưu nguyên văn `originalPrompt`
và lưu bản dịch ở `submittedPrompt`; worker chỉ gửi trường sau cho FLUX.
Nhận diện dùng bản sao NFC, không thay nội dung gốc hoặc fingerprint.
Tiếng Anh giữ nguyên; tiếng Việt không dấu chưa được nhận diện đáng tin cậy.
Lỗi dịch trả502 `GENERATION_FAILED`, bản dịch quá2048 UTF-16 trả400
`INVALID_PROMPT`, chưa tạo job/trừ quota; không fallback âm thầm sang prompt gốc.
Replay dùng original fingerprint, không dịch hoặc inference lại job đã có.
Hai request đồng thời trước khi lưu job vẫn có thể gọi dịch trùng (giới hạn
prototype hiện có); transaction giữ một job/một quota reservation.
Quyết định triển khai chung và đánh giá ảnh/usage ở #25 vẫn **OPEN QUESTION**.

**CONFIRMED — bổ sung cùng ngày:** bản dịch thật của lần tạo người dùng báo
đã mất đoạn màu nước. Adapter bảo vệ các chỉ dẫn màu nước khẳng định, rõ ràng:
nếu thiếu watercolor/watercolour trong bản dịch, thêm `Watercolor painting.` ở đầu.
Mệnh đề có phủ định, dấu trích dẫn hoặc lựa chọn/điều kiện mơ hồ không được suy diễn
thành yêu cầu màu nước. Không thêm texture/ánh sáng/chủ thể hoặc gọi AI thêm.
`submittedPrompt` chứa chính xác bản sau bảo vệ, kiểm tra2048 sau khi bổ sung;
`originalPrompt`/fingerprint/replay/history không thay đổi. Đây là bộ bảo vệ hẹp,
không nhận diện mọi cách diễn đạt/phong cách, không bảo đảm ngữ nghĩa bản dịch khác.

**CONFIRMED — cập nhật theo ảnh mẫu do chủ dự án gửi:** chỉ dẫn màu nước nay
được diễn đạt bằng nét cọ, màu loang trong, cạnh mềm, vân giấy và khoảng giấy trắng
trong tiền tố `Hand-painted watercolor illustration ...`. Áp dụng cho yêu cầu màu
nước rõ ràng kể cả khi bản dịch đã có từ watercolor; vẫn giữ nguyên nội dung
bản dịch phía sau. Đây là đặc điểm phong cách được yêu cầu thêm qua ảnh mẫu,
không tự thêm chủ thể/bố cục từ ảnh hoặc xử lý ảnh tham chiếu qua provider.
Giới hạn2048 kiểm tra trên toàn bộ prompt cuối; không tăng số call/model/steps.

## Tên hiển thị người dùng — D2, 02/11/2026 (CONFIRMED)

`displayName` là field hiện hành xuyên suốt MongoDB, request/response API và frontend.
Register gửi `{displayName,email,password}`; login/me/register/profile update trả
`data.user.displayName`; `PATCH /api/v1/users/me` gửi `{displayName}` trim1–80 ký tự.
`users.name` trong PRD cũ chỉ là tên lịch sử của cùng khái niệm, không phải alias API.
Không đổi tên biến form nội bộ `fullName` nếu payload đã map đúng sang `displayName`.
Xem [ánh xạ PRD–schema–API–FE và bằng chứng code](../backend/database-design.md#user-display-name-contract).
Task D2 chỉ cập nhật tài liệu, không đổi schema hoặc migrate database.

## Library/Detail/History — hiện hành 02/11/2026 (CONFIRMED)

Theo [phân công cập nhật #17](https://github.com/hieupt-ht/126CQH01-NHOM-14/issues/17#issuecomment-6560294331)
và [baseline08](../technical-baseline/08-IMPLEMENTATION-STATUS.md), phần dưới đây ưu tiên hơn các bảng proposal cũ:

- `GET /api/v1/images` và `/generations`: `{items,nextCursor}`, default20/max50,
  thứ tự giảm dần `(createdAt,_id)`. Cursor là base64url canonical của `{date,id}`;
  truyền cursor rỗng/sai encoding/sai cấu trúc trả400 `INVALID_CURSOR`.
- Image list DTO giữ các trường baseline08, bổ sung `model` từ generation cùng owner
  để card hiển thị model thật; chuỗi rỗng nếu tham chiếu không còn hợp lệ. Không copy model vào schema ảnh.
- Detail trả DTO ảnh cùng `prompt`/`model`; PATCH chỉ nhận `{title}` trim1–120, trả200 DTO ảnh.
  Không hỗ trợ favorite ở P0.
- DELETE trả204 sau soft-delete, `storageDeletionStatus=pending`; không khẳng định cloud đã xóa,
  không hoàn quota, giữ generation. History list/detail có `imageDeleted`.
- `/images/:id/content` và `/download` đã CONFIRMED; stream sau auth/owner check,
  `Content-Type=image/{png|jpeg|webp}`, `Content-Length` theo bytes metadata,
  `Cache-Control: private, no-store`, `nosniff`, disposition inline/attachment.
  Lỗi mở file trả503 `STORAGE_UNAVAILABLE`; stream lỗi giữa chừng bị ngắt để browser nhận lỗi tải.
- Missing/not-owned cùng404 cho detail, content, download, PATCH, DELETE và job detail.
- FE lưu cursor/back stack/vị trí qua query của route danh sách; `returnTo` chỉ nhận
  `/app/library` hoặc `/app/history`. `/app/history?job=<id>` mở drawer lần tạo,
  không tạo job. Polling dừng khi terminal/rời trang/lỗi; tải lại trạng thái chỉ GET.

Kiểm thử và giới hạn: [bàn giao C/D](TASK_C_D_LIBRARY_HISTORY_HANDOFF.md).

This is the frontend/backend coordination contract for implementation. The current auth decision (01/11/2026) is HS256 JWT in an HttpOnly cookie with MongoDB session revocation. The frontend continues to use `credentials: include`; it must not store or decode auth tokens. Cloudflare FLUX and Cloudinary authenticated storage remain current providers. Older Gemini/local storage text is historical where it conflicts with the latest baseline.

## Application endpoint map

The existing endpoints retain Issue #1/PRD semantics under the confirmed `/api/v1` prefix. The private inline content route is a **PROPOSAL** to give Library/Detail a private image URL and must be confirmed before frontend implementation.

| Method | Endpoint | Scope |
|---|---|---|
| POST | `/api/v1/auth/register` | P0 |
| POST | `/api/v1/auth/login` | P0 |
| POST | `/api/v1/auth/logout` | P0 |
| GET | `/api/v1/auth/me` | P0 |
| GET | `/api/v1/auth/csrf` | P0 cookie-CSRF bootstrap |
| POST | `/api/v1/generations` | P0; requires `Idempotency-Key` |
| GET | `/api/v1/generations/:id` | P0 |
| GET | `/api/v1/generations` | P0 history |
| GET | `/api/v1/images` | P0 library |
| GET/PATCH/DELETE | `/api/v1/images/:id` | P0 image management; favorite is P1 |
| GET | `/api/v1/images/:id/content` | P0 **PROPOSAL** private inline image content |
| GET | `/api/v1/images/:id/download` | P0 |
| GET | `/api/v1/usage/me` | P0 usage |
| PATCH | `/api/v1/users/me` | P1 |
| GET | `/api/v1/stats/me` | P1 |

## Request and response rules

Generation request is `{ "prompt": "..." }`; frontend does not send provider keys, arbitrary model/steps/count or userId. A newly accepted request returns HTTP `202` with `{ "success": true, "data": { "id": "...", "status": "queued" } }`.

Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. Known codes include `INVALID_PROMPT`, `UNAUTHENTICATED`, `NOT_FOUND`, `DAILY_LIMIT_REACHED`, `GENERATION_IN_PROGRESS`, `PROVIDER_QUOTA_EXCEEDED`, `GENERATION_FAILED`, `RESULT_UNCERTAIN` and `STORAGE_FAILED`.

Use HTTP 400 for invalid data, 401 unauthenticated, 404 missing/not-owned resources, 409 request conflict, and 429 quota/rate limits. A `200` response must not imply that an asynchronous generation has succeeded.

## State contract

Frontend renders `queued`, `processing`, `saving`, `succeeded`, `failed` and `needs_review` from the server. It may poll only while needed and must stop on terminal state or when leaving the relevant screen. It must not convert uncertain results into a new generation.

## Ownership and security

Backend verifies JWT signature/claims and matching active MongoDB session, derives the user from JWT `sub`, and applies ownership to every read/write/download. Frontend treats server authorization and quota as authoritative.

## Confirmed infrastructure and remaining integration decisions

- Backend may use only the official Google Gen AI Node.js SDK (`@google/genai`); key is server-only and model comes from environment. One prompt produces one image. No free tier or pricing is assumed, billing is not enabled by this contract, and no provider call is authorized by this documentation task.
- Image assets are stored in Cloudinary as authenticated assets. MongoDB stores provider, opaque public ID, asset/version metadata and `deliveryMode`; do not expose Cloudinary credentials or authenticated asset URLs. Any content/download delivery must remain behind authenticated owner-scoped APIs.
- JWT stays in an HttpOnly cookie, Secure under production HTTPS; no token in localStorage or frontend state. Unsafe requests keep Origin + `X-CSRF-Token` checks. Frontend continues `credentials: include`. Exact deployment origins and signing-key rotation policy remain OPEN QUESTION.
- Confirmed product invariants remain: atomic idempotency/quota reservation, one active generation/user, UTC daily reset from PRD (quota values remain OPEN QUESTION), async state lifecycle, `succeeded` only after file + metadata persist, history retains failed/needs_review and deleted-image jobs, library shows saved non-deleted images only, and every resource is owner-scoped.
