# 🪝 Pre-Commit Check (Validation Hook)

**Run when:** Code changes are ready to be committed / submitted.

---

## Code Quality

- [ ] No `Console.WriteLine` or `Debug.Write` left in production code
- [ ] No commented-out code blocks (unless intentional with explanation)
- [ ] No `TODO` / `FIXME` left unresolved in changed files (or explicitly deferred)
- [ ] No hardcoded connection strings, secrets, or credentials
- [ ] `CancellationToken` passed through all async call chains

---

## .NET Specific

- [ ] No raw `try/catch` in handlers or controllers (use global exception middleware)
- [ ] `using` statements or `using` declarations — no unclosed disposable resources
- [ ] No `async void` methods (except event handlers where unavoidable)
- [ ] Migrations: if schema changed, `dotnet ef migrations add` was run and migration reviewed
- [ ] Migration file does NOT drop tables or columns without explicit user confirmation

---

## Tests

- [ ] Tests exist for changed handlers/services (at minimum happy path + one error case)
- [ ] All tests pass locally: `dotnet test`
- [ ] No tests are marked `[Skip]` without explanation

---

## Files & Structure

- [ ] New files placed in correct project/layer
- [ ] New files follow naming conventions (PascalCase for C#, kebab-case for NestJS)
- [ ] No accidental changes to `.gitignore`, `appsettings.Production.json`, or secret files
- [ ] `appsettings.Development.json` not committed with real credentials

---

## Requirements Traceability

- [ ] The change corresponds to a documented requirement in `<Service>/requirements/features/`
- [ ] If the feature was newly scoped during implementation → requirements file updated

---

## Result

| Status | Action |
|---|---|
| ✅ All checks passed | Safe to commit |
| 🔴 Any red item | Fix before committing |
| 🟡 Minor item | Fix or explicitly defer with comment |
