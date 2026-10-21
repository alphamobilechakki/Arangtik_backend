# 🧺 Arangtik Vendor App API Documentation & Integration Guide

> **Official Backend Integration Guide for Arangtik Vendor Native Mobile Application (iOS / Android / Flutter / React Native)**  
> **Base URL:** `http://localhost:8083/api/vendor` *(or `/api/v1/vendor`)*  
> **Production Base URL:** `https://api.arangtik.com/api/vendor`  
> **Version:** `v1.2.0` • **Target Platform:** `Mobile Native App` • **Auth:** `Bearer JWT (role: 'vendor')`  

---

## 📑 Table of Contents

1. [📐 System Architecture & Vendor Lifecycle](#1--system-architecture--vendor-lifecycle)
2. [🔐 Authentication & Authorization Standard](#2--authentication--authorization-standard)
   - [2.1 Vendor JWT Token Header](#21-vendor-jwt-token-header)
   - [2.2 Quick Testing Credentials](#22-quick-testing-credentials)
3. [🏷️ Service Categories & Discovery Endpoints](#3--service-categories--discovery-endpoints)
   - [3.1 List Vendor Service Categories (`GET /api/vendor/categories`)](#31-list-vendor-service-categories)
   - [3.2 User Vendor Lookup by Phone (`GET /api/vendor/lookup`)](#32-user-vendor-lookup-by-phone)
4. [📲 Vendor Authentication Endpoints (WhatsApp OTP & Passwordless)](#4--vendor-authentication-endpoints)
   - [4.1 Send WhatsApp OTP (`POST /api/vendor/auth/send-otp`)](#41-send-whatsapp-otp)
   - [4.2 Verify OTP & Authenticate (`POST /api/vendor/auth/verify-otp`)](#42-verify-otp--authenticate)
   - [4.3 Vendor Registration with Category & OTP (`POST /api/vendor/auth/register`)](#43-vendor-registration)
   - [4.4 Vendor Login with OTP / Password (`POST /api/vendor/auth/login`)](#44-vendor-login)
5. [👤 Vendor Profile & Category Management](#5--vendor-profile-management)
   - [5.1 Get Authenticated Vendor Profile (`GET /api/vendor/profile`)](#51-get-authenticated-vendor-profile)
   - [5.2 Multi-Category In-App Management (`PATCH /api/vendor/categories`)](#52-multi-category-in-app-management)
   - [5.3 Update Vendor Profile (`PATCH /api/vendor/profile`)](#53-update-vendor-profile)
6. [📋 Work Orders & Laundry Execution (Vendor Hub)](#6--work-orders--laundry-execution-vendor-hub)
   - [6.1 List Assigned Work Orders & Category Tab Switching (`GET /api/vendor/orders`)](#61-list-assigned-work-orders)
   - [6.2 Get Work Order Details (`GET /api/vendor/orders/:id`)](#62-get-work-order-details)
   - [6.3 Update Work Order Status (`PATCH /api/vendor/orders/:id/status`)](#63-update-work-order-status)
7. [⚙️ Critical Business Rules & State Machine](#7--critical-business-rules--state-machine)
   - [7.1 User Cancellation vs. Vendor Rejection](#71-user-cancellation-vs-vendor-rejection)
   - [7.2 Automatic Wardrobe Clothes State Sync](#72-automatic-wardrobe-clothes-state-sync)
   - [7.3 Real-Time FCM Push Notifications to Customers](#73-real-time-fcm-push-notifications-to-customers)
   - [7.4 Unregistered to Registered Seamless Migration](#74-unregistered-to-registered-seamless-migration)
8. [📱 Mobile App Integration Best Practices & Code Examples](#8--mobile-app-integration-best-practices--code-examples)
9. [🎨 Status Badges & Color Palette for Vendor UI](#9--status-badges--color-palette-for-vendor-ui)

---

## 1. 📐 System Architecture & Vendor Lifecycle

In the Arangtik ecosystem, vendors (Dhobis, Dry Cleaners, Ironing / Press providers, Tailors) can exist in two states:

```
[ Customer creates Work Order ] 
              │
              ▼
  Vendor Phone entered?
  ├─── Unregistered Vendor (Not yet on app) ──► Saved in Unregistered DB ──► Receives PDF via WhatsApp
  │
  └─── Registered Vendor (Active on app)    ──► Assigned to Vendor ID    ──► Instant Push & App Dashboard
                                                                                  ▲
                                                                                  │
[ Unregistered Vendor downloads App & Registers with phone ] ─────────────────────┘
 (Auto-syncs all past work orders & upgrades account immediately)
```

1. **Unregistered Vendor:** Added by customers simply by selecting a phone number from mobile contacts. Orders generate PDF slips sent via WhatsApp.
2. **Registered Vendor:** The vendor installs the Vendor Mobile App, registers with their phone number and category, and sets a password. All past orders automatically attach to their new account!

---

## 2. 🔐 Authentication & Authorization Standard

### 2.1 Vendor JWT Token Header
All private vendor endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
```

> **Note:** The Vendor JWT payload contains:
> ```json
> {
>   "id": "670f...",
>   "vendorId": "VND-481920",
>   "phone": "919876543210",
>   "role": "vendor",
>   "category": "Dhobi"
> }
> ```

### 2.2 Quick Testing Credentials
For development and QA mobile testing, bypass WhatsApp OTP using the built-in test account:
- **Test Phone:** `918949056321` *(or any phone ending with `8949056321`)*
- **Fixed Bypass OTP:** `1234`
- **Default Password:** Set upon registration or reset.

---

## 3. 🏷️ Service Categories & Discovery Endpoints

### 3.1 List Vendor Service Categories
Fetch the list of active service categories to display in the registration dropdown or category filter.

- **Method:** `GET`
- **Path:** `/api/vendor/categories` *(Alias: `/api/vendor/auth/categories`)*
- **Access:** Public (No token required)
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor categories retrieved successfully",
  "data": [
    {
      "id": "dhobi",
      "name": "Dhobi",
      "code": "DHOBI",
      "icon": "🧺",
      "description": "Laundry, Dry Cleaning & Garment Care"
    },
    {
      "id": "press_ironing",
      "name": "Press / Ironing",
      "code": "PRESS_IRONING",
      "icon": "👔",
      "description": "Clothes Pressing & Fold Delivery"
    },
    {
      "id": "tailor",
      "name": "Tailor",
      "code": "TAILOR",
      "icon": "✂️",
      "description": "Stitching & Garment Alteration"
    },
    {
      "id": "doodh_wala",
      "name": "Doodh Wala",
      "code": "DOODH_WALA",
      "icon": "🥛",
      "description": "Fresh Milk & Dairy Delivery"
    }
  ]
}
```

---

### 3.2 User Vendor Lookup by Phone
Used by the Customer Mobile App when typing a phone number or picking from contacts to verify if the vendor is registered.

- **Method:** `GET`
- **Path:** `/api/vendor/lookup?phone=919876543210`
- **Access:** Private (Customer Bearer JWT required)
- **Query Parameters:**
  - `phone` *(required)*: 10-digit mobile number with or without `+91`.
- **Response (200 OK - Registered Vendor):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Registered vendor found",
  "data": {
    "isRegistered": true,
    "vendor": {
      "id": "67b4d1234567890abcdef012",
      "vendorId": "VND-849102",
      "name": "Ramesh Laundry Services",
      "phone": "919876543210",
      "category": "Dhobi",
      "categoryCode": "DHOBI",
      "businessName": "Ramesh Dry Cleaners",
      "rating": 4.9,
      "totalOrdersHandled": 42,
      "isVerified": true
    }
  }
}
```
- **Response (200 OK - Unregistered Contact):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor details retrieved",
  "data": {
    "isRegistered": false,
    "vendor": {
      "id": null,
      "vendorId": null,
      "name": "Ramesh Dhobi",
      "phone": "919876543210",
      "category": "Dhobi",
      "businessName": "",
      "isVerified": false
    }
  }
}
```

---

### 3.3 List Available Services for Selected Category
When a vendor selects their category (e.g. *Washerman* or *Milkman*), the mobile app calls this endpoint to fetch all available services under that category so the vendor can select what they provide.

- **Method:** `GET`
- **Path:** `/api/vendor/categories/:category/services`
- **Access:** Public / Vendor
- **URL Parameters:**
  - `category`: Category name (e.g. `Dhobi`, `Washerman`, `Doodh Wala`, `Milkman`) or `categoryId`.
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Category services retrieved successfully",
  "data": [
    {
      "_id": "67b1234567890abcdef12345",
      "categoryId": "67b0ef123456789abcdef001",
      "categoryName": "Dhobi",
      "name": "Dry Cleaning",
      "code": "DRY_CLEANING",
      "description": "Specialized chemical garment cleaning",
      "price": 60,
      "icon": "✨",
      "isActive": true
    },
    {
      "_id": "67b1234567890abcdef12346",
      "categoryId": "67b0ef123456789abcdef001",
      "categoryName": "Dhobi",
      "name": "Ironing",
      "code": "IRONING",
      "description": "Steam and heat garment pressing",
      "price": 15,
      "icon": "👔",
      "isActive": true
    }
  ]
}
```

---

### 3.4 Public Vendor Offered Services Lookup
Allows customer mobile app or public users to view exactly which services a specific vendor provides.

- **Method:** `GET`
- **Path:** `/api/vendor/:id/services`
- **Access:** Public / Customer
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor offered services retrieved successfully",
  "data": {
    "vendorId": "67b4d1234567890abcdef012",
    "vendorName": "Ramesh Laundry Services",
    "businessName": "Ramesh Dry Cleaners",
    "category": "Dhobi",
    "services": [
      {
        "serviceId": "67b1234567890abcdef12345",
        "name": "Dry Cleaning",
        "code": "DRY_CLEANING",
        "price": 60,
        "isOffered": true
      },
      {
        "serviceId": "67b1234567890abcdef12346",
        "name": "Ironing",
        "code": "IRONING",
        "price": 15,
        "isOffered": true
      }
    ],
    "offeredServices": ["Dry Cleaning", "Ironing"]
  }
}
```

---

### 3.5 Find Eligible Vendors Offering Required Services
Finds all active registered vendors in a category that provide **ALL** services requested by the customer (e.g. customer needs *Dry Cleaning* and *Ironing*).

- **Method:** `POST` *(or `GET /api/vendor/eligible?category=Dhobi&services=Dry Cleaning,Ironing`)*
- **Path:** `/api/vendor/eligible`
- **Access:** Public / Customer
- **Request Body:**
```json
{
  "category": "Dhobi",
  "requiredServices": ["Dry Cleaning", "Ironing"]
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Eligible vendors retrieved successfully",
  "data": [
    {
      "_id": "67b4d1234567890abcdef012",
      "vendorId": "VND-849102",
      "name": "Ramesh Laundry Services",
      "phone": "919876543210",
      "category": "Dhobi",
      "offeredServices": ["Dry Cleaning", "Ironing", "Washing"],
      "rating": 4.9,
      "isVerified": true
    }
  ]
}
```

---

## 4. 📲 Vendor Authentication Endpoints (WhatsApp OTP & Passwordless)

Arangtik Vendor App uses **secure, passwordless authentication** via 4-digit WhatsApp OTP (identical to the customer app). Vendors no longer need to remember passwords or usernames.

### 4.1 Send WhatsApp OTP
Sends a 4-digit verification code to the vendor's WhatsApp number.  
The response indicates `isExistingVendor: true` (vendor can directly log in with OTP) or `false` (vendor should fill registration profile).

- **Method:** `POST`
- **Path:** `/api/vendor/auth/send-otp` *(or `/api/v1/vendor/auth/send-otp`)*
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210"
}
```
- **Response (200 OK — Existing Registered Vendor):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to your WhatsApp number",
  "data": {
    "phone": "919876543210",
    "isExistingVendor": true,
    "expiresInMinutes": 5
  }
}
```
- **Response (200 OK — New Unregistered Number):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to your WhatsApp number",
  "data": {
    "phone": "919876543210",
    "isExistingVendor": false,
    "expiresInMinutes": 5
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Missing phone or invalid 10-digit number.
  - `403 Forbidden`: Vendor account is suspended or inactive.

---

### 4.2 Verify OTP & Authenticate (Direct Login or Register)
Verifies the WhatsApp OTP and issues the Vendor JWT token.

#### Flow A: Existing Vendor Login (Just Phone + OTP)
- **Method:** `POST`
- **Path:** `/api/vendor/auth/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "1234"
}
```
- **Response (200 OK):**
```json
{
    "statusCode": 200,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZDRhMjA0ODUwZThhNDVjMGFjNDFkMiIsInZlbmRvcklkIjoiVk5ELTc3MzcxNyIsInBob25lIjoiOTE4OTQ5MDU2MzIxIiwicm9sZSI6InZlbmRvciIsImNhdGVnb3J5IjoiRGhvYmkiLCJpYXQiOjE3OTI1NzQxODgsImV4cCI6MTgyNDExMDE4OH0.PwKD2OFzi_fAM1ncEWXxrIYlxKekuQaGDtq3DlNdbAs",
        "isNewVendor": false,
        "vendor": {
            "_id": "6ad4a204850e8a45c0ac41d2",
            "vendorId": "VND-773717",
            "name": "Raushan Kumar",
            "phone": "918949056321",
            "category": "Dhobi",
            "primaryCategory": "Dhobi",
            "categories": [
                "Dhobi"
            ],
            "isRegistered": true,
            "businessName": "",
            "address": {
                "street": "",
                "city": "",
                "state": "",
                "pincode": ""
            },
            "rating": 5,
            "totalOrdersHandled": 3,
            "isVerified": true,
            "status": "ACTIVE",
            "createdAt": "2026-10-18T10:40:04.861Z"
        }
    },
    "message": "Vendor login successful",
    "success": true
}
```

#### Flow B: New Vendor Registration (Phone + OTP + Profile Details)
If `isExistingVendor === false`, include the vendor's name and category alongside the OTP:
- **Method:** `POST`
- **Path:** `/api/vendor/auth/verify-otp` *(or `/api/vendor/auth/register`)*
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "1234",
  "name": "Ramesh Kumar",
  "category": "Dhobi",
  "businessName": "Ramesh Dry Cleaners & Steam Press",
  "address": {
    "street": "Shop 4, Market Complex",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302001"
  }
}
```
| Field | Type | Mandatory? | Description |
| :--- | :--- | :--- | :--- |
| `phone` | String | **Yes** | 10-digit mobile number |
| `otp` | String | **Yes** | 4-digit WhatsApp OTP |
| `name` | String | **Yes** (For new vendors) | Full name of the vendor proprietor |
| `category` | String | Optional (default `"Dhobi"`) | Initial primary service category (e.g. `"Dhobi"`, `"Tailor"`) |
| `categories` | Array of Strings | Optional | Initial list of service categories e.g. `["Dhobi", "Press / Ironing"]` |
| `primaryCategory` | String | Optional | Primary category tag (defaults to first category in `categories`) |
| `businessName` | String | Optional | Registered business / shop name |
| `address` | Object | Optional | Shop address object (`street`, `city`, `state`, `pincode`) |

- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor registered and logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewVendor": true,
    "vendor": {
      "_id": "67b4d1234567890abcdef012",
      "vendorId": "VND-849102",
      "name": "Ramesh Kumar",
      "phone": "919876543210",
      "category": "Dhobi",
      "primaryCategory": "Dhobi",
      "categories": ["Dhobi"],
      "isRegistered": true,
      "businessName": "Ramesh Dry Cleaners & Steam Press",
      "address": {
        "street": "Shop 4, Market Complex",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302001"
      },
      "rating": 5.0,
      "totalOrdersHandled": 0,
      "isVerified": true,
      "status": "ACTIVE",
      "createdAt": "2026-10-19T10:00:00.000Z"
    }
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Invalid or expired OTP.
  - `400 Bad Request`: Missing vendor name or category when registering for the first time.
  - `403 Forbidden`: Account is suspended or inactive.

---

### 4.3 Vendor Registration Alias (`POST /api/vendor/auth/register`)
Convenience endpoint for registration. Accepts identical payload to `verify-otp` with `{ phone, otp, name, category, categories, primaryCategory, businessName, address }`.

- **Method:** `POST`
- **Path:** `/api/vendor/auth/register`

---

### 4.4 Vendor Login Alias (`POST /api/vendor/auth/login`)
Convenience endpoint for login. Accepts `{ phone, otp }` to verify OTP, or `{ phone }` to trigger an OTP send.

- **Method:** `POST`
- **Path:** `/api/vendor/auth/login`

---

## 5. 👤 Vendor Profile & Category Management

### 5.1 Get Authenticated Vendor Profile
Fetches the current logged-in vendor's profile details including all registered service categories.

- **Method:** `GET`
- **Path:** `/api/vendor/profile` *(Alias: `/api/vendor/auth/me`)*
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:**
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```
- **Response (200 OK):**
```json
{
    "statusCode": 200,
    "data": {
        "_id": "6ad4a204850e8a45c0ac41d2",
        "vendorId": "VND-773717",
        "name": "Raushan Kumar",
        "phone": "918949056321",
        "category": "Dhobi",
        "primaryCategory": "Dhobi",
        "categories": [
            "Dhobi"
        ],
        "isRegistered": true,
        "businessName": "",
        "address": {
            "street": "",
            "city": "",
            "state": "",
            "pincode": ""
        },
        "rating": 5,
        "totalOrdersHandled": 3,
        "isVerified": true,
        "status": "ACTIVE",
        "createdAt": "2026-10-18T10:40:04.861Z"
    },
    "message": "Vendor profile fetched successfully",
    "success": true
}
```

---

### 5.2 Multi-Category In-App Management (Tick / Add Categories)
Allows a logged-in vendor to tick, untick, or add multiple service categories and set their primary category from the vendor mobile app settings/profile screen.

- **Method:** `PATCH`
- **Path:** `/api/vendor/categories`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:**
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body:**
```json
{
  "categories": ["Dhobi", "Press / Ironing", "Tailor"],
  "primaryCategory": "Dhobi"
}
```
| Field | Type | Mandatory? | Description |
| :--- | :--- | :--- | :--- |
| `categories` | Array of Strings | **Yes** | Array of category names vendor operates in (at least 1 required) |
| `primaryCategory` | String | Optional | Primary service category (defaults to first item in `categories`) |

- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor categories updated successfully",
  "data": {
    "_id": "67b4d1234567890abcdef012",
    "name": "Ramesh Kumar",
    "primaryCategory": "Dhobi",
    "categories": ["Dhobi", "Press / Ironing", "Tailor"],
    "category": "Dhobi"
  }
}
```

---

### 5.3 Update Vendor Profile
Updates vendor details including personal name, business name, address, and categories.

- **Method:** `PATCH`
- **Path:** `/api/vendor/profile`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:** `Authorization: Bearer <VENDOR_JWT_TOKEN>`
- **Request Body:**
```json
{
  "name": "Ramesh Multi-Service Enterprise",
  "businessName": "Ramesh Hub",
  "categories": ["Dhobi", "Press / Ironing", "Tailor"],
  "primaryCategory": "Dhobi",
  "address": {
    "street": "Shop 4, Market Complex",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302001"
  }
}
```

---

### 5.4 Select / Update Vendor Offered Services
Enables vendors to select, deselect, and update the specific services they offer within their category (e.g. A Milkman selecting only *Milk* and unticking *Paneer*, or a Washerman selecting *Dry Cleaning* and *Ironing*).

- **Method:** `PATCH`
- **Path:** `/api/vendor/services`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:**
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body (Example A - Array of Objects):**
```json
{
  "services": [
    {
      "serviceId": "67b1234567890abcdef12345",
      "name": "Dry Cleaning",
      "code": "DRY_CLEANING",
      "price": 60,
      "isOffered": true
    },
    {
      "serviceId": "67b1234567890abcdef12346",
      "name": "Ironing",
      "code": "IRONING",
      "price": 15,
      "isOffered": true
    },
    {
      "serviceId": "67b1234567890abcdef12347",
      "name": "Premium Cleaning",
      "code": "PREMIUM_CLEANING",
      "price": 120,
      "isOffered": false
    }
  ]
}
```
- **Request Body (Example B - Simple Names Array):**
```json
{
  "services": ["Milk"]
}
```

- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor services updated successfully",
  "data": {
    "vendorId": "VND-849102",
    "category": "Dhobi",
    "services": [
      {
        "serviceId": "67b1234567890abcdef12345",
        "name": "Dry Cleaning",
        "code": "DRY_CLEANING",
        "price": 60,
        "isOffered": true
      },
      {
        "serviceId": "67b1234567890abcdef12346",
        "name": "Ironing",
        "code": "IRONING",
        "price": 15,
        "isOffered": true
      }
    ],
    "offeredServices": [
      "Dry Cleaning",
      "Ironing"
    ]
  }
}
```

---

### 5.5 Get Authenticated Vendor Offered Services
Retrieves the list of services currently configured and offered by the logged-in vendor.

- **Method:** `GET`
- **Path:** `/api/vendor/services`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:**
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor services retrieved successfully",
  "data": {
    "vendorId": "VND-849102",
    "category": "Dhobi",
    "services": [
      {
        "serviceId": "67b1234567890abcdef12345",
        "name": "Dry Cleaning",
        "code": "DRY_CLEANING",
        "price": 60,
        "isOffered": true
      },
      {
        "serviceId": "67b1234567890abcdef12346",
        "name": "Ironing",
        "code": "IRONING",
        "price": 15,
        "isOffered": true
      }
    ],
    "offeredServices": [
      "Dry Cleaning",
      "Ironing"
    ]
  }
}
```

---

## 6. 📋 Work Orders & Laundry Execution (Vendor Hub)

### 6.1 List Assigned Work Orders & Category Tab Switching
Fetches paginated work orders assigned to this vendor.
- **In-App Category Switcher:** Passing `?category=Dhobi` or `?category=Tailor` filters work orders for that specific service tab, leveraging direct MongoDB indexes `{ orderCategory: 1 }`.
- **Backward Compatibility:** Omit `category` or pass `?category=ALL` to retrieve all orders assigned to the vendor.

- **Method:** `GET`
- **Path:** `/api/vendor/orders`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:** `Authorization: Bearer <VENDOR_JWT_TOKEN>`
- **Query Parameters:**
  - `category` *(optional)*: Filter by active service tab (`'Dhobi'`, `'Press / Ironing'`, `'Tailor'`, `'ALL'`).
  - `orderCategory` *(optional)*: Alias for `category`.
  - `status` *(optional)*: Filter by status (`ALL`, `PENDING_PICKUP`, `PICKED_UP`, `IN_PROCESS`, `READY_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REJECTED`).
  - `search` *(optional)*: Text search across `orderNumber`, `userName`, or `userPhone`.
  - `page` *(optional, default: 1)*: Page number.
  - `limit` *(optional, default: 20)*: Items per page (max: 100).

- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor work orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "67b0aa112233445566778899",
        "orderNumber": "WO-20261019-4821",
        "orderCategory": "Dhobi",
        "userId": "670a9876543210fedcba9876",
        "userName": "Amit Sharma",
        "userPhone": "919812345678",
        "vendorId": "67b4d1234567890abcdef012",
        "vendorPhone": "919876543210",
        "vendorName": "Ramesh Kumar",
        "isRegisteredVendor": true,
        "pickupDate": "2026-10-20T10:00:00.000Z",
        "expectedDeliveryDate": "2026-10-22T18:00:00.000Z",
        "specialInstructions": "Handle silk kurta with extreme care, mild dry cleaning only.",
        "totalItems": 3,
        "status": "PENDING_PICKUP",
        "items": [
          {
            "_id": "67b0bb112233445566778801",
            "wardrobeItemId": "670b001122334455667788aa",
            "name": "Navy Blue Silk Kurta",
            "category": "ETHNIC_WEAR",
            "subCategory": "Kurta",
            "color": "Navy Blue",
            "fabric": "Silk",
            "imageUrl": "http://localhost:8083/uploads/garments/kurta_1.png",
            "serviceType": "DRY_CLEAN",
            "specialInstructions": "Mild solvent only"
          },
          {
            "_id": "67b0bb112233445566778802",
            "wardrobeItemId": "670b001122334455667788bb",
            "name": "Formal White Linen Shirt",
            "category": "UPPER_WEAR",
            "subCategory": "Shirt",
            "color": "White",
            "fabric": "Linen",
            "imageUrl": "http://localhost:8083/uploads/garments/shirt_1.png",
            "serviceType": "WASH_AND_IRON",
            "specialInstructions": "Starch collar lightly"
          }
        ],
        "pdfUrl": "http://localhost:8083/uploads/work-orders/WO-20261019-4821.pdf",
        "createdAt": "2026-10-19T09:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 14,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

---

### 6.2 Get Work Order Details
Fetches complete details for a single work order, including populated wardrobe item attributes, customer notes, and the status transition timeline.

- **Method:** `GET`
- **Path:** `/api/vendor/orders/:id`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:** `Authorization: Bearer <VENDOR_JWT_TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor work order details retrieved",
  "data": {
    "_id": "67b0aa112233445566778899",
    "orderNumber": "WO-20261019-4821",
    "userId": "670a9876543210fedcba9876",
    "userName": "Amit Sharma",
    "userPhone": "919812345678",
    "vendorId": "67b4d1234567890abcdef012",
    "vendorPhone": "919876543210",
    "vendorName": "Ramesh Kumar",
    "status": "IN_PROCESS",
    "pickupDate": "2026-10-20T10:00:00.000Z",
    "expectedDeliveryDate": "2026-10-22T18:00:00.000Z",
    "specialInstructions": "Handle silk kurta with extreme care.",
    "totalItems": 2,
    "pdfUrl": "http://localhost:5000/uploads/laundry-slips/WO-20261019-4821.pdf",
    "items": [
      {
        "_id": "67b0bb112233445566778801",
        "wardrobeItemId": {
          "_id": "670b001122334455667788aa",
          "name": "Navy Blue Silk Kurta",
          "category": "ETHNIC_WEAR",
          "images": [
            "http://localhost:5000/uploads/garments/kurta_1.png"
          ],
          "attributes": {
            "color": "Navy Blue",
            "fabric": "Silk",
            "pattern": "Solid"
          }
        },
        "name": "Navy Blue Silk Kurta",
        "serviceType": "DRY_CLEAN",
        "specialInstructions": "Mild solvent only"
      }
    ],
    "statusHistory": [
      {
        "status": "PENDING_PICKUP",
        "changedBy": "USER",
        "changedAt": "2026-10-19T09:30:00.000Z",
        "note": "Work order created by customer"
      },
      {
        "status": "PICKED_UP",
        "changedBy": "VENDOR",
        "changedAt": "2026-10-20T10:15:00.000Z",
        "note": "Garments collected from customer home"
      },
      {
        "status": "IN_PROCESS",
        "changedBy": "VENDOR",
        "changedAt": "2026-10-20T14:00:00.000Z",
        "note": "Dry cleaning underway"
      }
    ]
  }
}
```

---

### 6.3 Update Work Order Status
The vendor updates the progress of the laundry order. Uses HTTP `PATCH` in accordance with Arangtik REST standards.

- **Method:** `PATCH`
- **Path:** `/api/vendor/orders/:id/status`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:**
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Allowed Status Values for Vendor:**
  - `PENDING_PICKUP` (Awaiting pickup)
  - `PICKED_UP` (Garments collected from customer)
  - `IN_PROCESS` (Washing / Dry Cleaning / Ironing underway)
  - `READY_FOR_DELIVERY` (Processed and packed, ready to return)
  - `DELIVERED` (Handed back to customer — marks complete)
  - `REJECTED` (Vendor declines or rejects the order with reason)
  - ❌ `CANCELLED` **IS STRICTLY PROHIBITED FOR VENDORS** *(Only customers can cancel)*

- **Request Body:**
```json
{
  "status": "READY_FOR_DELIVERY",
  "note": "Clothes have been dry-cleaned and steam-pressed. Delivery scheduled for 5 PM."
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work order status updated successfully by vendor",
  "data": {
    "_id": "67b0aa112233445566778899",
    "orderNumber": "WO-20261019-4821",
    "status": "READY_FOR_DELIVERY",
    "statusHistory": [
      {
        "status": "READY_FOR_DELIVERY",
        "changedBy": "VENDOR",
        "changedAt": "2026-10-21T16:00:00.000Z",
        "note": "Clothes have been dry-cleaned and steam-pressed. Delivery scheduled for 5 PM."
      }
    ]
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Vendor attempts `CANCELLED` *(Returns: "Vendors cannot cancel orders. Please use REJECTED if you wish to decline this order.")*
  - `400 Bad Request`: Vendor attempts to reject an order that is already `DELIVERED` or `CANCELLED`.
  - `404 Not Found`: Order ID does not exist or is not assigned to this vendor.

---

## 9. 🎨 Status Badges & Color Palette for Vendor UI

| Status Key | Vendor UI Display Label | Recommended Color | Badge Style |
| :--- | :--- | :--- | :--- |
| `PENDING_PICKUP` | **Awaiting Pickup** | Amber (`#F59E0B`) | `bg-amber-100 text-amber-800` |
| `PICKED_UP` | **Garments Collected** | Indigo (`#6366F1`) | `bg-indigo-100 text-indigo-800` |
| `IN_PROCESS` | **Washing / Ironing** | Blue (`#3B82F6`) | `bg-blue-100 text-blue-800` |
| `READY_FOR_DELIVERY` | **Ready for Delivery** | Purple (`#8B5CF6`) | `bg-purple-100 text-purple-800` |
| `DELIVERED` | **Delivered & Completed** | Emerald (`#10B981`) | `bg-emerald-100 text-emerald-800` |
| `REJECTED` | **Order Rejected** | Rose (`#F43F5E`) | `bg-rose-100 text-rose-800` |
| `CANCELLED` | **Cancelled by User** | Gray (`#6B7280`) | `bg-gray-100 text-gray-800` |

---

> **Support & Inquiries:** Contact Arangtik Core Engineering Team.
