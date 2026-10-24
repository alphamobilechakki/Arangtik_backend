# Arangtik Vendor API Documentation

**Base URL:**
- **Local:** `http://localhost:8083/api/vendor`
- **Android Emulator:** `http://10.0.2.2:8083/api/vendor`
- **Production:** `https://api.arangtik.com/api/vendor`

**Authentication Header (for protected endpoints):**
```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
```

**Test Account (Bypass OTP):**
- Phone: `918949056321` (or ending with `8949056321`)
- OTP: `1234`

---

## 1. Authentication & Onboarding

### 1.1 Send OTP
- **Method:** `POST`
- **Endpoint:** `/api/vendor/auth/send-otp`
- **Description:** Sends a 4-digit verification OTP to the vendor's WhatsApp mobile number.
- **Request:**
```json
{
  "phone": "9876543210"
}
```
- **Response (`200 OK`):**
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

---

### 1.2 Verify OTP (Login / Register)
- **Method:** `POST`
- **Endpoint:** `/api/vendor/auth/verify-otp`
- **Description:** Verifies OTP. Logs in existing vendor or registers a new vendor if registration details are provided.
- **Request (Existing Vendor Login):**
```json
{
  "phone": "9876543210",
  "otp": "1234"
}
```
- **Request (New Vendor Registration):**
```json
{
  "phone": "9876543210",
  "otp": "1234",
  "name": "Ramu Sharma",
  "category": "Washerman",
  "categories": ["Washerman"],
  "primaryCategory": "Washerman",
  "businessName": "CleanWash Express",
  "address": {
    "street": "Shop 4, Market Complex",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302001"
  }
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewVendor": false,
    "vendor": {
      "_id": "6ad4a204850e8a45c0ac41d2",
      "vendorId": "VND-773717",
      "name": "Ramu Sharma",
      "phone": "919876543210",
      "category": "Washerman",
      "primaryCategory": "Washerman",
      "categories": ["Washerman"],
      "isRegistered": true,
      "businessName": "CleanWash Express",
      "address": {
        "street": "Shop 4, Market Complex",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pincode": "302001"
      },
      "rating": 5.0,
      "totalOrdersHandled": 12,
      "isVerified": true,
      "status": "ACTIVE",
      "services": [],
      "offeredServices": [],
      "createdAt": "2026-02-18T10:00:00.000Z"
    }
  }
}
```


---

## 2. Categories & Service Discovery

### 2.1 Get Vendor Categories
- **Method:** `GET`
- **Endpoint:** `/api/vendor/categories` *(alias: `/api/vendor/auth/categories`)*
- **Description:** Returns all available vendor trade categories for selection dropdowns.
- **Request:** None
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor categories retrieved successfully",
  "data": [
    {
      "id": "washerman",
      "name": "Washerman",
      "code": "WASHERMAN",
      "icon": "🧺",
      "description": "Laundry, Dry Cleaning & Garment Care"
    },
    {
      "id": "tailor",
      "name": "Tailor",
      "code": "TAILOR",
      "icon": "🪡",
      "description": "Custom Stitching & Alterations"
    }
  ]
}
```

---

### 2.2 Get Services for a Category
- **Method:** `GET`
- **Endpoint:** `/api/vendor/categories/:category/services`
- **Description:** Returns standard service list under a category (by name, code, or ObjectId).
- **Request:**
  - Path param `:category`: `Washerman`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Category services retrieved successfully",
  "data": [
    {
      "_id": "6ad89efdcb41a2627aecb421",
      "name": "dry",
      "code": "DRY",
      "description": "Chemical dry wash for delicate clothes",
      "icon": "🧼",
      "imageUrl": "",
      "price": 0,
      "sortOrder": 1,
      "isActive": true,
      "categoryId": "6ad35971b52d7dd7d79f7035",
      "categoryName": "Washerman"
    },
    {
      "_id": "6ad9a687e02e82bf9aaf7444",
      "name": "iron and press",
      "code": "IRON_AND_PRESS",
      "description": "High temperature wrinkle press",
      "icon": "👔",
      "imageUrl": "",
      "price": 0,
      "sortOrder": 2,
      "isActive": true,
      "categoryId": "6ad35971b52d7dd7d79f7035",
      "categoryName": "Washerman"
    }
  ]
}
```

---

### 2.3 Find Eligible Vendors
- **Method:** `GET` or `POST`
- **Endpoint:** `/api/vendor/eligible`
- **Description:** Finds active registered vendors offering all specified services in a category.
- **Request (via Query Parameters):**
  - `?category=Washerman&services=dry,iron and press`
- **Request (via Body):**
```json
{
  "category": "Washerman",
  "requiredServices": ["dry", "iron and press"]
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Eligible vendors retrieved successfully",
  "data": [
    {
      "_id": "6ad4a204850e8a45c0ac41d2",
      "vendorId": "VND-773717",
      "name": "Ramu Sharma",
      "businessName": "CleanWash Express",
      "phone": "919876543210",
      "category": "Washerman",
      "primaryCategory": "Washerman",
      "categories": ["Washerman"],
      "rating": 5.0,
      "isVerified": true,
      "offeredServices": ["dry", "iron and press"],
      "services": [
        {
          "serviceId": "6ad89efdcb41a2627aecb421",
          "name": "dry",
          "code": "DRY",
          "price": 40,
          "isOffered": true
        },
        {
          "serviceId": "6ad9a687e02e82bf9aaf7444",
          "name": "iron and press",
          "code": "IRON_AND_PRESS",
          "price": 20,
          "isOffered": true
        }
      ]
    }
  ]
}
```

---

### 2.4 Get Specific Vendor Offered Services
- **Method:** `GET`
- **Endpoint:** `/api/vendor/:id/services`
- **Description:** Retrieves services and prices offered by a specific vendor ID.
- **Request:**
  - Path param `:id`: `6ad4a204850e8a45c0ac41d2`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor offered services retrieved successfully",
  "data": {
    "vendorId": "6ad4a204850e8a45c0ac41d2",
    "vendorName": "Ramu Sharma",
    "businessName": "CleanWash Express",
    "category": "Washerman",
    "services": [
      {
        "serviceId": "6ad89efdcb41a2627aecb421",
        "name": "dry",
        "code": "DRY",
        "price": 40,
        "isOffered": true
      }
    ],
    "offeredServices": ["dry"]
  }
}
```

---

### 2.5 Lookup Vendor by Phone
- **Method:** `GET`
- **Endpoint:** `/api/vendor/lookup?phone=919876543210`
- **Description:** Checks if a phone number is registered or unregistered.
- **Request:**
  - Query param `phone`: `919876543210`
  - Header: `Authorization: Bearer <TOKEN>`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Registered vendor found",
  "data": {
    "isRegistered": true,
    "vendor": {
      "id": "6ad4a204850e8a45c0ac41d2",
      "vendorId": "VND-773717",
      "name": "Ramu Sharma",
      "phone": "919876543210",
      "category": "Washerman",
      "categoryCode": "WASHERMAN",
      "businessName": "CleanWash Express",
      "rating": 5.0,
      "isVerified": true
    }
  }
}
```

---

## 3. Vendor Profile & Category Configuration

### 3.1 Get Profile
- **Method:** `GET`
- **Endpoint:** `/api/vendor/profile` *(alias: `/api/vendor/auth/me`)*
- **Description:** Retrieves current authenticated vendor profile.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor profile fetched successfully",
  "data": {
    "_id": "6ad4a204850e8a45c0ac41d2",
    "vendorId": "VND-773717",
    "name": "Ramu Sharma",
    "phone": "919876543210",
    "category": "Washerman",
    "primaryCategory": "Washerman",
    "categories": ["Washerman"],
    "isRegistered": true,
    "businessName": "CleanWash Express",
    "address": {
      "street": "Shop 4, Market Complex",
      "city": "Jaipur",
      "state": "Rajasthan",
      "pincode": "302001"
    },
    "rating": 5.0,
    "totalOrdersHandled": 14,
    "isVerified": true,
    "status": "ACTIVE",
    "services": [ ... ],
    "offeredServices": ["dry", "iron and press"]
  }
}
```

---

### 3.2 Update Profile
- **Method:** `PATCH`
- **Endpoint:** `/api/vendor/profile`
- **Description:** Updates vendor name, business name, address, or categories.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
```json
{
  "name": "Ramu Sharma",
  "businessName": "CleanWash Pro Hub",
  "address": {
    "street": "Shop 4, Main Market Road",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302001"
  }
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor profile updated successfully",
  "data": {
    "_id": "6ad4a204850e8a45c0ac41d2",
    "vendorId": "VND-773717",
    "name": "Ramu Sharma",
    "businessName": "CleanWash Pro Hub",
    "phone": "919876543210",
    "category": "Washerman",
    "primaryCategory": "Washerman",
    "categories": ["Washerman"],
    "isRegistered": true,
    "status": "ACTIVE"
  }
}
```

---

### 3.3 Update Categories
- **Method:** `PATCH`
- **Endpoint:** `/api/vendor/categories`
- **Description:** Updates vendor trade categories and primary trade.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
```json
{
  "categories": ["Washerman", "Tailor"],
  "primaryCategory": "Washerman"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor categories updated successfully",
  "data": {
    "_id": "6ad4a204850e8a45c0ac41d2",
    "vendorId": "VND-773717",
    "name": "Ramu Sharma",
    "category": "Washerman",
    "primaryCategory": "Washerman",
    "categories": ["Washerman", "Tailor"],
    "isRegistered": true,
    "status": "ACTIVE"
  }
}
```

---

## 4. Service Offerings & Rate Card

### 4.1 Get Vendor Services
- **Method:** `GET`
- **Endpoint:** `/api/vendor/services`
- **Description:** Fetches current vendor's configured services and prices.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor services fetched successfully",
  "data": {
    "vendorId": "6ad4a204850e8a45c0ac41d2",
    "category": "Washerman",
    "services": [
      {
        "serviceId": "6ad89efdcb41a2627aecb421",
        "name": "dry",
        "code": "DRY",
        "price": 40,
        "isOffered": true
      },
      {
        "serviceId": "6ad9a687e02e82bf9aaf7444",
        "name": "iron and press",
        "code": "IRON_AND_PRESS",
        "price": 20,
        "isOffered": true
      }
    ],
    "offeredServices": ["dry", "iron and press"]
  }
}
```

---

### 4.2 Update Vendor Services & Rates
- **Method:** `PATCH`
- **Endpoint:** `/api/vendor/services`
- **Description:** Selects offered services and sets custom prices per garment.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
```json
{
  "services": [
    {
      "serviceId": "6ad89efdcb41a2627aecb421",
      "name": "dry",
      "code": "DRY",
      "price": 40,
      "isOffered": true
    },
    {
      "serviceId": "6ad9a687e02e82bf9aaf7444",
      "name": "iron and press",
      "code": "IRON_AND_PRESS",
      "price": 20,
      "isOffered": true
    }
  ]
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor services updated successfully",
  "data": {
    "_id": "6ad4a204850e8a45c0ac41d2",
    "vendorId": "VND-773717",
    "name": "Ramu Sharma",
    "category": "Washerman",
    "primaryCategory": "Washerman",
    "categories": ["Washerman"],
    "services": [
      {
        "serviceId": "6ad89efdcb41a2627aecb421",
        "name": "dry",
        "code": "DRY",
        "price": 40,
        "isOffered": true
      },
      {
        "serviceId": "6ad9a687e02e82bf9aaf7444",
        "name": "iron and press",
        "code": "IRON_AND_PRESS",
        "price": 20,
        "isOffered": true
      }
    ],
    "offeredServices": ["dry", "iron and press"],
    "status": "ACTIVE"
  }
}
```

---

## 5. Work Orders Management

### 5.1 List Assigned Work Orders
- **Method:** `GET`
- **Endpoint:** `/api/vendor/orders`
- **Description:** Retrieves work orders assigned to authenticated vendor with filters.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
  - Query params (all optional):
    - `category`: Category name filter (`Washerman` / `ALL`)
    - `status`: `PENDING_PICKUP` / `PICKED_UP` / `IN_PROCESS` / `READY_FOR_DELIVERY` / `DELIVERED` / `PARTIALLY_DELIVERED` / `REJECTED` / `ALL`
    - `paymentStatus`: `PAID` / `UNPAID` / `ALL`
    - `search`: Search order number, customer name, phone
    - `page`: Page number (default `1`)
    - `limit`: Items per page (default `20`)
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor work orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "67c3344556677889900aabbc",
        "orderNumber": "WO-20261024-4211",
        "orderCategory": "Washerman",
        "orderType": "LAUNDRY_WORK_ORDER",
        "userName": "Rahul Sharma",
        "userPhone": "919876543210",
        "status": "PENDING_PICKUP",
        "totalItems": 2,
        "totalAmount": 60,
        "deliveredItemsCount": 0,
        "deliveredAmount": 0,
        "payment": {
          "status": "UNPAID",
          "paidAt": null,
          "updatedBy": "SYSTEM"
        },
        "paymentStatus": "UNPAID",
        "pickupDate": "2026-10-25T09:00:00.000Z",
        "expectedDeliveryDate": "2026-10-27T18:00:00.000Z",
        "pdfUrl": "http://localhost:8083/uploads/order_WO-20261024-4211.pdf",
        "createdAt": "2026-10-24T17:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```

---

### 5.2 Get Work Order Details
- **Method:** `GET`
- **Endpoint:** `/api/vendor/orders/:id`
- **Description:** Retrieves full order details with customer and garment info.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
  - Path param `:id`: `67c3344556677889900aabbc`
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor work order details retrieved",
  "data": {
    "_id": "67c3344556677889900aabbc",
    "orderNumber": "WO-20261024-4211",
    "orderCategory": "Washerman",
    "userName": "Rahul Sharma",
    "userPhone": "919876543210",
    "status": "PENDING_PICKUP",
    "totalItems": 2,
    "subtotal": 60,
    "totalAmount": 60,
    "deliveredItemsCount": 0,
    "deliveredAmount": 0,
    "payment": {
      "status": "UNPAID",
      "paidAt": null,
      "updatedBy": "SYSTEM"
    },
    "paymentStatus": "UNPAID",
    "pickupDate": "2026-10-25T09:00:00.000Z",
    "expectedDeliveryDate": "2026-10-27T18:00:00.000Z",
    "specialInstructions": "Handle silk suit gently",
    "pdfUrl": "http://localhost:8083/uploads/order_WO-20261024-4211.pdf",
    "items": [
      {
        "_id": "67c3344556677889900aabbd",
        "name": "Navy Blue Linen Shirt",
        "serviceName": "iron and press",
        "price": 20,
        "quantity": 1,
        "status": "PENDING",
        "specialInstructions": "Starch the collar firmly",
        "imageUrl": "http://localhost:8083/uploads/linen_shirt.png"
      },
      {
        "_id": "67c3344556677889900aabbe",
        "name": "Silk Party Kurta",
        "serviceName": "dry",
        "price": 40,
        "quantity": 1,
        "status": "PENDING",
        "specialInstructions": "Delicate silk dry cleaning",
        "imageUrl": "http://localhost:8083/uploads/silk_kurta.png"
      }
    ],
    "statusHistory": [
      {
        "status": "PENDING_PICKUP",
        "changedBy": "USER",
        "changedAt": "2026-10-24T17:30:00.000Z",
        "note": "Work order created by customer"
      }
    ]
  }
}
```

---

### 5.3 Update Work Order Status
- **Method:** `PATCH`
- **Endpoint:** `/api/vendor/orders/:id/status`
- **Description:** Updates status (`PICKED_UP`, `IN_PROCESS`, `READY_FOR_DELIVERY`, `PARTIALLY_DELIVERED`, `DELIVERED`, `REJECTED`). *Note: CANCELLED is prohibited for vendors.*
- **Request (Standard Status Update):**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
```json
{
  "status": "IN_PROCESS",
  "note": "Washing underway"
}
```
- **Request (Full Delivery + Payment):**
```json
{
  "status": "DELIVERED",
  "note": "All clothes delivered to customer",
  "paymentStatus": "PAID"
}
```
- **Request (Partial Delivery):**
```json
{
  "status": "PARTIALLY_DELIVERED",
  "note": "Delivered 1 shirt today. Kurta pending dry clean.",
  "deliveredItemIds": ["67c3344556677889900aabbd"],
  "paymentStatus": "PAID"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work order status updated successfully by vendor",
  "data": {
    "_id": "67c3344556677889900aabbc",
    "orderNumber": "WO-20261024-4211",
    "status": "PARTIALLY_DELIVERED",
    "totalItems": 2,
    "totalAmount": 60,
    "deliveredItemsCount": 1,
    "deliveredAmount": 20,
    "payment": {
      "status": "PAID",
      "paidAt": "2026-10-24T18:00:00.000Z",
      "updatedBy": "VENDOR"
    },
    "paymentStatus": "PAID",
    "pdfUrl": "http://localhost:8083/uploads/order_WO-20261024-4211.pdf"
  }
}
```

---

## 6. Payments & Transactions

### 6.1 Update Order Payment Status
- **Method:** `PATCH`
- **Endpoint:** `/api/vendor/orders/:id/payment`
- **Description:** Marks order payment as `PAID` or `UNPAID`. Allowed only when order status is `DELIVERED` or `PARTIALLY_DELIVERED`. Once `PAID`, payment cannot be reverted.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
```json
{
  "status": "PAID",
  "note": "Cash collected on delivery"
}
```
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order payment marked as PAID successfully",
  "data": {
    "order": {
      "_id": "67c3344556677889900aabbc",
      "orderNumber": "WO-20261024-4211",
      "payment": {
        "status": "PAID",
        "paidAt": "2026-10-24T18:00:00.000Z",
        "updatedBy": "VENDOR"
      }
    },
    "transaction": {
      "_id": "67c445566778899aabbcc001",
      "transactionNumber": "TXN-20261024-42111002",
      "orderNumber": "WO-20261024-4211",
      "amount": 60,
      "status": "PAID",
      "paidAt": "2026-10-24T18:00:00.000Z",
      "updatedBy": "VENDOR"
    }
  }
}
```

---

### 6.2 Get Vendor Transactions Ledger
- **Method:** `GET`
- **Endpoint:** `/api/vendor/transactions`
- **Description:** Retrieves payment transactions ledger and financial statistics for authenticated vendor.
- **Request:**
  - Header: `Authorization: Bearer <VENDOR_TOKEN>`
  - Query params (all optional):
    - `status`: `ALL` (default), `PAID`, or `UNPAID`
    - `search`: Search order number, transaction number, customer name, phone
    - `startDate`: ISO date string (e.g. `2026-10-01`)
    - `endDate`: ISO date string (e.g. `2026-10-31`)
    - `page`: Page number (default `1`)
    - `limit`: Items per page (default `20`)
- **Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "_id": "67c445566778899aabbcc001",
        "transactionNumber": "TXN-20261024-42111002",
        "orderId": {
          "_id": "67c3344556677889900aabbc",
          "orderNumber": "WO-20261024-4211",
          "status": "DELIVERED",
          "totalItems": 2
        },
        "orderNumber": "WO-20261024-4211",
        "vendorId": "6ad4a204850e8a45c0ac41d2",
        "vendorPhone": "919876543211",
        "vendorName": "CleanWash Express",
        "userName": "Rahul Sharma",
        "userPhone": "919876543210",
        "orderCategory": "Washerman",
        "amount": 60,
        "totalAmount": 60,
        "deliveredAmount": 60,
        "deliveredItemsCount": 2,
        "totalItems": 2,
        "orderStatus": "DELIVERED",
        "status": "PAID",
        "paidAt": "2026-10-24T18:00:00.000Z",
        "updatedBy": "VENDOR",
        "createdAt": "2026-10-24T17:30:00.000Z"
      }
    ],
    "stats": {
      "totalTransactions": 14,
      "totalAmount": 1120,
      "paidCount": 10,
      "paidAmount": 800,
      "unpaidCount": 4,
      "unpaidAmount": 320
    },
    "pagination": {
      "total": 14,
      "page": 1,
      "limit": 20,
      "pages": 1
    }
  }
}
```
