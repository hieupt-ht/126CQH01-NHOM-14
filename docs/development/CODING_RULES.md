# Coding Rules

- Use TypeScript strict mode and explicit domain types at API boundaries.
- Keep feature modules cohesive; do not create a generic abstraction until at least two real consumers need it.
- Validate and normalize input at boundaries; never pass an unfiltered request body to a query or update.
- Use stable names for routes, states and error codes from the shared contract.
- Return safe, actionable errors to clients; log correlation identifiers and safe codes, not secrets or raw provider payloads.
- Preserve idempotency and ownership invariants when refactoring.
- Keep provider/storage calls outside MongoDB transactions; make file/metadata recovery explicit.
- Do not use arbitrary mock values in production paths or claim provider capabilities without verification.
- Do not alter the canonical design tokens, public API contract or schema without recording the decision and updating the relevant docs.

## Definition of done for code

The change has a focused diff, typed boundaries, error paths, relevant tests/checks, no secret leakage, no scope expansion and a report that distinguishes verified behavior from assumptions.
