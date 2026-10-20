# 🤖 AI Instructions – How to Work With This Codebase

> **This file is the first thing any AI assistant should read before writing code.** It defines the rules, conventions, constraints, and decision-making framework for this project.

---

## Pre-Flight Checklist

Before writing **any** code, you must:

1. **Read all documentation** in this `docs/` folder:
   - `01-architecture-overview.md` → Understand the system architecture
   - `02-coding-style-and-patterns.md` → Learn every coding pattern
   - `03-new-service-template.md` → Template for new services/entities
   - `04-spark-library-reference.md` → Full API reference for SPARK library
2. **Identify which layer** the change belongs to (Domain, Application, Infrastructure, API)
3. **Check if SPARK already provides** the functionality before writing custom code

---

## Absolute Rules – Never Violate These

### Architecture Rules

| #   | Rule                                            | Reason                                                         |
| --- | ----------------------------------------------- | -------------------------------------------------------------- |
| 1   | **Never put business logic in Controllers**     | Controllers only call `_sender.Send()` and return `Ok(result)` |
| 2   | **Never reference Infrastructure from Domain**  | Domain has zero external dependencies                          |
| 3   | **Never place entities in Application layer**   | Entities belong in `Infrastructure/Persistence/Entities/`      |
| 4   | **Never skip the CQRS pattern**                 | All read ops use `IQuery`, all write ops use `ICommand`        |
| 5   | **Never write raw SQL**                         | Use `Specification` pattern or LINQ via repository             |
| 6   | **Never use try-catch in handlers/controllers** | `GlobalException` middleware handles all errors                |
| 7   | **Never inject `IMediator`**                    | Always inject `ISender` for dispatching                        |
| 8   | **Never use `_mapper.Map()` on IQueryable**     | Use `.ProjectTo<T>()` for query projections                    |

### Code Style Rules

| #   | Rule                                                         | Reason                                                                              |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 9   | **Always add `.ForAllMembers(null check)` in AutoMapper**    | Prevents null overwriting: `.ForAllMembers(o => o.Condition((s,d,m) => m != null))` |
| 10  | **Always pass `CancellationToken`**                          | Required for all async methods                                                      |
| 11  | **Always inherit entities from `BaseAuditableEntity<Guid>`** | Provides Id, CreatedAt, UpdatedAt, Version                                          |
| 12  | **Always use `DateTime? DeletedAt` for soft delete**         | Never hard-delete entities                                                          |
| 13  | **Query and Handler in the same file**                       | File named after the Query/Command class                                            |
| 14  | **Use `= null!;` for required strings**                      | `public string Name { get; set; } = null!;`                                         |
| 15  | **Use `string?` for optional strings**                       | `public string? Description { get; set; }`                                          |
| 16  | **Init collections with `new HashSet<T>()`**                 | `public virtual ICollection<T> Items { get; set; } = new HashSet<T>();`             |

### SPARK Library Rules

| #   | Rule                                          | Reason                                                |
| --- | --------------------------------------------- | ----------------------------------------------------- |
| 17  | **Never re-implement what SPARK provides**    | Use `ICacheService`, not custom caching               |
| 18  | **Never write custom exception middleware**   | SPARK's `GlobalException` handles everything          |
| 19  | **Never write custom transaction management** | `ICommand` auto-wraps in transaction via `TxBehavior` |
| 20  | **Use SPARK's custom exceptions**             | `NotFoundException`, `BadRequestException`, etc.      |
| 21  | **Use `[Cache]` attribute for query caching** | Don't manually cache query responses                  |

---

## Decision Framework

### When to Create a New Feature

```
1. Do I need a new entity?
   YES → Follow "Adding a New Entity Checklist" (see doc 03)
   NO  → Continue

2. Is this a read operation?
   YES → Create IQuery + IQueryHandler in Features/{Feature}/Queries/
   NO  → Continue

3. Is this a write operation?
   YES → Create ICommand + ICommandHandler in Features/{Feature}/Commands/
   NO  → Continue

4. Is this a background task?
   YES → Create TaskQueue + Producer + register WorkerService
   NO  → Continue

5. Is this a cross-service event?
   YES → Create MassTransit Consumer or Redis Pub/Sub Handler
   NO  → It's probably a utility or extension
```

### When to Use Each Repository Method

| Need                               | Method                                      |
| ---------------------------------- | ------------------------------------------- |
| Single entity by ID                | `GetByIdAsync(id)`                          |
| Single entity by condition         | `GetByAsync(predicate)`                     |
| List with filtering/sorting/paging | `Filter(spec).ProjectTo<T>().ToListAsync()` |
| List with includes (navigation)    | `GetListAsync(spec)` with `Includes`        |
| Count only                         | `Filter(spec).CountAsync()`                 |
| Check existence                    | `GetByAsync(predicate)` → `is not null`     |
| Cursor pagination                  | `Filter(spec)` with `PaginationMode.Cursor` |

### When to Use Each Exception

| Situation                   | Exception                                 |
| --------------------------- | ----------------------------------------- |
| Entity not found by ID      | `NotFoundException("Entity", id)`         |
| Invalid input / bad request | `BadRequestException("message", details)` |
| Duplicate / already exists  | `ConflictException("message")`            |
| User not authenticated      | `UnauthorizedException()`                 |
| User lacks permissions      | `ForbiddenException()`                    |
| Business rule violation     | `BusinessException("message")`            |
| External service down       | `ServiceUnavailableException()`           |
| Unexpected internal error   | `ServerErrorException()`                  |
| Data can't be processed     | `UnprocessableEntityException("message")` |

### When to Cache

| Scenario                      | Approach                               |
| ----------------------------- | -------------------------------------- |
| Query returning lists/lookups | `[Cache("prefix", 60)]` on Query class |
| Query with user-specific data | Don't cache (or use short TTL)         |
| After a write operation       | Invalidate with `RemoveTypeAsync`      |
| Real-time data needed         | Don't cache                            |

---

## Naming Conventions Quick Reference

| Type                 | Pattern                  | Example                         |
| -------------------- | ------------------------ | ------------------------------- |
| Query                | `Get{What}Query`         | `GetProductsQuery`              |
| Command              | `{Verb}{Entity}Command`  | `CreateProductCommand`          |
| Handler              | `{Request}Handler`       | `GetProductsQueryHandler`       |
| Controller           | `{Entity}Controller`     | `ProductController`             |
| Entity               | `{EntityName}`           | `Product`                       |
| Repository Interface | `I{Entity}Repository`    | `IProductRepository`            |
| Mapping Profile      | `{Entity}Mapping`        | `ProductMapping`                |
| DTO / Response       | `{Entity}{Purpose}Model` | `ProductPreviewModel`           |
| Validator            | `{Command}Validator`     | `CreateProductCommandValidator` |
| Consumer             | `{Event}Consumer`        | `OrderCreatedConsumer`          |
| EF Configuration     | `{Entity}Configuration`  | `ProductConfiguration`          |
| Background Queue     | `{Feature}Queue`         | `TrackingQueue`                 |
| Background Producer  | `I{Feature}Producer`     | `ITrackingProducer`             |

---

## Feature Implementation Checklists

### New Query (Read Operation)

- [ ] Create response model in `Application/Models/{Feature}Models/`
- [ ] Create query + handler in `Application/Features/{Feature}/Queries/`
- [ ] Add AutoMapper mapping in `Application/Mappings/`
- [ ] Add controller endpoint with `[HttpGet]` + `[FromQuery]`
- [ ] Consider adding `[Cache]` attribute for frequently-accessed data

### New Command (Write Operation)

- [ ] Create request model (command class itself serves as DTO)
- [ ] Create command + handler in `Application/Features/{Feature}/Commands/`
- [ ] Add AutoMapper mapping for entity←→command (if needed)
- [ ] Add FluentValidation validator (if input validation needed)
- [ ] Add controller endpoint with `[HttpPost/Put/Patch/Delete]` + `[Authorize]`
- [ ] Invalidate related caches after mutation

### New Entity

- [ ] Create entity class → `Infrastructure/Persistence/Entities/`
- [ ] Create EF configuration → `Infrastructure/Persistence/Configurations/`
- [ ] Add `DbSet<T>` to `AppDbContext`
- [ ] Create repository interface → `Infrastructure/Persistence/Abstractions/`
- [ ] Create repository implementation → `Infrastructure/Persistence/Repositories/`
- [ ] Add repository property to `IUnitOfWork` interface
- [ ] Add lazy-initialized property to `UnitOfWork` class
- [ ] Create DTO model → `Application/Models/{Entity}Models/`
- [ ] Create AutoMapper profile → `Application/Mappings/`
- [ ] Create EF migration: `dotnet ef migrations add Add{Entity}`

### New Service (Entire Microservice)

Follow `03-new-service-template.md` step by step.

---

## Tech Stack Reference

| Component          | Technology                  |
| ------------------ | --------------------------- |
| **Framework**      | .NET 10                     |
| **ORM**            | Entity Framework Core 10    |
| **Primary DB**     | PostgreSQL (Npgsql)         |
| **Document DB**    | MongoDB (optional)          |
| **Cache**          | Redis (StackExchange.Redis) |
| **Message Queue**  | RabbitMQ (MassTransit)      |
| **Pub/Sub**        | Redis Pub/Sub               |
| **CQRS**           | MediatR 12.x                |
| **Validation**     | FluentValidation 12.x       |
| **Mapping**        | AutoMapper 14.x             |
| **Auth**           | JWT Bearer                  |
| **API Docs**       | Swagger + Scalar UI         |
| **API Versioning** | Asp.Versioning              |
| **Resilience**     | Polly 8.x                   |
| **API Gateway**    | YARP Reverse Proxy          |
| **Real-time**      | SignalR / Ably (optional)   |
| **Shared Library** | SparkToolkit (NuGet)        |

---

## Common Mistakes to Avoid

| ❌ Mistake                          | ✅ Correct                                                            |
| ----------------------------------- | --------------------------------------------------------------------- |
| `_mapper.Map(queryable.ToList())`   | `queryable.ProjectTo<T>(_mapper.ConfigurationProvider).ToListAsync()` |
| `try { } catch { }` in handler      | Let `GlobalException` middleware handle it                            |
| `IMediator` injection               | Use `ISender` injection                                               |
| Putting logic in controller         | Move to command/query handler                                         |
| Creating entity in Application      | Entity belongs in `Infrastructure/Persistence/Entities/`              |
| Forgetting `CancellationToken`      | Always pass `ct` to async methods                                     |
| Missing `ForAllMembers` null check  | Add `.ForAllMembers(o => o.Condition((s,d,m) => m != null))`          |
| Hard-deleting records               | Use `DeletedAt = DateTime.UtcNow` (soft delete)                       |
| Custom exception types              | Use SPARK's `AppException` hierarchy                                  |
| Manual transaction in query handler | Queries don't need transactions; commands auto-wrap                   |
| `new DbContext()` directly          | Use DI-injected `IUnitOfWork`                                         |
| Inline SQL strings                  | Use `Specification` pattern                                           |
