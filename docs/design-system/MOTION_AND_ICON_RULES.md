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

## Icons

- Reuse an existing repository icon set before proposing a new one. Do not install an icon library just for one screen.
- Keep one coherent visual language for stroke/fill, weight, size, alignment and optical spacing.
- Choose icons by meaning and recognition, not decoration. Do not use emoji as the primary icon for navigation, forms or product controls.
- Icon-only buttons require a useful accessible name, visible keyboard focus, sufficient contrast and a practical hit area.
- Do not draw complex custom SVG when an existing icon provides the same meaning. Custom artwork is acceptable only when it is genuinely part of the product visual identity and remains accessible.
- Do not rely on color alone to communicate a state; pair icons with text, status or another perceivable treatment when needed.

## Review checklist

- [ ] Existing motion/icon patterns and dependencies were inspected.
- [ ] The motion has a stated UI purpose and does not cause layout shift.
- [ ] Reduced motion, keyboard focus and semantic status behavior were checked.
- [ ] The icon meaning, style, contrast, size and hit area are appropriate.
- [ ] Icon-only controls have accessible names.
- [ ] No new dependency, token or theme was introduced without approval.
