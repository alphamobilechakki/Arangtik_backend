# Milk / Dairy Orders Module (Doodh Wala)

## Overview
This folder is reserved for the upcoming **Milk / Dairy (Doodh Wala)** functionality in Arangtik.

### Architecture Principles:
1. **Universal Database Collection**: 
   - All dairy orders and subscriptions write to the shared MongoDB `orders` collection (`orderCategory: 'Doodh Wala'`, `orderType: 'MILK_SUBSCRIPTION_OR_ORDER'`).
2. **Dedicated Modular Logic**:
   - `milkOrder.service.js`: Daily delivery schedules (Cow/Buffalo milk litres, morning/evening slots, monthly billing tally).
   - `milk.controller.js`: Mobile endpoints for customers to pause, resume, or change daily milk quantity.
   - `milk.routes.js`: Routes mapped under `/api/milk/orders`.
   - `milkWhatsapp.service.js`: Daily delivery summaries and monthly bill dispatches.
3. **Vendor Multi-Category Compatibility**:
   - Vendors registered with `'Doodh Wala'` in their `categories` array (or combined with `'Dhobi'`) see their dairy routes and customer drop lists via `/api/vendor/orders?category=Doodh Wala`.
