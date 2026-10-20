# Prompts

Reusable prompt files (slash commands) for this playbook.

## Available

- `01-Analyst-Requirements.prompt.md` — turn a request/transcript into requirements under `<Service>/requirements/`
- `02-Plan-From-Requirements.prompt.md` — create an implementation plan (no code)
- `03-Implement-From-Requirements.prompt.md` — implement a feature from requirements
- `04-Generate-Tests.prompt.md` — add/improve tests for a feature or set of files
- `05-Code-Review.prompt.md` — structured review (review-only by default)
- `06-Improve-Code.prompt.md` — refactor/cleanup/perf improvements while preserving behavior

## Conventions

- Requirements live under `<Service>/requirements/`.
- Write requirements in **English**.
- Do not add dependencies without notifying first (prefer free/open-source).
