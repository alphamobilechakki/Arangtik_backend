# CODE SIMPLICITY & MINIMAL IMPLEMENTATION RULES

## 1. Follow KISS Principle
- Keep It Simple, Stupid.
- Always implement the simplest solution that satisfies the exact requirement.
- Do not over-engineer simple functionalities.
- Prefer straightforward, readable and maintainable code.
- Do not introduce unnecessary design patterns or abstractions.

## 2. No Unnecessary Code
- Write only code that is actually required.
- Do not add unused variables, functions, imports, schemas, helpers or utilities.
- Do not create functions for one-time operations unless genuinely necessary.
- Do not add unnecessary fallback logic or defensive checks.
- Do not add hypothetical future functionality.
- Do not duplicate existing logic.

## 3. Strict API & Route Rules
- One functionality should have one canonical API endpoint.
- One controller function should have one route unless multiple routes are explicitly required.
- NEVER create alternative routes, aliases, duplicate endpoints or backward-compatible routes without explicit approval.
- Do not expose the same controller through multiple HTTP methods or URLs.
- Follow REST API conventions.
- Use PATCH for partial updates, POST for creation/actions, GET for fetching and DELETE for deletion.

## 4. Reuse Existing Architecture
- Before creating anything, inspect the existing module structure.
- Reuse existing middleware, services, validators and utilities wherever applicable.
- Do not create new files if existing files can handle the requirement cleanly.
- Do not create unnecessary service/helper layers.
- Follow the project's established architecture.

## 5. No Unnecessary Abstraction
- Avoid generic factories, wrappers, managers, adapters and base classes for simple functionality.
- Avoid creating a separate utility for logic used only once.
- Do not create multiple layers that simply pass data from one function to another.
- Keep business logic in the appropriate existing service/controller layer.

## 6. Strict Scope Control
- Implement ONLY what the user requested.
- Do not modify unrelated files.
- Do not refactor existing modules unless explicitly requested.
- Do not add extra features based on assumptions.
- Do not change existing API contracts without approval.

## 7. Mandatory Before Coding
Before implementation:
1. Inspect the existing code.
2. Identify reusable functions and existing routes.
3. Identify the minimum files that need modification.
4. Decide the single API endpoint required.
5. Explain the proposed implementation briefly.

## 8. Mandatory After Coding
After implementation:
1. Remove unused imports and variables.
2. Remove duplicate code and unnecessary abstractions.
3. Verify that no duplicate routes or aliases were created.
4. Verify that only required files were modified.
5. Run relevant tests.

## 9. Complexity Justification
If implementation requires:
- Multiple routes for one functionality.
- Multiple controller functions for one operation.
- Additional services or helper files.
- New abstractions or design patterns.

You MUST explain why they are necessary.

Do not implement them without justification.

## 10. Golden Rule
The best implementation is not the one with the most code.

The best implementation is the smallest clean, scalable and maintainable implementation that correctly satisfies the requirement.

**Prefer 30 clean lines over 150 unnecessary lines.**