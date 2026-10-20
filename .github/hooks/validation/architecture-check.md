# 🪝 Architecture Check (Validation Hook)

**Run when:** Adding new services, changing layers, introducing new dependencies, or restructuring.

---

## Layer Boundaries

Verify no layer violations exist:

| ✅ Allowed | ❌ Not allowed |
|---|---|
| API → Application | API → Domain (direct) |
| Application → Domain | Application → Infrastructure (direct) |
| Infrastructure → Domain | Domain → anything outside Domain |
| Infrastructure → Application (for DI only) | |

Checklist:
- [ ] Domain layer has zero references to Infrastructure projects
- [ ] Application layer does not import Infrastructure namespaces (except via interfaces)
- [ ] Controllers only call `ISender.Send()` — no direct service calls
- [ ] No business logic in Infrastructure (only data access)

---

## CQRS Conformance

- [ ] All write operations use `ICommand` / `ICommandHandler`
- [ ] All read operations use `IQuery` / `IQueryHandler`
- [ ] No Command handler returns domain data (use a separate Query)
- [ ] No Query handler mutates state

---

## SPARK Conventions

- [ ] Entities inherit from correct SPARK base class
- [ ] Repositories use SPARK `IRepository<T>` abstraction
- [ ] Cache access uses SPARK `ICacheService` (not raw `IMemoryCache`)
- [ ] Events use SPARK `IEventPublisher`
- [ ] New utilities: checked if SPARK already provides this before writing custom

---

## Service Boundaries

- [ ] New service does not duplicate responsibility of existing service
- [ ] Cross-service communication uses events (RabbitMQ) or API calls — not shared DB
- [ ] No direct DB-to-DB joins across services

---

## Dependency Check

- [ ] No new NuGet package added without notifying user first
- [ ] All new packages are free/open-source (or user explicitly approved)
- [ ] Package versions consistent with workspace (check existing `.csproj` files)

---

## Result

| Status | Action |
|---|---|
| ✅ All checks passed | Proceed to `post-task.md` |
| 🔴 Critical violation | Stop, fix violation, re-run check |
| 🟠 Major issue | Flag to user, do not commit until resolved |
