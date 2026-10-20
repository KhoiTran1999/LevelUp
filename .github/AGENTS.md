# StudyAhead Workspace Guidelines

This workspace is a **multi-repo** folder (each service may have its own Git history). It also includes a shared **AI Playbook** under `.github/`.

## Shared AI Playbook

- The shared playbook lives in `.github/` (prompts, instructions, skills, templates).
- Project-specific notes live in `.github/projects/`.

## Canonical Knowledge (Global)

Global architecture + coding standards are in `docs/` at the workspace root. These are the canonical sources (avoid duplicating them elsewhere):

- `docs/01-architecture-overview.md`
- `docs/02-coding-style-and-patterns.md`
- `docs/03-new-service-template.md`
- `docs/04-spark-library-reference.md`
- `docs/05-ai-instructions.md`
- `docs/06-authentication-and-authorization.md`
- `docs/07-cross-service-communication.md`
- `docs/08-database-and-efcore.md`
- `docs/09-real-world-recipes.md`
- `docs/10-gateway-configuration.md`

## Requirements (Per Service)

Each service keeps its own requirements so AI + humans can work from a single source of truth:

- `<Service>/requirements/features/<feature-slug>.md` (feature requirements)
- `<Service>/requirements/q_and_a.md` (confirmed decisions + open questions)

Rules:
- Write requirements in **English**.
- Do not assume missing details; ask concise clarifying questions.
- Only write to `q_and_a.md` when a decision is explicitly confirmed.

## Working Agreement

- Do not implement code until requirements are captured (or explicitly waived).
- Prefer existing SPARK / project utilities before adding new abstractions.
- Keep changes minimal and consistent with the established architecture.
