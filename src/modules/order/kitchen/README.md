# Kitchen / Food Orders Module

## Overview
This folder is reserved for the upcoming **Kitchen / Food Order** functionality in Arangtik.

### Architecture Principles:
1. **Universal Database Collection**: 
   - All kitchen orders write to the shared MongoDB `orders` collection (`orderCategory: 'Kitchen'`, `orderType: 'KITCHEN_ORDER'`).
   - No fragmented or separate tables are created in MongoDB.
2. **Dedicated Modular Logic**:
   - `kitchenOrder.service.js`: Handles meal preparation orders, portions, delivery times, and chef/vendor assignment.
   - `kitchen.controller.js`: Handles API requests and responses.
   - `kitchen.routes.js`: Routes mapped under `/api/kitchen/orders` or `/api/orders?orderCategory=Kitchen`.
   - `kitchenWhatsapp.service.js`: WhatsApp menu & order confirmation templates.
3. **Vendor Multi-Category Compatibility**:
   - Vendors with `'Kitchen'` in their `categories` array (e.g. `['Dhobi', 'Kitchen']`) will receive and manage kitchen orders via `/api/vendor/orders?category=Kitchen`.
