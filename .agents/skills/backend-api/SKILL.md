---
name: backend-api
description: Design or implement a confirmed FLUX STUDIO Node.js API with validation, session security, ownership, quota, idempotency and safe errors.
---

# Backend Api

## Use when

Use for a backend endpoint, controller, service, middleware or contract change that is explicitly in scope. Do not invent endpoints, schemas or provider behavior.

## Read first

1. `AGENTS.md`.
2. `docs/development/FRONTEND_BACKEND_CONTRACT.md`.
3. Relevant `PRD.md` sections for lifecycle, MongoDB, security and API.
4. Existing backend architecture, package configuration and migrations/scripts before changing them.

## Workflow

1. Confirm method, path, priority, request, response, status codes and ownership scope.
2. Validate and normalize only allowed fields; reject invalid prompt, oversized input and unknown mutation fields.
3. Authenticate from the server-side session and enforce ownership on every read, update, delete and download.
4. For generation, resolve an existing `Idempotency-Key` before quota reservation; reserve quota and active-job state atomically where supported.
5. Keep provider/storage calls outside database transactions. Use job state, lease, checkpoint and idempotent upsert for recovery.
6. Return safe error codes/messages. Do not expose API keys, passwords, Base64, provider stack traces or another user's existence.
7. Add tests for unauthorized, ownership, duplicate request, quota boundary, provider uncertainty and storage failure.

## Never

- Trust `userId` from the frontend.
- Retry uncertain image generation automatically.
- Claim success before file and metadata persistence.
- Log secrets or pass raw request bodies to MongoDB.
- Add payment, community, editing, multi-image or unconfirmed provider parameters.

## Completion checklist

- [ ] Contract and scope are confirmed.
- [ ] Validation, authentication, authorization, quota and idempotency are covered.
- [ ] Error/status behavior is safe and documented.
- [ ] Relevant tests/build/type checks were run.
- [ ] No secret, schema or endpoint was added without approval.
