# Codex Skills: Discovery and Invocation

## Repository convention

This repository stores project skills under `.agents/skills/<skill-name>/SKILL.md`, with optional `agents/openai.yaml`. Each skill has a lowercase name, a concise description and focused workflow instructions. The current environment exposes these project skills in its available-skill catalog.

## What is verified from official OpenAI documentation

OpenAI describes a skill as a directory anchored by one `SKILL.md` with front matter and instructions. Supporting `references/`, `scripts/` and `assets/` are optional. During discovery, the model receives the skill name and description and may read the full `SKILL.md`. See the [official Skills documentation](https://developers.openai.com/api/docs/guides/tools-skills).

The loading mechanism depends on the runtime:

- Hosted shell: attach a `skill_reference` through the shell environment.
- Local shell: provide the skill name, description and local path in the runtime-controlled skills list.
- Agents API sandbox: register parent directories through `environment.capability_directories`; the harness searches them for `SKILL.md`.

Therefore, a repository folder named `.agents/skills` is a project convention, not proof that every runtime automatically mounts it. Explicitly request `Use the $skill-name skill` when deterministic selection is needed, or configure the runtime with the absolute skill path/parent directory.

## Current repository status

- Confirmed in this Codex session: the eight project skills are listed in the available skills catalog.
- Not confirmed: whether another Codex client, hosted shell, local shell runner or Agents API session will automatically register this repository's `.agents/skills` directory.
- Safe handoff: use the explicit skill name and read the repository `SKILL.md`; do not rely on conversation memory or a private local installation.

## Security

Skills are instructions that can influence tool use and commands. Review them as project-controlled privileged instructions before exposing them to another runtime or user. Keep network/image-download actions bounded by the image workflow and explicit task authorization.
