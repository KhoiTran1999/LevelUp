# 🪝 Pre-Task Hook

**Run this BEFORE starting any task.**

This hook ensures the agent has full context before doing anything.

---

## Step 1 — Identify the task scope

- What service(s) are affected?
- What type of task is this? (implement / review / debug / requirements / design)
- Which agent role is appropriate? → See `.github/agents/`

## Step 2 — Load memory

Check the following in order:

```
1. .github/memory/decisions/         ← Any relevant architecture decisions?
2. .github/memory/work-in-progress/  ← Is there a WIP file for this service?
3. .github/memory/auto/              ← Any gotchas or observations to be aware of?
```

**Rules:**
- If a relevant **decision** exists → follow it, do not re-debate
- If a **WIP file** exists → resume from it, do not restart
- If **auto notes** exist for this area → read them before proceeding

## Step 3 — Load canonical standards

Read the relevant canonical docs for the task type:

| Task type | Docs to read |
|---|---|
| Implement .NET feature | `docs/02-coding-style-and-patterns.md`, `docs/04-spark-library-reference.md` |
| Design / architecture | `docs/01-architecture-overview.md`, `docs/07-cross-service-communication.md` |
| Database work | `docs/08-database-and-efcore.md` |
| Auth/security | `docs/06-authentication-and-authorization.md` |
| API design | `docs/10-gateway-configuration.md` |
| Any | `docs/05-ai-instructions.md` |

## Step 4 — Confirm before acting

Before writing any code or making changes:
- State what you understood the task to be
- List what you found in memory (relevant decisions, WIP)
- Ask clarifying questions if anything is ambiguous

> ⚠️ Do NOT start implementing if requirements are unclear. Stop and ask.

## Step 5 — Activate the appropriate agent

State explicitly which agent role you are taking:

> "I am acting as the **[agent-name]** for this task."

See `.github/agents/` for available roles.
