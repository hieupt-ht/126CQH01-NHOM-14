---
name: api-integration
description: Connect FLUX STUDIO frontend flows to the confirmed backend contract with explicit loading/error/job states and safe idempotent retries.
---

# Api Integration

## Use when

Use when wiring a frontend screen or service to an existing/approved backend endpoint. Do not use to define a new endpoint unilaterally.

## Read first

- `AGENTS.md`.
- `docs/development/FRONTEND_BACKEND_CONTRACT.md` and `QUALITY_CHECKLIST.md`.
- The screen specification and existing service/error conventions.

## Workflow

1. Map request, response, HTTP status and error code from the contract; type them explicitly.
2. Send only allowed fields and let the backend own auth, model, quota and ownership.
3. For generation, create one stable idempotency key per user intent and preserve it across a repeated submit; do not generate a new key on every render.
4. Render queued, processing, saving, succeeded, failed and needs_review distinctly. Stop polling on terminal state, page exit or explicit cancellation supported by the contract.
5. Keep prompt/user input on validation or recoverable network errors. Offer “reload status” separately from “create new image”.
6. Retry only safe reads or explicitly idempotent operations with bounded backoff; never blindly retry an uncertain provider submission.
7. Verify unauthorized, not-found, quota, conflict and provider/storage errors using safe user-facing copy.

## Never

- Treat HTTP 200 as generation success while the job is running.
- Fabricate data or metrics when the API is unavailable.
- Put provider secrets in browser code.
- Call AI on typing, library open, detail open or download.

## Completion checklist

- [ ] Contract types and error mapping match the shared document.
- [ ] Duplicate-submit and uncertain-result behavior is safe.
- [ ] Loading/empty/error/success states are visible and accessible.
- [ ] Polling/retry has a stop condition.
- [ ] Integration checks and limitations are reported.
