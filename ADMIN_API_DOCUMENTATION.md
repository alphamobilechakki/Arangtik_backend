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
4. [📋 Quick Integration Checklist for Admin Web Developers](#4--quick-integration-checklist-for-admin-web-developers)

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

---

## 4. 📋 Quick Integration Checklist for Admin Web Developers

- [ ] Set `x-api-key` header to `process.env.ADMIN_SYNC_API_KEY` in your HTTP client (Axios / Fetch).
- [ ] Alternatively, authenticate with an admin user account and set `Authorization: Bearer <TOKEN>`.
- [ ] For updates, always use `PATCH` method; never use `PUT`.
- [ ] In Category management tables, default list call is `GET /api/admin/categories`.
- [ ] Provide an "Include Inactive / Archive" toggle that switches to `GET /api/admin/categories?includeInactive=true`.
- [ ] Deactivation (`DELETE /api/admin/categories/:id`) is recommended over hard-delete to avoid disrupting historical vendor category labels.
- [ ] Categories created here immediately become selectable by mobile vendors upon registration.
