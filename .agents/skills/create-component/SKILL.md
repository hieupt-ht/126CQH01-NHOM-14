---
name: create-component
description: Create a reusable FLUX STUDIO frontend component with a narrow typed contract, accessible states and approved design tokens.
---

# Create Component

## Use when

Use for a reusable UI primitive or feature component needed by a confirmed page. Do not use to abstract a one-off element without a second real consumer.

## Read first

- `AGENTS.md` and complete `writing-block.md`.
- `docs/design-system/COMPONENT_GUIDELINES.md`, `COLOR_TOKENS.md` and `ACCESSIBILITY.md`.
- The screen requirement and existing component conventions.

## Workflow

1. State the component's one responsibility and its real consumers.
2. Define minimal typed props, callbacks and controlled/uncontrolled behavior.
3. Decide loading, empty, error, disabled, focus and destructive states where relevant.
4. Keep data fetching, authorization, quota and navigation out of low-level visual primitives.
5. Reuse existing tokens and semantic HTML; provide labels, keyboard behavior and focus return for interactive controls.
6. Test the component at required widths and with long Vietnamese text.

## Never

- Create a generic design system, local token set or arbitrary abstraction.
- Hardcode colors or redefine approved CSS variables.
- Hide a network mutation, AI call or authorization check inside a presentational component.
- Make status understandable only by color.

## Completion checklist

- [ ] Responsibility and consumers are documented.
- [ ] Props and states are typed and minimal.
- [ ] Tokens, semantic HTML and keyboard behavior are correct.
- [ ] No scope, API or design-token change was smuggled in.
- [ ] Relevant checks and remaining limitations are reported.
