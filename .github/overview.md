# 📖 Documentation Index

Reusable architecture documentation for .NET microservices built with **SPARK (SparkToolkit)**.  
Copy this `docs/` folder into any new project for instant AI and developer onboarding.

---

## Documents

| #   | File                                                                     | Description                                                                                                               |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | [Architecture Overview](../docs/01-architecture-overview.md)             | Microservices topology, Clean Architecture layers, SPARK library overview, API Gateway                                    |
| 2   | [Coding Style & Patterns](../docs/02-coding-style-and-patterns.md)        | CQRS, controllers, DI, entities, repositories, AutoMapper, caching, exceptions, validation, background processing         |
| 3   | [New Service Template](../docs/03-new-service-template.md)               | Step-by-step guide with complete code templates for creating a new microservice from scratch                              |
| 4   | [SPARK Library Reference](../docs/04-spark-library-reference.md)          | Full API reference for SparkToolkit — 17 modules covering entities, MediatR, repos, cache, messaging, resilience          |
| 5   | [AI Instructions](../docs/05-ai-instructions.md)                          | Rules, decision frameworks, checklists, naming conventions, and anti-patterns for AI assistants                           |
| 6   | [Authentication & Authorization](../docs/06-authentication-and-authorization.md) | JWT flow, IAuthenticationService, claims extraction, role-based auth, cross-service auth                                  |
| 7   | [Cross-Service Communication](../docs/07-cross-service-communication.md)  | RabbitMQ event publishing, Redis Pub/Sub, event-driven data sync, consumer patterns                                       |
| 8   | [Database & EF Core](../docs/08-database-and-efcore.md)                   | Migrations, entity configs, indexing, query filters, seeding, concurrency, MongoDB integration                            |
| 9   | [Real-World Recipes](../docs/09-real-world-recipes.md)                    | 8 copy-paste solutions: search/filter, dashboard, bulk ops, file upload, slug gen, background queue, caching, enum filter |
| 10  | [Gateway Configuration](../docs/10-gateway-configuration.md)              | YARP reverse proxy setup: routes, clusters, transforms, load balancing, rate limiting                                     |

---

## Folders

1. **prompts**: Copilot prompt files (slash commands)
2. **instructions**: file-scoped instructions
3. **skills**: reusable skills
4. **requirements/templates**: requirement templates
5. **projects**: per-project customization

## Quick Start

1. **AI assistants** → Read [AI Instructions](../docs/05-ai-instructions.md) first
2. **New project** → Follow [New Service Template](../docs/03-new-service-template.md)
3. **New feature** → Refer to [Coding Style & Patterns](../docs/02-coding-style-and-patterns.md) + [Real-World Recipes](../docs/09-real-world-recipes.md)
4. **SPARK API lookup** → Check [SPARK Library Reference](../docs/04-spark-library-reference.md)

Notice: If something is unclear, ask clarifying questions; do not assume.


Notice: You should ask again if you need to clarify requirement or deeply understand somethings, should not auto thinking or assume.
