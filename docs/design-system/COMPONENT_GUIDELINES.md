# Component Guidelines

Use the shared vocabulary from Issue #1 before creating a new component: `AppShell`, `Sidebar`, `Topbar`, `AuthLayout`, `Button`, `Input`, `Textarea`, `Card`, `Badge`, `Dialog`, `Dropdown`, `Toast`, `Skeleton`, `EmptyState`, `Pagination`, `ImageCard/Grid`, `PromptEditor`, `UsageSummary`, `GenerationStatus`, `ResultPreview` and `GenerationDetailDrawer`.

## Responsibilities

- Layout components own structure and responsive regions, not business fetching.
- Presentational components receive typed data and callbacks; they do not own authorization or quota decisions.
- Feature containers coordinate API calls and map API states to UI states.
- Dialogs must have an accessible name, cancel path, Escape handling, focus trap when modal, and focus return.
- Image cards keep menu/heart actions separate from card navigation and do not show controls for actions the contract does not support.
- Prompt editor preserves Vietnamese text, reports verified character limits, and never calls AI while typing.
- Status components show text for every job state, including `needs_review`; do not invent progress percentages.

## Props and state

- Define the smallest typed props needed by the component.
- Keep server state separate from local interaction state.
- Make loading/error/empty/success behavior explicit in the API of a reusable component when applicable.
- Do not hide data fetching, mutation or navigation inside a low-level visual primitive.

## Styling

All colors, shadows, radii and transitions come from `writing-block.md`. Reuse existing tokens and component patterns. Do not introduce arbitrary Tailwind colors or a second theme.

## Current component vocabulary

Confirmed reusable implementation: `Brand`, `Icon`, `DashboardLayout`, `studio-button` variants,
`ReferenceArtwork`, `PromptComposer`, `GenerationPanel`, `CreationGallery` and the native artwork
dialog. Login field styles are currently local to `LoginPage`; a generic shared `Input` component
is `Not yet defined`.

Before creating a similar primitive, inspect these files and the measurements in
`docs/design-system/IMPLEMENTED_UI_REFERENCE.md`. If the new screen is the first consumer, keep
the style local and typed; promote it only when a second real consumer exists.
