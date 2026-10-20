# 🪝 Hooks System

Hooks are **mandatory lifecycle steps** that AI agents must execute at specific moments in a task.

Unlike prompts (which describe *what* to do), hooks describe *when* and *what to check/record*.

## Structure

```
hooks/
├── README.md                    ← this file
├── pre-task.md                  ← Run BEFORE starting any task
├── post-task.md                 ← Run AFTER completing any task
└── validation/
    ├── architecture-check.md   ← Validate architecture conformance
    ├── pre-commit-check.md     ← Validate before code is committed
    └── security-check.md       ← Security scan checklist
```

## Hook Execution Order

```
[User request]
      │
      ▼
 pre-task hook          ← Read memory, understand context
      │
      ▼
 [Task execution]       ← Implement / analyze / review
      │
      ▼
 validation hooks       ← Architecture, security checks (if code changed)
      │
      ▼
 post-task hook         ← Write memory, summarize, hand off
      │
      ▼
 [Done]
```

## When to apply hooks

| Hook | When |
|---|---|
| `pre-task` | Always — at the start of every agent task |
| `post-task` | Always — at the end of every agent task |
| `validation/architecture-check` | When adding/changing services, layers, or dependencies |
| `validation/pre-commit-check` | When code changes are ready to be committed |
| `validation/security-check` | When touching auth, APIs, data access, or config |
