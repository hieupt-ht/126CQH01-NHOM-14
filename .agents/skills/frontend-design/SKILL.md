---
name: frontend-design
description: Apply the FLUX STUDIO Midnight Aurora design system when designing or implementing frontend UI, layout, styling, motion or interaction.
---

# Frontend Design

## Use when

Use for any frontend task that changes page composition, visual styling, layout, interaction, animation or design tokens. Do not use it to invent product scope or to review code without a UI concern.

## Read first

1. `AGENTS.md`.
2. The complete `writing-block.md` before any UI decision.
3. `docs/design-system/DESIGN_PRINCIPLES.md`, `COLOR_TOKENS.md`, and the relevant responsive/accessibility docs.
4. GitHub Issue #1 and the relevant route/screen section in `PRD.md`.
5. Existing root stylesheet, layout and shared components before adding new ones.

## Workflow

1. Identify the requested screen/state and classify requirements as `CONFIRMED`, `PROPOSAL` or `OPEN QUESTION`.
2. Map each visual decision to an existing FLUX-UI-001 token. Use the reference image for composition, not for unconfirmed controls.
3. Reuse existing layout and component patterns. Keep artwork prominent, accent usage restrained and the primary action clear.
4. Design desktop, tablet and mobile behavior, keyboard focus, semantic status text and reduced-motion behavior before implementation.
5. If a new token or visual behavior is unavoidable, stop and propose the smallest extension; do not silently change the palette.
6. After implementation, inspect changed styles for hardcoded colors, duplicate tokens, overflow and missing states, then run applicable checks.

## Never

- Modify `writing-block.md` or introduce a second theme without explicit approval.
- Hardcode colors, create arbitrary Tailwind colors or use named colors outside the canonical token root.
- Add search, light mode, notifications, multi-image, style controls, upgrade UI or other controls not confirmed by the Issue.
- Use fake metrics, fake progress or AI calls while the user is typing.

## Completion checklist

- [ ] Relevant source docs were read.
- [ ] Existing tokens/components were reused.
- [ ] Responsive, loading/empty/error/success and focus states were checked.
- [ ] No unauthorized color, control or scope was added.
- [ ] Build/test/visual checks actually run are reported.

Report route/state changed, token mapping, responsive/accessibility checks, deviations and open questions.
