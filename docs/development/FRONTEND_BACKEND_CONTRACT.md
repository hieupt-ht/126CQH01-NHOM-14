> **Chốt01/11:** Cloudinary authenticated là storage MVP, không bắt buộc credential khi generation tắt và chưa cấu hình cloud. [Quyết định hiện hành](../technical-baseline/09-CLOUDINARY-DECISION.md) thay các lựa chọn provider cũ bên dưới.

> **Implementation30/10:** Endpoint/DTO/cookie/schema thực thi mới được ghi tại [08-IMPLEMENTATION-STATUS](../technical-baseline/08-IMPLEMENTATION-STATUS.md). Đọc08 trước các proposal/lịch sử bên dưới.

> **Cập nhật 30/10/2026:** Đọc [baseline kỹ thuật mới](../technical-baseline/README.md) trước. Các lựa chọn Gemini/local làm storage cuối trong nội dung bên dưới là lịch sử và đã được thay bởi hướng FLUX/cloud. API/schema tương thích vẫn được giữ; Azure Blob private đã chốt, có adapter/migration để đổi Cloudinary theo baseline07. Không dùng đề xuất cũ để tự bật dịch vụ hoặc sửa code.

# Frontend/Backend Contract

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
