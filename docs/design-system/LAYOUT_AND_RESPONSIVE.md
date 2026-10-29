# Layout and Responsive Rules

## Breakpoints and regions

- Desktop from 1280px: sidebar approximately 240–256px, topbar approximately 72px, content padding 24–32px.
- Tablet 768–1279px: reduce or collapse the sidebar without causing content overflow.
- Mobile below 768px: sidebar becomes a drawer; use one-column stacking and preserve access to the primary CTA.
- Review at 360px, 768px, 1280px and 1536px.

## Observed implementation baseline

The current Login/Dashboard source uses `1700px`, `1279px`, `1023px`, `980px`, `767px` and `380px`
breakpoints. The Dashboard sidebar is `248px` on desktop, `218px` at `1279px` and becomes a
dialog drawer below `1023px`; the topbar is `76px` on desktop and `66px` on mobile. The Login
page changes from a two-column layout to a compact artwork header below `767px`.

These values are `CONFIRMED` implementation evidence, not a request to add a breakpoint to every
new component. See `IMPLEMENTED_UI_REFERENCE.md` before choosing a new layout value.

## Page composition

- Auth: cinematic artwork and form card on desktop; form takes priority on mobile.
- Create: editor and result area first, control panel second, recent creations below; do not let hero artwork consume the whole workspace.
- Library: responsive grid; target desktop 4 columns, tablet 2–3, mobile 1–2 when space permits.
- Detail: image roughly two-thirds and metadata/actions one-third on desktop; image first on mobile.
- History: table on desktop and cards on mobile; preserve full prompt in detail/drawer.

## Non-negotiables

Prevent horizontal page scrolling, preserve readable line length, keep prompt text wrapping, and do not hide essential actions at smaller widths. Test keyboard focus and reduced motion at each breakpoint.

Not yet defined: a shared spacing scale beyond the measured feature values. Reuse the existing
component spacing patterns until a tokenized scale is approved.
