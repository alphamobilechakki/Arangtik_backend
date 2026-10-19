# Tailor Orders Module

## Overview
This folder is reserved for the upcoming **Tailor / Alteration Order** functionality in Arangtik.

### Architecture Principles:
1. **Universal Database Collection**: 
   - All tailor orders write to the shared MongoDB `orders` collection (`orderCategory: 'Tailor'`, `orderType: 'TAILOR_WORK_ORDER'`).
   - Links directly to customer `WardrobeItem` documents for stitching, alterations, custom fitting measurements, or embroidery.
2. **Dedicated Modular Logic**:
   - `tailorOrder.service.js`: Handles tailor work orders, measurements snapshots, pickup/delivery scheduling, and tailor assignment.
   - `tailor.controller.js`: Tailor order endpoints.
   - `tailor.routes.js`: Routes mapped under `/api/tailor/orders`.
   - `tailorPdf.service.js`: PDF work order with measurements diagram and garment thumbnails.
   - `tailorWhatsapp.service.js`: Tailor WhatsApp work order dispatches.
3. **Vendor Multi-Category Compatibility**:
   - Vendors with `'Tailor'` in their `categories` array (e.g. `['Dhobi', 'Tailor']`) manage these orders seamlessly.
