> **Implementation30/10:** Endpoint/DTO/cookie/schema thực thi mới được ghi tại [08-IMPLEMENTATION-STATUS](../technical-baseline/08-IMPLEMENTATION-STATUS.md). Đọc08 trước các proposal/lịch sử bên dưới.

> **Cập nhật 30/10/2026:** Đọc [baseline kỹ thuật mới](../technical-baseline/README.md) trước. Các lựa chọn Gemini/local làm storage cuối trong nội dung bên dưới là lịch sử và đã được thay bởi hướng FLUX/cloud. API/schema tương thích vẫn được giữ; Azure Blob private đã chốt, có adapter/migration để đổi Cloudinary theo baseline07. Không dùng đề xuất cũ để tự bật dịch vụ hoặc sửa code.

# Backend Rules

These rules apply to backend design and implementation. `AGENTS.md` remains the always-on repository rule. This file is a focused backend reference, not a replacement for domain/API documents.

## Sources and decision status

- Read `AGENTS.md`, `docs/backend/implementation-plan.md`, `docs/backend/database-design.md`, `docs/backend/api-contract.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, and relevant `PRD.md` sections before changing backend behavior.
- `docs/backend/` and the shared frontend/backend contract hold the detailed schema, endpoint and lifecycle definitions. Preserve their field names, status values and response semantics.
- The implementation contract confirms Node.js + Express + TypeScript, MongoDB + Mongoose, `/api/v1`, opaque server-side sessions with HttpOnly cookies, Google Gemini through official `@google/genai`, local filesystem storage for demo, and five collections: `users`, `sessions`, `generations`, `images`, `dailyUsage`.
- Treat deployment details explicitly labelled `PROPOSAL` or `OPEN QUESTION` as unresolved. Do not silently select a model, quota, retention policy, cookie lifetime, SameSite/CSRF bootstrap, production storage, or password-hash package.
- Older FLUX/Cloudflare and `/api` references in Issue #1 / PRD are legacy where they conflict with the confirmed implementation contract. Preserve the product invariants.

## Architecture and HTTP boundary

- Inspect existing scaffold, package scripts, module layout, middleware and tests before editing; extend the existing structure.
- Keep routes responsible for mapping HTTP methods/paths and middleware, controllers for HTTP input/output, services for business orchestration, models for persistence schema, and providers/storage behind focused adapters. Avoid generic layers without multiple real consumers.
- Validate and normalize every path, query, header and body at the boundary. Pass only whitelisted typed values into services and MongoDB; never spread raw request objects into filters or updates.
- Use `/api/v1` and the shared response/error contract. Do not add an endpoint, field, status or behavior without updating its canonical contract and resolving open questions.
- Centralize safe error mapping. Client responses must not contain stack traces, secrets, raw provider payloads, filesystem paths, password hashes, tokens or image Base64.

## MongoDB and domain invariants

- Follow `docs/backend/database-design.md` exactly for collection and field names, required fields, enums, references and declared indexes. Do not add `user_settings` without an approved need.
- Derive ownership scope only from the authenticated backend session. Scope every image/generation query and mutation by owner; ObjectId is not authorization.
- Preserve one prompt to at most one image, the lifecycle `queued → processing → saving → succeeded` with `failed` / `needs_review` outcomes, idempotency, UTC daily quota, and at most one active generation per user.
- Resolve an idempotency replay before reserving quota. Same key and same canonical payload returns the existing job without another reservation/inference; same key with a different payload conflicts. Do not retry an uncertain provider outcome blindly.
- Keep provider and filesystem work outside MongoDB transactions. Use atomic database operations for reservations and explicit recovery/checkpoints where the approved design requires them. Do not assume a standalone local MongoDB supports transactions.
- Apply index changes deliberately. Never drop production data or call destructive index synchronization as routine startup behavior. Audit existing data before introducing a unique index that could fail on duplicates.

## Authentication and security

- Authentication uses an opaque server-side session and HttpOnly cookie; JWT is out of scope. Persist a hash of a cryptographically random session token, never the raw token. Hash passwords with an approved reputable package; the exact package remains open until selected.
- Set Secure for HTTPS deployments. Final SameSite, cookie lifetime, CSRF bootstrap/header and allowed origins depend on deployment topology and remain open; do not treat a proposal as a confirmed policy.
- Use exact-origin CORS allowlisting for credentialed requests, appropriate request-size limits and security headers. Protect unsafe cookie-authenticated actions with the agreed CSRF and origin policy before frontend integration.
- Keep database URLs, session secrets, Gemini keys and storage credentials in server environment configuration. Never commit real secrets, echo them in errors, or log them.
- Keep private image files outside public/static roots. Deliver them only through authenticated owner-scoped routes with safe content/disposition headers and private cache policy.

## Gemini and local image storage

- Use only the official Node.js SDK `@google/genai`, from the server. Read current Google documentation and verify image-generation capability, project access, limits and pricing for the selected model before enabling calls. Model ID comes from `GEMINI_IMAGE_MODEL`; the API key comes from `GEMINI_API_KEY`. Do not presume a free tier, enable billing, or make a billable request without explicit authorization.
- Do not send Gemini requests from the frontend. Never log the key, raw response, or image bytes. An ambiguous timeout after dispatch is `needs_review` unless provider evidence proves the call was not accepted; do not retry inference blindly.
- For local demo storage, use a configured root (proposed default `backend/data/images`) outside any web static root. Generate opaque server-owned filenames; do not use prompts, user filenames or client paths as disk paths. Validate decoded file size, allowed MIME and file signature before persistence; use restrictive filesystem permissions and safe atomic temp-write/rename where supported.
- Create an `images` metadata record only for a validated persisted result. Mark generation `succeeded` only after file and metadata are persisted. On failure, remove temporary/partial files and compensate metadata/state safely; make cleanup idempotent and retain cleanup/reconciliation evidence when deletion fails. User deletion hides the image from Library immediately while generation history remains; physical file cleanup follows the approved retryable deletion policy.
- Local storage is single-host/demo storage: replicas do not share files, ephemeral disks can lose them, and backup/retention/durability require a deployment decision before production.

## Change and verification workflow

- Check `git status`, diff and existing code first. Preserve unrelated work. Do not switch branches, commit, push, reset or delete unclear files.
- Keep changes within the authorized task. Do not touch frontend, install dependencies, connect databases, call paid providers or create secrets unless explicitly authorized by the implementation task.
- Run checks relevant to changed code and report exact commands/results. Database/provider tests must use isolated test resources; do not claim an integration check when no test MongoDB/provider access was configured.
- Report files changed, decisions as `CONFIRMED`, `PROPOSAL` or `OPEN QUESTION`, verification evidence, remaining risks and scope boundaries.

## Related skills and canonical references

- `backend-api`: domain/API contract, ownership, quota, idempotency and safe errors.
- `express-api-development`: Express HTTP structure and boundary validation.
- `mongodb-mongoose`: exact schemas, indexes and persistence behavior.
- `authentication-session`: server-side sessions, cookie security and CSRF.
- `gemini-image-generation`: official provider integration and generation recovery.
- `backend-testing`: isolated API, schema, security and lifecycle tests.
- Canonical details: `docs/backend/database-design.md`, `docs/backend/api-contract.md`, `docs/backend/implementation-plan.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, `docs/development/CODING_RULES.md`, and `docs/development/QUALITY_CHECKLIST.md`.
