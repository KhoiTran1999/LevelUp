---
description: "Use when writing or updating requirement docs (features, Q&A decisions, tasks)."
applyTo: "**/requirements/**/*.md"
---

# Requirements Writing Rules

- Write in **English**.
- Keep requirements unambiguous, testable, and scoped.
- Separate **Confirmed Decisions** from **Open Questions**.
- Only add to `q_and_a.md` when the decision is explicitly confirmed.
- If updating an existing feature doc, append `## Update YYYY-MM-DD` and only describe the delta.

Recommended structure:
- `requirements/README.md` (index)
- `requirements/features/<feature-slug>.md`
- `requirements/q_and_a.md`
- `requirements/api-need.md` (optional)
- `requirements/tasks.md` (optional)
