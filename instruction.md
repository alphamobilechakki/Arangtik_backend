# Development Instructions

## 1. General Development Rules

* Always write clean, readable, maintainable, and professional code.
* Follow the existing project architecture and coding patterns.
* Before making changes, understand the existing implementation and dependencies.
* Do not unnecessarily change working code.
* Do not remove, disable, replace, or break any existing functionality.
* New functionality must be added without affecting existing features.
* Avoid unnecessary refactoring unless it is required for the requested change.
* Keep implementations simple, modular, and scalable.
* Do not duplicate code when an existing reusable function/component can be used.
* Follow the project's existing technology stack and conventions.

---

## 2. File and Folder Structure

Maintain a clean and logical project structure.

### Rules

* Keep related files together.
* Separate business logic, API logic, database logic, utilities, components, and configuration where applicable.
* Do not place unrelated functionality in the same file.
* Avoid creating unnecessary folders or files.
* Use meaningful and descriptive file and folder names.
* Follow the existing folder structure before introducing a new structure.
* New files must be placed in the most appropriate existing directory.
* Do not create duplicate files for the same functionality.
* Keep configuration files separate from application logic.

### Example

```text
src/
├── controllers/
├── services/
├── routes/
├── models/
├── middleware/
├── utils/
├── config/
└── server.js
```

Follow the project's actual structure if it already has an established architecture.

---

## 3. Code Quality

All code must be:

* Clean
* Readable
* Consistent
* Maintainable
* Modular
* Reusable
* Production-ready

Avoid:

* Extremely long functions
* Extremely large files
* Duplicate logic
* Unnecessary nesting
* Hardcoded values
* Unused variables
* Unused imports
* Dead code
* Temporary debugging code
* Unnecessary abstractions

Prefer clear and straightforward implementations over unnecessarily complex solutions.

---

## 4. Naming Conventions

Use meaningful names for:

* Variables
* Functions
* Classes
* Components
* Files
* Folders
* API endpoints
* Database fields

Names should clearly describe their purpose.

Avoid names such as:

```text
data
temp
test
abc
xyz
newData
thing
```

unless they are genuinely appropriate for the context.

Use consistent naming throughout the project.

---

## 5. Functions

Functions should have a single clear responsibility whenever practical.

### Guidelines

* Keep functions reasonably small.
* Use descriptive function names.
* Avoid repeating the same logic.
* Extract reusable logic into helper/service functions.
* Do not create unnecessary functions for very simple operations.
* Keep business logic separate from routing or UI code where applicable.
* Handle errors properly.

Example:

```js
async function getUserById(userId) {
    // Fetch user from database
}
```

The function name should make its purpose immediately understandable.

---

## 6. Comments

Comments should explain **why** something is done, not simply repeat what the code already says.

Good:

```js
// Use the transaction here to ensure deal creation and inventory
// updates are completed together.
```

Avoid:

```js
// Create user
const user = await createUser();
```

Do not add unnecessary comments to obvious code.

### Important

* Write comments professionally.
* Keep comments short and meaningful.
* Explain complex business rules or non-obvious logic.
* Add comments where future developers may otherwise misunderstand the implementation.
* Do not fill the code with excessive comments.

---

## 7. Existing Functionality Protection

This is a critical rule.

### Never remove existing functionality unless explicitly requested.

When modifying an existing feature:

1. Understand the current implementation.
2. Identify dependencies.
3. Make the smallest necessary change.
4. Preserve existing behavior.
5. Verify related functionality after the change.

Do not delete existing functions, APIs, components, database fields, routes, or logic simply because they appear unused without first confirming their purpose.

If a requested change conflicts with existing behavior, modify the implementation carefully so both requirements can coexist whenever possible.

---

## 8. Adding New Features

When adding a feature:

* Follow the existing architecture.
* Reuse existing utilities and services where possible.
* Keep the new feature modular.
* Avoid modifying unrelated files.
* Do not duplicate existing functionality.
* Add required validation and error handling.
* Keep API, database, service, and UI responsibilities separated where applicable.

The implementation should integrate naturally with the existing project.

---

## 9. Modifying Existing Code

Before modifying code:

* Read the complete relevant file.
* Understand how the function/component is used.
* Check related routes, services, models, and utilities.
* Identify possible side effects.
* Make only the required changes.

Do not rewrite an entire file when only a small modification is required.

Prefer:

```text
Small targeted change
        ↓
Preserve existing logic
        ↓
Add required functionality
        ↓
Verify related functionality
```

---

## 10. Error Handling

Errors should be handled properly and consistently.

* Do not silently ignore errors.
* Do not expose sensitive information in error responses.
* Use meaningful error messages.
* Follow the project's existing error-handling pattern.
* Validate user input where required.
* Handle expected failures gracefully.

Avoid unnecessary `try/catch` blocks when they provide no useful handling.

---

## 11. Security

Never hardcode sensitive information.

Do not commit:

* API keys
* Passwords
* Access tokens
* Secret keys
* Database credentials
* Private configuration

Use environment variables or the project's existing secure configuration system.

Example:

```env
DATABASE_URL=...
API_KEY=...
JWT_SECRET=...
```

Never expose secrets in frontend code or API responses.

---

## 12. Database Changes

When modifying database-related functionality:

* Understand existing schemas/models first.
* Preserve existing fields unless removal is explicitly required.
* Avoid breaking existing records.
* Use appropriate validation.
* Maintain consistent naming.
* Consider backward compatibility.
* Do not change database structure unnecessarily.

For new fields, consider how the structure may need to support future requirements.

---

## 13. API Development

Maintain consistent API design.

Follow the project's existing conventions for:

* Routes
* HTTP methods
* Request parameters
* Request bodies
* Response structure
* Status codes
* Authentication
* Validation
* Error handling

Do not change existing API response structures unnecessarily because other parts of the application may depend on them.

---

## 14. Frontend Development

For frontend code:

* Keep components reusable.
* Avoid unnecessarily large components.
* Separate reusable logic where appropriate.
* Maintain consistent UI patterns.
* Reuse existing components and styles.
* Keep state management clear.
* Avoid unnecessary API calls.
* Handle loading, success, empty, and error states where required.

Do not introduce a new UI pattern when an existing project pattern can be reused.

---

## 15. Backend Development

For backend code:

* Keep routes thin.
* Keep business logic in appropriate services/controllers.
* Keep database operations organized.
* Use middleware for shared request-processing logic.
* Validate input.
* Handle errors consistently.
* Avoid putting large amounts of business logic directly inside route handlers.

A typical flow should remain:

```text
Request
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
Model / Database
   ↓
Response
```

Follow the existing project architecture if it differs.

---

## 16. Dependencies

Do not add a new package unless it is genuinely required.

Before adding a dependency:

* Check whether the project already has an equivalent solution.
* Prefer existing dependencies.
* Avoid unnecessary package duplication.
* Use stable and appropriate packages.

Do not remove existing dependencies without confirming that they are no longer required.

---

## 17. Formatting and Style

Maintain consistent formatting throughout the project.

* Use the project's existing formatter/linter configuration.
* Follow existing indentation and spacing.
* Keep imports organized.
* Avoid unnecessary blank lines.
* Keep code visually clean.
* Do not mix multiple coding styles.

If the project already uses ESLint, Prettier, or another formatter, follow its configuration.

---

## 18. Debugging

During debugging:

* Identify the actual root cause.
* Do not hide errors simply to make the application appear functional.
* Do not add permanent debugging code.
* Remove temporary `console.log`, debug statements, and test code after resolving the issue unless they are intentionally part of the application's logging system.

Prefer fixing the root cause rather than adding workarounds.

---

## 19. Documentation

Documentation should be concise and useful.

Document:

* Important architecture decisions
* Complex business logic
* Required environment variables
* Important setup instructions
* Non-obvious implementation details
* Important API behavior when necessary

Do not create documentation for trivial or self-explanatory code.

---

## 20. Before Completing Any Change

Before considering a task complete:

* Verify the requested functionality.
* Check for syntax or type errors.
* Check imports and dependencies.
* Check that existing functionality is preserved.
* Check related APIs/components/services.
* Remove unnecessary debug code.
* Keep the final implementation clean.
* Ensure no unrelated files were modified unnecessarily.

---

## 21. Golden Rule

> **Make the smallest clean change that completely solves the requested problem while preserving all existing functionality.**

Always prioritize:

```text
Existing Functionality
        +
Clean Architecture
        +
Readable Code
        +
Minimal Changes
        +
Future Maintainability
```

Do not sacrifice existing functionality for unnecessary code restructuring.
