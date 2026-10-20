---
name: "Plan From Requirements"
description: "Use when: turn an approved requirements doc into a concrete implementation plan (no code changes)."
argument-hint: "Service name + feature slug (or path to <Service>/requirements/features/<feature>.md)"
agent: "agent"
---

You are a senior engineer. Your job is to produce a **clear, minimal, executable plan** from the provided requirements.

## Inputs

The user should provide at least one of:

- Target service name (e.g., `CareerService`, `UserService`, `document-service`)
- Feature slug and/or the path to the feature requirements file: `<Service>/requirements/features/<feature-slug>.md`

If the user did not provide a requirements file, ask them to run the **Analyst Requirements** prompt first.

## Constraints

- DO NOT implement code.
- DO NOT change production/runtime files.
- Do not assume missing details. Ask concise questions.
- Before proposing new dependencies, prefer free/open-source and **ask/notify first**.

## Required reading (when available)

- Global standards: `docs/05-ai-instructions.md`, `docs/02-coding-style-and-patterns.md`
- Service requirements: `<Service>/requirements/README.md`, `<Service>/requirements/q_and_a.md`

## Output format

1) **Summary** (what will be built)
2) **Open Questions** (only if blocking)
3) **Implementation Plan** (ordered steps)
4) **Files & Locations** (where each change should go)
5) **Test Plan** (unit/integration/e2e)
6) **Risks & Rollback**
