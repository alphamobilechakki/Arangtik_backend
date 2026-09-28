# ARANGTIK — AGENT DEVELOPMENT & ARCHITECTURE RULES

> **MANDATORY INSTRUCTIONS FOR ALL AI AGENTS & DEVELOPERS**  
> Every agent working on this codebase MUST strictly follow these rules before writing any code, modifying files, or testing endpoints.

---

## 1. PHASE-WISE STEP-BY-STEP DEVELOPMENT PROTOCOL

### STRICT RULE: One Functionality at a Time with Mandatory Testing
1. **Never build the whole project or module at once.**
2. Work step-by-step on a single feature/API endpoint.
3. For every feature:
   - **Step A:** Review requirements in [WARDROBE_MODULE_REQUIREMENTS.md](file:///d:/my%20codes/Arangtik/backend/WARDROBE_MODULE_REQUIREMENTS.md).
   - **Step B:** Implement the Model $\rightarrow$ Service $\rightarrow$ Controller $\rightarrow$ Route.
   - **Step C:** Test the API endpoint thoroughly (Success cases, Validation failures, Auth checks, Edge cases).
   - **Step D:** Fix any bug immediately and re-test.
   - **Step E:** Only after 100% verification and stability, proceed to the next feature.

---

## 2. STRICT API & HTTP METHOD STANDARDS

1. **NO `PUT` METHOD FOR UPDATES:**
   - **Always use `PATCH`** for partial and full resource updates (e.g. `PATCH /api/wardrobe/update-item/:id`, `PATCH /api/wardrobe/update-item-status/:id`).
   - Never use `PUT`.

2. **CLEAN & INTUITIVE API NAMING:**
   - API routes must be simple, readable, and self-explanatory:
     - `POST  /api/wardrobe/analyze-photo`
     - `POST  /api/wardrobe/add-item`
     - `GET   /api/wardrobe/get-all-items`
     - `GET   /api/wardrobe/get-item-details/:id`
     - `PATCH /api/wardrobe/update-item/:id`
     - `PATCH /api/wardrobe/update-item-status/:id`
     - `DELETE /api/wardrobe/delete-item/:id`
     - `POST  /api/wardrobe/log-worn-dress`
     - `GET   /api/wardrobe/get-wear-history`
     - `POST  /api/wardrobe/suggest-outfit`
     - `POST  /api/wardrobe/lend-item`
     - `PATCH /api/wardrobe/return-lent-item/:id`
     - `POST  /api/laundry/create-order`
     - `PATCH /api/dhobi/update-order-status/:id`
     - `PATCH /api/dhobi/update-order-payment/:id`

3. **STANDARDIZED JSON API RESPONSE STRUCTURE:**
   - Every API must return responses in this consistent structure:
   ```json
   {
     "success": true,
     "message": "Item added successfully to wardrobe store",
     "data": { ... }
   }
   ```
   - For errors:
   ```json
   {
     "success": false,
     "message": "Detailed error message",
     "errors": [ ... ]
   }
   ```

---

## 3. "THE UNIVERSAL STORE" SCHEMA STANDARDS (ZERO FUTURE SCHEMA ROT)

1. **Universal Core Item Architecture:**
   - Never hardcode wardrobe-only columns in the root schema.
   - Use dynamic `attributes` object bag to store category-specific metadata.
   - This ensures **Kitchen**, **Electronics**, **Household Items**, and **Valuables** (100+ future categories) can be added with zero database migrations or table proliferation.

2. **Universal Operational Statuses:**
   - `AVAILABLE` (In store/closet ready to use)
   - `IN_USE` (Currently worn / in active use)
   - `DIRTY` (Needs washing/cleaning)
   - `IN_LAUNDRY` (With Dhobi/laundry service)
   - `LENT_OUT` (Given to friend/relative)
   - `IN_REPAIR` (At tailor/repair shop)
   - `ARCHIVED` (Donated/removed)

3. **Active Assignment Object:**
   - Track who currently holds an item when it is outside:
     `{ assignedTo: String, assignedPhone: String, purpose: String, givenDate: Date, expectedReturnDate: Date }`.

---

## 4. CODE QUALITY & FILE STRUCTURE CONVENTIONS

1. **Modular Architecture:**
   - Structure modules under `src/modules/<module_name>/`:
     - `<module_name>.model.js`
     - `<module_name>.service.js`
     - `<module_name>.controller.js`
     - `<module_name>.routes.js`
     - `<module_name>.validation.js`
2. **Centralized Error Handling:**
   - Never leave unhandled promise rejections. Always use async wrappers or try-catch forwarding to `next(error)`.
3. **No Dead Code or Unused Imports:**
   - Keep files clean, modular, properly documented, and lint-error free.

---

## 5. REFERENCE DOCUMENTS

- **Master Requirements:** [MASTER_REQUIREMENTS.md](file:///d:/my%20codes/Arangtik/backend/MASTER_REQUIREMENTS.md)
- **Phase 1 Wardrobe & AI Specs:** [WARDROBE_MODULE_REQUIREMENTS.md](file:///d:/my%20codes/Arangtik/backend/WARDROBE_MODULE_REQUIREMENTS.md)
