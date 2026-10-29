# FLUX-UI-001 Design Principles

`writing-block.md` is the canonical and immutable source. This document explains how to apply it; it does not replace or extend its tokens.

## Visual direction

- Midnight Aurora: dark cinematic, cold neon, futuristic and premium.
- Use navy backgrounds and dark surfaces for roughly 75% of the visual field.
- Use neutral typography/borders for hierarchy and reserve purple, blue and cyan accents for meaningful actions and states.
- Artwork is the visual centerpiece; do not tint or over-glow generated images.
- Use glassmorphism, gradients and glow sparingly so the interface remains readable.

## Composition from the approved reference

- Desktop: sidebar, topbar, primary workspace and a right-side generation control panel where the page needs it.
- Create page: artwork/banner and prompt editor at the center-left, controls on the right, recent creations below.
- Library: responsive artwork grid with restrained metadata and actions.
- Mobile: sidebar becomes a drawer; content stacks vertically with no horizontal page scroll.

The reference image informs composition only. Search, notifications, multi-model controls, multiple image counts, style dropdowns and upgrade prompts are not automatically product requirements.

## Interaction principles

- Make the primary action obvious without making every control neon.
- Show system state with text/icon plus semantic color; never rely on color alone.
- Keep destructive actions explicit and reversible where possible.
- Preserve user input on recoverable errors and never turn an uncertain result into a new generation automatically.
- Respect `prefers-reduced-motion` and keep focus visible.

## Implemented reference evidence

The current source confirms the direction above in two previews:

- Login: `frontend/src/pages/auth/LoginPage.tsx` and `LoginPage.css` use a portrait aurora artwork,
  split showcase/form composition, editorial headings and a restrained form surface.
- Dashboard: `frontend/src/pages/dashboard/DashboardPage.tsx`, `DashboardPage.css` and
  `DashboardLayout.css` use a dark workbench, a right generation panel, prompt editor and
  reference-art gallery.

Use `docs/design-system/IMPLEMENTED_UI_REFERENCE.md` for measured values and implementation
evidence. The reference record does not add controls to the confirmed product scope.
