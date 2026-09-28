# Arangtik Backend API Documentation

**Base URL:** `http://localhost:5000/api`

---

## 1. Health Check

### Endpoint: `/api/health`
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

## 3. Wardrobe Store Module

### 3.1 Analyze Photo (AI Clothing Recognition, Auto-Crop & Duplicate Matcher)
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
  "message": "Lent item returned and status set to AVAILABLE",
  "success": true
}
```






