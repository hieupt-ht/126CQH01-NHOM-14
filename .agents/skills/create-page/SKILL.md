---
name: create-page
description: Create a confirmed FLUX STUDIO page or route with shared layout, design tokens, API states and responsive accessibility.
---

# Create Page

## Use when

Use only when the requested page/route is confirmed in GitHub Issue #1 or an approved follow-up decision. If the route is missing, record an open question instead of creating a placeholder page.

## Read first

- `AGENTS.md`.
- Complete `writing-block.md` and `docs/design-system/*` relevant to the page.
- The Issue screen specification and matching `PRD.md` requirements.
- `docs/development/FRONTEND_BACKEND_CONTRACT.md` for data and status behavior.
- Existing `AppShell`, layouts, components and service conventions.

## Workflow

1. Confirm route, priority, owner and acceptance states.
2. Define the page's content hierarchy and desktop/tablet/mobile composition before coding.
3. Reuse shared layout and primitives; create a new component only when the responsibility is real and typed.
4. Connect only confirmed API contract. Keep server state authoritative for auth, quota, ownership and generation status.
5. Implement default, loading, empty, error, success, unauthorized/not-found and relevant job states.
6. Keep user input on recoverable errors; preserve idempotency and never create a new job from reload, polling failure or `needs_review`.
7. Check keyboard/focus, reduced motion, no horizontal overflow and artwork treatment.

## Never

- Build a blank page, fake route, fake API data or an unconfirmed control.
- Add a feature because it appears in the reference image if Issue #1 excludes it.
- Put secret/provider/quota/ownership decisions in the frontend.
- Announce image success before storage and metadata persistence are confirmed.

## Completion checklist

- [ ] Route and scope are confirmed.
- [ ] Shared layout and tokens are reused.
- [ ] All relevant states and safe recovery actions are present.
- [ ] Mobile/tablet/desktop and accessibility behavior are checked.
- [ ] Relevant build/test checks are run and reported.
