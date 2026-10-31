> **Implementation30/10:** Endpoint/DTO/cookie/schema thực thi mới được ghi tại [08-IMPLEMENTATION-STATUS](../technical-baseline/08-IMPLEMENTATION-STATUS.md). Đọc08 trước các proposal/lịch sử bên dưới.

> **Cập nhật 30/10/2026:** Đọc [baseline kỹ thuật mới](../technical-baseline/README.md) trước. Các lựa chọn Gemini/local làm storage cuối trong nội dung bên dưới là lịch sử và đã được thay bởi hướng FLUX/cloud. API/schema tương thích vẫn được giữ; Azure Blob private đã chốt, có adapter/migration để đổi Cloudinary theo baseline07. Không dùng đề xuất cũ để tự bật dịch vụ hoặc sửa code.

# Frontend/Backend Contract

This is the frontend/backend coordination contract for implementation. The project owner confirmed `/api/v1`, opaque server-side sessions with HttpOnly cookies (no JWT), Google AI Studio/Gemini through the official Node.js SDK, and local filesystem storage for local demo. Older `/api` paths and FLUX/Cloudflare details in Issue #1/`PRD.md` are legacy source requirements; implementation follows this confirmed backend decision while preserving the product invariants below. Gemini model ID and access/limits remain integration-time OPEN QUESTION.

## Application endpoint map

The existing endpoints retain Issue #1/PRD semantics under the confirmed `/api/v1` prefix. The private inline content route is a **PROPOSAL** to give Library/Detail a private image URL and must be confirmed before frontend implementation.

| Method | Endpoint | Scope |
|---|---|---|
| POST | `/api/v1/auth/register` | P0 |
| POST | `/api/v1/auth/login` | P0 |
| POST | `/api/v1/auth/logout` | P0 |
| GET | `/api/v1/auth/me` | P0 |
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

Backend derives the user from the authenticated session and applies ownership to every read/write/download. Frontend treats server authorization and quota as authoritative.

## Confirmed infrastructure and remaining integration decisions

- Backend may use only the official Google Gen AI Node.js SDK (`@google/genai`); key is server-only and model comes from environment. One prompt produces one image. No free tier or pricing is assumed, billing is not enabled by this contract, and no provider call is authorized by this documentation task.
- Image files are local for demo/local-first, stored outside public/static roots and delivered through authenticated owner-scoped content/download APIs. Do not expose public URLs or filesystem paths.
- Cookie must be HttpOnly and Secure under production HTTPS. **PROPOSAL:** SameSite=Lax, exact-origin CORS allowlist, origin checks and a session-bound CSRF token/header for unsafe requests. Exact CSRF bootstrap and CORS origins depend on deployment topology and must be agreed before frontend integration; use `credentials: include` when the API origin requires it.
- Confirmed product invariants remain: atomic idempotency/quota reservation, one active generation/user, UTC daily reset from PRD (quota values remain OPEN QUESTION), async state lifecycle, `succeeded` only after file + metadata persist, history retains failed/needs_review and deleted-image jobs, library shows saved non-deleted images only, and every resource is owner-scoped.
