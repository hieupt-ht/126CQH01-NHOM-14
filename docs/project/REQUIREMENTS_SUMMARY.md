# Requirements Summary

## Sources and status

| Source | Role | Status |
|---|---|---|
| GitHub Issue #1 | UI scope, screens, routes, interaction and acceptance | CONFIRMED source for the current frontend issue |
| `PRD.md` | Product, architecture, data, API proposal and MVP limits | Local planning document; proposals must remain marked |
| `writing-block.md` | FLUX-UI-001 visual system | Canonical local design source; immutable unless owner approves |
| Reference image in Issue #1 | Composition and visual direction | Reference, not a license to copy unapproved controls |

## Product

FLUX STUDIO lets an authenticated user submit one free-form description, create one image, persist the result, and manage their own library and generation history. The interface is Vietnamese and follows the Midnight Aurora dark cinematic system.

## Confirmed P0 surfaces

- `/login`: email/password authentication with field errors and safe request states.
- `/register`: display name, email, password, confirmation and duplicate-email handling.
- `/app/create`: prompt editor, character count, fixed server-selected model, one image per request, usage status, CTA and result states.
- `/app/library`: responsive paginated grid containing only saved images of the current user.
- `/app/images/:id`: image, metadata, prompt, download, rename, delete and safe missing/forbidden states.
- `/app/history`: all generation jobs including queued, processing, saving, succeeded, failed and needs_review.

## Confirmed product invariants

- Only the explicit create CTA starts a generation request.
- Repeated submission with the same idempotency key must not create a duplicate job or consume quota twice.
- Backend owns authentication, authorization, ownership, quota, provider configuration and secrets.
- Success is shown only after image storage and metadata persistence are complete.
- A timeout or uncertain provider result must not trigger an automatic new generation.
- Opening library, detail or download must not call the AI provider.

## P1 and exclusions

P1 includes overview, account settings, title search, date filtering, favorites and quality feedback after P0 is stable. AI editing, input-image upload, stories, consistent characters, multi-image generation, payments, community and user-selected providers are outside the current MVP.
