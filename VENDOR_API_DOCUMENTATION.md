# 🧺 Arangtik Vendor App API Documentation & Integration Guide

> **Official Backend Integration Guide for Arangtik Vendor Native Mobile Application (iOS / Android / Flutter / React Native)**  
> **Base URL:** `http://localhost:5000/api/vendor` *(or `/api/v1/vendor`)*  
> **Production Base URL:** `https://api.arangtik.com/api/vendor`  
> **Version:** `v1.0.0` • **Target Platform:** `Mobile Native App` • **Auth:** `Bearer JWT (role: 'vendor')`  

---

## 📑 Table of Contents

1. [📐 System Architecture & Vendor Lifecycle](#1--system-architecture--vendor-lifecycle)
2. [🔐 Authentication & Authorization Standard](#2--authentication--authorization-standard)
   - [2.1 Vendor JWT Token Header](#21-vendor-jwt-token-header)
   - [2.2 Quick Testing Credentials](#22-quick-testing-credentials)
3. [🏷️ Service Categories & Discovery Endpoints](#3--service-categories--discovery-endpoints)
   - [3.1 List Vendor Service Categories (`GET /api/vendor/categories`)](#31-list-vendor-service-categories)
   - [3.2 User Vendor Lookup by Phone (`GET /api/vendor/lookup`)](#32-user-vendor-lookup-by-phone)
4. [📲 Vendor Authentication Endpoints](#4--vendor-authentication-endpoints)
   - [4.1 Vendor Registration (`POST /api/vendor/auth/register`)](#41-vendor-registration)
   - [4.2 Vendor Login (`POST /api/vendor/auth/login`)](#42-vendor-login)
   - [4.3 Forgot Password - Request OTP (`POST /api/vendor/auth/forgot-password`)](#43-forgot-password---request-otp)
   - [4.4 Verify Reset OTP (`POST /api/vendor/auth/verify-reset-otp`)](#44-verify-reset-otp)
   - [4.5 Reset Password (`POST /api/vendor/auth/reset-password`)](#45-reset-password)
5. [👤 Vendor Profile Management](#5--vendor-profile-management)
   - [5.1 Get Authenticated Vendor Profile (`GET /api/vendor/auth/me`)](#51-get-authenticated-vendor-profile)
6. [📋 Work Orders & Laundry Execution (Vendor Hub)](#6--work-orders--laundry-execution-vendor-hub)
   - [6.1 List Assigned Work Orders (`GET /api/vendor/orders`)](#61-list-assigned-work-orders)
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

## 4. 📲 Vendor Authentication Endpoints

### 4.1 Vendor Registration
Registers a new vendor with their primary category, mobile number, and password.  
**⚡ Instant Login:** Upon successful registration, the backend automatically generates and returns the Vendor JWT Bearer token so the user is directly logged into the dashboard!

- **Method:** `POST`
- **Path:** `/api/vendor/auth/register` *(or `/api/v1/vendor/auth/register`)*
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Ramesh Kumar",
  "phone": "9876543210",
  "password": "Password@123",
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
| `name` | String | **Yes** | Full name of the vendor proprietor |
| `phone` | String | **Yes** | 10-digit mobile number |
| `password` | String | **Yes** | Minimum 6 characters |
| `category` | String | **Yes** | Category name or Category ID (e.g. `"Dhobi"`, `"Tailor"`) |
| `businessName` | String | Optional | Registered business / shop name |
| `address` | Object | Optional | Shop address object |

- **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Vendor registered and logged in successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YjRkMTIzNDU2Nzg5MGFiY2RlZjAxMiIsInZlbmRvcklkIjoiVk5ELTg0OTEwMiIsInBob25lIjoiOTE5ODc2NTQzMjEwIiwicm9sZSI6InZlbmRvciIsImNhdGVnb3J5IjoiRGhvYmkiLCJpYXQiOjE3MzcyNDgwMDB9...",
    "vendor": {
      "_id": "67b4d1234567890abcdef012",
      "vendorId": "VND-849102",
      "name": "Ramesh Kumar",
      "phone": "919876543210",
      "category": "Dhobi",
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
  - `400 Bad Request`: Missing name, phone, password (< 6 chars), or category.
  - `409 Conflict`: Phone number is already registered with a password.

---

### 4.2 Vendor Login
Log in to an existing vendor account with mobile number and password.

- **Method:** `POST`
- **Path:** `/api/vendor/auth/login` *(or `/api/v1/vendor/auth/login`)*
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210",
  "password": "Password@123"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "vendor": {
      "_id": "67b4d1234567890abcdef012",
      "vendorId": "VND-849102",
      "name": "Ramesh Kumar",
      "phone": "919876543210",
      "category": "Dhobi",
      "isRegistered": true,
      "businessName": "Ramesh Dry Cleaners & Steam Press",
      "address": {
        "street": "Shop 4, Market Complex",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302001"
      },
      "rating": 4.9,
      "totalOrdersHandled": 18,
      "isVerified": true,
      "status": "ACTIVE",
      "createdAt": "2026-10-19T10:00:00.000Z"
    }
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Password has not been set yet (user must use Forgot Password to initialize password).
  - `401 Unauthorized`: Invalid mobile number or incorrect password.
  - `403 Forbidden`: Account suspended or inactive.

---

### 4.3 Forgot Password - Request OTP
Sends a 4-digit verification OTP to the vendor's registered WhatsApp number.

- **Method:** `POST`
- **Path:** `/api/vendor/auth/forgot-password`
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset OTP sent successfully to your WhatsApp number",
  "data": {
    "phone": "919876543210",
    "expiresInMinutes": 10
  }
}
```
- **Error Responses:**
  - `404 Not Found`: No registered vendor found with this phone number.
  - `403 Forbidden`: Vendor account is suspended.

---

### 4.4 Verify Reset OTP
Pre-validates the OTP entered by the vendor before prompting for the new password.

- **Method:** `POST`
- **Path:** `/api/vendor/auth/verify-reset-otp`
- **Access:** Public
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
  "success": true,
  "statusCode": 200,
  "message": "OTP verified successfully",
  "data": {
    "phone": "919876543210",
    "verified": true
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: Invalid or expired OTP.

---

### 4.5 Reset Password
Verifies OTP and sets the new encrypted password for the vendor.

- **Method:** `POST`
- **Path:** `/api/vendor/auth/reset-password`
- **Access:** Public
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "1234",
  "newPassword": "NewStrongPassword@2026"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully. You can now login with your new password.",
  "data": {
    "phone": "919876543210",
    "success": true,
    "message": "Password reset successfully. You can now login with your new password."
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: OTP expired or new password < 6 characters.

---

## 5. 👤 Vendor Profile Management

### 5.1 Get Authenticated Vendor Profile
Fetches the current logged-in vendor's profile details.

- **Method:** `GET`
- **Path:** `/api/vendor/auth/me` *(Alias: `/api/vendor/profile`)*
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
  "message": "Vendor profile fetched successfully",
  "data": {
    "_id": "67b4d1234567890abcdef012",
    "vendorId": "VND-849102",
    "name": "Ramesh Kumar",
    "phone": "919876543210",
    "category": "Dhobi",
    "isRegistered": true,
    "businessName": "Ramesh Dry Cleaners & Steam Press",
    "address": {
      "street": "Shop 4, Market Complex",
      "city": "Jaipur",
      "state": "Rajasthan",
      "pincode": "302001"
    },
    "rating": 4.9,
    "totalOrdersHandled": 24,
    "isVerified": true,
    "status": "ACTIVE",
    "createdAt": "2026-10-19T10:00:00.000Z"
  }
}
```

---

## 6. 📋 Work Orders & Laundry Execution (Vendor Hub)

### 6.1 List Assigned Work Orders
Fetches paginated work orders assigned to this vendor. Automatically matches orders by either `vendorId` OR `vendorPhone` (ensuring unlinked past orders show up seamlessly).

- **Method:** `GET`
- **Path:** `/api/vendor/orders`
- **Access:** Private (Vendor Bearer JWT required)
- **Headers:** `Authorization: Bearer <VENDOR_JWT_TOKEN>`
- **Query Parameters:**
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
            "imageUrl": "http://localhost:5000/uploads/garments/kurta_1.png",
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
            "imageUrl": "http://localhost:5000/uploads/garments/shirt_1.png",
            "serviceType": "WASH_AND_IRON",
            "specialInstructions": "Starch collar lightly"
          }
        ],
        "pdfUrl": "http://localhost:5000/uploads/laundry-slips/WO-20261019-4821.pdf",
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

## 7. ⚙️ Critical Business Rules & State Machine

```
              ┌───────────────────┐
              │  PENDING_PICKUP   │
              └─────────┬─────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   [ PICKED_UP ]                 [ REJECTED ] (By Vendor)
         │                             │
         ▼                             ▼
   [ IN_PROCESS ]             (Items revert to ACTIVE)
         │
         ▼
[ READY_FOR_DELIVERY ]
         │
         ▼
   [ DELIVERED ] ──────────► (Items revert to ACTIVE & vendor totalOrders incremented)
```

### 7.1 User Cancellation vs. Vendor Rejection
- **Customer Cancellation:** If a user cancels an order, the status is set to `CANCELLED`.
- **Vendor Rejection:** If a vendor is overloaded or unable to serve, they must choose `REJECTED`. The backend strictly blocks vendors from calling `CANCELLED` (`400 Bad Request`).

### 7.2 Automatic Wardrobe Clothes State Sync
The backend coordinates between the laundry module and the customer's virtual wardrobe:
- While an order is active (`PENDING_PICKUP`, `PICKED_UP`, `IN_PROCESS`, `READY_FOR_DELIVERY`), all associated wardrobe items are automatically marked `status: 'INACTIVE'` in the customer's wardrobe so they cannot be selected for daily outfits or duplicate laundry orders.
- As soon as the vendor sets the status to `DELIVERED` or `REJECTED`, the items are immediately reverted to `status: 'ACTIVE'`.

### 7.3 Real-Time FCM Push Notifications to Customers
Whenever a vendor changes the order status via `PATCH /api/vendor/orders/:id/status`, the backend immediately dispatches an FCM Push Notification to the customer's mobile device:
- **Title:** `Laundry Order Update #WO-20261019-4821`
- **Body:** `Vendor Ramesh Kumar updated your work order to: Ready for Delivery.`
- **Data Payload:** `{ "type": "LAUNDRY_ORDER_STATUS", "orderId": "...", "status": "READY_FOR_DELIVERY" }`

### 7.4 Unregistered to Registered Seamless Migration
When a customer inputs an unregistered vendor phone:
1. An entry is saved in `unregisteredvendors`.
2. A PDF invoice slip is generated and sent to the vendor via WhatsApp.
3. Later, when the vendor installs the Arangtik Vendor App and registers with that phone number, the backend automatically:
   - Sets `isConvertedToRegistered: true` on the old contact record.
   - Updates all past work orders with `vendorId: vendor._id` and `isRegisteredVendor: true`.
   - Sends a welcome FCM notification: *"Vendor Hub Activated 🧺 - Past work orders are now in your dashboard!"*

---

## 8. 📱 Mobile App Integration Best Practices & Code Examples

### 8.1 Flutter / Dart API Service Example

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class VendorApiService {
  static const String baseUrl = 'http://10.0.2.2:5000/api/vendor'; // Android Emulator
  String? _authToken;

  void setToken(String token) {
    _authToken = token;
  }

  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  // 1. Vendor Login
  Future<Map<String, dynamic>> login(String phone, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers,
      body: jsonEncode({'phone': phone, 'password': password}),
    );
    final body = jsonDecode(response.body);
    if (response.statusCode == 200) {
      setToken(body['data']['token']);
      return body['data'];
    } else {
      throw Exception(body['message'] ?? 'Login failed');
    }
  }

  // 2. Fetch Assigned Orders with Status Filter
  Future<List<dynamic>> getOrders({String status = 'ALL', int page = 1}) async {
    final response = await http.get(
      Uri.parse('$baseUrl/orders?status=$status&page=$page&limit=20'),
      headers: _headers,
    );
    final body = jsonDecode(response.body);
    if (response.statusCode == 200) {
      return body['data']['orders'];
    } else {
      throw Exception(body['message'] ?? 'Failed to fetch orders');
    }
  }

  // 3. Update Order Status (PATCH per Rule 4)
  Future<void> updateOrderStatus(String orderId, String newStatus, String note) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/orders/$orderId/status'),
      headers: _headers,
      body: jsonEncode({'status': newStatus, 'note': note}),
    );
    final body = jsonDecode(response.body);
    if (response.statusCode != 200) {
      throw Exception(body['message'] ?? 'Failed to update status');
    }
  }
}
```

### 8.2 React Native / Axios Example

```typescript
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const vendorApi = axios.create({
  baseURL: 'https://api.arangtik.com/api/vendor',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic Bearer Token Injection
vendorApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('VENDOR_TOKEN');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Vendor Registration & Auto-Login
export const registerVendor = async (payload: {
  name: string;
  phone: string;
  password: string;
  category: string;
  businessName?: string;
}) => {
  const { data } = await vendorApi.post('/auth/register', payload);
  if (data.data?.token) {
    await AsyncStorage.setItem('VENDOR_TOKEN', data.data.token);
  }
  return data.data;
};

// Update Order Status
export const updateVendorOrderStatus = async (
  orderId: string,
  status: 'PICKED_UP' | 'IN_PROCESS' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'REJECTED',
  note?: string
) => {
  const { data } = await vendorApi.patch(`/orders/${orderId}/status`, {
    status,
    note,
  });
  return data.data;
};
```

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
