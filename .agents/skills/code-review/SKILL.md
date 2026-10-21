---
name: code-review
description: Review FLUX STUDIO code for correctness, security, maintainability, regression risk, contract compliance and scope discipline.
---

# Code Review

## Use when

Use for a focused diff, change request or pre-merge review. Review the code as it exists; do not implement fixes unless asked.

## Read first

- `AGENTS.md`.
- Relevant source requirements in Issue #1/`PRD.md`.
- `docs/development/CODING_RULES.md`, `FRONTEND_BACKEND_CONTRACT.md` and `QUALITY_CHECKLIST.md`.
- `writing-block.md` for frontend changes.

## Workflow

1. Inspect `git diff`, surrounding code, existing uncommitted changes and changed tests.
2. Check functional correctness, state transitions, error paths, race/idempotency behavior and regression risk.
3. Check authentication, authorization, ownership, validation, secret handling, logging and data exposure.
4. Check API/schema compatibility, frontend/backend contract, responsive/accessibility impact and design-token compliance.
5. Check scope: no fake functionality, unapproved dependency, provider assumption, token mutation or unrelated refactor.
6. Classify findings: Blocker, High, Medium, Low or Note. Each finding needs file/line evidence, impact and a concrete fix direction.
7. State what was not verified and what commands were run.

## Never

- Hide a finding because the UI looks good.
- Infer security from frontend checks alone.
- Call a proposal a confirmed requirement.
- Modify files or run destructive Git commands during review unless explicitly requested.

## Completion checklist

- [ ] Findings are evidence-based and severity-ranked.
- [ ] Security, contract, regression and scope were reviewed.
- [ ] Tests/checks and unverified areas are reported.
- [ ] No source files were changed during a review-only task.
