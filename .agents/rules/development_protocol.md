# ARANGTIK — AGENT DEVELOPMENT RULES

1. Always review `MASTER_REQUIREMENTS.md` and `WARDROBE_MODULE_REQUIREMENTS.md` before development.

2. Work on **one functionality at a time**; never build the complete module at once.

3. Follow: **Model → Service → Controller → Validation → Route → Test**.

4. Use `PATCH` for updates; **never use `PUT`**. Follow clean and consistent API naming and response structure.

5. After every functionality, test success, validation, authentication, and edge cases; fix bugs and re-test before moving forward.

6. Keep the code **clean, modular, production-ready**, with no unnecessary files, dead code, duplicate logic, or unused imports.
