---
name: pr-preparation
description: Prepare a FLUX STUDIO pull-request summary, verification checklist and UI evidence without pushing, merging or changing remote branches.
---

# Pr Preparation

## Use when

Use when the user asks to prepare or review a PR handoff. This skill does not push, merge, commit or change remote state.

## Read first

- `AGENTS.md`.
- `docs/development/GIT_COLLABORATION.md` and `QUALITY_CHECKLIST.md`.
- Relevant requirements, design and contract docs.

## Workflow

1. Inspect status and diff; identify pre-existing changes and the task's actual scope.
2. Summarize the problem, implementation, files and behavior without claiming unverified work.
3. Run appropriate typecheck/build/test/lint commands and record exact results.
4. For UI, record route, states, viewport sizes, responsive/accessibility checks and attach screenshots only when actually captured.
5. Check for secrets, hardcoded tokens, fake metrics, accidental dependency changes, broken links and unrelated files.
6. List known limitations, open questions and follow-up work; distinguish P0 from P1.
7. Produce a reviewer-ready checklist and recommended PR title/body.

## Never

- Push, merge, commit, reset or alter remote branches.
- Claim a browser, API, visual or test check that was not run.
- Hide incomplete work or present mock data as a real integration.

## Completion checklist

- [ ] Diff and ownership boundaries are clear.
- [ ] Tests/checks and limitations are stated honestly.
- [ ] UI evidence includes viewport/state context when applicable.
- [ ] Security, scope and design-system checks are included.
