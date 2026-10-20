# 🤖 Agent Definitions

This folder defines the **role-based AI agents** available in this workspace.

## Structure

```
agents/
├── README.md                     ← this file
├── architect-agent.md            ← System design & architecture decisions
├── code-reviewer-agent.md        ← Code review & quality enforcement
├── test-writer-agent.md          ← Unit/integration test generation
├── requirements-analyst-agent.md ← Requirements extraction & Q&A
└── debugger-agent.md             ← Root-cause analysis & bug fixing
```

## How to use agents

Each agent file defines:
- **Role** — what this agent is
- **Responsibilities** — what it does
- **Constraints** — what it must NOT do
- **Memory protocol** — how it reads/writes to `memory/`
- **Handoff** — when to involve another agent

## Agent activation

Reference an agent explicitly at the start of a task:

> "Act as the `architect-agent`. Review the domain model for CareerService."

Or use the corresponding prompt from `.github/prompts/` — prompts already embed the right agent role.

## Memory integration

All agents follow the memory protocol defined in `.github/memory/README.md`:
- Read `memory/decisions/` and `memory/work-in-progress/` at task start
- Write new decisions/WIP/auto notes at task end (or when interrupted)
