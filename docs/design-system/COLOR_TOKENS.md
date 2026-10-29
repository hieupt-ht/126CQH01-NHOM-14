# Color Tokens

The canonical token values live in `writing-block.md` under Rule `FLUX-UI-001`. The verified runtime
mirror is `frontend/src/styles/tokens.css`, imported by `frontend/src/index.css`. It is an
implementation mirror, not a second palette; if it disagrees with the canonical source, the source
wins and the drift must be corrected in a separate code task.

For the extracted evidence from the current Login and Dashboard previews, see
`docs/design-system/IMPLEMENTED_UI_REFERENCE.md`.

## Approved token groups

- Background: `bg-primary`, `bg-secondary`, `bg-tertiary`, `bg-elevated`, `bg-sidebar`, `bg-navbar`, `bg-overlay`.
- Surface: `surface-primary`, `surface-secondary`, `surface-elevated`, `surface-hover`, `surface-input`, `surface-glass`.
- Brand: `accent-primary`, `accent-primary-hover`, `accent-primary-active`, `accent-cyan`, `accent-cyan-hover`, `accent-blue`, `accent-pink`.
- Typography: `text-primary`, `text-secondary`, `text-muted`, `text-disabled`, `text-accent`, `text-on-primary`.
- Border: `border-primary`, `border-secondary`, `border-subtle`, `border-hover`, `border-focus`.
- Status: `success`, `warning`, `danger`, `info`.
- Effects: approved gradients, shadows, glows, radii and transitions from the root token definition.

## Usage mapping

| UI purpose | Token source |
|---|---|
| App/sidebar/navbar/card/input/modal | Corresponding background/surface hierarchy in `writing-block.md` |
| Primary CTA | `gradient-primary`, `text-on-primary`, `shadow-button`, `radius-md` |
| Secondary action | `surface-secondary`, `text-primary`, `border-primary` |
| Prompt editor | `surface-input`, `text-primary`, `text-muted`, `border-primary`, `border-focus` |
| Focus/active detail | `accent-cyan` or `border-focus` according to purpose |
| Status feedback | `success`, `warning`, `danger`, `info` only for semantic status |

## Enforcement

Use CSS variables from the canonical root. Do not hardcode hex/RGB/HSL/named colors in components, do not redefine tokens locally and do not add a light theme. A new token requires explicit owner approval and an update to `writing-block.md` first.

## Runtime verification

- Confirmed: `frontend/src/styles/tokens.css` contains the approved token groups and `index.css`
  imports it before feature styles are loaded.
- Confirmed: current Login and Dashboard feature CSS consumes token variables rather than a local
  feature palette.
- Not yet defined: a Tailwind theme mapping. The current frontend uses Tailwind's Vite plugin but
  the inspected UI is styled primarily through feature CSS and CSS variables.
