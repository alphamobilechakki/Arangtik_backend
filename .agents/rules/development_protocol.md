# ARANGTIK AGENT PROTOCOL & STANDARDS

All AI coding agents working on Arangtik MUST adhere to the following rules:

1. **Phase-by-Phase & Feature-by-Feature Development:**
   - Always implement 1 feature/endpoint at a time.
   - Run and test the API thoroughly before moving to the next feature.
   - Do NOT build multiple features simultaneously without testing.

2. **HTTP Method Rule:**
   - **Always use `PATCH`** for update APIs.
   - **Never use `PUT`**.

3. **API Naming Rules:**
   - Simple, human-readable, clear naming:
     - `/api/wardrobe/analyze-photo`
     - `/api/wardrobe/add-item`
     - `/api/wardrobe/get-all-items`
     - `/api/wardrobe/get-item-details/:id`
     - `/api/wardrobe/update-item/:id`
     - `/api/wardrobe/update-item-status/:id`
     - `/api/wardrobe/delete-item/:id`
     - `/api/wardrobe/log-worn-dress`
     - `/api/wardrobe/suggest-outfit`
     - `/api/wardrobe/lend-item`
     - `/api/wardrobe/return-lent-item/:id`
     - `/api/laundry/create-order`
     - `/api/dhobi/update-order-status/:id`
     - `/api/dhobi/update-order-payment/:id`

4. **Universal Store Schema Model:**
   - Extensible `attributes` key-value pattern (no hardcoded category tables).
   - Universal statuses: `AVAILABLE`, `IN_USE`, `DIRTY`, `IN_LAUNDRY`, `LENT_OUT`, `IN_REPAIR`, `ARCHIVED`.
   - Ready for Wardrobe now and Kitchen/Electronics/Household later.

5. **Consistent JSON Format:**
   `{ success: true, message: "...", data: { ... } }`
