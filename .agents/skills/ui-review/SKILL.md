---
name: ui-review
description: Review FLUX STUDIO UI against the approved Issue #1 scope, FLUX-UI-001 tokens, responsive behavior and accessibility without redesigning by assumption.
---

# Ui Review

## Use when

Use for a visual/UX review of an implemented screen, component or responsive state. This skill reports deviations; it does not silently fix them.

## Read first

- `AGENTS.md`.
- Complete `writing-block.md`.
- `docs/design-system/VISUAL_REVIEW_CHECKLIST.md`, `DESIGN_PRINCIPLES.md`, `LAYOUT_AND_RESPONSIVE.md` and `ACCESSIBILITY.md`.
- GitHub Issue #1 and the relevant PRD screen/acceptance section.

## Workflow

1. Record route, viewport, data source, commit/diff and states reviewed.
2. Compare layout hierarchy, content, controls and copy against confirmed requirements and the reference composition.
3. Check tokens, hardcoded colors, surfaces, gradients, borders, radii, shadows, artwork treatment and neon restraint.
4. Check default, hover, focus, disabled, loading, empty, error, success and job states.
5. Check 360/768/1280/1536px behavior, drawer/menu/dialog keyboard use, contrast and reduced motion.
6. Report each finding with evidence, severity, source rule and smallest recommended correction.

## Never

- Change the palette, source document or scope to make the review pass.
- Treat reference-image details as confirmed functionality.
- Report a check that was not actually performed.

## Completion checklist

- [ ] Source and route scope are recorded.
- [ ] Visual, responsive, state and accessibility checks are complete.
- [ ] Findings distinguish defect, open question and proposal.
- [ ] Screenshots/viewport evidence are attached when available.
