# AI Playbook (Shared)

This `.github/` folder is a **shared AI Playbook** intended to make AI agents (Copilot/LLMs) productive and consistent across projects.

## What’s inside

- `prompts/`: reusable prompt files (slash commands)
- `instructions/`: file-scoped instructions automatically loaded by file patterns
- `skills/`: reusable multi-step workflows (skills)
- `requirements/templates/`: requirement templates to copy into projects
- `projects/`: per-project customization (workspace-specific notes)
- `mcp/`: all tools define how to setup

## Canonical Standards

Global standards for this workspace live in `docs/` (workspace root), not inside this folder.

## How to use in a new project

1. Copy or clone this playbook into the new workspace as `.github/`.
2. Copy the `docs/` folder (global standards) into the workspace root.
3. Create per-service requirements under `<Service>/requirements/`.
