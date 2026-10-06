# Arangtik Backend API Documentation

**Base URL:** `http://localhost:8085/api` (or `/api/v1/`)

---

## 🧭 System Workflow Overview

```text
[STEP 1: AUTH]
  ├─► POST /api/auth/send-otp           (Send WhatsApp OTP)
  └─► POST /api/auth/verify-otp         (Verify OTP, Login/Register, Get JWT Token)

[STEP 2: PROFILE & BIOMETRICS]
  ├─► GET    /api/auth/profile          (Get Profile Info)
  ├─► PATCH  /api/auth/profile          (Unified Profile Update: Text Details + Photo Upload)
  ├─► GET    /api/face-recognition/reference (Check Biometric Status)
  ├─► DELETE /api/face-recognition/reference (Delete Reference Face)
  └─► POST   /api/face-recognition/scan (Scan Photo for User Face Match)

[STEP 3: STORE CONTAINERS]
  ├─► POST /api/wardrobe/create-wardrobe (Create Almari / Store Container)
  └─► GET  /api/wardrobe/get-wardrobes   (List User Almaris / Stores)

[STEP 4: AI CLOTH ANALYSIS & DIGITIZATION]
  ├─► POST /api/cloth-analysis/analyze-photo      (AI Garment Detection & Auto-Crop)
  ├─► POST /api/cloth-analysis/scan-gallery-photo (Single Photo: Face Check + Clothes Extract)
  ├─► POST /api/cloth-analysis/bulk-add-photos    (Bulk 1 to 100 Photos Auto-Digitize & Store)
  └─► POST /api/cloth-analysis/ingest-gallery     (Batch Ingestion Pipeline)

[STEP 5: DRESS & STORE ITEMS]
  ├─► POST   /api/wardrobe/add-item           (Directly Add Item to Almari)
  ├─► GET    /api/wardrobe/get-all-items      (Search, Filter & Paginate Items)
  ├─► GET    /api/wardrobe/get-item-details/:id (Get Full Item Details)
  ├─► PATCH  /api/wardrobe/update-item/:id    (Update Item Details)
  └─► DELETE /api/wardrobe/delete-item/:id    (Delete Item from Almari)
```

---

# SECTION 1: SYSTEM & HEALTH

### 1.1 Root Info
- **Description:** Server health aur version check karne ke liye base endpoint.
- **Method:** `GET`
- **Endpoint:** `/`
- **Request:**
  - Headers: None
  - Body: None
- **Response:**
```json
{
  "name": "Arangtik Backend API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/api/health"
}
```

---

### 1.2 Health Check
- **Description:** Database connectivity aur server status check karta hai.
- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Request:**
  - Headers: None
  - Body: None
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "System is healthy",
  "data": {
    "status": "UP",
    "timestamp": "2026-10-05T17:10:00.000Z",
    "services": {
      "database": "connected",
      "server": "running"
    }
  }
}
```

---

# SECTION 2: AUTHENTICATION MODULE (`/api/auth`)

### 2.1 Send WhatsApp OTP
- **Description:** User ke WhatsApp mobile number par 6-digit login OTP bhejta hai.
- **Method:** `POST`
- **Endpoint:** `/api/auth/send-otp`
- **Request:**
  - Headers: `Content-Type: application/json`
  - Body:
```json
{
  "phone": "919876543210"
}
```
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP sent successfully to your WhatsApp number",
  "data": {
    "phone": "919876543210",
    "expiresInSeconds": 300
  }
}
```

---

### 2.2 Verify OTP & Login
- **Description:** WhatsApp OTP verify karke user ko login/register karta hai aur JWT access token return karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/auth/verify-otp`
- **Request:**
  - Headers: `Content-Type: application/json`
  - Body:
```json
{
  "phone": "919876543210",
  "otp": "123456",
  "name": "Rahul Sharma"
}
```
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": false,
    "user": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Rahul Sharma",
      "phone": "919876543210",
      "gender": "UNSPECIFIED",
      "accountType": "INDIVIDUAL",
      "country": "India",
      "currency": "INR",
      "preferredLanguage": "en",
      "role": "user",
      "status": "active"
    }
  }
}
```

---

### 2.3 Get Current User Profile
- **Description:** Logged-in user ka complete profile data (name, gender, accountType, country, currency, preferredLanguage, profileImage) aur biometric status fetch karta hai.
- **Method:** `GET`
- **Endpoint:** `/api/auth/profile` *(or `/api/auth/me`)*
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - Body: None
- **Response:**
```json
{
    "statusCode": 200,
    "data": {
        "country": "India",
        "currency": "INR",
        "preferredLanguage": "en",
        "_id": "6ac34c5bfd79ed5569324cd1",
        "name": "",
        "phone": "916202579799",
        "role": "user",
        "status": "active",
        "gender": "UNSPECIFIED",
        "accountType": "INDIVIDUAL",
        "profileImage": "",
        "createdAt": "2026-10-05T07:06:03.821Z",
        "updatedAt": "2026-10-05T07:06:03.821Z"
    },
    "message": "User profile fetched successfully",
    "success": true
}
```

---

### 2.4 Update Profile (Text Details & Photo File)
- **Description:** User profile details (name, gender, country, currency, language) update karta hai. Photo file (`image`) attach karne par automatically single clear face check karke 128-d reference face embedding generate aur save karta hai.
- **Method:** `PATCH`
- **Endpoint:** `/api/auth/profile`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - **Option A (JSON - Text Only):** `Content-Type: application/json`
```json
{
  "name": "Rahul Sharma",
  "gender": "MALE",
  "accountType": "INDIVIDUAL",
  "country": "India",
  "currency": "INR",
  "preferredLanguage": "en"
}
```
  - **Option B (Multipart Form-Data - Text + Photo File):** `Content-Type: multipart/form-data`
    - `name` (text, optional): `"Rahul Sharma"`
    - `gender` (text, optional): `"MALE"`
    - `accountType` (text, optional): `"INDIVIDUAL"`
    - `country` (text, optional): `"India"`
    - `currency` (text, optional): `"INR"`
    - `preferredLanguage` (text, optional): `"en"`
    - `image` (file, optional): `profile_photo.jpg`
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Rahul Sharma",
    "phone": "919876543210",
    "gender": "MALE",
    "accountType": "INDIVIDUAL",
    "country": "India",
    "currency": "INR",
    "preferredLanguage": "en",
    "profileImage": "/uploads/image-1718000000000.jpg",
    "status": "active"
  }
}
```

---

### 2.5 Logout
- **Description:** User session logout karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - Body: None
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

# SECTION 3: FACE RECOGNITION & BIOMETRICS (`/api/face-recognition`)

### 3.1 Validate Reference Profile Photo
- **Description:** Current profile photo ko check karta hai ki usme single clear face present hai ya nahi.
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/reference/validate`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - Body: None
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile image validated for face recognition",
  "data": {
    "isValid": true,
    "profileImage": "/uploads/image-1718000000000.jpg",
    "faceDetected": true,
    "confidence": 0.992,
    "message": "Profile image contains a valid single reference face ready for recognition."
  }
}
```

---

### 3.2 Get Reference Face Biometric Status
- **Description:** User ke registered biometric embedding ki metadata aur generation timestamp fetch karta hai.
- **Method:** `GET`
- **Endpoint:** `/api/face-recognition/reference`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - Body: None
- **Response:**
```json
{
    "statusCode": 200,
    "data": {
        "userId": "6ac34c5bfd79ed5569324cd1",
        "hasProfileImage": false,
        "profileImage": null,
        "hasReferenceFace": false,
        "referenceMetadata": null
    },
    "message": "Reference face status retrieved successfully",
    "success": true
}
```

---

### 3.3 Delete Reference Face Biometric
- **Description:** Registered reference face embedding delete karta hai.
- **Method:** `DELETE`
- **Endpoint:** `/api/face-recognition/reference`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - Body: None
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Reference face embedding deleted successfully",
  "data": {
    "deleted": true
  }
}
```

---

### 3.4 Scan Photo for Face Matching
- **Description:** Kisi bhi photo me user ka face match check karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/scan`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
  - Form-Data:
    - `image` (file, required): Photo file to match
    - `threshold` (number, optional): Distance threshold (Default: `0.55`)
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Gallery image scan completed",
  "data": {
    "matched": true,
    "facesDetected": 1,
    "matchedFaces": [
      {
        "confidence": 0.985,
        "similarity": 0.88,
        "distance": 0.28
      }
    ]
  }
}
```

---

# SECTION 4: STORE CONTAINERS (ALMARI / CLOSETS) (`/api/wardrobe`)

### 4.1 Create Wardrobe / Almari Container
- **Description:** User ke liye naya Almari container create karta hai (e.g. "Master Bedroom Almari", "Mummy ki Almari"). Backend silently `storeType: 'WARDROBE'` set karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/create-wardrobe`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json` (or `multipart/form-data`)
  - Body:
```json
{
  "name": "Master Bedroom Almari",
  "ownerName": "Rahul Sharma",
  "type": "PERSONAL",
  "isDefault": true
}
```
- **Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Wardrobe closet created successfully",
  "data": {
    "_id": "674f1b2c3d4e5f6a7b8c9d10",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Master Bedroom Almari",
    "storeType": "WARDROBE",
    "type": "PERSONAL",
    "ownerName": "Rahul Sharma",
    "isDefault": true,
    "isActive": true,
    "createdAt": "2026-10-05T14:00:00.000Z"
  }
}
```

---

### 4.2 Get All Wardrobes / Stores
- **Description:** User ki sabhi active Almaris aur Stores ki list fetch karta hai.
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-wardrobes`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - Query Parameters (Optional): `?storeType=WARDROBE`
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe closets fetched successfully",
  "data": [
    {
      "_id": "674f1b2c3d4e5f6a7b8c9d10",
      "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Master Bedroom Almari",
      "storeType": "WARDROBE",
      "type": "PERSONAL",
      "isDefault": true,
      "isActive": true,
      "createdAt": "2026-10-05T14:00:00.000Z"
    }
  ]
}
```

---

# SECTION 5: AI CLOTH ANALYSIS & DIGITIZATION (`/api/cloth-analysis`)

### 5.1 Analyze Single Photo (AI Vision & Auto-Crop)
- **Description:** Photo upload karke AI se garments recognize aur segment karta hai, transparent cropped images banata hai aur color/fabric/occasion extract karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/cloth-analysis/analyze-photo` *(Alias: `/api/cloth-analysis/analyze`, `/api/wardrobe/analyze-photo`)*
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
  - Form-Data:
    - `photo` (file, required): Garment image file
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Photo analyzed successfully with clothing recognition",
  "data": {
    "originalImageUrl": "/uploads/photo-1790589292516.jpg",
    "sourceImageHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "detectedItemsCount": 1,
    "analysis": [
      {
        "name": "Navy Blue Slim Fit Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/crop-1790589292535-0.webp",
        "attributes": {
          "primaryColor": "Navy Blue",
          "pattern": "SOLID",
          "fabric": "LINEN",
          "fit": "SLIM_FIT",
          "sleeveLength": "FULL_SLEEVE",
          "occasions": ["OFFICE", "FORMAL", "PARTY"],
          "seasons": ["SUMMER", "ALL_SEASON"]
        }
      }
    ]
  }
}
```

---

### 5.2 Scan Gallery Photo (Face Check + Garments Extract)
- **Description:** Single photo me user face match verify karta hai aur matching kapde extract karke Almari me link karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/cloth-analysis/scan-gallery-photo` *(Alias: `/api/cloth-analysis/scan`, `/api/wardrobe/scan-gallery-photo`)*
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
  - Form-Data:
    - `photo` (file, required): Gallery image file
    - `wardrobeId` (text, optional): Target Almari ID
    - `threshold` (number, optional): Face matching threshold (Default: `0.50`)
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User matched successfully! Extracted 1 clothing items.",
  "data": {
    "matched": true,
    "facesDetected": 1,
    "originalImageUrl": "/uploads/photo-1790938133930.png",
    "detectedItemsCount": 1,
    "items": [
      {
        "name": "Navy Blue Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/seg-0-1790943556926.webp"
      }
    ]
  }
}
```

---

### 5.3 Bulk Add Dress Photos (1 to 100 Photos)
- **Description:** Multiple kapdo ki photos ko batch me AI recognize karke sidha target Almari me store kar deta hai.
- **Method:** `POST`
- **Endpoint:** `/api/cloth-analysis/bulk-add-photos` *(Alias: `/api/cloth-analysis/bulk-add`, `/api/wardrobe/bulk-add-photos`)*
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
  - Form-Data:
    - `photos` (file array, required): Multiple image files (1 to 100)
    - `wardrobeId` (text, optional): Target Almari ID
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Bulk processing complete: 5 items added to wardrobe, 1 existing items matched",
  "data": {
    "totalImagesProcessed": 6,
    "newItemsCreated": [
      {
        "_id": "6aba317270f26b72d852616f",
        "name": "Navy Blue Linen Shirt",
        "category": "UPPER_WEAR"
      }
    ],
    "existingMatches": []
  }
}
```

---

### 5.4 Ingest Gallery Photos (Batch Ingestion Pipeline)
- **Description:** Puri gallery photos upload karke user face filter lagata hai aur clothes automatically Almari me store karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/cloth-analysis/ingest-gallery` *(Alias: `/api/cloth-analysis/ingest`, `/api/wardrobe/ingest-gallery`)*
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
  - Form-Data:
    - `photos` (file array, required): Gallery photos
    - `wardrobeId` (text, optional): Target Almari ID
    - `autoCreateNewItems` (boolean, optional): Default: `true`
- **Response:**
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
        "_id": "6aba317270f26b72d852616f",
        "name": "Navy Blue Linen Shirt",
        "category": "UPPER_WEAR"
      }
    ]
  }
}
```

---

# SECTION 6: DRESS & STORE ITEMS MANAGEMENT (`/api/wardrobe`)

### 6.1 Add Item Directly to Almari
- **Description:** Naya dress item sidha targeted Almari me store karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/add-item`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
  - Body:
```json
{
  "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
  "name": "Navy Blue Formal Linen Shirt",
  "category": "UPPER_WEAR",
  "subCategory": "Shirt",
  "color": "Navy Blue",
  "fabric": "LINEN",
  "pattern": "SOLID",
  "fit": "SLIM_FIT",
  "sleeveLength": "FULL_SLEEVE",
  "occasion": ["OFFICE", "FORMAL", "PARTY"],
  "season": ["SUMMER", "ALL_SEASON"],
  "images": [
    {
      "url": "/uploads/crops/shirt.webp",
      "isPrimary": true
    }
  ],
  "attributes": {
    "brand": "Zara",
    "size": "40"
  },
  "tags": ["formal", "linen", "blue", "office"]
}
```
- **Response:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Item added successfully to wardrobe store",
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
    "name": "Navy Blue Formal Linen Shirt",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "color": "Navy Blue",
    "fabric": "LINEN",
    "images": [
      {
        "url": "/uploads/crops/shirt.webp",
        "isPrimary": true
      }
    ],
    "isFavorite": false,
    "createdAt": "2026-10-05T14:30:00.000Z"
  }
}
```

---

### 6.2 Get All Items (Search, Filter & Pagination)
- **Description:** Almari items ko category, color, occasion, season, favorite, aur search keyword ke hisaab se filter aur paginate karke fetch karta hai.
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-all-items`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - Query Parameters:
    - `wardrobeId` (optional): Filter by specific Almari ID (e.g. `674f1b2c3d4e5f6a7b8c9d10`)
    - `category` (optional): Filter category (e.g. `UPPER_WEAR`, `TRADITIONAL`, `FOOTWEAR`)
    - `subCategory` (optional): Filter subcategory (e.g. `Kurta`, `Jeans`, `Shirt`)
    - `color` (optional): Filter color (e.g. `Navy Blue`, `Black`)
    - `occasion` (optional): Filter occasion (e.g. `FESTIVE`, `OFFICE`, `CASUAL`)
    - `season` (optional): Filter season (e.g. `SUMMER`, `WINTER`)
    - `favorite` (optional): Filter favorites (`true` / `false`)
    - `search` (optional): Search keyword (e.g. `zara linen`)
    - `page` (optional): Page number (Default: `1`)
    - `limit` (optional): Page limit (Default: `20`)
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe items fetched successfully",
  "data": {
    "items": [
      {
        "_id": "6aba317270f26b72d852616f",
        "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
        "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
        "name": "Navy Blue Formal Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "fabric": "LINEN",
        "images": [
          {
            "url": "/uploads/crops/shirt.webp",
            "isPrimary": true
          }
        ],
        "isFavorite": false,
        "createdAt": "2026-10-05T14:30:00.000Z"
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
  }
}
```

---

### 6.3 Get Item Details by ID
- **Description:** Item ID ke zariye kapde ki complete details, attributes, aur images fetch karta hai.
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-item-details/:id`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - URL Params: `id` (e.g. `6aba317270f26b72d852616f`)
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item details fetched successfully",
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
    "name": "Navy Blue Formal Linen Shirt",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "color": "Navy Blue",
    "fabric": "LINEN",
    "pattern": "SOLID",
    "fit": "SLIM_FIT",
    "sleeveLength": "FULL_SLEEVE",
    "occasion": ["OFFICE", "FORMAL"],
    "season": ["SUMMER", "ALL_SEASON"],
    "images": [
      {
        "url": "/uploads/crops/shirt.webp",
        "isPrimary": true
      }
    ],
    "attributes": {
      "brand": "Zara",
      "size": "40"
    },
    "tags": ["formal", "linen", "blue"],
    "isFavorite": false,
    "createdAt": "2026-10-05T14:30:00.000Z",
    "updatedAt": "2026-10-05T14:30:00.000Z"
  }
}
```

---

### 6.4 Update Wardrobe Item
- **Description:** Item ke attributes, name, fabric, favorite status, tags update karta hai.
- **Method:** `PATCH`
- **Endpoint:** `/api/wardrobe/update-item/:id`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`
  - URL Params: `id` (e.g. `6aba317270f26b72d852616f`)
  - Body:
```json
{
  "name": "Navy Blue Royal Linen Shirt (Updated)",
  "color": "Navy Blue",
  "fabric": "PURE_LINEN",
  "isFavorite": true,
  "attributes": {
    "brand": "Zara Man Exclusive"
  },
  "tags": ["formal", "linen", "blue", "exclusive"]
}
```
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item updated successfully",
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "name": "Navy Blue Royal Linen Shirt (Updated)",
    "fabric": "PURE_LINEN",
    "isFavorite": true,
    "updatedAt": "2026-10-05T14:45:00.000Z"
  }
}
```

---

### 6.5 Delete Item from Wardrobe
- **Description:** Almari se kapde ko delete karta hai.
- **Method:** `DELETE`
- **Endpoint:** `/api/wardrobe/delete-item/:id`
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`
  - URL Params: `id` (e.g. `6aba317270f26b72d852616f`)
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item deleted successfully",
  "data": {
    "deleted": true,
    "itemId": "6aba317270f26b72d852616f"
  }
}
```

---

# SECTION 7: SUMMARY OF ALL ACTIVE API ENDPOINTS

| # | Description | Method | Endpoint | Auth |
|---|---|---|---|---|
| 1 | Server Root Info | `GET` | `/` | No |
| 2 | System Health Check | `GET` | `/api/health` | No |
| 3 | Send WhatsApp OTP | `POST` | `/api/auth/send-otp` | No |
| 4 | Verify OTP & Login | `POST` | `/api/auth/verify-otp` | No |
| 5 | Get User Profile | `GET` | `/api/auth/profile` | Yes |
| 6 | Update Profile (Text + Photo) | `PATCH` | `/api/auth/profile` | Yes |
| 7 | User Logout | `POST` | `/api/auth/logout` | Yes |
| 8 | Validate Reference Face | `POST` | `/api/face-recognition/reference/validate` | Yes |
| 9 | Get Reference Biometric Status | `GET` | `/api/face-recognition/reference` | Yes |
| 10 | Delete Reference Biometric | `DELETE` | `/api/face-recognition/reference` | Yes |
| 11 | Match Face in Photo | `POST` | `/api/face-recognition/scan` | Yes |
| 12 | Create Wardrobe Almari | `POST` | `/api/wardrobe/create-wardrobe` | Yes |
| 13 | Get All Wardrobes / Stores | `GET` | `/api/wardrobe/get-wardrobes` | Yes |
| 14 | AI Photo Garment Recognition & Crop | `POST` | `/api/cloth-analysis/analyze-photo` | Yes |
| 15 | Scan Gallery Photo (Face + Clothes) | `POST` | `/api/cloth-analysis/scan-gallery-photo` | Yes |
| 16 | Bulk Add Photos (1-100 Photos) | `POST` | `/api/cloth-analysis/bulk-add-photos` | Yes |
| 17 | Ingest Gallery Pipeline | `POST` | `/api/cloth-analysis/ingest-gallery` | Yes |
| 18 | Add Item to Almari | `POST` | `/api/wardrobe/add-item` | Yes |
| 19 | Get All Items (Filter & Search) | `GET` | `/api/wardrobe/get-all-items` | Yes |
| 20 | Get Item Details by ID | `GET` | `/api/wardrobe/get-item-details/:id` | Yes |
| 21 | Update Wardrobe Item | `PATCH` | `/api/wardrobe/update-item/:id` | Yes |
| 22 | Delete Wardrobe Item | `DELETE` | `/api/wardrobe/delete-item/:id` | Yes |
