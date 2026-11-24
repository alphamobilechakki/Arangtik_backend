# Arangtik Load Testing Framework (k6)

A modular, feature-oriented load testing suite built with [k6](https://k6.io/) for the Arangtik platform.

---

## Directory Architecture

```
Backend/tests/loadtesting/
â”œâ”€â”€ config/
â”‚   â”œâ”€â”€ environments.js        # Target environments (local, staging, production) & endpoints
â”‚   â”œâ”€â”€ thresholds.js          # SLA thresholds (p95, error rates) & stages
â”‚   â””â”€â”€ tokens.json            # Auto-generated JWT test tokens
â”œâ”€â”€ utils/
â”‚   â”œâ”€â”€ authHelper.js          # Injects User & Admin Bearer headers in k6
â”‚   â”œâ”€â”€ dataGenerator.js       # Generates realistic items, boxes, weights & prices
â”‚   â””â”€â”€ generateTokens.js      # Node.js script signing valid JWT tokens from .env
â”œâ”€â”€ scenarios/
â”‚   â”œâ”€â”€ smoke_test.js          # Fast 20s health check across all core features
â”‚   â””â”€â”€ load_test.js           # Multi-stage ramp-up test (User + Catalog + Admin)
â”œâ”€â”€ features/
â”‚   â”œâ”€â”€ jewellery/
â”‚   â”‚   â”œâ”€â”€ jewellery_public.js # Public category catalog browsing
â”‚   â”‚   â”œâ”€â”€ jewellery_user.js   # User boxes, sets, and item additions
â”‚   â”‚   â””â”€â”€ jewellery_admin.js  # Admin KPIs, filters, pagination, phone search
â”‚   â”œâ”€â”€ wardrobe/
â”‚   â”‚   â””â”€â”€ wardrobe_browse.js  # Garments and wardrobe categories
â”‚   â”œâ”€â”€ auth/
â”‚   â”‚   â””â”€â”€ auth_flow.js        # User profile & auth latency
â”‚   â”œâ”€â”€ orders/
â”‚   â”‚   â””â”€â”€ orders_lifecycle.js # Order lists and queries
â”‚   â”œâ”€â”€ frequentConnect/
â”‚   â”‚   â””â”€â”€ fc_cluster_activity.js # Clusters and conversations
â”‚   â””â”€â”€ admin/
â”‚       â””â”€â”€ admin_dashboard.js  # Terminals, store types, and admin operations
â””â”€â”€ README.md
```

---

## Quick Start Commands

Make sure the backend server is running (`npm start` or `npm run dev` in `Backend/`).

### 1. Run Smoke Test (Quick Sanity Check)
```bash
npm run test:load:smoke
```

### 2. Run Comprehensive Multi-Feature Load Test
```bash
npm run test:load:all
```

### 3. Run Feature-Specific Load Tests
```bash
# Jewellery User flow (items, boxes, creates)
npm run test:load:jewellery

# Jewellery Admin flow (KPIs, table pagination, phone search)
npm run test:load:jewellery:admin
```

### 4. Running Any Feature Directly with k6
```bash
k6 run tests/loadtesting/features/jewellery/jewellery_public.js
k6 run tests/loadtesting/features/wardrobe/wardrobe_browse.js
k6 run tests/loadtesting/features/auth/auth_flow.js
```

---

## Overriding Parameters via Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `TARGET` | Switch environment profile (`local`, `staging`, `production`) | `-e TARGET=staging` |
| `BASE_URL` | Explicitly override target API base URL | `-e BASE_URL=http://localhost:8083/api` |
| `USER_TOKEN` | Pass a custom user JWT token | `-e USER_TOKEN=eyJ...` |
| `ADMIN_TOKEN` | Pass a custom admin JWT token | `-e ADMIN_TOKEN=eyJ...` |

Example:
```bash
k6 run -e TARGET=staging tests/loadtesting/scenarios/smoke_test.js
```

---

## Key Performance Indicators (KPIs) to Watch

When k6 completes a run, check the summary table:
- **`http_req_duration`**:
  - `p(90)` / `p(95)`: 90th / 95th percentile latency. Target: `< 300ms` for reads, `< 500ms` for writes.
- **`http_req_failed`**: Total request error rate. Target: `< 1%`.
- **`iterations`**: Total transactions executed.
- **`vus` / `vus_max`**: Number of concurrent virtual users simulated.
