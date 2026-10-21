# Quality Checklist

## Before implementation

- [ ] Repository status/diff and existing files checked.
- [ ] Relevant Issue, PRD and `writing-block.md` sections read.
- [ ] Scope is P0/P1 and contract/schema impact is identified.
- [ ] Open questions are recorded rather than guessed.

## During implementation

- [ ] Authentication, ownership, validation and quota are enforced server-side.
- [ ] Idempotency and uncertain-provider behavior are preserved.
- [ ] UI handles loading, empty, error, success and relevant generation states.
- [ ] No secret, fake metric, fake progress or unapproved control is added.
- [ ] Design tokens, responsive layout and accessibility rules are followed.

## Before handoff

- [ ] Typecheck/build/test/lint commands relevant to the change were run.
- [ ] API checks include unauthorized, not-found, duplicate and boundary cases.
- [ ] UI checks include keyboard/focus, responsive widths and reduced motion when applicable.
- [ ] Links and relative paths in docs/skills resolve.
- [ ] Diff contains no unintended source, dependency or design-token changes.
- [ ] Report separates verified, not tested and blocked items.
