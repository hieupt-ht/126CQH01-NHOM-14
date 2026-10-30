# Moved

The canonical current skill inventory and runtime discovery status are maintained in [`AGENT_SKILLS.md`](AGENT_SKILLS.md). Keep this file for Codex-specific background only.

## Repository convention

This repository stores project skills under `.agents/skills/<skill-name>/SKILL.md`, with optional `agents/openai.yaml`. Each skill has a lowercase name, a concise description and focused workflow instructions. Availability in a tool catalog depends on that runtime's registration configuration.

## What is verified from official OpenAI documentation

OpenAI describes a skill as a directory anchored by one `SKILL.md` with front matter and instructions. Supporting `references/`, `scripts/` and `assets/` are optional. During discovery, the model receives the skill name and description and may read the full `SKILL.md`. See the [official Skills documentation](https://developers.openai.com/api/docs/guides/tools-skills).

The loading mechanism depends on the runtime:

- Hosted shell: attach a `skill_reference` through the shell environment.
- Local shell: provide the skill name, description and local path in the runtime-controlled skills list.
- Agents API sandbox: register parent directories through `environment.capability_directories`; the harness searches them for `SKILL.md`.

Therefore, a repository folder named `.agents/skills` is a project convention, not proof that every runtime automatically mounts it. Explicitly request `Use the $skill-name skill` when deterministic selection is needed, or configure the runtime with the absolute skill path/parent directory.

## Visual rule routing

- Before implementing UI, read `docs/design-system/IMPLEMENTED_UI_REFERENCE.md` to distinguish
  measured current patterns from product requirements and to resolve whether `/` is the current
  Dashboard preview or a confirmed Home route.
- Use `frontend-design` for any frontend layout, styling, artwork, motion or icon decision. It reads `IMAGE_ASSET_WORKFLOW.md` and `MOTION_AND_ICON_RULES.md` when relevant.
- Use `create-page` only for a confirmed route. It applies the same image, motion and icon rules while checking responsive, accessibility and API-state requirements.
- Use `create-component` for a reusable UI primitive; it must keep a narrow typed contract and follow the same token and accessibility rules.
- `MOTION_AND_ICON_RULES.md` is shared guidance, not a standalone Skill. It is referenced by the Skills above to avoid duplicated or conflicting instructions.

## Current repository status

- At the start of the 2026-10-30 setup task, this Codex session exposed eight existing repository skills. Five backend skill directories were added afterward; their automatic registration in this live runtime was not verified. See [`AGENT_SKILLS.md`](AGENT_SKILLS.md) for current routing and handoff.
- Not confirmed: whether another Codex client, hosted shell, local shell runner or Agents API session will automatically register this repository's `.agents/skills` directory.
- Safe handoff: use the explicit skill name and read the repository `SKILL.md`; do not rely on conversation memory or a private local installation.

## Security

Skills are instructions that can influence tool use and commands. Review them as project-controlled privileged instructions before exposing them to another runtime or user. Keep network/image-download actions bounded by the image workflow and explicit task authorization.
