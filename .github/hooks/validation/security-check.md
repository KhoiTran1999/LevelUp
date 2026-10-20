# 🪝 Security Check (Validation Hook)

**Run when:** Touching authentication, authorization, APIs, data access, configuration, or any user-facing input.

---

## Authentication & Authorization

- [ ] All protected endpoints have `[Authorize]` attribute or equivalent middleware
- [ ] Role/policy requirements match the spec in `docs/06-authentication-and-authorization.md`
- [ ] JWT token claims extracted via `IAuthenticationService` (not raw `HttpContext.User`)
- [ ] No endpoint accidentally exposed as anonymous that should be protected
- [ ] Refresh token logic handles revocation and expiry correctly

---

## Input Validation

- [ ] All API request DTOs have FluentValidation validators registered
- [ ] No raw user input used in SQL strings (use parameterized queries / EF Core)
- [ ] File uploads: type, size, and extension validated
- [ ] Pagination inputs: max page size enforced (prevents over-fetching)

---

## Data Access

- [ ] Soft delete applied where required (users, sensitive records)
- [ ] Multi-tenancy: all queries include tenant filter where applicable
- [ ] No query returns all records without pagination (`ToListAsync()` on unbounded sets)
- [ ] Sensitive fields (passwords, tokens) never returned in API responses

---

## Secrets & Configuration

- [ ] No secrets hardcoded in source code
- [ ] Secrets loaded from environment variables or secret manager
- [ ] `appsettings.Development.json` does not contain production credentials
- [ ] New config sections documented in `docs/` or `<Service>/requirements/`

---

## Cross-Service Communication

- [ ] Outgoing API calls use `IHttpClientFactory` (not `new HttpClient()`)
- [ ] Service-to-service calls include auth headers where required
- [ ] Sensitive data not logged in RabbitMQ event payloads

---

## Logging

- [ ] No PII (email, name, password, token) logged at INFO level or above
- [ ] Error logs include sufficient context (service, operation, error code) without sensitive data
- [ ] Structured logging used (Serilog with `{Property}` placeholders, not string interpolation)

---

## Result

| Status | Action |
|---|---|
| ✅ All checks passed | Proceed to commit |
| 🔴 Critical item | Fix immediately — do not commit |
| 🟠 Major item | Escalate to user before committing |
| 🟡 Minor item | Fix or document as acceptable risk |

---

> If a security issue reveals an architectural gap → save to `memory/auto/` and consider escalating to `architect-agent`.
