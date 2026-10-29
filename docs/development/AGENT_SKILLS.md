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

- Confirmed in both Codex and Antigravity sessions: the eight project skills are listed in the available skills catalog.
- Not confirmed: whether every possible Codex client configuration automatically registers this repository's `.agents/skills/` directory without explicit setup.
- Safe handoff: use the explicit skill name and read the repository `SKILL.md`; do not rely on conversation memory or a private local installation.

## Security

Skills are instructions that can influence tool use and commands. Review them as project-controlled privileged instructions before exposing them to another runtime or user. Keep network/image-download actions bounded by the image workflow and explicit task authorization.

## UI implementation routing

For a frontend screen, read `docs/design-system/IMPLEMENTED_UI_REFERENCE.md` after the canonical
requirements and before selecting a component or layout skill. It records the current `/`
Dashboard preview and `/login` implementation, measured breakpoints, token usage, image treatment
and known `Not yet defined` areas. It is evidence for reuse, not authorization to add routes or
controls. Use `frontend-design` for visual decisions, `create-page` only for confirmed routes,
`create-component` for a real reusable consumer, and `ui-review` for evidence-based review.
