# Git Collaboration

## Shared workflow

1. Read `AGENTS.md`, source docs and current `git status` before editing.
2. Split work by screen/API or document group; assign one owner and one reviewer.
3. Avoid concurrent edits to shared files such as `AGENTS.md`, token docs, package manifests and API contract.
4. Recheck diff before and after the task; preserve unrelated and uncommitted changes.
5. Keep commits focused when the team decides to commit; never reset, force-push, merge or delete another member's work from an agent task.

## Suggested ownership split

- TV1: layout/auth/account and shared app shell.
- TV2: generation lifecycle, quota, worker/provider adapter.
- TV3: library, history, image detail/download/delete and database evidence.

Names are proposals until the team assigns them. Shared schema, session, response envelope and quota decisions must be reviewed by all three members.

## Handoff format

State changed files, source docs read, contract impact, checks run, known limits and any open question. Do not hand off “works” without a reproducible command or visual route/state.
