ARANGTIK — AGENT DEVELOPMENT RULES
1. Requirement Analysis (Mandatory)
- Always read and understand MASTER_REQUIREMENTS.md and WARDROBE_MODULE_REQUIREMENTS.md before starting development.
- Review the existing project structure, related modules, models, services, controllers, validations, and routes before making changes.
- Understand the existing code flow and dependencies before modifying anything.
- Never assume requirements. If something is unclear, ask before implementing.
2. One Functionality at a Time
- Work on one functionality at a time. Never develop the complete module in one go.
- Break large features into small, manageable tasks.
- Complete, test, and verify the current functionality before moving to the next one.
- Do not modify unrelated functionalities.
3. Mandatory Development Flow
Always follow this development sequence:

Model-> Service-> Controller -> Validation -> Route -> Test



- Keep business logic inside services.
- Controllers should only handle request/response processing.
- Routes should only define endpoints and middleware.
- Validation should be handled separately.
- Keep responsibilities separated and avoid mixing layers.
4. API Design Standards
- Always use PATCH for updating existing resources.
- Never use PUT.
- Use POST for creating resources and DELETE for deleting resources.
- Follow consistent REST API naming conventions.
- Use meaningful endpoint names and HTTP status codes.
- Maintain a consistent API response structure across all modules.
- Avoid duplicate endpoints that perform the same operation.
- Use appropriate pagination, filtering, and sorting for list APIs.
- Return only the necessary response fields.
5. Testing & Verification
After completing every functionality, test the following:
- Successful API execution.
- Required field validation.
- Invalid input and incorrect data types.
- Authentication and authorization.
- Missing or invalid IDs.
- Duplicate records and conflicting requests.
- Empty data and edge cases.
- Database update and deletion behavior.
- Related functionality should not break.
Important: Fix all identified bugs and re-test before proceeding to the next functionality.
6. Clean & Simple Code
- Write clean, modular, production-ready code.
- Prefer simple and understandable implementations.
- Make only necessary changes.
- Do not overengineer solutions.
- Do not create unnecessary files, functions, variables, or abstractions.
- Remove unused imports, dead code, and duplicate logic.
- Do not write redundant code.
- Create helper functions only when genuinely necessary.
- Avoid deeply nested conditions and unnecessarily complex logic.
- Follow the existing project coding style and naming conventions.
7. Database & Schema Rules
- Review existing schemas before creating or modifying models.
- Avoid storing duplicate or unnecessary data.
- Use appropriate data types, defaults, required fields, and indexes.
- Use references (ObjectId) where relationships are required.
- Use GeoJSON for geographical locations requiring geospatial queries.
- Add indexes only when they serve actual query requirements.
- Prevent duplicate records through appropriate database constraints where necessary.
- Handle database errors properly.
- Never drop collections, delete production data, or perform destructive database operations without explicit approval.
8. Security Rules
- Never expose passwords, tokens, API keys, or sensitive information in API responses.
- Never hardcode secrets or credentials.
- Validate and sanitize incoming user input.
- Apply authentication and authorization wherever required.
- Verify resource ownership before allowing modifications or deletions.
- Prevent unauthorized access to admin or other users' data.
- Do not trust IDs or roles received directly from the client.
- Follow secure file upload practices, including file type and size restrictions.
9. Existing Code Protection
- Do not rewrite existing working code unnecessarily.
- Before modifying an existing function, understand where and how it is being used.
- Check all related API dependencies before changing a schema or response structure.
- Maintain backward compatibility wherever possible.
- Do not rename existing fields, APIs, or functions without a valid requirement.
- Do not modify unrelated modules to solve a localized problem.
- Avoid introducing new packages unless absolutely necessary.
10. Error Handling & Logging
- Use consistent error-handling patterns throughout the project.
- Return meaningful and understandable error messages.
- Never expose internal stack traces or sensitive database information to clients.
- Handle asynchronous operations properly.
- Avoid empty catch blocks.
- Add meaningful logs for important operations and failures.
- Do not add excessive console logs or unnecessary debugging statements.
11. Authentication & Authorization
- Follow the existing authentication architecture.
- Reuse existing authentication middleware instead of creating duplicate implementations.
- Verify user roles and permissions at the appropriate level.
- Never rely only on frontend restrictions for security.
- Ensure users can access and modify only the resources they are authorized to access.
12. Code Change & Git Rules
- Before development, inspect the current Git status.
- Never overwrite or discard existing user changes.
- Do not reset, revert, or force-push without explicit approval.
- Do not commit unrelated files.
- Review the final Git diff before completing the task.
- Remove temporary debugging code before finalizing.
13. Agent Execution Rules
- First analyze the task and identify the exact files that need modification.
- Explain the implementation approach briefly before making major changes.
- Do not blindly modify multiple files without understanding their purpose.
- Do not create a new architecture when the existing architecture already solves the problem.
- If an existing implementation can be improved with a small change, prefer that over rewriting it.
- If a requirement conflicts with the existing architecture, explain the conflict before proceeding.
- Never claim that something is tested unless the test was actually executed.
14. Final Completion Report
After completing each functionality, provide a short report containing:
1. What was implemented: Brief functionality summary.
2. Files changed: Exact files created or modified.
3. APIs affected: Endpoints added or updated.
4. Testing performed: Tests executed and their results.
5. Issues found: Bugs or edge cases identified and fixed.
6. Pending work: Anything that remains incomplete.

Most Important Golden Rules
Strictly follow these rules

1. Understand first, then code.
2. One functionality at a time.
3. Simple code over complicated code.
4. Reuse existing logic wherever possible.
5. Make only necessary changes.
6. Never break existing functionality.
7. Test before moving forward.
8. Never perform destructive database operations without approval.
9. No unnecessary abstractions or redundant code.
10. Production safety and data integrity come first.