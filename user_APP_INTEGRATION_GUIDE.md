# 📱 Arangtik Mobile App — Complete User API Integration Guide

> **Official Mobile Application API Contract & Integration Manual**  
> **Target Audience:** Flutter, React Native, Native Android (Kotlin), iOS (Swift), and Mobile AI Code Generators  
> **Backend Base URL:** `http://localhost:8083/api` *(Production: `https://api.arangtik.com/api`)*  
> **API Version:** `v1.2.0`  
> **Authentication:** `Bearer JWT Token` (Header: `Authorization: Bearer <TOKEN>`)  
> **Global Response Standard:** `{ "success": boolean, "statusCode": number, "message": string, "data": { ... } }`

---

## 📑 Series-Wise Table of Contents (User App Journey)

1. [🌐 Series 0: Global Architecture, Environments & Headers](#-series-0-global-architecture-environments--headers)
2. [🔐 Series 1: Authentication & Session Lifecycle](#-series-1-authentication--session-lifecycle)
3. [🏪 Series 2: Store Types (Dynamic Store Verticals)](#-series-2-store-types-dynamic-store-verticals)
4. [🚪 Series 3: Digital Almari / User Wardrobes](#-series-3-digital-almari--user-wardrobes)
5. [👤 Series 4: User Profile & Reference Face Biometrics](#-series-4-user-profile--reference-face-biometrics)
6. [📸 Series 5: Clothes Ingestion (Camera & Gallery AI Vision)](#-series-5-clothes-ingestion-camera--gallery-ai-vision)
7. [👥 Series 6: Event & Group Photo Face Verification](#-series-6-event--group-photo-face-verification)
8. [👗 Series 7: Wardrobe Catalog, Filtering & Clothing CRUD](#-series-7-wardrobe-catalog-filtering--clothing-crud)
9. [🧊 Series 8: 3D Garment Mesh Reconstruction (TripoSR Engine)](#-series-8-3d-garment-mesh-reconstruction-triposr-engine)
10. [✨ Series 9: Smart AI Outfit Recommendations & Styling](#-series-9-smart-ai-outfit-recommendations--styling)
11. [🏷️ Series 10: Service Categories & Live Rate Card Discovery](#-series-10-service-categories--live-rate-card-discovery)
12. [🧺 Series 11: Work Orders & Payments (Customer Dispatch)](#-series-11-work-orders--payments-customer-dispatch)
13. [🔔 Series 12: Push Notifications (FCM) & In-App Alerts](#-series-12-push-notifications-fcm--in-app-alerts)
14. [🖼️ Series 13: Image & Media URL Resolution Protocol](#-series-13-image--media-url-resolution-protocol)
15. [🚀 Series 14: Ready-to-Use Mobile Integration Clients (Flutter & React Native)](#-series-14-ready-to-use-mobile-integration-clients)

---

## 🌐 Series 0: Global Architecture, Environments & Headers

### 0.1 Base URLs & Network Endpoints

| Environment | Base URL | Media Uploads URL | Notes |
|---|---|---|---|
| **Localhost (Dev Web)** | `http://localhost:8083/api` | `http://localhost:8083` | Web / Node server |
| **Android Emulator** | `http://10.0.2.2:8083/api` | `http://10.0.2.2:8083` | Standard Android Studio AVD mapping |
| **Physical Device (Wi-Fi)** | `http://192.168.x.x:8083/api` | `http://192.168.x.x:8083` | Your PC's local LAN IP address |
| **Production Cloud** | `https://api.arangtik.com/api` | `https://api.arangtik.com` | SSL Enabled CDN |

### 0.2 Standard HTTP Headers

```http
Content-Type: application/json
Accept: application/json
Authorization: Bearer <JWT_TOKEN>
```
*Note: For multipart endpoints (`multipart/form-data`), omit `Content-Type` manually so your client auto-sets the boundary.*

### 0.3 Global Response Envelope

All API endpoints strictly return this uniform JSON structure:

```json
// Success Response (HTTP 200 / 201)
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... }
}

// Error Response (HTTP 400 / 401 / 403 / 404 / 409 / 500)
{
  "success": false,
  "statusCode": 400,
  "message": "Descriptive reason for failure",
  "errors": []
}
```

---

## 🔐 Series 1: Authentication & Session Lifecycle

Mobile authentication is passwordless via a 6-digit WhatsApp OTP.

### 1.1 Send OTP
Dispatches a 6-digit verification code to the user's WhatsApp number.

- **Method:** `POST`
- **Path:** `/api/auth/send-otp`
- **Auth Required:** `No (Public)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "phone": "919876543210"
}
```
*Rule: Phone number must include country code (e.g. `91` for India) without `+` or spaces (10–14 digits).*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP sent successfully to your WhatsApp number",
  "data": {
    "phone": "919876543210",
    "otpExpirySeconds": 300
  }
}
```

---

### 1.2 Verify OTP & Login / Register
Verifies OTP, auto-creates user if new, registers device FCM push token, and returns JWT session token.

- **Method:** `POST`
- **Path:** `/api/auth/verify-otp`
- **Auth Required:** `No (Public)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "phone": "919876543210",
  "otp": "123456",
  "name": "Rahul Sharma",
  "fcmToken": "dK_3f9z...fcm_registration_token...",
  "platform": "ANDROID",
  "deviceId": "unique_hardware_uuid",
  "deviceModel": "Google Pixel 8",
  "appVersion": "1.2.0"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "67a3f890b1234567890abcdef",
      "phone": "919876543210",
      "name": "Rahul Sharma",
      "gender": "MALE",
      "profileImage": "http://localhost:8083/uploads/avatar_123.jpg",
      "hasReferenceFace": true,
      "defaultWardrobeId": "6ac8e4471dd51c1c79a52e6d"
    },
    "fcmToken": "dK_3f9z...",
    "deviceRegistered": true
  }
}
```

---

### 1.3 User Logout
Invalidates session and unregisters the device push token.

- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body (Optional)
```json
{
  "fcmToken": "dK_3f9z...fcm_registration_token..."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully"
}
```

---

## 🏪 Series 2: Store Types (Dynamic Store Verticals)

Fetches active store types configured by the admin (e.g. `Wardrobe`, `Kitchen`, `Household`). Mobile apps call this to populate store categories dynamically.

### 2.1 List Store Types
- **Method:** `GET`
- **Path:** `/api/store-types`
- **Auth Required:** `No (Public)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Store types retrieved successfully",
  "data": [
    {
      "_id": "67b00112233445566778899a",
      "name": "Wardrobe",
      "code": "WARDROBE",
      "imageUrl": "http://localhost:8083/uploads/store_wardrobe.png",
      "isActive": true
    },
    {
      "_id": "67b00112233445566778899b",
      "name": "Kitchen",
      "code": "KITCHEN",
      "imageUrl": "http://localhost:8083/uploads/store_kitchen.png",
      "isActive": true
    }
  ]
}
```

---

## 🚪 Series 3: Digital Almari / User Wardrobes

Users can organize clothes into one or more Almari containers (e.g. *"My Almari"*, *"Office Almari"*, *"Mummy Almari"*).

### 3.1 List User Wardrobes
Fetches all wardrobe containers owned by the authenticated user.
Defaults to `storeType=WARDROBE` so only wardrobe almaris (and their accurate garment counts) are returned.

- **Method:** `GET`
- **Path:** `/api/wardrobe/get-wardrobes` *(alias: `/api/wardrobe/create-wardrobe`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Query Parameters (Optional):**
  | Parameter | Type | Required | Default | Description |
  |---|---|:---:|---|---|
  | `storeType` | String | No | `WARDROBE` | Store vertical code (defaults to `WARDROBE`). |
  | `storeTypeId` | String (ObjectId) | No | *None* | Optional StoreType `_id` |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Wardrobes fetched successfully",
  "data": [
    {
      "_id": "6ac8e4471dd51c1c79a52e6d",
      "name": "My Almari",
      "ownerName": "Rahul",
      "storeType": "WARDROBE",
      "storeTypeId": "67b00112233445566778899a",
      "type": "PERSONAL",
      "isDefault": true,
      "itemCount": 24,
      "coverImage": "http://localhost:8083/uploads/almari_cover.jpg",
      "ownerFaceImage": "http://localhost:8083/uploads/rahul_face.jpg",
      "isActive": true,
      "createdAt": "2026-02-01T08:00:00.000Z"
    },
    {
      "_id": "6cd0a6693ff73e3e90c74a8f",
      "name": "Office Formal Almari",
      "ownerName": "Rahul Sharma",
      "storeType": "WARDROBE",
      "storeTypeId": "67b00112233445566778899a",
      "type": "PERSONAL",
      "isDefault": false,
      "itemCount": 12,
      "coverImage": "",
      "ownerFaceImage": "",
      "isActive": true,
      "createdAt": "2026-02-10T11:00:00.000Z"
    }
  ]
}
```

---

### 3.2 Create New Wardrobe Container
- **Method:** `POST`
- **Path:** `/api/wardrobe/create-wardrobe`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `multipart/form-data` or `application/json`

#### Form Fields / JSON Body
| Field | Type | Required | Description |
|---|---|:---:|---|
| `name` | String | Yes | Name of Almari (e.g. "Master Bedroom Almari") |
| `ownerName` | String | No | Owner person's name |
| `storeType` | String | No | Defaults to `WARDROBE` |
| `storeTypeId` | String (ObjectId) | No | Optional dynamic StoreType ID |
| `type` | String | No | `PERSONAL`, `FAMILY`, `CAPSULE`, `SHARED`, `SEASONAL` |
| `isDefault` | Boolean | No | `true` or `false` |
| `coverImage` | Binary File / String | No | Almari cover photo |
| `ownerFaceImage` | Binary File / String | No | Owner face image |

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Wardrobe created successfully",
  "data": {
    "_id": "6cd0a6693ff73e3e90c74a8f",
    "name": "Office Formal Almari",
    "ownerName": "Rahul Sharma",
    "storeType": "WARDROBE",
    "storeTypeId": "67b00112233445566778899a",
    "type": "PERSONAL",
    "isDefault": false,
    "itemCount": 0,
    "createdAt": "2026-02-10T11:00:00.000Z"
  }
}
```

---

### 3.3 Delete Wardrobe Container
Deletes a non-default wardrobe / almari container. Any clothes previously inside are automatically reassigned to the user's default Almari.

- **Method:** `DELETE`
- **Path:** `/api/wardrobe/delete-wardrobe/:id` *(alias: `/api/wardrobe/closets/:id`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Wardrobe container deleted successfully"
}
```

---

## 👤 Series 4: User Profile & Reference Face Biometrics

Used to store identity data and an enrolled face reference (512-dimension embedding via InsightFace) to automatically verify whether clothes in photos belong to the user.

### 4.1 Get Current User Profile
- **Method:** `GET`
- **Path:** `/api/auth/me` *(alias: `/api/auth/profile`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "_id": "67a3f890b1234567890abcdef",
      "phone": "919876543210",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "gender": "MALE",
      "profileImage": "http://localhost:8083/uploads/avatar_123.jpg",
      "hasReferenceFace": true,
      "defaultWardrobeId": "6ac8e4471dd51c1c79a52e6d",
      "createdAt": "2026-02-06T10:00:00.000Z"
    }
  }
}
```

---

### 4.2 Update Profile Attributes
- **Method:** `PATCH` *(Never use PUT)*
- **Path:** `/api/auth/profile`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "name": "Rahul Sharma",
  "gender": "MALE",
  "email": "rahul.sharma@example.com"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "67a3f890b1234567890abcdef",
      "name": "Rahul Sharma",
      "gender": "MALE",
      "email": "rahul.sharma@example.com"
    }
  }
}
```

---

### 4.3 Upload Profile Image & Enroll Face
Uploads portrait/selfie and extracts 512-d face embedding for automatic biometric matching.

- **Method:** `POST`
- **Path:** `/api/auth/profile-image` *(alias: `/api/face-recognition/register`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `multipart/form-data`

#### Multipart Form Fields
| Field Name | Type | Description |
|---|---|---|
| `image` *(or `photo`)* | Binary File | Front-facing portrait photo (JPEG/PNG) |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile image uploaded and face enrolled successfully",
  "data": {
    "profileImage": "http://localhost:8083/uploads/img_928340.jpg",
    "faceEnrolled": true,
    "faceEmbeddingAvailable": true
  }
}
```

---

### 4.4 Check Face Reference Status
- **Method:** `GET`
- **Path:** `/api/face-recognition/status`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Face reference status retrieved",
  "data": {
    "hasReferenceFace": true,
    "enrolledAt": "2026-02-06T10:15:30.000Z"
  }
}
```

---

### 4.5 Delete Face Reference
- **Method:** `DELETE`
- **Path:** `/api/face-recognition/reference`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reference face deleted successfully"
}
```

---

## 📸 Series 5: Clothes Ingestion (Camera & Gallery AI Vision)

Primary Arangtik feature. The user snaps or selects a photo of a garment. The backend:
1. Detects clothes and crops them cleanly.
2. Extracts colors, category, subcategory, and pattern.
3. Performs strict anti-duplicate check (visual similarity & perceptual hash).

### 5.1 Extract & Add Item to Almari (Direct Capture Mode)
- **Method:** `POST`
- **Path:** `/api/wardrobe/add-item` *(aliases: `/api/wardrobe/extract-item`, `/api/wardrobe/items`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `multipart/form-data`

#### Multipart Form Fields
| Field Name | Type | Required | Description |
|---|---|:---:|---|
| `photo` *(or `photos`, `image`, `file`)* | Binary File | Yes | Garment photograph from camera/gallery |
| `wardrobeId` | String | No | Target Almari ID (defaults to user default Almari) |
| `forceAdd` | String / Boolean | No | Set to `'true'` to force-save even if duplicate is flagged |
| `name` | String | No | Custom garment name |
| `category` | String | No | `UPPER_WEAR`, `LOWER_WEAR`, `FULL_BODY`, `FOOTWEAR`, `ACCESSORIES` |

#### Scenario A: Unique Dress (Saved Successfully)
`201 Created` or `200 OK`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Garment extracted and added to your Almari successfully",
  "data": {
    "duplicateDetected": false,
    "item": {
      "_id": "67b12345abcdef0123456789",
      "wardrobeId": "6ac8e4471dd51c1c79a52e6d",
      "name": "Navy Blue Linen Shirt",
      "category": "UPPER_WEAR",
      "subCategory": "SHIRT",
      "color": "Navy Blue",
      "season": "SUMMER",
      "occasion": "CASUAL",
      "status": "ACTIVE",
      "images": [
        {
          "url": "http://localhost:8083/uploads/garment_987654.png",
          "isPrimary": true
        }
      ],
      "wearCount": 0,
      "createdAt": "2026-02-18T14:20:00.000Z"
    }
  }
}
```

#### Scenario B: Duplicate Dress Flagged
`200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Potential duplicate garment detected in your Almari",
  "data": {
    "duplicateDetected": true,
    "similarityScore": 0.92,
    "uploadedImage": "http://localhost:8083/uploads/temp_scan_1122.png",
    "existingItem": {
      "_id": "65e99887766554433221100a",
      "name": "Dark Blue Casual Shirt",
      "category": "UPPER_WEAR",
      "subCategory": "SHIRT",
      "color": "Navy Blue",
      "status": "ACTIVE",
      "primaryImage": "http://localhost:8083/uploads/garment_443322.png",
      "wearCount": 4
    }
  }
}
```
*Mobile App Action:* Show a modal comparing the two dresses:
- If user chooses *"Same Dress"* ➔ Discard.
- If user chooses *"Different Dress"* ➔ Re-call with `forceAdd: 'true'`.

---

### 5.2 Scan Photo & Detect Garments (Pre-Analysis Mode)
Pre-scans one or more photos to detect garments before saving to Almari.

- **Method:** `POST`
- **Path:** `/api/wardrobe/scan-item` *(aliases: `/api/wardrobe/scan`, `/api/wardrobe/analyze-photo`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `multipart/form-data`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Photo analyzed successfully with clothing recognition",
  "data": {
    "garmentsCount": 1,
    "garments": [
      {
        "name": "Casual Cotton T-Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "T_SHIRT",
        "color": "White",
        "croppedImageUrl": "http://localhost:8083/uploads/crop_white_tshirt.png"
      }
    ]
  }
}
```

---

### 5.3 Bulk Ingestion (Multiple Gallery Photos)
Upload up to 100 photos at once.

- **Method:** `POST`
- **Path:** `/api/wardrobe/add-item` *(alias: `/api/wardrobe/bulk-add-photos`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `multipart/form-data`

#### Multipart Form Fields
| Field Name | Type | Description |
|---|---|---|
| `photos` *(or `images`)* | Array of Files | Up to 100 images |
| `wardrobeId` | String | Target Almari ID |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Processed 5 images: 4 items added, 1 duplicate flagged",
  "data": {
    "addedCount": 4,
    "duplicateCount": 1,
    "addedItems": [ ... ],
    "duplicates": [ ... ]
  }
}
```

---

## 👥 Series 6: Event & Group Photo Face Verification

Checks whether the user appears in a group/event photo before extracting clothes.

### 6.1 Verify Face in Photo
- **Method:** `POST`
- **Path:** `/api/face-recognition/verify`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `multipart/form-data`

#### Multipart Form Fields
| Field Name | Type | Description |
|---|---|---|
| `photo` *(or `image`)* | Binary File | Group photograph |
| `threshold` | Number | Optional matching threshold (Default: `0.60`) |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Face verification completed",
  "data": {
    "isUserPresent": true,
    "confidence": 0.89,
    "facesDetectedCount": 3,
    "userBbox": { "x": 120, "y": 80, "width": 140, "height": 180 }
  }
}
```

---

## 👗 Series 7: Wardrobe Catalog, Filtering & Clothing CRUD

Browse, filter, search, view, edit (`PATCH`), and delete clothes in the Almari.

### 7.1 List Clothes / Wardrobe Items (Catalog with Pagination)
- **Method:** `GET`
- **Path:** `/api/wardrobe/get-items` *(aliases: `/api/wardrobe/items`, `/api/wardrobe/get-all-items`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Query Parameters
| Parameter | Type | Required | Example | Description |
|---|---|:---:|---|---|
| `wardrobeId` | String | No | `6ac8e44...` | Filter by specific Almari |
| `category` | String | No | `UPPER_WEAR` | `UPPER_WEAR`, `LOWER_WEAR`, `FULL_BODY`, `FOOTWEAR`, `ACCESSORIES` |
| `subCategory` | String | No | `SHIRT` | `SHIRT`, `T_SHIRT`, `JEANS`, `TROUSERS`, `KURTA`, `SUIT`, `DRESS` |
| `status` | String | No | `ACTIVE` | `ACTIVE` (clean/ready) or `INACTIVE` (in laundry) |
| `color` | String | No | `Blue` | Color filter |
| `season` | String | No | `SUMMER` | `SUMMER`, `WINTER`, `ALL_SEASON`, `MONSOON` |
| `occasion` | String | No | `CASUAL` | `CASUAL`, `FORMAL`, `PARTY`, `ETHNIC`, `SPORTS` |
| `search` | String | No | `Linen` | Search query matching garment name or color |
| `page` | Integer | No | `1` | Page number (Default: `1`) |
| `limit` | Integer | No | `20` | Items per page (Default: `20`) |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Wardrobe items retrieved successfully",
  "data": {
    "items": [
      {
        "_id": "67b12345abcdef0123456789",
        "name": "Navy Blue Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "SHIRT",
        "color": "Navy Blue",
        "season": "SUMMER",
        "occasion": "CASUAL",
        "status": "ACTIVE",
        "images": [
          { "url": "http://localhost:8083/uploads/garment_987654.png", "isPrimary": true }
        ],
        "model3d": {
          "status": "COMPLETED",
          "modelUrl": "http://localhost:8083/uploads/models/garment_987654.glb"
        },
        "wearCount": 3,
        "createdAt": "2026-02-18T14:20:00.000Z"
      }
    ],
    "pagination": {
      "total": 35,
      "page": 1,
      "limit": 20,
      "pages": 2
    }
  }
}
```

---

### 7.2 Get Single Garment Details
- **Method:** `GET`
- **Path:** `/api/wardrobe/get-item/:id` *(alias: `/api/wardrobe/items/:id`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item details retrieved",
  "data": {
    "item": {
      "_id": "67b12345abcdef0123456789",
      "name": "Navy Blue Linen Shirt",
      "category": "UPPER_WEAR",
      "subCategory": "SHIRT",
      "color": "Navy Blue",
      "season": "SUMMER",
      "occasion": "CASUAL",
      "status": "ACTIVE",
      "wearCount": 3,
      "images": [
        { "url": "http://localhost:8083/uploads/garment_987654.png", "isPrimary": true }
      ]
    }
  }
}
```

---

### 7.3 Update Garment Attributes (PATCH Only)
- **Method:** `PATCH` *(Never use PUT)*
- **Path:** `/api/wardrobe/edit-item/:id` *(aliases: `/api/wardrobe/update-item/:id`, `/api/wardrobe/items/:id`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body (All optional)
```json
{
  "name": "Premium Italian Navy Shirt",
  "color": "Dark Navy",
  "season": "ALL_SEASON",
  "occasion": "FORMAL",
  "notes": "Dry clean only or delicate iron",
  "tags": ["favorite", "office", "summer"]
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item updated successfully",
  "data": {
    "item": {
      "_id": "67b12345abcdef0123456789",
      "name": "Premium Italian Navy Shirt",
      "occasion": "FORMAL"
    }
  }
}
```

---

### 7.4 Delete Garment from Almari
- **Method:** `DELETE`
- **Path:** `/api/wardrobe/delete-item/:id` *(alias: `/api/wardrobe/items/:id`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Clothing item deleted successfully"
}
```

---

## 🧊 Series 8: 3D Garment Mesh Reconstruction (TripoSR Engine)

Generates an interactive 3D `.glb` mesh for any garment using the TripoSR neural engine.

### 8.1 Trigger 3D Model Generation
- **Method:** `POST`
- **Path:** `/api/wardrobe/generate-3d/:id` *(alias: `/api/wardrobe/items/:id/generate-3d`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "3D model generation completed",
  "data": {
    "itemId": "67b12345abcdef0123456789",
    "status": "COMPLETED",
    "modelUrl": "http://localhost:8083/uploads/models/garment_987654.glb"
  }
}
```
*Mobile Viewers:* Render `.glb` URL using Flutter `model_viewer_plus`, React Native `@react-three/fiber` / Google `<model-viewer>`, or native SceneView.

---

## ✨ Series 9: Smart AI Outfit Recommendations & Styling

Recommends harmonious outfit combinations using available clothes. Clothes currently in laundry (`status: 'INACTIVE'`) are automatically excluded.

### 9.1 Generate Outfit Suggestions
- **Method:** `POST`
- **Path:** `/api/outfit/suggest` *(alias: `/api/outfit/generate`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "occasion": "CASUAL",
  "season": "SUMMER",
  "weather": "Sunny, 30°C",
  "wardrobeId": "6ac8e4471dd51c1c79a52e6d"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Outfit suggestions generated successfully",
  "data": {
    "outfits": [
      {
        "outfitId": "outfit_rec_1",
        "score": 0.95,
        "stylingAdvice": "Navy Linen Shirt pairs cleanly with Beige Chinos for a sharp summer casual vibe.",
        "upperWear": {
          "_id": "67b12345abcdef0123456789",
          "name": "Navy Blue Linen Shirt",
          "color": "Navy Blue",
          "imageUrl": "http://localhost:8083/uploads/garment_987654.png"
        },
        "lowerWear": {
          "_id": "67b98765fedcba9876543210",
          "name": "Beige Slim Chinos",
          "color": "Beige",
          "imageUrl": "http://localhost:8083/uploads/garment_112233.png"
        },
        "footwear": null,
        "occasion": "CASUAL"
      }
    ]
  }
}
```

---

### 9.2 Save Favorite Outfit
- **Method:** `POST`
- **Path:** `/api/outfit/save`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "name": "My Go-To Summer Office Look",
  "upperWearId": "67b12345abcdef0123456789",
  "lowerWearId": "67b98765fedcba9876543210",
  "occasion": "CASUAL"
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Outfit saved to favorites",
  "data": {
    "_id": "67c99887766554433221100f",
    "name": "My Go-To Summer Office Look",
    "createdAt": "2026-02-18T16:00:00.000Z"
  }
}
```

---

### 9.3 Get Saved Outfits
- **Method:** `GET`
- **Path:** `/api/outfit/saved`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Saved outfits retrieved",
  "data": [
    {
      "_id": "67c99887766554433221100f",
      "name": "My Go-To Summer Office Look",
      "upperWear": { ... },
      "lowerWear": { ... },
      "occasion": "CASUAL"
    }
  ]
}
```

---

### 9.4 Delete Saved Outfit
- **Method:** `DELETE`
- **Path:** `/api/outfit/saved/:id`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Saved outfit deleted successfully"
}
```

---

## 🏷️ Series 10: Service Categories & Live Rate Card Discovery

Categories (e.g. *Washerman*, *Doodh Wala*, *Tailor*) and services are 100% dynamic and live from MongoDB.

### 10.1 Get Vendor Categories (With Storage Scoping)
- **Method:** `GET`
- **Path:** `/api/categories`
- **Direct Storage Scoped Route:** `GET /api/categories?storeType=WARDROBE`
- **Auth Required:** `No (Public)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor categories retrieved successfully",
  "data": [
    {
      "_id": "6ad35971b52d7dd7d79f7035",
      "name": "Washerman",
      "code": "WASHERMAN",
      "icon": "🧺",
      "description": "Laundry, Dry Cleaning & Garment Care",
      "imageUrl": "http://localhost:8083/uploads/category_washerman.png",
      "storeTypes": ["WARDROBE"],
      "services": [
        {
          "_id": "6ad89efdcb41a2627aecb421",
          "name": "dry",
          "code": "DRY",
          "price": 40,
          "isActive": true
        },
        {
          "_id": "6ad9a687e02e82bf9aaf7444",
          "name": "iron and press",
          "code": "IRON_AND_PRESS",
          "price": 20,
          "isActive": true
        }
      ]
    }
  ]
}
```

---

### 10.2 Get Services for a Specific Category
- **Method:** `GET`
- **Path:** `/api/services?category=Washerman` *(or `/api/categories/:categoryId/services`)*
- **Auth Required:** `No (Public)`

#### Success Response (`200 OK`)
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
      "price": 40,
      "isActive": true,
      "categoryName": "Washerman"
    },
    {
      "_id": "6ad9a687e02e82bf9aaf7444",
      "name": "iron and press",
      "code": "IRON_AND_PRESS",
      "price": 20,
      "isActive": true,
      "categoryName": "Washerman"
    }
  ]
}
```

---

## 🧺 Series 11: Work Orders & Payments (Customer Dispatch)

Allows customers to select dresses, assign services and rates to each dress, schedule pickup, and dispatch a branded PDF work order slip to the vendor via WhatsApp.

### 11.1 Vendor Lookup (Check Phone & Load Rate Card)
- **Method:** `GET`
- **Path:** `/api/laundry/vendors/lookup?phone=9876543210`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor found",
  "data": {
    "isRegistered": true,
    "vendor": {
      "id": "67b889900aabbccddeeff001",
      "vendorId": "VND-4081",
      "name": "Ramu Dhobi",
      "businessName": "CleanWash Express",
      "phone": "9876543210",
      "rating": 4.9,
      "services": [
        { "name": "dry", "code": "DRY", "price": 40, "isOffered": true },
        { "name": "iron and press", "code": "IRON_AND_PRESS", "price": 20, "isOffered": true }
      ]
    }
  }
}
```

---

### 11.2 List Eligible Area Partners
- **Method:** `GET`
- **Path:** `/api/laundry/vendors/eligible?category=Washerman`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Eligible partners retrieved successfully",
  "data": [
    {
      "_id": "67b889900aabbccddeeff001",
      "vendorId": "VND-4081",
      "name": "Ramu Dhobi",
      "businessName": "CleanWash Express",
      "phone": "9876543210",
      "rating": 4.9,
      "services": [ ... ]
    }
  ]
}
```

---

### 11.3 Create Work Order (Multi-Garment with Per-Dress Care)
Places order, marks selected garments as `status: 'INACTIVE'`, renders PDF invoice, and dispatches via WhatsApp.

- **Method:** `POST`
- **Path:** `/api/laundry/orders`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "vendorPhone": "9876543210",
  "vendorName": "CleanWash Express",
  "orderCategory": "Washerman",
  "pickupDate": "2026-02-19T09:00:00.000Z",
  "expectedDeliveryDate": "2026-02-21T18:00:00.000Z",
  "specialInstructions": "Handle silk kurta gently",
  "items": [
    {
      "wardrobeItemId": "67b12345abcdef0123456789",
      "serviceType": "IRON",
      "serviceName": "iron and press",
      "price": 20,
      "specialInstructions": "Starch the collar"
    },
    {
      "wardrobeItemId": "67c11223344556677889900a",
      "serviceType": "DRY_CLEAN",
      "serviceName": "dry",
      "price": 40
    }
  ]
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Work Order created successfully and sent to vendor via WhatsApp",
  "data": {
    "_id": "67c3344556677889900aabbc",
    "orderNumber": "ORD-2026-0042",
    "status": "PENDING_PICKUP",
    "vendorName": "CleanWash Express",
    "vendorPhone": "9876543210",
    "totalGarments": 2,
    "totalCost": 60,
    "pdfUrl": "http://localhost:8083/uploads/order_ORD-2026-0042.pdf",
    "createdAt": "2026-02-18T17:30:00.000Z"
  }
}
```

---

### 11.4 List User Work Orders
- **Method:** `GET`
- **Path:** `/api/laundry/orders`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Query Parameters:** `status`, `category`, `page`, `limit`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "67c3344556677889900aabbc",
        "orderNumber": "ORD-2026-0042",
        "status": "PENDING_PICKUP",
        "vendorName": "CleanWash Express",
        "vendorPhone": "9876543210",
        "totalGarments": 2,
        "totalCost": 60,
        "pdfUrl": "http://localhost:8083/uploads/order_ORD-2026-0042.pdf"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

---

### 11.5 Get Work Order Details
- **Method:** `GET`
- **Path:** `/api/laundry/orders/:id`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work order details retrieved",
  "data": {
    "order": {
      "_id": "67c3344556677889900aabbc",
      "orderNumber": "ORD-2026-0042",
      "status": "DELIVERED",
      "totalGarments": 2,
      "totalCost": 60,
      "payment": { "status": "PAID", "paidAt": "2026-02-21T10:00:00.000Z" },
      "items": [ ... ],
      "timeline": [ ... ]
    }
  }
}
```

---

### 11.6 Cancel Work Order
Reverts garments from `INACTIVE` back to `ACTIVE`.

- **Method:** `PATCH`
- **Path:** `/api/laundry/orders/:id/status`
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "status": "CANCELLED",
  "note": "Customer cancelled before pickup"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order cancelled successfully and garments restored to active wardrobe",
  "data": {
    "_id": "67c3344556677889900aabbc",
    "status": "CANCELLED"
  }
}
```

---

### 11.7 Update Order Payment Status
Allows customer to mark payment as `PAID` (available when order is `DELIVERED` or `PARTIALLY_DELIVERED`).

- **Method:** `PATCH`
- **Path:** `/api/orders/:id/payment` *(alias: `/api/laundry/orders/:id/payment`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "status": "PAID",
  "note": "Paid via UPI / Cash"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order payment marked as PAID successfully",
  "data": {
    "order": {
      "_id": "67c3344556677889900aabbc",
      "orderNumber": "ORD-2026-0042",
      "payment": {
        "status": "PAID",
        "paidAt": "2026-02-21T10:00:00.000Z",
        "updatedBy": "USER"
      }
    }
  }
}
```

---

### 11.8 Get Customer Order Transactions Ledger
- **Method:** `GET`
- **Path:** `/api/orders/transactions?status=ALL&page=1&limit=20`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Order transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "_id": "67c445566778899aabbcc001",
        "transactionNumber": "TXN-20261023-0001",
        "orderNumber": "ORD-2026-0042",
        "amount": 60,
        "status": "PAID",
        "paidAt": "2026-02-21T10:00:00.000Z"
      }
    ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

---

### 11.9 Download Work Order Invoice PDF
- **Method:** `GET`
- **Path:** `/api/orders/:id/pdf` *(alias: `/api/laundry/orders/:id/pdf`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Response Format:** Binary `application/pdf` stream

---

## 🔔 Series 12: Push Notifications (FCM) & In-App Alerts

### 12.1 FCM Deep-Link Routing Map

| `data.type` | Target Mobile Screen | Action |
|---|---|---|
| `LAUNDRY_ORDER_STATUS` | Order Detail Screen | View latest status of work order |
| `GARMENT_3D_COMPLETED` | 3D Interactive Mesh Viewer | View 3D garment |
| `WARDROBE_DIGITIZED` | Almari Screen | View freshly extracted clothes |

---

### 12.2 Register Device Push Token
- **Method:** `POST`
- **Path:** `/api/notifications/device-token` *(alias: `/api/auth/device-token`)*
- **Auth Required:** `Yes (Bearer <TOKEN>)`
- **Content-Type:** `application/json`

#### Request Body
```json
{
  "token": "dK_3f9z...fcm_registration_token...",
  "platform": "ANDROID",
  "deviceId": "unique_hardware_uuid",
  "deviceModel": "Google Pixel 8",
  "appVersion": "1.2.0"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Device token registered successfully"
}
```

---

### 12.3 Get In-App Notifications
- **Method:** `GET`
- **Path:** `/api/notifications?page=1&limit=20&unreadOnly=false`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "_id": "67d11223344556677889900a",
        "title": "Laundry In Progress",
        "body": "CleanWash Express has started processing your garments.",
        "type": "LAUNDRY_ORDER_STATUS",
        "isRead": false,
        "createdAt": "2026-02-18T18:00:00.000Z"
      }
    ],
    "unreadCount": 1
  }
}
```

---

### 12.4 Mark Notification as Read
- **Method:** `PATCH`
- **Path:** `/api/notifications/:id/read`
- **Auth Required:** `Yes (Bearer <TOKEN>)`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification marked as read"
}
```

---

## 🖼️ Series 13: Image & Media URL Resolution Protocol

The backend returns full URLs (`http://localhost:8083/uploads/abc.png`) or relative paths (`/uploads/abc.png`).
Use this standard utility across your mobile app:

### Flutter / Dart:
```dart
import 'dart:io';

String resolveMediaUrl(String? path, {String baseUrl = 'http://localhost:8083'}) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (Platform.isAndroid && path.contains('localhost')) {
      return path.replaceAll('localhost', '10.0.2.2');
    }
    return path;
  }
  final cleanBase = baseUrl.replaceAll(RegExp(r'/api/?$'), '');
  final cleanPath = path.startsWith('/') ? path : '/$path';
  return '$cleanBase$cleanPath';
}
```

### React Native / TypeScript:
```typescript
import { Platform } from 'react-native';

export function resolveMediaUrl(path?: string, baseUrl = 'http://localhost:8083'): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    if (Platform.OS === 'android' && path.includes('localhost')) {
      return path.replace('localhost', '10.0.2.2');
    }
    return path;
  }
  const cleanBase = baseUrl.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
```

---

## 🚀 Series 14: Ready-to-Use Mobile Integration Clients

### Flutter / Dart (`dio` Client)

```dart
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ArangtikApiClient {
  static final String baseUrl = Platform.isAndroid 
      ? 'http://10.0.2.2:8083/api' 
      : 'http://localhost:8083/api';

  final Dio _dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
  ));

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  ArangtikApiClient() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException error, handler) async {
        if (error.response?.statusCode == 401) {
          await _storage.delete(key: 'jwt_token');
        }
        return handler.next(error);
      },
    ));
  }

  // 1. Send OTP
  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final res = await _dio.post('/auth/send-otp', data: {'phone': phone});
    return res.data;
  }

  // 2. Verify OTP
  Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String otp,
    String? fcmToken,
  }) async {
    final res = await _dio.post('/auth/verify-otp', data: {
      'phone': phone,
      'otp': otp,
      'fcmToken': fcmToken,
      'platform': Platform.isAndroid ? 'ANDROID' : 'IOS',
    });
    final token = res.data['data']['token'];
    await _storage.write(key: 'jwt_token', value: token);
    return res.data;
  }

  // 3. Get Store Types
  Future<List<dynamic>> getStoreTypes() async {
    final res = await _dio.get('/store-types');
    return res.data['data'];
  }

  // 4. Get User Wardrobes (defaults to WARDROBE)
  Future<List<dynamic>> getWardrobes() async {
    final res = await _dio.get('/wardrobe/get-wardrobes');
    return res.data['data'];
  }

  // 5. Add Garment Photo to Almari
  Future<Map<String, dynamic>> addGarment({
    required File photoFile,
    String? wardrobeId,
    bool forceAdd = false,
  }) async {
    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(photoFile.path),
      if (wardrobeId != null) 'wardrobeId': wardrobeId,
      'forceAdd': forceAdd.toString(),
    });
    final res = await _dio.post('/wardrobe/add-item', data: formData);
    return res.data;
  }

  // 6. List Wardrobe Clothes
  Future<Map<String, dynamic>> getWardrobeItems({String? wardrobeId, int page = 1}) async {
    final res = await _dio.get('/wardrobe/get-items', queryParameters: {
      if (wardrobeId != null) 'wardrobeId': wardrobeId,
      'page': page,
    });
    return res.data['data'];
  }

  // 7. Create Work Order
  Future<Map<String, dynamic>> createOrder(Map<String, dynamic> payload) async {
    final res = await _dio.post('/laundry/orders', data: payload);
    return res.data;
  }
}
```

---

### React Native / TypeScript (`axios` Client)

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:8083/api' 
  : 'http://localhost:8083/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('jwt_token');
    }
    return Promise.reject(error);
  }
);

// 1. Send OTP
export const sendOtp = (phone: string) => 
  api.post('/auth/send-otp', { phone }).then(res => res.data);

// 2. Verify OTP
export const verifyOtp = async (phone: string, otp: string, fcmToken?: string) => {
  const res = await api.post('/auth/verify-otp', {
    phone,
    otp,
    fcmToken,
    platform: Platform.OS.toUpperCase(),
  });
  const token = res.data.data.token;
  await SecureStore.setItemAsync('jwt_token', token);
  return res.data;
};

// 3. Get Store Types
export const getStoreTypes = () =>
  api.get('/store-types').then(res => res.data.data);

// 4. Get User Wardrobes (defaults to WARDROBE)
export const getWardrobes = () =>
  api.get('/wardrobe/get-wardrobes').then(res => res.data.data);

// 5. Add Garment Photo to Almari
export const addGarment = async (fileUri: string, wardrobeId?: string, forceAdd = false) => {
  const formData = new FormData();
  formData.append('photo', {
    uri: fileUri,
    type: 'image/jpeg',
    name: 'garment.jpg',
  } as any);
  if (wardrobeId) formData.append('wardrobeId', wardrobeId);
  formData.append('forceAdd', String(forceAdd));

  const res = await api.post('/wardrobe/add-item', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// 6. List Wardrobe Clothes
export const getWardrobeItems = (params?: { wardrobeId?: string; page?: number }) =>
  api.get('/wardrobe/get-items', { params }).then(res => res.data.data);

// 7. Create Work Order
export const createOrder = (payload: any) =>
  api.post('/laundry/orders', payload).then(res => res.data);
```

---

## 📋 Integration Verification Checklist

- [ ] **Base URL Setup:** Set Android emulator to `http://10.0.2.2:8083/api` and iOS/Web to `http://localhost:8083/api`.
- [ ] **Auth Token Storage:** Store JWT in secure storage (`flutter_secure_storage` / `expo-secure-store`).
- [ ] **Strict PATCH Rule:** Use `PATCH` for any update endpoint (e.g. `PATCH /api/auth/profile`, `PATCH /api/wardrobe/edit-item/:id`, `PATCH /api/orders/:id/payment`). Never use `PUT`.
- [ ] **Wardrobe Separation:** `GET /api/wardrobe/get-wardrobes` returns only the user's Wardrobes (Almaris).
- [ ] **Status Guardrail:** Items with `status: 'INACTIVE'` are currently in laundry; disable selection for outfit styling or new orders until delivered.
- [ ] **FCM Registration:** Provide `fcmToken` in `POST /api/auth/verify-otp` and handle deep links via `data.type`.

---

## 📊 Mobile App Integration Action Report (Monika Rathore / SummaryApi Audit)

This audit report compares the Mobile App's current `SummaryApi` configuration directly with the Backend API contract. Use the tables below to identify exactly what to integrate, what backend fixes were made, and which endpoints are already 100% matched.

---

### 1. 🚨 Naye Endpoints Jo Mobile App Me Add / Integrate Karne Hain

Yeh endpoints Backend me live hain aur Mobile App ke `SummaryApi` me missing hain. Inhe app ke `SummaryApi` me add karein:

| # | Key Name (App Me Add Karein) | Method | Backend URL Path | Purpose / Description | Action Required |
|:--|:-----------------------------|:------:|:-----------------|:----------------------|:----------------|
| 1 | `getStoreTypes` | `GET` | `/store-types` | Multi-store list (Wardrobe, Kitchen, etc.) fetch karne ke liye | Add to `SummaryApi` & Store selector screen me bind karein |
| 2 | `updateOrderPayment` | `PATCH` | `/orders/:id/payment` | Payment success / status update karne ke liye (`PUT` use na karein) | Add to `SummaryApi` & Razorpay/Online payment callback me call karein |
| 3 | `getOrderTransactions` | `GET` | `/orders/transactions` | All payment transactions history dekhne ke liye | Add to `SummaryApi` & Wallet/Transactions tab me use karein |
| 4 | `getOrderPdf` | `GET` | `/orders/:id/pdf` | Order invoice / receipt PDF download/view karne ke liye | Add to `SummaryApi` & Order details screen pe "Download Invoice" button bind karein |
| 5 | `getSingleOrderTransactions` | `GET` | `/orders/:id/transactions` | Ek specific order ki transaction history dekhne ke liye | Add to `SummaryApi` & Order detail page ke payment section me bind karein |
| 6 | `getCategoryServices` | `GET` | `/categories/:id/services` | Category ke specific available laundry services fetch karne ke liye | (Optional) Category-wise service filtering ke liye add karein |

---

### 2. ⚙️ Backend Endpoints Jo Fix / Optimize Ho Chuke Hain (App ke Sath 100% Compatible)

In endpoints me mobile app ki compatibility aur user request ke anusar backend me update aur validation confirm kar di gayi hai:

| # | Key Name in App | Method | Endpoint URL Path | Backend Fix / Status | Mobile App Impact |
|:--|:----------------|:------:|:------------------|:---------------------|:------------------|
| 1 | `deleteWardrobe` | `DELETE` | `/wardrobe/delete-wardrobe/:id` | Backend me dedicated route `/wardrobe/delete-wardrobe/:id` add kar diya gaya hai. Jab wardrobe delete hota hai to clothes safe rehte hain (default Almari me migrate ho jate hain). | Mobile app ko code change karne ki zaroorat nahi hai; direct call karein. |
| 2 | `getWardrobes` | `GET` | `/wardrobe/get-wardrobes` | Ab yeh API **strictly default `storeType: 'WARDROBE'`** filter karti hai. Kitchen ya other store types isme mix nahi honge, aur real-time accurate `itemCount` calculate hoke aayega. | Wardrobe list me sirf Almari/Closets aayenge, kitchen storage nahi aayega. |
| 3 | `getEligibleVendors` | `GET` | `/laundry/vendors/eligible` | Pincode / geolocation ke hisab se order deliver karne wale eligible partners fetch karta hai. | User app ke laundry flow me delivery estimate ya vendor info dikhane ke liye use karein. |

---

### 3. ✅ Existing Endpoints Audit Matrix (SummaryApi vs Backend)

Niche di gayi table me Monika Rathore ke `SummaryApi` ke sabhi existing endpoints ka Backend verification status hai:

| Series | App Function / Key | Method | Backend URL Path | Verification Status |
|:-------|:-------------------|:------:|:-----------------|:-------------------:|
| **Series 1** | `healthCheck` | `GET` | `/health` | ✅ 100% Match |
| **Series 2** | `sendOtp` | `POST` | `/auth/send-otp` | ✅ 100% Match |
| **Series 2** | `verifyOtp` | `POST` | `/auth/verify-otp` | ✅ 100% Match |
| **Series 2** | `getProfile` | `GET` | `/auth/profile` | ✅ 100% Match |
| **Series 2** | `updateProfile` | `PATCH` | `/auth/profile` | ✅ 100% Match (Strict PATCH) |
| **Series 2** | `uploadProfileImage` | `POST` | `/auth/profile-image` | ✅ 100% Match (multipart) |
| **Series 2** | `logout` | `POST` | `/auth/logout` | ✅ 100% Match |
| **Series 3** | `registerFace` | `POST` | `/face-recognition/register` | ✅ 100% Match |
| **Series 3** | `verifyFace` | `POST` | `/face-recognition/verify` | ✅ 100% Match |
| **Series 3** | `faceStatus` | `GET` | `/face-recognition/status` | ✅ 100% Match |
| **Series 3** | `deleteFace` | `DELETE` | `/face-recognition/reference` | ✅ 100% Match |
| **Series 4** | `addAddress` | `POST` | `/addresses` | ✅ 100% Match |
| **Series 4** | `getAddresses` | `GET` | `/addresses` | ✅ 100% Match |
| **Series 4** | `updateAddress` | `PATCH` | `/addresses/:id` | ✅ 100% Match |
| **Series 4** | `deleteAddress` | `DELETE` | `/addresses/:id` | ✅ 100% Match |
| **Series 4** | `setDefaultAddress` | `PATCH` | `/addresses/:id/default` | ✅ 100% Match |
| **Series 5** | `createWardrobe` | `POST` | `/wardrobe/add-wardrobe` | ✅ 100% Match |
| **Series 5** | `getWardrobes` | `GET` | `/wardrobe/get-wardrobes` | ✅ 100% Match (Filtered to WARDROBE) |
| **Series 5** | `updateWardrobe` | `PATCH` | `/wardrobe/edit-wardrobe/:id` | ✅ 100% Match |
| **Series 5** | `deleteWardrobe` | `DELETE` | `/wardrobe/delete-wardrobe/:id` | ✅ 100% Match (Backend Route Live) |
| **Series 6** | `createClothingItem` | `POST` | `/wardrobe/add-item` | ✅ 100% Match (multipart) |
| **Series 6** | `getClothingItems` | `GET` | `/wardrobe/get-items` | ✅ 100% Match |
| **Series 6** | `getClothingItemDetails`| `GET` | `/wardrobe/get-item/:id` | ✅ 100% Match |
| **Series 6** | `updateClothingItem` | `PATCH` | `/wardrobe/edit-item/:id` | ✅ 100% Match |
| **Series 6** | `deleteClothingItem` | `DELETE` | `/wardrobe/delete-item/:id` | ✅ 100% Match |
| **Series 6** | `getClothTypes` | `GET` | `/wardrobe/meta/cloth-types` | ✅ 100% Match |
| **Series 6** | `getCategories` | `GET` | `/categories` | ✅ 100% Match |
| **Series 7** | `getOccasions` | `GET` | `/wardrobe/meta/occasions` | ✅ 100% Match |
| **Series 7** | `createOutfit` | `POST` | `/wardrobe/outfits` | ✅ 100% Match |
| **Series 7** | `getOutfits` | `GET` | `/wardrobe/outfits` | ✅ 100% Match |
| **Series 7** | `getOutfitDetails` | `GET` | `/wardrobe/outfits/:id` | ✅ 100% Match |
| **Series 7** | `updateOutfit` | `PATCH` | `/wardrobe/outfits/:id` | ✅ 100% Match |
| **Series 7** | `deleteOutfit` | `DELETE` | `/wardrobe/outfits/:id` | ✅ 100% Match |
| **Series 8** | `getServices` | `GET` | `/laundry/services` | ✅ 100% Match |
| **Series 8** | `getClothingRates` | `GET` | `/laundry/clothing-rates` | ✅ 100% Match |
| **Series 8** | `getPricingSummary` | `POST` | `/laundry/pricing-summary` | ✅ 100% Match |
| **Series 9** | `createOrder` | `POST` | `/laundry/orders` | ✅ 100% Match |
| **Series 9** | `getOrders` | `GET` | `/laundry/orders` | ✅ 100% Match |
| **Series 9** | `getOrderDetails` | `GET` | `/laundry/orders/:id` | ✅ 100% Match |
| **Series 9** | `cancelOrder` | `POST` | `/laundry/orders/:id/cancel` | ✅ 100% Match |
| **Series 9** | `trackOrder` | `GET` | `/laundry/orders/:id/track` | ✅ 100% Match |
| **Series 10** | `getEligibleVendors` | `GET` | `/laundry/vendors/eligible` | ✅ 100% Match |
| **Series 11** | `getNotifications` | `GET` | `/notifications` | ✅ 100% Match |
| **Series 11** | `markNotificationRead`| `PATCH` | `/notifications/:id/read` | ✅ 100% Match |
| **Series 11** | `markAllNotificationsRead`| `PATCH` | `/notifications/read-all` | ✅ 100% Match |
| **Series 11** | `getUnreadNotificationCount`| `GET` | `/notifications/unread-count` | ✅ 100% Match |
| **Series 12** | `submitFeedback` | `POST` | `/feedback` | ✅ 100% Match |
| **Series 13** | `getPrivacyPolicy` | `GET` | `/legal/privacy-policy` | ✅ 100% Match |
| **Series 13** | `getTermsConditions`| `GET` | `/legal/terms` | ✅ 100% Match |
| **Series 13** | `getFaq` | `GET` | `/legal/faq` | ✅ 100% Match |

---

### 4. 💻 Copy-Paste Code Snippet For Mobile App (`SummaryApi`)

Mobile app developer Monika Rathore apne `SummaryApi` object me yeh missing block add kar sakti hain:

```javascript
// ==========================================
// NEW MISSING ENDPOINTS TO ADD TO SummaryApi
// ==========================================

// Store Types (Multi-Store Support)
getStoreTypes: {
  url: `${API_ROOT}/store-types`,
  method: 'GET',
},

// Order Payments & Transactions
updateOrderPayment: (id) => ({
  url: `${API_ROOT}/orders/${id}/payment`,
  method: 'PATCH',
}),
getOrderTransactions: {
  url: `${API_ROOT}/orders/transactions`,
  method: 'GET',
},
getSingleOrderTransactions: (id) => ({
  url: `${API_ROOT}/orders/${id}/transactions`,
  method: 'GET',
}),
getOrderPdf: (id) => ({
  url: `${API_ROOT}/orders/${id}/pdf`,
  method: 'GET',
}),

// Category Specific Services (Optional)
getCategoryServices: (id) => ({
  url: `${API_ROOT}/categories/${id}/services`,
  method: 'GET',
}),
```

