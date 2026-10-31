---
name: gemini-image-generation
description: Integrate the official Google Gen AI Node.js SDK for approved server-side image generation with FLUX STUDIO lifecycle, quota and recovery invariants.
---

> HISTORICAL: project target is now FLUX/Cloudflare. Do not invoke this Gemini workflow for current generation work. Read docs/technical-baseline/README.md.

# Gemini Image Generation

## Use when

Use only when a task explicitly authorizes backend Gemini integration. Documentation or tests do not authorize billing changes, credentials, or live provider calls.

## Read first

1. `AGENTS.md`, `docs/development/BACKEND_RULES.md`, `docs/backend/implementation-plan.md` and generation sections of `docs/backend/api-contract.md`.
2. `docs/backend/database-design.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md` and relevant open questions.
3. Current official Google [image generation guide](https://ai.google.dev/gemini-api/docs/image-generation) and [model catalog](https://ai.google.dev/gemini-api/docs/models); verify model generation capability, project access, limits and pricing at implementation time.
4. Existing provider adapter, configuration and test seams.

## Workflow

1. Use official Node.js SDK `@google/genai`. Keep `GEMINI_API_KEY` server-only and obtain the model from `GEMINI_IMAGE_MODEL`; do not hardcode either value.
2. Do not select a model by copying an old example. The exact model, account access, output behavior, quota and pricing are open until checked against current official docs and the project configuration. Do not presume a free tier, enable billing or send a potentially billable request without explicit authorization.
3. Keep the provider behind an adapter returning a narrow typed result. Validate response modalities, MIME/signature and decoded byte limits before storage; never expose provider objects or log keys/base64.
4. Preserve one prompt → at most one image and the server lifecycle `queued → processing → saving → succeeded`, with `failed` or `needs_review` as appropriate. Reserve UTC daily quota and one-active-generation atomically; resolve idempotency before reservation.
5. A provider timeout after dispatch is uncertain: do not blindly retry. Record/reconcile as `needs_review` unless provider evidence establishes safe retry.
6. Persist validated file and image metadata before reporting `succeeded`. Clean partial files on failure and track cleanup/reconciliation failures. Keep local storage outside public/static roots and deliver through authenticated owner-scoped APIs.
7. Unit tests must mock the adapter and label the mock. Live provider tests require separate explicit authorization and a controlled project/budget.

## Configuration example

```dotenv
GEMINI_API_KEY=<server-side secret supplied outside source control>
GEMINI_IMAGE_MODEL=<model verified for the configured Google project>
```

Do not put actual credentials in `.env.example`, docs or logs. This is configuration shape only, not approval for a provider call.

## Acceptance checklist

- [ ] SDK, model capability, project access, output and cost assumptions are verified from current official sources.
- [ ] Secret/model are server-configured and never sent to frontend.
- [ ] Idempotency, quota, active-job and one-image invariants are preserved.
- [ ] Uncertain outcomes are not retried blindly; success requires file + metadata persistence.
- [ ] MIME/signature/size checks, private storage and failure cleanup are tested.
- [ ] No live provider request or billing change occurred without explicit authorization.

## Common mistakes

- Treating an SDK example or model name as proof of current access/pricing.
- Assuming a free tier or making an unapproved test call.
- Retrying a timeout and accidentally generating/charging twice.
- Marking a job successful after provider response but before durable file and metadata persistence.
- Storing provider bytes in MongoDB or exposing local paths/public image URLs.

## References

`docs/development/BACKEND_RULES.md`, `docs/backend/implementation-plan.md`, `docs/backend/api-contract.md`, `docs/backend/database-design.md`, `docs/development/FRONTEND_BACKEND_CONTRACT.md`, `docs/project/OPEN_QUESTIONS.md`, [Google image generation guide](https://ai.google.dev/gemini-api/docs/image-generation), and [Google models](https://ai.google.dev/gemini-api/docs/models).
