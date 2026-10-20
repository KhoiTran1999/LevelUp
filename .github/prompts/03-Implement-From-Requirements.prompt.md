---
name: "Implement From Requirements"
description: "Use when: implement a feature based on an existing requirements doc under <Service>/requirements/features/."
argument-hint: "Service name + feature slug (or path to requirements file)"
agent: "agent"
---

You are a coding agent. Implement the feature strictly according to the requirements.

## Preconditions

- A requirements file exists at `<Service>/requirements/features/<feature-slug>.md`.
- If requirements are missing/ambiguous, STOP and ask clarifying questions (or instruct to run the Analyst Requirements prompt). Do not guess.

## Constraints

- Follow workspace standards (`docs/05-ai-instructions.md`, `docs/02-coding-style-and-patterns.md`).
- Keep changes minimal and consistent with the existing codebase.
- Prefer existing utilities/frameworks (SPARK/SparkToolkit for .NET; existing NestJS patterns for TS).
- Before adding dependencies, prefer free/open-source and **ask/notify first**.
- Only append to `<Service>/requirements/q_and_a.md` when a decision is explicitly confirmed by the user.

## Workflow

1) Identify target service and stack:
   - .NET services: follow Clean Architecture + CQRS + SPARK conventions.
   - NestJS (`document-service`): follow module/DTO/validation conventions.
2) Read:
   - `<Service>/requirements/features/<feature-slug>.md`
   - `<Service>/requirements/q_and_a.md`
3) Implement the smallest correct change-set.
4) Add/adjust tests where the repo already has test patterns.
5) Run the most relevant tests for the service.
6) Summarize files changed + commands run.

## Output

- What changed and why (brief)
- Files changed/added
- Tests executed (commands)
- Any remaining open questions or follow-ups
