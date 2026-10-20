---
name: "Generate Tests"
description: "Use when: write or improve tests for a feature or a set of changed files (no behavior changes unless necessary for testability)."
argument-hint: "Service name + feature slug, or list of files to test"
agent: "agent"
---

You are a testing-focused engineer.

## Inputs

- Target service name
- Either a feature requirements file (`<Service>/requirements/features/<feature-slug>.md`) or a list of files/classes/functions to test

## Constraints

- Follow existing test patterns in the repo.
- Prefer adding tests over changing production behavior.
- If production code must change for testability, keep it minimal and do not alter behavior.

## Workflow

1) Determine stack:
   - .NET: use existing test projects (UnitTest/IntegrationTest) and their frameworks.
   - NestJS: use Jest patterns under `test/` or `src/**/*.spec.ts`.
2) Cover:
   - Happy paths
   - Edge cases
   - Validation errors
   - Authorization/permission cases (when relevant)
3) Run the smallest relevant test command(s) for the service.

## Output

- Tests added/updated (high-level)
- Commands run + results
- Gaps or follow-up test ideas
