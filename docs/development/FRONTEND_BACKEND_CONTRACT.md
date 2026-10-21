# Frontend/Backend Contract

This is a coordination document. It records only the endpoints currently described by Issue #1/`PRD.md`; provider-specific API details remain unconfirmed until integration testing.

## Confirmed application endpoints

| Method | Endpoint | Scope |
|---|---|---|
| POST | `/api/auth/register` | P0 |
| POST | `/api/auth/login` | P0 |
| POST | `/api/auth/logout` | P0 |
| GET | `/api/auth/me` | P0 |
| POST | `/api/generations` | P0; requires `Idempotency-Key` |
| GET | `/api/generations/:id` | P0 |
| GET | `/api/generations` | P0 history |
| GET | `/api/images` | P0 library |
| GET/PATCH/DELETE | `/api/images/:id` | P0 image management; favorite is P1 |
| GET | `/api/images/:id/download` | P0 |
| GET | `/api/usage/me` | P0 usage |
| PATCH | `/api/users/me` | P1 |
| GET | `/api/stats/me` | P1 |

## Request and response rules

Generation request is `{ "prompt": "..." }`; frontend does not send provider keys, arbitrary model/steps/count or userId. A newly accepted request returns HTTP `202` with `{ "success": true, "data": { "id": "...", "status": "queued" } }`.

Errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. Known codes include `INVALID_PROMPT`, `UNAUTHENTICATED`, `NOT_FOUND`, `DAILY_LIMIT_REACHED`, `GENERATION_IN_PROGRESS`, `PROVIDER_QUOTA_EXCEEDED`, `GENERATION_FAILED`, `RESULT_UNCERTAIN` and `STORAGE_FAILED`.

Use HTTP 400 for invalid data, 401 unauthenticated, 404 missing/not-owned resources, 409 request conflict, and 429 quota/rate limits. A `200` response must not imply that an asynchronous generation has succeeded.

## State contract

Frontend renders `queued`, `processing`, `saving`, `succeeded`, `failed` and `needs_review` from the server. It may poll only while needed and must stop on terminal state or when leaving the relevant screen. It must not convert uncertain results into a new generation.

## Ownership and security

Backend derives the user from the authenticated session and applies ownership to every read/write/download. Frontend treats server authorization and quota as authoritative.
