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
- `docs/design-system/IMAGE_ASSET_WORKFLOW.md` when the page uses artwork, background, illustration or gallery fixtures.
- `docs/design-system/MOTION_AND_ICON_RULES.md` when the page introduces motion, loading feedback, icon controls or a new icon treatment.
- The Issue screen specification and matching `PRD.md` requirements.
- `docs/development/FRONTEND_BACKEND_CONTRACT.md` for data and status behavior.
- Existing `AppShell`, layouts, components and service conventions.

## Workflow

1. Confirm route, priority, owner and acceptance states.
2. Define the page's content hierarchy and desktop/tablet/mobile composition before coding.
3. Classify image needs before coding; inspect approved repository assets first. If external imagery is authorized, follow the image workflow and record source/usage status.
4. Reuse shared layout and primitives; create a new component only when the responsibility is real and typed.
5. Choose motion only for interaction feedback, hierarchy or state transition; verify reduced-motion behavior before implementation.
6. Reuse the existing icon system for navigation and controls; make icon-only actions named, focusable and understandable without relying on color alone.
7. Connect only confirmed API contract. Keep server state authoritative for auth, quota, ownership and generation status.
8. Implement default, loading, empty, error, success, unauthorized/not-found and relevant job states.
9. Keep user input on recoverable errors; preserve idempotency and never create a new job from reload, polling failure or `needs_review`.
10. Check keyboard/focus, reduced motion, no horizontal overflow, crop safety and artwork treatment at required viewports.

## Never

- Build a blank page, fake route, fake API data or an unconfirmed control.
- Add a feature because it appears in the reference image if Issue #1 excludes it.
- Put secret/provider/quota/ownership decisions in the frontend.
- Announce image success before storage and metadata persistence are confirmed.
- Add unverified stock/reference images, hotlink arbitrary URLs or imply an external image is a real FLUX result.

## Completion checklist

- [ ] Route and scope are confirmed.
- [ ] Shared layout and tokens are reused.
- [ ] All relevant states and safe recovery actions are present.
- [ ] Motion and icon behavior follows the shared visual rules.
- [ ] Image provenance, licensing/attribution status and demo/generated labeling are clear when applicable.
- [ ] Mobile/tablet/desktop and accessibility behavior are checked.
- [ ] Relevant build/test checks are run and reported.
