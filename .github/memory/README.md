# 🧠 AI Memory System

This folder is the **persistent memory** for AI agents working in this workspace.

## Structure

```
memory/
├── README.md                    ← this file
├── decisions/                   ← Architecture & design decisions (permanent)
│   └── YYYY-MM-DD-<slug>.md
├── work-in-progress/            ← Active tasks / unfinished work
│   └── <service>-wip.md
└── auto/                        ← AI-generated notes (agent decides what to save)
    └── YYYY-MM-DD-<topic>.md
```

## Rules for AI Agents

### When to READ memory
- **Always** at the start of any task — check `decisions/` and `work-in-progress/` before doing anything.
- If a relevant decision exists: follow it. Do not re-debate closed decisions.
- If WIP exists for the target service: resume from it, do not restart from scratch.

### When to WRITE memory

| Folder | Write when |
|---|---|
| `decisions/` | A technical/architectural decision is explicitly confirmed by the user |
| `work-in-progress/` | A task is incomplete at end of session, OR you need to hand off context |
| `auto/` | You observe something useful that doesn't fit elsewhere (your call) |

### Auto-save policy (`auto/`)
AI agents are trusted to save anything they judge will help future sessions:
- Discovered gotchas / non-obvious behaviors
- Cross-service dependencies found during implementation
- Performance findings, security observations
- Patterns that deviate from docs (and why)
- Any "I wish I had known this earlier" insight

### Format
- Filename: `YYYY-MM-DD-<descriptive-slug>.md`
- Always include: date, context, and the decision/finding clearly stated.
- Keep it concise — bullet points preferred over prose.

## What is NOT stored here
- Requirements → `<Service>/requirements/`
- Canonical standards → `docs/`
- Agent role definitions → `agents/`
