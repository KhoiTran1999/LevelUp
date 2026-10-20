---
applyTo: '**/*.cs'
---

# C# Coding Style Instructions

## File Structure & Namespaces
- **File-scoped namespaces**: All files use `namespace ProjectName;` format (not block syntax)
- **One type per file**: Classes, interfaces, enums each in separate files

```csharp
namespace S5E.Shared.Helpers;

public static class RegexHelper
{
    // implementation
}
```

## Classes & Inheritance
- **Sealed by default**: Classes are `public sealed class` unless inheritance needed
- **No base classes**: Don't use inheritance for aggregates/entities unless business justification

```csharp
public sealed class UserManagementFixture : IDisposable
{
    // implementation
}
```

## Null Checks & Guard Clauses
- **Modern null checks**: Use `is null`/`is not null`, never `== null`
- **Guard clauses**: Early returns with `ArgumentNullException` for validation
- **Use nameof**: Always reference parameter names with `nameof(parameter)`

```csharp
public static void ThrowIfNull<T>(T value, [CallerArgumentExpression(nameof(value))] string? paramName = null)
{
    if (value is null)
    {
        throw new ArgumentNullException(paramName);
    }
}
```

## Variable Declarations
- **Use var**: When type is obvious from assignment
- **Expression-bodied members**: For simple property/method implementations

```csharp
// Properties and constructors
internal AsyncQueryProvider(IQueryProvider inner) => this._inner = inner;
public IQueryable CreateQuery(Expression expression) => new AsyncQueryable<TEntity>(expression);

// Variables
var context = new MongoDbContext(_connectionString, _databaseName);
var collection = context.GetCollection<Document>();
```

## Modern C# Features
- **Pattern matching**: Use `switch` expressions and pattern matching
- **Object initializers**: For simple object construction
- **File-scoped types**: When types are internal to single file
- **Primary constructors**: For simple data classes (C# 12+)

# Coding Style

## General Guidelines
- Follow the official Microsoft .NET C# coding conventions: https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions
- Prefer clarity and readability over brevity.
- Use consistent formatting and naming throughout the codebase.
- Make only high confidence suggestions when reviewing code changes.
- Always use the latest version C#, currently C# 13 features.
- Never change global.json unless explicitly asked to.
- Never change package.json or package-lock.json files unless explicitly asked to.

## Naming Conventions
- Use `PascalCase` for class, method, and property names.
- Use `camelCase` for local variables and method parameters.
- Use `ALL_CAPS` for constants.
- Prefix interfaces with `I` (e.g., `IOrderService`).
- Use meaningful, descriptive names; avoid abbreviations.

## Formatting
- Apply code-formatting style defined in `.editorconfig` file.
- Prefer file-scoped namespace declarations and single-line using directives.
- Add a blank line between method definitions.
- Place opening braces on a new line for methods, properties, and types (unless using file-scoped namespaces, then follow the file-scoped style).
- Use pattern matching and switch expressions wherever possible.
- Use nameof instead of string literals when referring to member names.
- Ensure that XML doc comments are created for any public APIs. When applicable, include <example> and <code> documentation in the comments.

### Example: File-Scoped Namespaces
```csharp
// Before
namespace MyNamespace
{
    public class ExampleClass
    {
        // ...existing code...
    }
}
// After
namespace MyNamespace;

public class ExampleClass
{
    // ...existing code...
}
```
- All new files must use file-scoped namespaces. Refactor existing files during updates or maintenance.

## Variable Declaration
- Use `var` for local variable declarations when the type is obvious.
- Prefer explicit types if it improves clarity.

### Example
```csharp
// Before
int x = 1;
double y = 2.0;
string z = "Hello";
ProductBacklogItem item = new ProductBacklogItem("Test", "Test", 1, 1, 1);
// After
var x = 1;
var y = 2.0;
var z = "Hello";
var item = new ProductBacklogItem("Test", "Test", 1, 1, 1);
```

## Sealed Classes
- Make classes `sealed` by default. If a class needs to be inherited, mark it as `virtual` explicitly.

## Use Nameof with Exceptions
- When throwing exceptions, use `nameof` to refer to the parameter name instead of hardcoding it.

### Example
```csharp
// Before
throw new ArgumentNullException("parameterName");
// After
throw new ArgumentNullException(nameof(parameterName));
```

## Code Structure
- One type per file (class, interface, enum, etc.).
- Organize files by feature/domain when possible.
- Group using directives at the top of the file, outside the namespace.
- Place related types in the same namespace.
- Use partial classes only when necessary (e.g., for code generation).

## Comments & Documentation
- Use XML documentation comments (`///`) for public APIs.
- Write comments to explain why, not what, when necessary.
- Remove commented-out code before committing.

## Null Checks & Exceptions
- Use guard clauses for argument validation.
- Declare variables non-nullable, and check for null at entry points.
- Use `nameof` for parameter names in exceptions.
- Always use `is null` or `is not null` instead of `== null` or `!= null`.
- Trust the C# null annotations and don't add null checks when the type system says a value cannot be null.

## Modern C# Features
- Use pattern matching and expression-bodied members where appropriate.
- Prefer object and collection initializers.

# References
- Adhere to Microsoft's [coding conventions](https://learn.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions).