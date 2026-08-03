# Architecture Review Skill

## Purpose
Review the project's architecture for quality and maintainability.

## Review Areas
* Separation of concerns.
* Provider abstraction.
* API design.
* Type safety.
* Frontend/backend boundaries.
* Security boundaries.
* Dependencies.
* Scalability.
* Testability.
* Maintainability.

## Detection Points
* Duplicated provider logic.
* God components.
* God API routes.
* Circular dependencies.
* Excessive abstractions.
* Unnecessary dependencies.
* Client-side secrets.
* Business logic inside UI components.
* Provider-specific logic leaking across the application.

## Output Format
Every review should produce:

```text
Architecture Health:
Excellent / Good / Needs Attention / Critical

Strengths:
...

Problems:
...

Recommended Improvements:
...

Priority:
...
```

## Note
The skill should not rewrite the architecture automatically.