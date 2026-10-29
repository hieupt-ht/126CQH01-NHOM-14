# Motion and Icon Rules

This document extends `writing-block.md` and `FLUX-UI-001`. It does not create a second theme or replace the canonical tokens.

## Motion

- Inspect existing CSS and animation dependencies before adding a new solution.
- Prefer CSS transitions/keyframes or an existing project library. Do not add a dependency without explicit task approval.
- Use motion for interaction feedback, hierarchy and state changes: hover/focus, button feedback, dialog/drawer, tab/route transition, loading/skeleton and generation states.
- Keep transitions short, purposeful and consistent. Prefer `transform` and `opacity` when possible to avoid layout shift and unnecessary work.
- Do not add motion to every element. Avoid flashing, shaking, strong parallax, continuous decorative animation and effects that reduce readability.
- Preserve keyboard focus and semantic status text. Motion must not be the only way a state is communicated.
- Provide a reduced-motion path with `@media (prefers-reduced-motion: reduce)` or an equivalent library setting. Disable non-essential looping motion and shorten transitions.

### Current implementation baseline

The inspected Login and Dashboard code uses CSS transitions for field focus, buttons, navigation,
cards and dialog affordances. `frontend/src/index.css` globally disables animation and transition
motion for `prefers-reduced-motion: reduce`. There is no animation dependency or keyframe-based
interaction pattern confirmed in these screens. New motion should extend this restrained pattern
only when it serves a clear interaction or state purpose.

## Icons

- Reuse an existing repository icon set before proposing a new one. Do not install an icon library just for one screen.
- Keep one coherent visual language for stroke/fill, weight, size, alignment and optical spacing.
- Choose icons by meaning and recognition, not decoration. Do not use emoji as the primary icon for navigation, forms or product controls.
- Icon-only buttons require a useful accessible name, visible keyboard focus, sufficient contrast and a practical hit area.
- Do not draw complex custom SVG when an existing icon provides the same meaning. Custom artwork is acceptable only when it is genuinely part of the product visual identity and remains accessible.
- Do not rely on color alone to communicate a state; pair icons with text, status or another perceivable treatment when needed.

The current icon system is `frontend/src/components/ui/Icon.tsx`: an inline SVG path map with
`currentColor`, `1.65` stroke width and named `IconName` values. Reuse it before adding another
icon source. It is `CONFIRMED` for current screens; an icon animation convention is `Not yet
defined`.

## Review checklist

- [ ] Existing motion/icon patterns and dependencies were inspected.
- [ ] The motion has a stated UI purpose and does not cause layout shift.
- [ ] Reduced motion, keyboard focus and semantic status behavior were checked.
- [ ] The icon meaning, style, contrast, size and hit area are appropriate.
- [ ] Icon-only controls have accessible names.
- [ ] No new dependency, token or theme was introduced without approval.
