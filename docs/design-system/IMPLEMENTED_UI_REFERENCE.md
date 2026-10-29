# Implemented UI Reference

Status: `CONFIRMED` where this document cites the current repository implementation. This is an
evidence record for the implemented UI, not a replacement for `writing-block.md` or the product
requirements.

Observed on 2026-10-29. The source files listed below are the authority for what is currently
implemented. If an implementation detail conflicts with `writing-block.md`, the canonical token
document remains authoritative and the conflict must be recorded as an `OPEN QUESTION` before
changing code.

## 1. Current route and source map

| Surface | Current implementation | Evidence |
| --- | --- | --- |
| `/` and any path other than `/login` | Dashboard preview | `frontend/src/App.tsx`, `DashboardPage.tsx` |
| `/login` | Login preview with client-side validation and non-authenticated feedback | `frontend/src/App.tsx`, `pages/auth/LoginPage.tsx` |
| `/register` | Not yet routed in the current frontend | `frontend/src/App.tsx` |
| Runtime token layer | CSS variable mirror imported by the global stylesheet | `frontend/src/styles/tokens.css`, `frontend/src/index.css` |
| Shared brand and icon primitives | `Brand` and the inline SVG `Icon` map | `components/dashboard/Brand.*`, `components/ui/Icon.tsx` |

The dashboard and login are visual references for future frontend work. They are not evidence that
authentication, generation, persistence, quota or provider integration is complete.

## 2. Design philosophy and visual identity

The implemented direction is `Midnight Aurora`: dark cinematic navy surfaces, cold cyan/blue
highlights, restrained purple gradients and high-contrast editorial headings. The login artwork
and dashboard reference artwork are the visual anchors. Artwork is treated as reference/demo
content and is explicitly labeled in the UI; it must not be described as a stored FLUX result.

Confirmed composition patterns:

- Login uses a split cinematic showcase/form composition on larger screens and puts the form first
  after a compact artwork header on mobile.
- Dashboard uses a fixed sidebar, sticky topbar, main workbench, right-side generation panel and
  responsive creation gallery.
- The primary CTA uses a purple-to-blue gradient; secondary controls use restrained dark surfaces.
- Glow, blur and gradients are used for hierarchy and focus, not as a full-screen filter over
  artwork.

Not yet defined: a separate light theme, a page-specific palette, a generic typography scale,
or a final authenticated dashboard data model.

## 3. Color tokens

`writing-block.md` is the canonical token source. The values below were verified in the runtime
mirror at `frontend/src/styles/tokens.css`; that file must not drift from the canonical source.

| Group | Token | Verified value |
| --- | --- | --- |
| Background | `--bg-primary` | `#080D18` |
| Background | `--bg-secondary` | `#0F172A` |
| Background | `--bg-tertiary` | `#111827` |
| Background | `--bg-elevated` | `#1B2940` |
| Background | `--bg-sidebar` | `#080F1F` |
| Background | `--bg-navbar` | `#0B1323` |
| Background | `--bg-overlay` | `rgba(3, 7, 18, 0.85)` |
| Surface | `--surface-primary` | `#111827` |
| Surface | `--surface-secondary` | `#162238` |
| Surface | `--surface-elevated` | `#1B2940` |
| Surface | `--surface-hover` | `#253653` |
| Surface | `--surface-input` | `#131F33` |
| Surface | `--surface-glass` | `rgba(17, 24, 39, 0.75)` |
| Brand | `--accent-primary` | `#7C3AED` |
| Brand | `--accent-primary-hover` | `#8B5CF6` |
| Brand | `--accent-primary-active` | `#6D28D9` |
| Brand | `--accent-cyan` | `#22D3EE` |
| Brand | `--accent-cyan-hover` | `#67E8F9` |
| Brand | `--accent-blue` | `#3B82F6` |
| Brand | `--accent-pink` | `#EC4899` |
| Text | `--text-primary` | `#F1F5FF` |
| Text | `--text-secondary` | `#94A3B8` |
| Text | `--text-muted` | `#64748B` |
| Text | `--text-disabled` | `#475569` |
| Text | `--text-accent` | `#22D3EE` |
| Text | `--text-on-primary` | `#FFFFFF` |
| Border | `--border-primary` | `#334155` |
| Border | `--border-secondary` | `#243249` |
| Border | `--border-subtle` | `rgba(148, 163, 184, 0.12)` |
| Border | `--border-hover` | `#475569` |
| Border | `--border-focus` | `#7C3AED` |
| Status | `--success` | `#22C55E` |
| Status | `--warning` | `#F59E0B` |
| Status | `--danger` | `#EF4444` |
| Status | `--info` | `#38BDF8` |

Usage observed in source:

- `bg-primary` is the page foundation; `bg-navbar` and `bg-sidebar` separate navigation regions.
- `surface-primary`/`surface-secondary`/`surface-elevated` distinguish cards, controls and dialogs.
- Purple is used for primary actions and brand emphasis; cyan is used for focus, active details and
  selected emphasis; pink is reserved for favorites.
- `danger`, `info` and `accent-cyan` are paired with text or icons in validation/status feedback.

## 4. Typography

Source: `frontend/src/styles/tokens.css`, `index.css`, `LoginPage.css` and `DashboardPage.css`.

| Role | Observed implementation |
| --- | --- |
| Font stack | `Inter, ui-sans-serif, system-ui, sans-serif` |
| Login showcase heading | `clamp(42px, 4.65vw, 72px)`, weight `750`, line-height `1.07`, letter spacing `-2.9px` at the largest layout |
| Login form heading | `clamp(40px, 3.4vw, 50px)`, weight `700`, line-height `1.11`, letter spacing `-1.9px` |
| Dashboard hero heading | `clamp(34px, 3.2vw, 49px)`, weight `800`, line-height `1.08`; `59px` at `min-width: 1700px` |
| Section/card headings | Approximately `16px–23px`, generally weight `500–600` |
| Body/supporting copy | Approximately `10px–13px`, using `--text-secondary` or `--text-muted` and line-height `1.7–1.9` |
| Labels/eyebrows | Approximately `7px–10px`, uppercase/letter-spaced, using accent or muted text |
| Buttons | Approximately `10px–13px`, weight `600–650` |

The code uses weights `300`, `400`, `500`, `600`, `650`, `700`, `750`, `800` and `850` in
different roles. A formal design-token scale for font sizes and weights is `Not yet defined`;
future screens should reuse the observed hierarchy rather than inventing a competing scale.

## 5. Spacing, layout and responsive behavior

Observed layout values:

- Login page: `min-height: 100svh`, outer padding `20px` (responsive to `28px`, `16px`, `14px`,
  `12px` and `10px`), desktop columns `1.14fr / 1fr`.
- Login form card: width `min(100%, 390px)`, `48px` vertical padding on desktop and reduced mobile
  padding. Inputs are `54px` high; the submit button is `52px` high.
- Dashboard desktop sidebar: `248px`; it becomes `218px` at `max-width: 1279px` and a modal drawer
  below `1023px`.
- Dashboard topbar: `76px` minimum height on desktop and `66px` on mobile.
- Dashboard content: `30px` horizontal padding on desktop, `24px` at the tablet reduction and
  `16px` on mobile.
- Dashboard workbench: main content plus a `294px` generation panel, reduced to `260px/270px`
  at narrower desktop/tablet widths, then one column below `768px`.
- Dashboard gallery: four columns on the widest layout, three below `1280px`, two below `768px`.

Observed breakpoints are `1700px`, `1279px`, `1023px`, `980px`, `767px`, `380px`. These are
implementation evidence, not a license to add more breakpoints without need. Review future UI at
`360px`, `768px`, `1280px` and `1536px` as required by the responsive docs.

## 6. Radius, borders, shadows and gradients

The official radii are `6px`, `10px`, `14px`, `18px`, `24px` and `9999px` through
`--radius-sm` to `--radius-full`. Actual usage maps to:

- Input/button: `--radius-md` (`10px`).
- Standard dashboard cards: `--radius-xl` (`18px`).
- Login showcase and dialogs: `--radius-2xl` (`24px`).
- Pills, status dots and compact tags: `--radius-full` or a small local `4px` tag radius where
  the current code already uses it.

Borders use `--border-primary`, `--border-secondary` or `--border-subtle`; focus uses
`--border-focus` and the global visible focus outline uses `--accent-cyan`. Cards use
`--shadow-card`; primary actions use `--shadow-button`; selected/brand emphasis uses
`--shadow-primary` or `--glow-neon` on hover.

The verified gradient definitions are the six canonical tokens in `writing-block.md` and
`tokens.css`: `gradient-primary` (135deg, purple to blue), `gradient-neon` (135deg, purple to
cyan), `gradient-hero` (120deg, navy through purple to teal), `gradient-sidebar` (180deg, dark
navy), `gradient-card` (145deg, surface-secondary to surface-primary) and `gradient-text` (90deg,
cyan to purple). No additional gradient token is defined.

## 7. Component patterns

### Brand and icons

- `Brand` is the shared wordmark/symbol primitive used by login and dashboard navigation.
- `Icon` is an inline SVG path map with a single stroke language, `1.65` stroke width and
  `currentColor`; icon-only controls provide labels in the consuming component.

### Buttons

- `.studio-button--primary`: `gradient-primary`, `text-on-primary`, `radius-md`, `shadow-button`;
  hover uses `glow-neon` and a small upward transform.
- `.studio-button--subtle`: `surface-secondary`, `text-secondary`, `border-secondary`; hover
  moves toward `surface-hover` and `text-primary`.
- `.login-submit` is a page-specific primary button with the same approved token mapping.
- A formal disabled-button visual beyond cursor treatment is `Not yet defined`.

### Inputs and prompt editor

- Login fields use `surface-input`, `border-primary`, `radius-md`, `54px` minimum height and
  `border-focus` plus `shadow-primary` on `:focus-within`.
- The password control keeps the visibility toggle inside the same field and exposes an accessible
  pressed state.
- The prompt editor uses a labeled `<textarea>`, `surface-input`, `border-primary`, `border-focus`
  on focus, resize support and a visible character count.
- Generic shared `Input`/`Textarea` components are `Not yet defined`; current patterns are local
  to the auth and dashboard features.

### Cards, gallery and dialog

- Dashboard cards use `surface-primary` or `gradient-card`, `border-secondary`, `radius-xl` and
  `shadow-card`.
- Gallery items keep the artwork dominant, put favorite/view actions over the image, and label
  the collection as reference/demo content.
- The artwork dialog uses `surface-elevated`, `border-primary`, `radius-2xl`, `shadow-card` and
  `bg-overlay` backdrop. Escape/cancel and a visible close control are implemented.

### Navigation and authentication

- The dashboard sidebar uses `gradient-sidebar`, an active `gradient-primary` item and a mobile
  `<dialog>` drawer below `1023px`.
- The dashboard topbar is sticky, keeps search in the visual center/left and places the preview
  badge and account details at the right.
- Login uses shared brand treatment in the artwork pane, a compact preview topbar, a centered form
  card and a small footer. Registration link/route behavior is not yet implemented.

## 8. Images and visual treatment

Confirmed current assets:

| Asset | Dimensions | Current use | Classification |
| --- | ---: | --- | --- |
| `frontend/src/assets/auth/login-aurora.png` | `1024 × 1536` | Login showcase background, `object-fit: cover` | Locally generated decorative artwork; not a user result |
| `frontend/src/assets/reference/dashboard-reference.jpg` | `1536 × 1024` | Dashboard hero, model preview and gallery crops | User-supplied reference/demo image |

The dashboard `ReferenceArtwork` component uses explicit source regions and positions the source
image as a crop rather than treating each crop as a separate generated asset. The login image is
portrait, dark and text-safe around the upper/lower composition; the dashboard image is a wider
collage with multiple distinct artwork subjects. Future screens should preserve focal-point safety,
avoid heavy filters that change artwork color and label reference/demo imagery.

The untracked `frontend/src/assets/images/home/` folder is not imported by the current `App.tsx`
or current dashboard/login screens. Its README documents separate reference assets; it is not
evidence of a currently rendered Home route.

## 9. Motion, focus and accessibility

Confirmed motion is restrained: CSS transitions are used for borders, colors, shadows and small
button/card transforms. No runtime animation package or keyframe system is currently used by the
implemented dashboard/login source. `index.css` disables animation and transitions under
`prefers-reduced-motion: reduce` and keeps a global cyan `:focus-visible` outline.

Confirmed accessibility patterns include skip links, real labels, `aria-invalid`/`aria-describedby`
for login errors, named icon-only controls, `aria-pressed` for favorites/password visibility,
semantic status regions and a dialog close/cancel path. A formal focus-trap/focus-return audit for
the native dialog drawer is `Not yet verified`; do not claim it without a browser check.

## 10. Do and do not

Do:

- Read this evidence record plus `writing-block.md` before implementing a new screen.
- Reuse `Brand`, `Icon`, `studio-button` patterns, token variables and the established breakpoints.
- Keep demo/reference labels visible and keep real API state authoritative.
- Review artwork crops and form usability at mobile and desktop widths.

Do not:

- Treat a screenshot or `dashboard-reference.jpg` crop as a confirmed product control.
- Add arbitrary colors, a second theme, a new icon library or a new generic primitive for one use.
- Assume the current dashboard preview proves `/app`, authentication, generation or persistence.
- Claim browser/visual verification when only source/assets were inspected.
