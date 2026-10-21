# 🛠️ Arangtik Admin API Documentation

> **Official Backend Integration Guide for Admin Web Panel & Operations Dashboard**  
> **Base URL:** `http://localhost:5000/api/admin` *(or `/api/v1/admin`)*  
> **Version:** `v1.0.0` • **Environment:** `Development & Production` • **Auth:** `Bearer JWT (role: 'admin')` or `x-api-key`

---

## 📑 Table of Contents

1. [🔐 Admin Authentication & Security](#1--admin-authentication--security)
   - [1.1 Admin Password Login (`POST /api/admin/auth/login`)](#11-admin-password-login-post-apiadminauthlogin)
   - [1.2 Get Current Admin Profile (`GET /api/admin/auth/me`)](#12-get-current-admin-profile-get-apiadminauthme)
2. [📦 Vendor Category Management (`/api/admin/vendor-categories`)](#2--service-category-management-apiadminvendor-categories)
   - [2.1 Create New Category (`POST /api/admin/vendor-categories`)](#21-create-new-category)
   - [2.2 List All Categories (`GET /api/admin/vendor-categories`)](#22-list-all-categories)
   - [2.3 Get Category by ID (`GET /api/admin/vendor-categories/:id`)](#23-get-category-by-id)
   - [2.4 Update Category Attributes (`PATCH /api/admin/vendor-categories/:id`)](#24-update-category-attributes-patch)
   - [2.5 Deactivate Category (Soft Delete) (`DELETE /api/admin/vendor-categories/:id`)](#25-deactivate-category-soft-delete)
   - [2.6 Permanent Delete Category (Hard Delete) (`DELETE /api/admin/vendor-categories/:id?hard=true`)](#26-permanent-delete-category-hard-delete)
3. [📊 System Inventory & Analytics Sync (`/api/integration`)](#3--system-inventory--analytics-sync-apiintegration)
   - [3.1 Aggregated System Statistics (`GET /api/integration/stats`)](#31-aggregated-system-statistics-get-apiintegrationstats)
   - [3.2 User List Synchronization (`GET /api/integration/users`)](#32-user-list-synchronization-get-apiintegrationusers)
   - [3.3 Detailed User Profile (`GET /api/integration/users/:identifier`)](#33-detailed-user-profile-get-apiintegrationusersidentifier)
4. [👥 Vendor Partner Management (`/api/admin/vendors`)](#4--vendor-partner-management-apiadminvendors)
   - [4.1 Registered vs Unregistered Vendor Metrics (`GET /api/admin/vendors/stats`)](#41-registered-vs-unregistered-vendor-metrics)
   - [4.2 List Registered Vendors (`GET /api/admin/vendors/registered`)](#42-list-registered-vendors)
   - [4.3 Onboard New Registered Vendor (`POST /api/admin/vendors/registered`)](#43-onboard-new-registered-vendor)
   - [4.4 Update Registered Vendor Details (`PATCH /api/admin/vendors/registered/:id`)](#44-update-registered-vendor-details)
   - [4.5 Suspend / Activate Vendor Status (`PATCH /api/admin/vendors/registered/:id/status`)](#45-suspend--activate-vendor-status)
   - [4.6 List Unregistered Contact Leads (`GET /api/admin/vendors/unregistered`)](#46-list-unregistered-contact-leads)
   - [4.7 Convert Unregistered Lead to Registered Partner (`POST /api/admin/vendors/unregistered/:id/convert`)](#47-convert-unregistered-lead-to-registered-partner)
5. [🧺 Customer Work Orders & Fulfillment (`/api/admin/orders`)](#5--customer-work-orders--fulfillment-apiadminorders)
   - [5.1 Aggregated Work Order Statistics (`GET /api/admin/orders/stats`)](#51-aggregated-work-order-statistics)
   - [5.2 List All Customer Work Orders with Category & Status Filters (`GET /api/admin/orders`)](#52-list-all-customer-work-orders)
   - [5.3 Work Order Details & Garments Breakdown (`GET /api/admin/orders/:id`)](#53-work-order-details--garments-breakdown)
   - [5.4 Admin Status Override (`PATCH /api/admin/orders/:id/status`)](#54-admin-status-override)
   - [5.5 Resend WhatsApp PDF Work Order Slip (`POST /api/admin/orders/:id/resend-whatsapp`)](#55-resend-whatsapp-pdf-work-order-slip)
6. [📋 Quick Integration Checklist for Admin Web Developers](#6--quick-integration-checklist-for-admin-web-developers)

---

## 1. 🔐 Admin Authentication & Security

All admin endpoints under `/api/admin/*` and `/api/integration/*` require admin-level authorization. The backend supports two flexible authentication methods:

### Method A: Admin Bearer JWT Token
Pass a valid JWT token generated for an admin user (`role === 'admin'`):
```http
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

### Method B: Admin API Key Header (x-api-key)
For server-to-server sync, automated scripts, or internal dashboards:
```http
x-api-key: <ADMIN_SYNC_API_KEY>
```
> **Development Key:** `arangtik_admin_secret_2026`  
> **Production Key:** Configured via `ADMIN_SYNC_API_KEY` in server `.env`.

---

### 1.1 Admin Password Login (`POST /api/admin/auth/login`)
Admin logs in with their registered phone number and password to obtain an Admin Bearer JWT Token.

- **Default Admin Credentials (Pre-seeded):**
  - **Phone:** `6202579799` *(or `916202579799`)*
  - **Password:** `123456`

- **Method:** `POST`
- **Path:** `/api/admin/auth/login` *(or `/api/v1/admin/auth/login`)*
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "6202579799",
  "password": "123456"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YjBlZi4uLiIsInJvbGUiOiJhZG1pbiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTcz...',
    "admin": {
      "_id": "67b0ef9876543210fedcba98",
      "name": "Super Admin",
      "phone": "916202579799",
      "role": "admin",
      "status": "ACTIVE",
      "createdAt": "2026-10-17T11:00:00.000Z"
    }
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Missing phone or password, or invalid 10-digit number.
  - `401 Unauthorized`: Invalid phone number or incorrect password.
  - `403 Forbidden`: Admin account has been deactivated.

---

### 1.2 Get Current Admin Profile (`GET /api/admin/auth/me`)
Fetch profile details of the currently authenticated admin.

- **Method:** `GET`
- **Path:** `/api/admin/auth/me`
- **Headers:** `Authorization: Bearer <ADMIN_JWT_TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin profile fetched successfully",
  "data": {
    "_id": "67b0ef9876543210fedcba98",
    "name": "Super Admin",
    "phone": "916202579799",
    "role": "admin",
    "status": "ACTIVE"
  }
}
```

---

## 2. 📦 Service Category Management (`/api/admin/vendor-categories`)

Manage dynamic service categories (e.g., *Dhobi*, *Doodh Wala*, *Press / Ironing*, *Tailor*, *Car Wash*, etc.).  
Categories created or updated here **instantly reflect in the Mobile App Vendor Registration flow** (`GET /api/vendor/categories`).

### 2.1 Create New Category
Creates a new vendor service category in the unified database.

- **Method:** `POST`
- **Path:** `/api/admin/vendor-categories`
- **Headers:**
  ```http
  Content-Type: application/json
  x-api-key: <ADMIN_SYNC_API_KEY>
  # OR
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```
- **Request Body:**
  ```json
  {
    "name": "Car Wash",
    "icon": "🚗",
    "description": "Doorstep vehicle wash and auto detailing",
    "sortOrder": 10,
    "isActive": true
  }
  ```
  | Field | Type | Required | Description |
  |---|---|:---:|---|
  | `name` | String | **Yes** | Unique category name (e.g. `"Car Wash"`, `"Maid Service"`). Case-insensitive unique check. |
  | `icon` | String | No | Emoji or icon identifier (default: `"🧺"`). |
  | `description`| String | No | Brief explanation of the service (max 300 chars). |
  | `sortOrder` | Number | No | Sort order in mobile app selection list (default: `0`). Lower numbers appear first. |
  | `isActive` | Boolean | No | Active status (default: `true`). |

- **Response (201 Created):**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Category created successfully",
    "data": {
      "_id": "67b0ef123456789abcdef005",
      "name": "Car Wash",
      "code": "CAR_WASH",
      "icon": "🚗",
      "description": "Doorstep vehicle wash and auto detailing",
      "isActive": true,
      "sortOrder": 10,
      "createdAt": "2026-10-17T11:00:00.000Z",
      "updatedAt": "2026-10-17T11:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Missing or empty `name`.
  - `401 Unauthorized`: Missing admin credentials.
  - `403 Forbidden`: Insufficient permissions or invalid API key.
  - `409 Conflict`: Category with this name already exists.

---

### 2.2 List All Categories
Fetches all categories. Admin panel can pass `?includeInactive=true` to view both active and deactivated categories.

- **Method:** `GET`
- **Path:** `/api/admin/vendor-categories`
- **Query Parameters:**
  | Parameter | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `includeInactive` | Boolean | No | `false` | When `true`, returns inactive/deactivated categories too. |

- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Categories retrieved successfully",
    "data": [
      {
        "_id": "67b0ef123456789abcdef001",
        "name": "Dhobi",
        "code": "DHOBI",
        "icon": "🧺",
        "description": "Laundry, Dry Cleaning & Garment Care",
        "isActive": true,
        "sortOrder": 1
      },
      {
        "_id": "67b0ef123456789abcdef002",
        "name": "Doodh Wala",
        "code": "DOODH_WALA",
        "icon": "🥛",
        "description": "Fresh Milk & Dairy Delivery",
        "isActive": true,
        "sortOrder": 2
      },
      {
        "_id": "67b0ef123456789abcdef005",
        "name": "Car Wash",
        "code": "CAR_WASH",
        "icon": "🚗",
        "description": "Doorstep vehicle wash and auto detailing",
        "isActive": false,
        "sortOrder": 10
      }
    ]
  }
  ```

---

### 2.3 Get Category by ID
Retrieves details of a single category by its MongoDB ObjectId.

- **Method:** `GET`
- **Path:** `/api/admin/vendor-categories/:id`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Category details retrieved successfully",
    "data": {
      "_id": "67b0ef123456789abcdef001",
      "name": "Dhobi",
      "code": "DHOBI",
      "icon": "🧺",
      "description": "Laundry, Dry Cleaning & Garment Care",
      "isActive": true,
      "sortOrder": 1
    }
  }
  ```
- **Error Response:**
  - `404 Not Found`: Category ID does not exist.

---

### 2.4 Update Category Attributes (PATCH)
Updates category fields. Strictly uses `PATCH` (never `PUT`).

- **Method:** `PATCH`
- **Path:** `/api/admin/vendor-categories/:id`
- **Headers:**
  ```http
  Content-Type: application/json
  x-api-key: <ADMIN_SYNC_API_KEY> # or Authorization: Bearer <ADMIN_TOKEN>
  ```
- **Request Body (Send only fields to update):**
  ```json
  {
    "name": "Premium Car Wash",
    "icon": "🚘",
    "sortOrder": 5,
    "isActive": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Category updated successfully",
    "data": {
      "_id": "67b0ef123456789abcdef005",
      "name": "Premium Car Wash",
      "code": "PREMIUM_CAR_WASH",
      "icon": "🚘",
      "description": "Doorstep vehicle wash and auto detailing",
      "isActive": true,
      "sortOrder": 5,
      "updatedAt": "2026-10-17T11:05:00.000Z"
    }
  }
  ```

---

### 2.5 Deactivate Category (Soft Delete)
Deactivates a category (`isActive = false`). Existing registered vendors keep their category string, but it is hidden from new vendor registrations.

- **Method:** `DELETE`
- **Path:** `/api/admin/vendor-categories/:id`
- **Headers:** `x-api-key: <ADMIN_SYNC_API_KEY>` or `Authorization: Bearer <ADMIN_TOKEN>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Category \"Car Wash\" deactivated successfully"
  }
  ```

---

---

### 2.6 Permanent Delete Category (Hard Delete)
Permanently deletes the category document from MongoDB.

- **Method:** `DELETE`
- **Path:** `/api/admin/vendor-categories/:id?hard=true`
- **Headers:** `x-api-key: <ADMIN_SYNC_API_KEY>` or `Authorization: Bearer <ADMIN_TOKEN>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Category \"Car Wash\" permanently deleted"
  }
  ```

---

### 2.7 Dynamic Category Service Management (`/api/admin/services` & `/api/admin/vendor-categories/:categoryId/services`)

Admin can create, update, activate, deactivate, and manage unlimited services under any category (e.g. *Washerman* -> *Dry Cleaning*, *Ironing*, *Washing*, *Premium Cleaning*; *Milkman* -> *Milk*, *Paneer*, *Curd*, *Ghee*).

#### A. Create Service Under Category
- **Method:** `POST`
- **Path:** `/api/admin/vendor-categories/:categoryId/services` *(or `/api/admin/services` with `categoryId` in body)*
- **Headers:** `Authorization: Bearer <ADMIN_JWT>` or `x-api-key: <ADMIN_SYNC_API_KEY>`
- **Request Body:**
  ```json
  {
    "name": "Dry Cleaning",
    "description": "Specialized chemical solvent cleaning for delicate garments",
    "price": 60,
    "icon": "✨",
    "sortOrder": 1,
    "isActive": true
  }
  ```
  | Field | Type | Required | Description |
  |---|---|:---:|---|
  | `name` | String | **Yes** | Service name (max 100 chars, unique within category). |
  | `description` | String | No | Detailed description of the service. |
  | `price` | Number | No | Base / default price in INR (default: `0`). |
  | `icon` | String | No | Service icon or emoji. |
  | `sortOrder` | Number | No | Display sorting priority. |
  | `isActive` | Boolean | No | Default: `true`. |
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Category service created successfully",
    "data": {
      "_id": "67b1234567890abcdef12345",
      "categoryId": "67b0ef123456789abcdef001",
      "categoryName": "Dhobi",
      "name": "Dry Cleaning",
      "code": "DRY_CLEANING",
      "description": "Specialized chemical solvent cleaning for delicate garments",
      "price": 60,
      "icon": "✨",
      "isActive": true,
      "sortOrder": 1
    }
  }
  ```

#### B. List Services for a Specific Category
- **Method:** `GET`
- **Path:** `/api/admin/vendor-categories/:categoryId/services` *(Query param: `?includeInactive=true`)*
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Category services retrieved successfully",
    "data": [
      { "_id": "...", "name": "Dry Cleaning", "code": "DRY_CLEANING", "price": 60, "isActive": true },
      { "_id": "...", "name": "Ironing", "code": "IRONING", "price": 15, "isActive": true },
      { "_id": "...", "name": "Washing", "code": "WASHING", "price": 30, "isActive": true },
      { "_id": "...", "name": "Premium Cleaning", "code": "PREMIUM_CLEANING", "price": 100, "isActive": true }
    ]
  }
  ```

#### C. List All Services Across Categories
- **Method:** `GET`
- **Path:** `/api/admin/services?category=Dhobi&includeInactive=false`
- **Response (200 OK):** Returns all services grouped or filtered by category.

#### D. Update Service Details (PATCH)
- **Method:** `PATCH`
- **Path:** `/api/admin/services/:id`
- **Request Body (Partial update):**
  ```json
  {
    "price": 75,
    "description": "Updated premium solvent cleaning"
  }
  ```

#### E. Activate / Deactivate Service Status
- **Method:** `PATCH`
- **Path:** `/api/admin/services/:id/status`
- **Request Body:**
  ```json
  {
    "isActive": false
  }
  ```

#### F. Delete Service (Soft or Hard Delete)
- **Method:** `DELETE`
- **Path:** `/api/admin/services/:id` *(Soft delete)* or `/api/admin/services/:id?hard=true` *(Hard delete)*

---

## 3. 📊 System Inventory & Analytics Sync (`/api/integration`)

Endpoints designed for Admin Dashboard overviews, monitoring, and database audits.

### 3.1 Aggregated System Statistics
- **Method:** `GET`
- **Path:** `/api/integration/stats`
- **Headers:** `x-api-key: <ADMIN_SYNC_API_KEY>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Integration stats retrieved successfully",
    "data": {
      "users": {
        "total": 125,
        "withFaceRegistered": 98,
        "activeToday": 42
      },
      "wardrobe": {
        "totalItems": 1420,
        "processed3d": 310
      },
      "laundry": {
        "totalOrders": 85,
        "activeOrders": 12
      }
    }
  }
  ```

### 3.2 User List Synchronization
- **Method:** `GET`
- **Path:** `/api/integration/users`
- **Headers:** `x-api-key: <ADMIN_SYNC_API_KEY>`
- **Query Params:** `?page=1&limit=50&search=`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Users retrieved successfully",
    "data": {
      "users": [...],
      "pagination": { "page": 1, "limit": 50, "total": 125 }
    }
  }
  ```

### 3.3 Detailed User Profile
- **Method:** `GET`
- **Path:** `/api/integration/users/:identifier`
- **Headers:** `x-api-key: <ADMIN_SYNC_API_KEY>`

### 3.3 Detailed User Profile
- **Method:** `GET`
- **Path:** `/api/integration/users/:identifier`
- **Headers:** `x-api-key: <ADMIN_SYNC_API_KEY>`

---

## 4. 👥 Vendor Partner Management (`/api/admin/vendors`)

Comprehensive partner lifecycle management for the Operations team. Handles registered vendors, lead conversions, category associations, and verification.

### 4.1 Registered vs Unregistered Vendor Metrics
- **Method:** `GET`
- **Path:** `/api/admin/vendors/stats`
- **Headers:** `Authorization: Bearer <ADMIN_TOKEN>` or `x-api-key: <ADMIN_SYNC_API_KEY>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor statistics retrieved successfully",
  "data": {
    "totalVendors": 45,
    "registeredVendors": 32,
    "unregisteredVendors": 13,
    "activeVendors": 30,
    "suspendedVendors": 2,
    "convertedLeads": 18,
    "categoryDistribution": [
      { "category": "Dhobi", "count": 28 },
      { "category": "Press / Ironing", "count": 14 },
      { "category": "Tailor", "count": 7 },
      { "category": "Doodh Wala", "count": 3 }
    ]
  }
}
```

---

### 4.2 List Registered Vendors
Search, filter by category or status, and paginate registered partners.
- **Method:** `GET`
- **Path:** `/api/admin/vendors/registered`
- **Query Parameters:**
  - `page` *(number, default 1)*
  - `limit` *(number, default 10)*
  - `search` *(string, matches name, phone, vendorId, or businessName)*
  - `category` *(string, category filter e.g. 'Dhobi', 'Tailor')*
  - `status` *(string, 'ALL' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED')*
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "vendors": [
      {
        "_id": "6ad4a204850e8a45c0ac41d2",
        "vendorId": "VND-481920",
        "name": "Raushan Kumar",
        "phone": "918949056321",
        "primaryCategory": "Dhobi",
        "categories": ["Dhobi", "Press / Ironing"],
        "category": "Dhobi",
        "businessName": "Raushan Express Laundry",
        "status": "ACTIVE",
        "rating": 5.0,
        "totalOrdersHandled": 12,
        "isVerified": true
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 1, "pages": 1 }
  }
}
```

---

### 4.3 Onboard New Registered Vendor (Direct Admin Creation)
- **Method:** `POST`
- **Path:** `/api/admin/vendors/registered`
- **Request Body:**
```json
{
  "name": "Suresh Tailors",
  "phone": "919812345678",
  "primaryCategory": "Tailor",
  "categories": ["Tailor", "Press / Ironing"],
  "businessName": "Suresh Stitching & Care",
  "address": {
    "street": "12 Gandhi Chowk",
    "city": "Patna",
    "state": "Bihar",
    "pincode": "800001"
  }
}
```

---

### 4.4 Update Registered Vendor Details
- **Method:** `PATCH`
- **Path:** `/api/admin/vendors/registered/:id`
- **Request Body:** Send only fields to update (`name`, `businessName`, `primaryCategory`, `categories`, `address`, `rating`, `isVerified`).

---

### 4.5 Suspend / Activate Vendor Status
- **Method:** `PATCH`
- **Path:** `/api/admin/vendors/registered/:id/status`
- **Request Body:**
```json
{
  "status": "SUSPENDED"
}
```

---

### 4.6 List Unregistered Contact Leads
Lists vendors entered by customer contacts that have not yet installed the app.
- **Method:** `GET`
- **Path:** `/api/admin/vendors/unregistered`

---

### 4.7 Convert Unregistered Lead to Registered Partner
- **Method:** `POST`
- **Path:** `/api/admin/vendors/unregistered/:id/convert`
- **Request Body:**
```json
{
  "name": "Official Vendor Name",
  "category": "Dhobi",
  "categories": ["Dhobi", "Press / Ironing"]
}
```

---

## 5. 🧺 Customer Work Orders & Fulfillment (`/api/admin/orders`)

Full control over customer work orders. Supports direct category indexing (`orderCategory`), order timeline auditing, and manual status overrides.

### 5.1 Aggregated Work Order Statistics
- **Method:** `GET`
- **Path:** `/api/admin/orders/stats`
- **Headers:** `Authorization: Bearer <ADMIN_TOKEN>` or `x-api-key: <ADMIN_SYNC_API_KEY>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalOrders": 12,
    "pendingPickup": 7,
    "pickedUp": 1,
    "inProcess": 0,
    "readyForDelivery": 0,
    "delivered": 4,
    "cancelled": 0,
    "rejected": 0,
    "activeProcessing": 1,
    "totalGarments": 77,
    "categoryDistribution": [
      { "category": "Dhobi", "count": 12 }
    ],
    "serviceTypeDistribution": [
      { "serviceType": "WASH_AND_IRON", "count": 77 }
    ]
  }
}
```

---

### 5.2 List All Customer Work Orders with Category & Status Filters
- **Method:** `GET`
- **Path:** `/api/admin/orders`
- **Query Parameters:**
  - `page` *(number, default 1)*
  - `limit` *(number, default 10, max 100)*
  - `search` *(string, searches orderNumber, userPhone, userName, vendorPhone, vendorName)*
  - `category` *(string, e.g. `'Dhobi'`, `'Tailor'`, `'Doodh Wala'`, `'ALL'`)*
  - `status` *(string, `'ALL'` | `'PENDING_PICKUP'` | `'PICKED_UP'` | `'IN_PROCESS'` | `'READY_FOR_DELIVERY'` | `'DELIVERED'` | `'CANCELLED'` | `'REJECTED'`)*
  - `serviceType` *(string, `'ALL'` | `'WASH'` | `'IRON'` | `'DRY_CLEAN'` | `'WASH_AND_IRON'`)*
  - `isRegisteredVendor` *(boolean, `'true'` | `'false'`)*
  - `startDate`, `endDate` *(ISO date strings)*
  - `sortBy` *(string, default `'createdAt'`)*
  - `sortOrder` *(string, `'asc'` | `'desc'`)*

---

### 5.3 Work Order Details & Garments Breakdown
- **Method:** `GET`
- **Path:** `/api/admin/orders/:id`
- Returns full snapshot including user info, vendor info, item thumbnails, attributes (fabric, color, brand), and timestamped audit history.

---

### 5.4 Admin Status Override
Allows administrator to advance or intervene on an order status.
- Automatically syncs connected closet garments (`ACTIVE`/`INACTIVE`).
- Automatically dispatches FCM push notification to the customer mobile app.
- **Method:** `PATCH`
- **Path:** `/api/admin/orders/:id/status`
- **Request Body:**
```json
{
  "status": "DELIVERED",
  "note": "Admin confirmed order handover"
}
```

---

### 5.5 Resend WhatsApp PDF Work Order Slip
Re-triggers the WhatsApp PDF work order slip dispatch to the assigned vendor.
- **Method:** `POST`
- **Path:** `/api/admin/orders/:id/resend-whatsapp`

---

## 6. 📋 Quick Integration Checklist for Admin Web Developers

- [ ] Set `x-api-key` header to `process.env.ADMIN_SYNC_API_KEY` in your HTTP client (Axios / Fetch).
- [ ] Alternatively, authenticate with an admin user account and set `Authorization: Bearer <TOKEN>`.
- [ ] For updates, always use `PATCH` method; never use `PUT`.
- [ ] In Category management tables, default list call is `GET /api/admin/vendor-categories`.
- [ ] In Orders table, pass `?category=Dhobi` to filter orders by service category.
- [ ] In Vendor table, pass `?category=Dhobi` or multi-category array to onboard multi-service partners.
- [ ] Deactivation (`DELETE /api/admin/vendor-categories/:id`) is recommended over hard-delete to avoid disrupting historical vendor category labels.
