# Scope and Priorities

## P0 — complete first

1. Register, login, logout and current-session handling.
2. One free-form prompt and one image per accepted generation request.
3. Job lifecycle: `queued`, `processing`, `saving`, `succeeded`, `failed`, `needs_review`.
4. Durable image file plus metadata; reload-safe status and result.
5. Own-library grid, detail, download, rename, delete and paginated history.
6. Authentication, ownership checks, quota checks and duplicate-request protection.
7. Safe loading, empty, error, quota and uncertain-result states.
8. MongoDB validation/index/aggregation evidence required by the course.

## P1 — only after P0 is stable

- Overview page and personal statistics.
- Basic profile name update and usage summary.
- Search by title, date filters and favorites within the library.
- Quality feedback for generated results.

## Explicitly out of scope

- Stories/comics and consistent characters.
- Multiple output images per request.
- Payments, community, public sharing and provider selection in the UI.
- Automatic prompt rewriting or translation.
- Admin UI unless a later approved requirement adds it.

## Approved scope update — 08/11/2026

**CONFIRMED by the project owner in this implementation request:** the existing prompt composer accepts one reference image by file selection or paste, previews/removes it, then submits it with the prompt to create one new result. This does not add editing of a saved library image or a multi-turn chat.

Issue [#36](https://github.com/hieupt-ht/126CQH01-NHOM-14/issues/36) still describes the feature as research-only. Its tracking status needs alignment with this explicit implementation decision before the issue is treated as closed/accepted evidence. See `PRD.md` §4.2 and `docs/development/FRONTEND_BACKEND_CONTRACT.md` for the approved implementation scope.

The excluded scope remains: stories/comics, consistent characters, multiple output images per request, payments, community, public sharing, provider selection and admin UI.
