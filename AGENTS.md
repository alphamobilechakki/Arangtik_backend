# ARANGTIK — AGENT DEVELOPMENT RULES

1. Always review `MASTER_REQUIREMENTS.md` and `WARDROBE_MODULE_REQUIREMENTS.md` before development.

2. Work on **one functionality at a time**; never build the complete module at once.

3. Follow: **Model → Service → Controller → Validation → Route → Test**.

4. Use `PATCH` for updates; **never use `PUT`**. Follow clean and consistent API naming and response structure.

5. After every functionality, test success, validation, authentication, and edge cases; fix bugs and re-test before moving forward.

6. Keep the code **clean, modular, production-ready**, with no unnecessary files, dead code, duplicate logic, or unused imports.

7. **LOCKED & INTEGRATED APIs PROTECTION (STRICT RULE):** All endpoints marked with `[DONE / INTEGRATED ✅]` (Auth, Profile & Biometrics, Store Containers, Cloth Analysis & Gallery Ingestion, Wardrobe CRUD) are tested, active, and locked. **NEVER modify, refactor, break, or alter the request/response structure of existing working APIs** unless the user explicitly asks to change that specific functionality.

8. **PRIMARY PRODUCT TARGET = MOBILE APP (NOT A WEBSITE):** Arangtik is strictly a mobile-first product built as a **Native Mobile Application (iOS / Android / Flutter / React Native)**, NOT a traditional website. The core mission is to make the backend 100% solid, correct, rock-solid, and mobile-optimized. All API designs, query filters, multi-wardrobe selection checkboxes, payload structures, camera/gallery uploads, and outfit recommendation flows must be built with mobile apps as the primary client.

