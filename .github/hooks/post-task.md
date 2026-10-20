# 🪝 Post-Task Hook

**Run this AFTER completing any task.**

This hook ensures memory is updated, the user is informed, and nothing is left dangling.

---

## Step 1 — Write to memory (required)

After every task, evaluate and act on each category:

### Decisions (`memory/decisions/`)
Write a decision file **if any of these happened**:
- An architectural approach was chosen (and confirmed by user)
- A library or pattern was selected over alternatives
- A constraint was established for a service

→ Use template: `memory/decisions/_template.md`

### Work In Progress (`memory/work-in-progress/`)
- **Task completed** → Delete or mark as ✅ Done in WIP file
- **Task interrupted** → Update WIP file with current progress, remaining steps, and handoff note
- **Task ongoing** → Create/update WIP file for the service

→ Use template: `memory/work-in-progress/_template.md`

### Auto notes (`memory/auto/`)
Save to auto **if you observed any of the following**:
- A non-obvious behavior, gotcha, or footgun
- A cross-service dependency discovered during implementation
- A deviation from docs (and why it was necessary)
- A performance or security observation
- Anything you'd want to know at the start of next session

→ Use template: `memory/auto/_template.md`

---

## Step 2 — Run validation hooks (if code changed)

If code was written or modified, run the relevant validation hooks:

| Changed area | Run hook |
|---|---|
| New service, layer, or dependency | `hooks/validation/architecture-check.md` |
| Code ready to commit | `hooks/validation/pre-commit-check.md` |
| Auth, API, data access, config | `hooks/validation/security-check.md` |

---

## Step 3 — Summarize for the user

Provide a clear summary:

```
## ✅ Task Summary

**What was done:** [1-2 sentence summary]

**Files changed:**
- `path/to/file1.cs` — [reason]
- `path/to/file2.cs` — [reason]

**Memory updated:**
- decisions: [file created] or None
- work-in-progress: [file updated/deleted] or None
- auto: [file created] or None

**Open questions / Next steps:**
- [ ] ...
```

---

## Step 4 — Handoff (if applicable)

If the task naturally leads to another agent's work:
- State which agent should take over
- Reference the relevant prompt from `.github/prompts/`
- Leave a handoff note in `memory/work-in-progress/`
