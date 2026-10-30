# Agent Skills: Discovery and Invocation

## Repository convention

This repository stores project skills under `.agents/skills/<skill-name>/SKILL.md`, with optional supporting directories. Each skill has a lowercase name, a concise description and focused workflow instructions. The format follows the open Agent Skills standard adopted by both OpenAI Codex and Google Antigravity.

## How skills work across tools

Both tools use **progressive disclosure**: at session start, only the skill name and description (from YAML frontmatter) are loaded into context. The full `SKILL.md` body is read on demand when a task matches.

### OpenAI Codex

What is verified from official OpenAI documentation:

- A skill is a directory anchored by one `SKILL.md` with YAML frontmatter and instructions. Supporting `references/`, `scripts/` and `assets/` are optional.
- The loading mechanism depends on the runtime:
  - Hosted shell: attach a `skill_reference` through the shell environment.
  - Local shell: provide the skill name, description and local path in the runtime-controlled skills list.
  - Agents API sandbox: register parent directories through `environment.capability_directories`; the harness searches them for `SKILL.md`.
- Explicitly request `Use the $skill-name skill` when deterministic selection is needed, or configure the runtime with the absolute skill path/parent directory.

### Google Antigravity (IDE, CLI, App)

What is verified from official Antigravity documentation:

- Antigravity scans `.agents/skills/` at the workspace root during session startup.
- Name and description are indexed for progressive disclosure (~50 tokens per skill).
- When a user prompt matches a skill's intent, the full `SKILL.md` is loaded automatically.
- Skills may also be registered globally at `~/.gemini/antigravity/skills/` for cross-workspace use.
- Antigravity enforces a 24 KB per-file limit for parsed skill content.
- Skills contribute to on-demand context, separate from the always-on rules token budget.

### Differences to be aware of

| Aspect | Codex | Antigravity |
|---|---|---|
| Auto-discovery from `.agents/skills/` | Depends on runtime configuration | Automatic in IDE/CLI |
| Explicit invocation | `$skill-name` or `Use the X skill` | Same, or via auto-generated `/skill-name` slash command |
| Per-file size limit | No documented hard limit | 24 KB |
| Global skills directory | `~/.agents/skills/` (convention) | `~/.gemini/antigravity/skills/` |

## Current repository status

- This document is the canonical map of repository skills. The always-on repository rules are in `AGENTS.md`; backend tasks must also read `docs/development/BACKEND_RULES.md`. The latter is guidance, not automatically loaded by every runtime.
- Codex skill discovery is runtime-controlled. The Codex catalog available at the start of this task listed the existing eight skills; the five newly added skill directories are not confirmed as registered in that live catalog. Reopen/restart or configure the runtime with `.agents/skills/` before relying on automatic loading, or explicitly request the skill by name and read its path.
- Antigravity scans `.agents/skills/` at session startup; skills added during an active session may require restart/rescan. Its documented per-file parsing limit is 24 KB; added skills are intentionally concise.
- Safe handoff: use the explicit skill name and read the repository `SKILL.md`; do not rely on conversation memory or a private local installation.

## Backend skill routing

Read `docs/development/BACKEND_RULES.md` for every backend task, then select the focused skill(s) matching the work. Keep `backend-api` as the authority for endpoint/domain semantics; focused skills add implementation workflow and do not override its invariants.

| Skill | Use for | Pair with |
|---|---|---|
| `backend-api` (existing) | Confirmed API contract, ownership, quota, idempotency, safe errors | Any business endpoint work |
| `express-api-development` (new) | Express routes, controllers, middleware and HTTP boundary | `backend-api` for domain behavior |
| `mongodb-mongoose` (new) | Mongoose schemas, indexes, queries and persistence tests | `backend-api` when enforcing business invariants |
| `authentication-session` (new) | Opaque server-side sessions, cookies, CSRF and auth flows | `backend-api`; resolve deployment open questions first |
| `gemini-image-generation` (new) | Official Google Gen AI SDK integration and generation recovery | `backend-api`; explicit provider authorization required for live calls |
| `backend-testing` (new) | Backend unit/API/database/security/lifecycle tests | Relevant implementation skill |

Use `api-integration` for frontend-to-backend wiring only when frontend work is separately authorized. Existing visual/UI skills remain frontend-specific and are unchanged.

## Security

Skills are instructions that can influence tool use and commands. Review them as project-controlled privileged instructions before exposing them to another runtime or user. Keep network/image-download actions bounded by the image workflow and explicit task authorization.

## UI implementation routing

For a frontend screen, read `docs/design-system/IMPLEMENTED_UI_REFERENCE.md` after the canonical
requirements and before selecting a component or layout skill. It records the current `/`
Dashboard preview and `/login` implementation, measured breakpoints, token usage, image treatment
and known `Not yet defined` areas. It is evidence for reuse, not authorization to add routes or
controls. Use `frontend-design` for visual decisions, `create-page` only for confirmed routes,
`create-component` for a real reusable consumer, and `ui-review` for evidence-based review.
