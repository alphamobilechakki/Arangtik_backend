# Arangtik Backend API Documentation & Developer Integration Guide

**Base URL:** `http://localhost:8085/api` (or `/api/v1/`)

---

# 🚀 STEP-BY-STEP DEVELOPER INTEGRATION ROADMAP

Frontend / Client application ko in steps me APIs ko call karna chahiye:

```text
========================================================================================
[STEP 1] AUTHENTICATION ──────► POST /api/auth/send-otp -> POST /api/auth/verify-otp (Get JWT Token)
                                      │
[STEP 2] PROFILE & REFERENCE ──► User Profile Image Upload -> POST /api/face-recognition/reference
                                      │
[STEP 3] SMART GALLERY SCAN ───► POST /api/face-recognition/scan (Detect & Match User Face)
                                      │
[STEP 4] AUTO WARDROBE INGEST ─► POST /api/wardrobe/ingest-gallery (Face Match -> AI Clothes -> Store)
                                      │
[STEP 5] WARDROBE MANAGEMENT ──► GET /api/wardrobe/get-all-items -> PATCH /api/wardrobe/update-item
                                      │
[STEP 6] DAILY WEAR & STYLING ─► POST /api/wardrobe/log-worn-dress -> POST /api/wardrobe/suggest-outfit
                                      │
[STEP 7] ITEM LENDING & RETURN ─► POST /api/wardrobe/lend-item -> PATCH /api/wardrobe/return-lent-item
========================================================================================
```

---

# ========================================================================
# ==================== STEP 0: SERVER HEALTH & STATUS ====================
# ========================================================================

## 1. Health Check

### Endpoint: `/api/health` (or `/api/v1/health`)
- **Method:** `GET`
- **Description:** Server status aur health check karne ke liye.
- **Access:** Public

#### Request:
- **Headers:** None
- **Body:** None

#### Response:
**200 OK:**
```json
{
  "status": "ok",
  "message": "Arangtik Backend API is healthy"
}
```

---

# ========================================================================
# ==================== STEP 1: AUTHENTICATION & LOGIN ====================
# ========================================================================

## 2. Auth Module

### 2.1 Send OTP
- **Method:** `POST`
- **Endpoint:** `/api/auth/send-otp`
- **Description:** WhatsApp par 4-digit OTP bhejta hai aur check karta hai ki user registered hai ya new.
- **Access:** Public

#### Request:
- **Headers:**
  - `Content-Type: application/json`
- **Body:**
```json
{
  "phone": "9876543210"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | Yes | 10-digit mobile number |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "phone": "919876543210",
    "isExistingUser": false,
    "expiresInMinutes": 5,
    "devOtp": "4821"
  },
  "message": "OTP sent successfully to your WhatsApp number",
  "success": true
}
```

**400 Bad Request (Validation Error):**
```json
{
  "statusCode": 400,
  "message": "Please provide a valid 10-digit mobile number",
  "success": false
}
```

---

### 2.2 Verify OTP
- **Method:** `POST`
- **Endpoint:** `/api/auth/verify-otp`
- **Description:** OTP verify karta hai, new user ko register karta hai (agar user exist nahi karta), aur JWT auth token return karta hai.
- **Access:** Public

#### Request:
- **Headers:**
  - `Content-Type: application/json`
- **Body:**
```json
{
  "phone": "9876543210",
  "otp": "4821",
  "name": "Rahul Sharma"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | Yes | 10-digit mobile number |
| `otp` | `string` | Yes | 4-digit OTP |
| `name` | `string` | Optional | User ka name (new user ke case me save hota hai) |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Rahul Sharma",
      "phone": "919876543210",
      "role": "user",
      "status": "active"
    },
    "isNewUser": true
  },
  "message": "Authentication successful",
  "success": true
}
```

**400 Bad Request (Invalid or Expired OTP):**
```json
{
  "statusCode": 400,
  "message": "Invalid or expired OTP",
  "success": false
}
```

**403 Forbidden (Blocked User):**
```json
{
  "statusCode": 403,
  "message": "Your account has been deactivated or blocked. Please contact support.",
  "success": false
}
```

---

### 2.3 Get Current User Profile
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Description:** Logged-in user ki profile details fetch karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Body:** None

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "phone": "919876543210",
    "name": "Rahul Sharma",
    "role": "user",
    "status": "active",
    "createdAt": "2026-09-26T10:00:00.000Z",
    "updatedAt": "2026-09-26T10:00:00.000Z"
  },
  "message": "User profile fetched successfully",
  "success": true
}
```

**401 Unauthorized (Token Missing / Invalid):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access, token missing",
  "success": false
}
```

**404 Not Found (User Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "success": false
}
```

---

### 2.4 Logout
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Description:** User session logout karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Body:** None

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "Logged out successfully",
  "success": true
}
```

**401 Unauthorized (Token Missing / Invalid):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access, token missing",
  "success": false
}
```

---

# ========================================================================
# ================= STEP 5: DIGITAL WARDROBE STORE MANAGEMENT ===========
# ========================================================================

## 3. Wardrobe Store Module

### 3.1 Scan Gallery Photo (User Face Identification & Garment Extraction)
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/scan-gallery-photo`
- **Description:** Scans a user's gallery photo, determines if the authenticated user (`req.user.id`) is present using their reference face embedding, and if matched, extracts only the clothing worn by that user with background removal segmentation (transparent WebP) and duplicate similarity matching. If user is not found, extraction is cleanly skipped.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: multipart/form-data`
- **Form Data (Multipart):**
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` / `image` | `file` | Yes | Uploaded gallery photo file (JPEG, PNG, WebP) |
| `threshold` | `number` | No | Optional custom Euclidean distance threshold (Default: `0.50`) |

#### Response:
**200 OK (User Matched & Clothing Extracted):**
```json
{
  "statusCode": 200,
  "data": {
    "matched": true,
    "matchedFace": {
      "confidence": 0.9999,
      "similarity": 1.0,
      "distance": 0,
      "boundingBox": {
        "x": 420,
        "y": 180,
        "width": 160,
        "height": 160
      }
    },
    "facesDetected": 1,
    "originalImageUrl": "/uploads/photo-1790938133930.png",
    "detectedItemsCount": 1,
    "items": [
      {
        "tempDetectionId": "det_1",
        "name": "Navy Blue Slim Fit Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/seg-0-1790943556926.webp",
        "croppedFilename": "seg-0-1790943556926.webp",
        "attributes": {
          "primaryColor": "Navy Blue",
          "pattern": "SOLID",
          "fabric": "LINEN",
          "fit": "SLIM_FIT",
          "occasions": ["CASUAL", "FORMAL"]
        },
        "matchType": "NEW_ITEM",
        "matchedItem": null,
        "matchResult": {
          "status": "NEW_ITEM",
          "confidenceScore": 0,
          "message": "New dress detected! Ready to add to wardrobe.",
          "candidateMatches": []
        }
      }
    ]
  },
  "message": "User matched successfully! Extracted 1 clothing items.",
  "success": true
}
```

**200 OK (User Not Found in Photo):**
```json
{
  "statusCode": 200,
  "data": {
    "matched": false,
    "reason": "USER_NOT_FOUND",
    "facesDetected": 1,
    "originalImageUrl": "/uploads/photo-1790941677639.jpg",
    "items": []
  },
  "message": "User face not detected in this photo. Skipped clothing extraction.",
  "success": true
}
```

### 3.2 Analyze Photo (AI Clothing Recognition, Auto-Crop & Duplicate Matcher)
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/analyze-photo`
- **Description:** Gallery photo ya camera image upload karke usme pehni hui dress/clothes detect karta hai, unhe automatically crop karke visual image banata hai, aur user ke existing wardrobe gallery ke sath duplicate/similarity match check karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: multipart/form-data`
- **Form Data (Multipart):**
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` | `file` | Yes | Uploaded image file (JPEG, PNG, WebP) |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "originalImageUrl": "/uploads/photo-1790589292516-940780054.jpg",
    "detectedItemsCount": 2,
    "analysis": [
      {
        "tempDetectionId": "det_1",
        "name": "Blue Solid Casual Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/crop-1790589292535-0-2425.webp",
        "attributes": {
          "primaryColor": "Navy Blue",
          "secondaryColors": ["Dark Blue"],
          "pattern": "SOLID",
          "fabric": "LINEN",
          "gender": "MEN",
          "fit": "SLIM_FIT",
          "sleeveLength": "FULL_SLEEVE",
          "neckline": "Collar",
          "occasions": ["OFFICE", "FORMAL", "PARTY"],
          "seasons": ["SUMMER", "ALL_SEASON"]
        },
        "matchResult": {
          "status": "EXACT_MATCH",
          "confidenceScore": 1.0,
          "message": "This dress is already registered in your wardrobe as \"Navy Blue Formal Linen Shirt\".",
          "existingItem": {
            "_id": "6aba317270f26b72d852616f",
            "name": "Navy Blue Formal Linen Shirt",
            "category": "UPPER_WEAR",
            "subCategory": "Shirt",
            "primaryImageUrl": "https://images.arangtik.com/wardrobe/shirt_01.jpg",
            "currentStatus": "AVAILABLE",
            "wearCount": 0,
            "similarityScore": 1.0
          },
          "candidateMatches": []
        }
      },
      {
        "tempDetectionId": "det_2",
        "name": "Light Blue Denim Jeans",
        "category": "LOWER_WEAR",
        "subCategory": "Jeans",
        "croppedImageUrl": "/uploads/crops/crop-1790589292558-1-9800.webp",
        "attributes": {
          "primaryColor": "Light Blue",
          "secondaryColors": ["Blue"],
          "pattern": "SOLID",
          "fabric": "DENIM",
          "gender": "MEN",
          "fit": "REGULAR_FIT",
          "occasions": ["CASUAL", "DAILY"],
          "seasons": ["ALL_SEASON"]
        },
        "matchResult": {
          "status": "NEW_ITEM",
          "confidenceScore": 0.1,
          "message": "New dress detected! Ready to add to wardrobe.",
          "existingItem": null,
          "candidateMatches": []
        }
      }
    ]
  },
  "message": "Photo analyzed successfully with clothing recognition",
  "success": true
}
```

**400 Bad Request (No Image Uploaded):**
```json
{
  "statusCode": 400,
  "message": "Please upload an image to analyze",
  "success": false
}
```

**401 Unauthorized (Missing or Invalid Token):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access, token missing",
  "success": false
}
```

---

### 3.2 Add Item to Wardrobe Store
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/add-item`
- **Description:** User ke personal wardrobe store mein naya kapda ya item add karta hai with dynamic extensible attributes (Wardrobe, Kitchen, Electronics support).
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "name": "Navy Blue Formal Linen Shirt",
  "storeType": "WARDROBE",
  "category": "UPPER_WEAR",
  "subCategory": "Shirt",
  "images": [
    {
      "url": "https://images.arangtik.com/wardrobe/shirt_01.jpg",
      "isPrimary": true
    }
  ],
  "attributes": {
    "primaryColor": "Navy Blue",
    "secondaryColors": ["Dark Blue"],
    "pattern": "SOLID",
    "fabric": "LINEN",
    "gender": "MEN",
    "size": "40",
    "brand": "Zara",
    "fit": "SLIM_FIT",
    "sleeveLength": "FULL_SLEEVE",
    "neckline": "Collar",
    "occasions": ["OFFICE", "FORMAL", "PARTY"],
    "seasons": ["SUMMER", "ALL_SEASON"]
  },
  "storageLocation": {
    "storagePlace": "Master Bedroom Closet - Shelf 2"
  },
  "laundryCare": {
    "washTypePreferred": "HAND_WASH",
    "ironPreferred": true,
    "careInstructions": "Use mild liquid detergent and warm iron"
  },
  "tags": ["formal", "linen", "blue", "office"]
}
```

#### Request Body Fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Kapde / Item ka display name |
| `category` | `string` | Yes | Broad category (`UPPER_WEAR`, `LOWER_WEAR`, `TRADITIONAL`, `FOOTWEAR`, etc.) |
| `storeType` | `string` | Optional | Store department (`WARDROBE`, `KITCHEN`, `ELECTRONICS`, default: `WARDROBE`) |
| `subCategory` | `string` | Optional | Sub-type (`Shirt`, `Jeans`, `Kurta`, `Sneakers`, etc.) |
| `images` | `array` | Optional | Image objects (`url`, `isPrimary`, `embedding`) |
| `attributes` | `object` | Optional | Dynamic key-value bag (`primaryColor`, `fabric`, `pattern`, `fit`, etc.) |
| `currentStatus` | `string` | Optional | Initial status (default: `AVAILABLE`) |
| `storageLocation` | `object` | Optional | `{ storagePlace: "Closet Shelf 2" }` |
| `laundryCare` | `object` | Optional | `{ washTypePreferred: "HAND_WASH", ironPreferred: true }` |
| `tags` | `array` | Optional | Search keywords `["formal", "blue"]` |

#### Response:
**201 Created (Success):**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Navy Blue Formal Linen Shirt",
    "storeType": "WARDROBE",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "images": [
      {
        "url": "https://images.arangtik.com/wardrobe/shirt_01.jpg",
        "isPrimary": true,
        "embedding": [],
        "uploadedAt": "2026-09-28T09:20:50.123Z",
        "_id": "6aba317270f26b72d8526170"
      }
    ],
    "attributes": {
      "primaryColor": "Navy Blue",
      "secondaryColors": ["Dark Blue"],
      "pattern": "SOLID",
      "fabric": "LINEN",
      "gender": "MEN",
      "size": "40",
      "brand": "Zara",
      "fit": "SLIM_FIT",
      "sleeveLength": "FULL_SLEEVE",
      "neckline": "Collar",
      "occasions": ["OFFICE", "FORMAL", "PARTY"],
      "seasons": ["SUMMER", "ALL_SEASON"]
    },
    "currentStatus": "AVAILABLE",
    "currentLocation": {
      "storagePlace": "Master Bedroom Closet - Shelf 2"
    },
    "usageStats": {
      "wearCount": 0,
      "useCount": 0,
      "washCount": 0,
      "isFavorite": false
    },
    "laundryCare": {
      "washTypePreferred": "HAND_WASH",
      "ironPreferred": true,
      "careInstructions": "Use mild liquid detergent and warm iron"
    },
    "tags": ["formal", "linen", "blue", "office"],
    "createdAt": "2026-09-28T09:20:50.125Z",
    "updatedAt": "2026-09-28T09:20:50.125Z"
  },
  "message": "Item added successfully to wardrobe store",
  "success": true
}
```

**400 Bad Request (Validation Failure):**
```json
{
  "statusCode": 400,
  "message": "Item name and category are required",
  "success": false
}
```

**401 Unauthorized (Missing or Invalid Token):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access, token missing",
  "success": false
}
```

---

### 3.3 Get All Items from Wardrobe Store
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-all-items`
- **Description:** User ke wardrobe store ke sabhi kapdo aur items ki paginated list fetch karta hai (category, status, color, occasion, season, search query aur sorting ke sath).
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Query Parameters:**
| Parameter | Type | Required | Description | Example |
|---|---|---|---|---|
| `category` | `string` | No | Category filter | `UPPER_WEAR`, `LOWER_WEAR`, `TRADITIONAL` |
| `subCategory` | `string` | No | Sub-category name | `Shirt`, `Jeans`, `Kurta` |
| `status` | `string` | No | Operational status | `AVAILABLE`, `IN_LAUNDRY`, `DIRTY`, `LENT_OUT` |
| `color` | `string` | No | Primary color | `Blue`, `Black`, `White` |
| `occasion` | `string` | No | Occasion filter | `OFFICE`, `WEDDING`, `PARTY`, `CASUAL` |
| `season` | `string` | No | Season filter | `SUMMER`, `WINTER`, `ALL_SEASON` |
| `favorite` | `boolean` | No | Only favorite items | `true` |
| `search` | `string` | No | Keyword search (name, brand, tags) | `zara linen` |
| `sort` | `string` | No | Sort order | `newest`, `oldest`, `mostWorn`, `lastWorn` |
| `page` | `number` | No | Page number (default: 1) | `1` |
| `limit` | `number` | No | Items per page (default: 20) | `20` |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "_id": "6aba317270f26b72d852616f",
        "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Navy Blue Formal Linen Shirt",
        "storeType": "WARDROBE",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "images": [
          {
            "url": "https://images.arangtik.com/wardrobe/shirt_01.jpg",
            "isPrimary": true,
            "_id": "6aba317270f26b72d8526170"
          }
        ],
        "attributes": {
          "primaryColor": "Navy Blue",
          "secondaryColors": ["Dark Blue"],
          "pattern": "SOLID",
          "fabric": "LINEN",
          "gender": "MEN",
          "size": "40",
          "brand": "Zara",
          "fit": "SLIM_FIT",
          "sleeveLength": "FULL_SLEEVE",
          "neckline": "Collar",
          "occasions": ["OFFICE", "FORMAL", "PARTY"],
          "seasons": ["SUMMER", "ALL_SEASON"]
        },
        "currentStatus": "AVAILABLE",
        "currentLocation": {
          "storagePlace": "Master Bedroom Closet - Shelf 2"
        },
        "usageStats": {
          "wearCount": 0,
          "useCount": 0,
          "washCount": 0,
          "isFavorite": false
        },
        "createdAt": "2026-09-28T09:20:50.125Z"
      }
    ],
    "pagination": {
      "totalItems": 1,
      "totalPages": 1,
      "currentPage": 1,
      "limit": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "message": "Wardrobe items fetched successfully",
  "success": true
}
```

**401 Unauthorized (Missing or Invalid Token):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access, token missing",
  "success": false
}
```

---

### 3.4 Get Item Details by ID
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-item-details/:id`
- **Description:** Kisi specific kapde ya item ki complete details fetch karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **URL Parameters:**
  - `id`: Item ka MongoDB ObjectId (`6aba317270f26b72d852616f`)

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Navy Blue Formal Linen Shirt",
    "storeType": "WARDROBE",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "images": [
      {
        "url": "https://images.arangtik.com/wardrobe/shirt_01.jpg",
        "isPrimary": true,
        "_id": "6aba317270f26b72d8526170"
      }
    ],
    "attributes": {
      "primaryColor": "Navy Blue",
      "pattern": "SOLID",
      "fabric": "LINEN",
      "brand": "Zara"
    },
    "currentStatus": "AVAILABLE",
    "currentLocation": {
      "storagePlace": "Master Bedroom Closet - Shelf 2"
    },
    "usageStats": {
      "wearCount": 0,
      "useCount": 0,
      "washCount": 0,
      "isFavorite": false
    },
    "laundryCare": {
      "washTypePreferred": "HAND_WASH",
      "ironPreferred": true,
      "careInstructions": "Use mild liquid detergent and warm iron"
    },
    "tags": ["formal", "linen", "blue", "office"],
    "createdAt": "2026-09-28T09:20:50.125Z",
    "updatedAt": "2026-09-28T09:20:50.125Z"
  },
  "message": "Wardrobe item details fetched successfully",
  "success": true
}
```

**404 Not Found (Item Doesn't Exist):**
```json
{
  "statusCode": 404,
  "message": "Wardrobe item not found",
  "success": false
}
```

---

### 3.5 Update Wardrobe Item (Partial / Full Update)
- **Method:** `PATCH`
- **Endpoint:** `/api/wardrobe/update-item/:id`
- **Description:** Kisi existing wardrobe item ke name, category, subCategory, images, dynamic attributes, location, laundryCare, ya tags ko update karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **URL Parameters:**
  - `id`: Item ka MongoDB ObjectId
- **Body:**
```json
{
  "name": "Navy Blue Royal Linen Shirt (Updated)",
  "attributes": {
    "brand": "Zara Man Exclusive",
    "fit": "SLIM_FIT"
  },
  "storageLocation": {
    "storagePlace": "Master Bedroom Wardrobe - Top Shelf"
  },
  "tags": ["formal", "linen", "blue", "exclusive"]
}
```

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Navy Blue Royal Linen Shirt (Updated)",
    "storeType": "WARDROBE",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "attributes": {
      "primaryColor": "Navy Blue",
      "brand": "Zara Man Exclusive",
      "fit": "SLIM_FIT"
    },
    "currentLocation": {
      "storagePlace": "Master Bedroom Wardrobe - Top Shelf"
    },
    "updatedAt": "2026-09-28T09:58:20.123Z"
  },
  "message": "Wardrobe item updated successfully",
  "success": true
}
```

---

### 3.6 Update Item Operational Status
- **Method:** `PATCH`
- **Endpoint:** `/api/wardrobe/update-item-status/:id`
- **Description:** Item ka current operational status quick change karta hai (`AVAILABLE`, `IN_USE`, `DIRTY`, `IN_LAUNDRY`, `LENT_OUT`, `IN_REPAIR`, `ARCHIVED`).
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **URL Parameters:**
  - `id`: Item ka MongoDB ObjectId
- **Body:**
```json
{
  "status": "DIRTY"
}
```

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "name": "Navy Blue Royal Linen Shirt",
    "currentStatus": "DIRTY",
    "updatedAt": "2026-09-28T09:59:10.456Z"
  },
  "message": "Item status updated to DIRTY successfully",
  "success": true
}
```

---

### 3.7 Delete / Archive Item from Wardrobe Store
- **Method:** `DELETE`
- **Endpoint:** `/api/wardrobe/delete-item/:id`
- **Description:** Item ko soft-delete (status = `ARCHIVED`) karta hai, ya query param `permanent=true` bhejne par database se completely delete karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **URL Parameters:**
  - `id`: Item ka MongoDB ObjectId
- **Query Parameters:**
  - `permanent` (optional): `true` for permanent delete, omit/false for soft archive.

#### Response:
**200 OK (Soft Archive Success):**
```json
{
  "statusCode": 200,
  "data": {
    "deleted": true,
    "archived": true
  },
  "message": "Wardrobe item deleted/archived successfully",
  "success": true
}
```

**200 OK (Permanent Delete Success):**
```json
{
  "statusCode": 200,
  "data": {
    "deleted": true,
    "permanent": true
  },
  "message": "Wardrobe item deleted/archived successfully",
  "success": true
}
```

---

# ========================================================================
# ============ STEP 6: DAILY WEAR HISTORY & AI OUTFIT STYLIST ============
# ========================================================================

### 3.8 Log Worn Dress (Wear History & Frequency Tracking)
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/log-worn-dress`
- **Description:** User dwara pehni gayi dress/outfit ko wear history mein log karta hai aur automatically har selected item ka `wearCount` $+1$ aur `lastWornDate` update karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "itemIds": ["6aba317270f26b72d852616f"],
  "wornDate": "2026-09-28T10:00:00.000Z",
  "occasion": "OFFICE",
  "sourcePhotoUrl": "/uploads/my_photo_office.jpg",
  "location": "Corporate Office HQ",
  "notes": "Important client meeting presentation",
  "rating": 5,
  "markAsDirty": false
}
```

#### Request Body Fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `itemIds` | `array` | Yes | Pehne gaye items ke ObjectId array `["6aba3..."]` |
| `wornDate` | `string` | Optional | Date & time (ISO string, default: current time) |
| `occasion` | `string` | Optional | `OFFICE`, `WEDDING`, `PARTY`, `CASUAL`, `FESTIVE`, `TRAVEL`, `DATE`, `GYM` |
| `sourcePhotoUrl` | `string` | Optional | Reference photo link |
| `location` | `string` | Optional | Kahan pehna gaya |
| `notes` | `string` | Optional | User remarks |
| `rating` | `number` | Optional | Rating (1-5) |
| `markAsDirty` | `boolean` | Optional | Agar `true` bhejenge to items ka status `DIRTY` set ho jayega |

#### Response:
**201 Created (Success):**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "6aba3ac18b77f573062508b7",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "items": [
      {
        "itemId": "6aba317270f26b72d852616f",
        "name": "Navy Blue Royal Linen Shirt (Updated)",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "photoUrl": "https://images.arangtik.com/wardrobe/shirt_01.jpg",
        "_id": "6aba3ac18b77f573062508b8"
      }
    ],
    "wornDate": "2026-09-28T10:00:00.000Z",
    "occasion": "OFFICE",
    "sourcePhotoUrl": "/uploads/my_photo_office.jpg",
    "location": "Corporate Office HQ",
    "notes": "Important client meeting presentation",
    "rating": 5,
    "createdAt": "2026-09-28T10:00:33.250Z"
  },
  "message": "Worn outfit logged successfully and wear count updated",
  "success": true
}
```

---

### 3.9 Get Wear History Logs
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-wear-history`
- **Description:** User ki outfit wear history logs fetch karta hai (occasion, specific item filter aur pagination ke sath).
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `occasion` | `string` | No | Occasion filter (`OFFICE`, `WEDDING`, `PARTY`) |
| `itemId` | `string` | No | Specific kapde ki wear history dekhne ke liye ObjectId |
| `page` | `number` | No | Page number (default: 1) |
| `limit` | `number` | No | Items per page (default: 20) |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "logs": [
      {
        "_id": "6aba3ac18b77f573062508b7",
        "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
        "items": [
          {
            "itemId": "6aba317270f26b72d852616f",
            "name": "Navy Blue Royal Linen Shirt (Updated)",
            "category": "UPPER_WEAR",
            "subCategory": "Shirt",
            "photoUrl": "https://images.arangtik.com/wardrobe/shirt_01.jpg"
          }
        ],
        "wornDate": "2026-09-28T10:00:00.000Z",
        "occasion": "OFFICE",
        "location": "Corporate Office HQ",
        "notes": "Important client meeting presentation",
        "rating": 5
      }
    ],
    "pagination": {
      "totalLogs": 1,
      "totalPages": 1,
      "currentPage": 1,
      "limit": 20,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "message": "Wear history fetched successfully",
  "success": true
}
```

---

### 3.10 AI Smart Outfit Suggestion / Stylist Engine
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/suggest-outfit`
- **Description:** User ke **currently AVAILABLE** wardrobe collection mein se Occasion (Interview, Wedding, Casual, Party, Festive) ke hisaab se best matching outfits aur color contrast combinations suggest karta hai styling advice ke sath. *(Jo kapde Dhobi ke paas ya Dost ke paas hain, unhe ignore karta hai).*
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "occasion": "INTERVIEW",
  "preferredStyle": "FORMAL",
  "weather": {
    "temperature": 28,
    "condition": "Sunny"
  },
  "colorPreference": "Blue",
  "customPrompt": "Need sharp contrast professional corporate look"
}
```

#### Request Body Fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `occasion` | `string` | Yes | `INTERVIEW`, `OFFICE`, `WEDDING`, `PARTY`, `CASUAL`, `FESTIVE`, `TRAVEL`, `DATE` |
| `preferredStyle` | `string` | Optional | `FORMAL`, `TRADITIONAL`, `CASUAL`, `SMART_CASUAL` |
| `weather` | `object` | Optional | `{ temperature: 30, condition: "Sunny" }` |
| `colorPreference` | `string` | Optional | Preferred base color (e.g. "Blue", "Black", "Light") |
| `customPrompt` | `string` | Optional | User natural language styling instruction |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "occasion": "INTERVIEW",
    "totalAvailableItems": 3,
    "outfitSuggestions": [
      {
        "title": "Sharp Professional Look",
        "stylingTip": "Ye combination Navy Blue Royal Linen Shirt ke sath Beige Formal Chinos ka clean contrast banata hai jo INTERVIEW ke liye well-balanced aur professional hai.",
        "colorHarmony": "Balanced Color Contrast",
        "matchScore": 92,
        "itemsCount": 2,
        "items": [
          {
            "_id": "6aba317270f26b72d852616f",
            "name": "Navy Blue Royal Linen Shirt (Updated)",
            "category": "UPPER_WEAR",
            "subCategory": "Shirt",
            "images": [
              {
                "url": "https://images.arangtik.com/wardrobe/shirt_01.jpg",
                "isPrimary": true
              }
            ],
            "attributes": {
              "primaryColor": "Navy Blue",
              "fabric": "LINEN",
              "brand": "Zara Man Exclusive"
            }
          },
          {
            "_id": "6aba3eb81a18209bbca198a2",
            "name": "Beige Slim Fit Formal Chinos",
            "category": "LOWER_WEAR",
            "subCategory": "Trousers",
            "attributes": {
              "primaryColor": "Beige",
              "fabric": "COTTON"
            }
          }
        ]
      }
    ]
  },
  "message": "Outfit suggestions generated successfully",
  "success": true
}
```

---

# ========================================================================
# ================= STEP 7: CLOTHING LENDING & RETURN TRACKING ==========
# ========================================================================

## 4. Item Lending & Handover Module (Dost/Relative ko Dena ya Lena)

### 4.1 Lend Item to Person
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/lend-item`
- **Description:** Wardrobe ka item (Sherwani, Coat, Suit, Dress) kisi dost ya relative ko pehenne ke liye deta hai. Item ka status automatically `LENT_OUT` ho jata hai aur expected return date set ho jati hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: application/json`
- **Body:**
```json
{
  "itemId": "6aba3d593d355788e6bcb8c0",
  "assignedTo": "Amit Kumar",
  "assignedPhone": "9876543210",
  "purpose": "LENT_FOR_WEARING",
  "givenDate": "2026-09-28T12:00:00.000Z",
  "expectedReturnDate": "2026-10-05T18:00:00.000Z"
}
```

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "6aba3d593d355788e6bcb8c0",
    "name": "Beige Slim Fit Formal Chinos",
    "currentStatus": "LENT_OUT",
    "currentLocation": {
      "storagePlace": "Main Closet",
      "holderPerson": {
        "name": "Amit Kumar",
        "phone": "9876543210",
        "relation": "Friend/Family"
      }
    },
    "activeAssignment": {
      "assignedTo": "Amit Kumar",
      "assignedPhone": "9876543210",
      "purpose": "LENT_FOR_WEARING",
      "givenDate": "2026-09-28T12:00:00.000Z",
      "expectedReturnDate": "2026-10-05T18:00:00.000Z"
    }
  },
  "message": "Item lent out to Amit Kumar successfully",
  "success": true
}
```

---

### 4.2 Get All Currently Lent Items
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-lent-items`
- **Description:** Jo kapde/items abhi bahar kisi dost ya relative ke paas hain unki list aur return due dates fetch karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "totalLentItems": 1,
    "items": [
      {
        "_id": "6aba3d593d355788e6bcb8c0",
        "name": "Beige Slim Fit Formal Chinos",
        "currentStatus": "LENT_OUT",
        "activeAssignment": {
          "assignedTo": "Amit Kumar",
          "assignedPhone": "9876543210",
          "purpose": "LENT_FOR_WEARING",
          "givenDate": "2026-09-28T12:00:00.000Z",
          "expectedReturnDate": "2026-10-05T18:00:00.000Z"
        }
      }
    ]
  },
  "message": "Lent items fetched successfully",
  "success": true
}
```

---

### 4.3 Return Lent Item Back to Closet
- **Method:** `PATCH`
- **Endpoint:** `/api/wardrobe/return-lent-item/:id`
- **Description:** Diya hua item wapas aane par status ko wapas `AVAILABLE` set karta hai aur active assignment clear karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **URL Parameters:**
  - `id`: Item ka MongoDB ObjectId

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "6aba3d593d355788e6bcb8c0",
    "name": "Beige Slim Fit Formal Chinos",
    "currentStatus": "AVAILABLE",
    "currentLocation": {
      "storagePlace": "Main Closet",
      "holderPerson": null
    },
    "activeAssignment": null
  },
# ========================================================================
# ================= STEP 2: USER PROFILE & REFERENCE BIOMETRIC ===========
# ========================================================================

## 5. Face Recognition Module

### 5.1 Update Profile Photo
- **Method:** `POST`
- **Endpoint:** `/api/auth/profile-image` (or `/api/v1/auth/profile-image`)
- **Description:** Authenticated user ka profile photo upload karta hai. Profile photo badalne par reference face embedding automatically refresh hone ke liye invalidate hoti hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: multipart/form-data`
- **Form-Data:**
  - `image`: Profile image file (JPEG, PNG, WEBP)

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "phone": "919876543210",
    "name": "Alex Mercer",
    "role": "user",
    "status": "active",
    "profileImage": "/uploads/image-1712000000000-123456789.jpg"
  },
  "message": "Profile image uploaded successfully",
  "success": true
}
```

---

### 5.2 Validate Reference Face
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/reference/validate`
- **Description:** Authenticated user ki existing profile image ko scan karke verify karta hai ki usme exactly 1 clear face maujood hai ya nahi.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "isValid": true,
    "profileImage": "/uploads/image-1712000000000-123456789.jpg",
    "faceDetected": true,
    "confidence": 0.9921,
    "boundingBox": {
      "x": 120,
      "y": 80,
      "width": 180,
      "height": 220
    },
    "message": "Profile image contains a valid single reference face ready for recognition."
  },
  "message": "Profile image validated for face recognition",
  "success": true
}
```

**422 Unprocessable Entity (Multiple Faces):**
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Multiple faces (2) detected in the profile image. Please upload a photo with only yourself.",
  "errors": [
    {
      "code": "PROFILE_MULTIPLE_FACES",
      "message": "Reference photo must contain exactly one face"
    }
  ]
}
```

---

### 5.3 Generate / Refresh Reference Face Embedding
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/reference`
- **Description:** User ki profile image se 128-d reference face embedding generate karke secure database me cache karta hai. (Raw vector API me expose nahi hota).
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "hasReferenceFace": true,
    "profileImage": "/uploads/image-1712000000000-123456789.jpg",
    "boundingBox": {
      "x": 120,
      "y": 80,
      "width": 180,
      "height": 220
    },
    "detectionConfidence": 0.9921,
    "lastGeneratedAt": "2026-10-02T12:00:00.000Z"
  },
  "message": "Reference face embedding generated successfully",
  "success": true
}
```

---

### 5.4 Get Reference Face Status
- **Method:** `GET`
- **Endpoint:** `/api/face-recognition/reference`
- **Description:** Reference face embedding status aur metadata check karne ke liye.
- **Access:** Private (Requires JWT Token)

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "hasProfileImage": true,
    "profileImage": "/uploads/image-1712000000000-123456789.jpg",
    "hasReferenceFace": true,
    "referenceMetadata": {
      "boundingBox": {
        "x": 120,
        "y": 80,
        "width": 180,
        "height": 220
      },
      "detectionConfidence": 0.9921,
      "lastGeneratedAt": "2026-10-02T12:00:00.000Z",
      "imagePath": "/uploads/image-1712000000000-123456789.jpg"
    }
  },
  "message": "Reference face status retrieved successfully",
  "success": true
}
```

---

# ========================================================================
# ================= STEP 3: SMART GALLERY SCAN & FACE MATCHING ===========
# ========================================================================

### 5.5 Scan Single Gallery Photo
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/scan`
- **Description:** Ek gallery photo ko logged-in user ke reference face ke sath scan aur compare karta hai. Sabhi detected faces ko analyze karke user match identify karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: multipart/form-data`
- **Form-Data:**
  - `image`: Gallery photo file (JPEG, PNG, WEBP)
- **Query Parameters (Optional):**
  - `threshold`: Custom Euclidean distance threshold (e.g. `0.55` or `0.6`)

#### Response (User Found / Matched):
**200 OK:**
```json
{
  "statusCode": 200,
  "data": {
    "imageId": "image-1712000045000-987654321.jpg",
    "matched": true,
    "facesDetected": 3,
    "matchedFaces": [
      {
        "faceIndex": 0,
        "confidence": 0.9854,
        "similarity": 0.74,
        "distance": 0.312,
        "boundingBox": {
          "x": 140,
          "y": 95,
          "width": 210,
          "height": 245
        }
      }
    ],
    "allDetectedFaces": [
      {
        "faceIndex": 0,
        "detectionConfidence": 0.9854,
        "distance": 0.312,
        "cosineSimilarity": 0.9512,
        "similarity": 0.74,
        "matched": true,
        "boundingBox": {
          "x": 140,
          "y": 95,
          "width": 210,
          "height": 245
        }
      },
      {
        "faceIndex": 1,
        "detectionConfidence": 0.924,
        "distance": 0.895,
        "cosineSimilarity": 0.599,
        "similarity": 0.254,
        "matched": false,
        "boundingBox": {
          "x": 480,
          "y": 110,
          "width": 190,
          "height": 230
        }
      },
      {
        "faceIndex": 2,
        "detectionConfidence": 0.881,
        "distance": 0.962,
        "cosineSimilarity": 0.538,
        "similarity": 0.198,
        "matched": false,
        "boundingBox": {
          "x": 750,
          "y": 130,
          "width": 175,
          "height": 215
        }
      }
    ],
    "thresholdUsed": 0.6,
    "processingTimeMs": 342
  },
  "message": "Gallery image scan completed",
  "success": true
}
```

#### Response (No Match Found):
**200 OK:**
```json
{
  "statusCode": 200,
  "data": {
    "imageId": "image-1712000045000-987654321.jpg",
    "matched": false,
    "facesDetected": 2,
    "matchedFaces": [],
    "allDetectedFaces": [
      {
        "faceIndex": 0,
        "detectionConfidence": 0.941,
        "distance": 0.842,
        "cosineSimilarity": 0.645,
        "similarity": 0.298,
        "matched": false,
        "boundingBox": {
          "x": 100,
          "y": 120,
          "width": 180,
          "height": 210
        }
      }
    ],
    "thresholdUsed": 0.6,
    "processingTimeMs": 285
  },
  "message": "Gallery image scan completed",
  "success": true
}
```

#### Response (No Faces Detected in Image):
**200 OK:**
```json
{
  "statusCode": 200,
  "data": {
    "imageId": "image-1712000045000-987654321.jpg",
    "matched": false,
    "facesDetected": 0,
    "matchedFaces": [],
    "allDetectedFaces": [],
    "processingTimeMs": 195
  },
  "message": "Gallery image scan completed",
  "success": true
}
```

---

# ========================================================================
# ================= STEP 4: SMART AUTO-INGESTION PIPELINE ================
# ============ (FACE MATCH ➔ AI VISION CLOTHES ➔ DIGITAL WARDROBE) ========
# ========================================================================

## 6. Smart Gallery Ingestion & Auto-Wardrobe Pipeline

### 6.1 Ingest Gallery Photos into Wardrobe
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/ingest-gallery` (or `/api/face-recognition/scan-and-ingest` / `/api/v1/wardrobe/ingest-gallery`)
- **Description:** User ke multiple gallery images (1 se 20 photos) ko upload karke end-to-end automate karta hai:
  1. **Face Recognition Filter:** Har photo me check karta hai ki logged-in user maujood hai ya nahi.
  2. **Non-User Rejection:** Jin photos me user nahi hai, unhe skip kar deta hai.
  3. **Fashion AI Extraction:** Jin photos me user match hota hai, unme user ke pehne hue kapde (Shirt, Jeans, Kurta, Dress etc.) detect aur auto-crop karta hai.
  4. **Wardrobe Deduplication & Storage:**
     - Agar wo kapda pehle se user ke wardrobe me exist karta hai $\rightarrow$ Automatic **`WearLog` (Daily Wear History)** create kar deta hai.
     - Agar naya kapda hai $\rightarrow$ Automatically user ke **Digital Wardrobe (`WardrobeItem`)** me new item save kar deta hai!
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
  - `Content-Type: multipart/form-data`
- **Form-Data (Multipart):**
| Field | Type | Required | Description |
|---|---|---|---|
| `photos` | `file[]` | Yes | Array of gallery image files (up to 20 files, JPEG/PNG/WebP) |
| `autoCreateNewItems` | `boolean` | Optional | `true` (Default: Auto creates new WardrobeItem in DB) |
| `autoLogWear` | `boolean` | Optional | `true` (Default: Auto creates WearLog for matched existing clothes) |
| `occasion` | `string` | Optional | `"CASUAL"`, `"OFFICE"`, `"PARTY"`, `"WEDDING"`, `"FESTIVE"` (Default: `"CASUAL"`) |
| `threshold` | `number` | Optional | Custom face distance threshold (e.g. `0.50` or `0.42` for strict) |

#### Response (Success):
**200 OK:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Gallery scanned: 2 photos matched your face, 3 new items added to wardrobe",
  "data": {
    "totalImagesReceived": 3,
    "matchedUserImagesCount": 2,
    "unmatchedImagesCount": 1,
    "newWardrobeItemsCreated": [
      {
        "_id": "674f1b2c3d4e5f6a7b8c9d01",
        "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Navy Blue Slim Fit Shirt",
        "storeType": "WARDROBE",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "images": [
          {
            "url": "/uploads/crops/crop-179093-0-1234.webp",
            "filename": "crop-179093-0-1234.webp",
            "isPrimary": true
          }
        ],
        "attributes": {
          "primaryColor": "Navy Blue",
          "secondaryColors": ["Dark Blue"],
          "pattern": "SOLID",
          "fabric": "LINEN",
          "gender": "MEN",
          "fit": "SLIM_FIT",
          "sleeveLength": "FULL_SLEEVE",
          "occasions": ["OFFICE", "FORMAL", "PARTY"],
          "seasons": ["SUMMER", "ALL_SEASON"]
        },
        "currentStatus": "AVAILABLE",
        "currentLocation": {
          "storagePlace": "Main Closet"
        },
        "tags": ["Auto-Extracted", "Gallery-Scan", "Navy Blue", "UPPER_WEAR"],
        "createdAt": "2026-10-02T15:28:00.000Z"
      },
      {
        "_id": "674f1b2c3d4e5f6a7b8c9d02",
        "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Light Blue Denim Jeans",
        "storeType": "WARDROBE",
        "category": "LOWER_WEAR",
        "subCategory": "Jeans",
        "images": [
          {
            "url": "/uploads/crops/crop-179093-1-5678.webp",
            "filename": "crop-179093-1-5678.webp",
            "isPrimary": true
          }
        ],
        "attributes": {
          "primaryColor": "Light Blue",
          "pattern": "SOLID",
          "fabric": "DENIM",
          "fit": "REGULAR_FIT",
          "occasions": ["CASUAL", "DAILY"]
        },
        "currentStatus": "AVAILABLE",
        "currentLocation": {
          "storagePlace": "Main Closet"
        },
        "tags": ["Auto-Extracted", "Gallery-Scan", "Light Blue", "LOWER_WEAR"],
        "createdAt": "2026-10-02T15:28:00.000Z"
      }
    ],
    "wearLogsCreated": [
      {
        "_id": "674f1b2c3d4e5f6a7b8c9d03",
        "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
        "items": [
          {
            "itemId": "65aba3d593d355788e6bcb8bf",
            "name": "Charcoal Grey Blazer",
            "category": "OUTERWEAR",
            "photoUrl": "/uploads/blazer.jpg"
          }
        ],
        "sourcePhotoUrl": "/uploads/party_gathering.jpg",
        "occasion": "PARTY",
        "wornDate": "2026-10-02T15:28:00.000Z",
        "notes": "Auto-detected from gallery image party_gathering.jpg"
      }
    ],
    "details": [
      {
        "filename": "party_gathering.jpg",
        "originalImageUrl": "/uploads/party_gathering.jpg",
        "isUserFound": true,
        "userFaceScore": 0.94,
        "garmentsDetected": 2,
        "newItemsAdded": 2,
        "existingItemsMatched": 1
      },
      {
        "filename": "landscape_mountain.jpg",
        "originalImageUrl": "/uploads/landscape_mountain.jpg",
        "isUserFound": false,
        "facesDetected": 0,
        "message": "User face not detected in this photo. Skipped wardrobe extraction."
      }
    ]
  }
}
```
