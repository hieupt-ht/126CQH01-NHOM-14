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

- AI image editing, input-image upload, stories/comics and consistent characters.
- Multiple output images per request.
- Payments, community, public sharing and provider selection in the UI.
- Automatic prompt rewriting or translation.
- Admin UI unless a later approved requirement adds it.

Any change to this list is an OPEN QUESTION until the team records it in the issue and updates the source documents.
