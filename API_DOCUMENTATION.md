# Arangtik Backend API Documentation

**Base URL:** `http://localhost:8085/api` (or `/api/v1/`)

---

## 🧭 System Workflow Overview

> 🔒 **STRICT CONTRACT / DO NOT MODIFY RULE:**
> All endpoints marked with `[DONE ✅]` are fully built, tested, integrated, and active. 
> **Never modify, break, or change the request/response structure of these existing working APIs** in future tasks unless explicitly requested by the user.

```text
[STEP 1: AUTH] ✅
  ├─► POST /api/auth/send-otp           [DONE ✅] (Send WhatsApp OTP)
  └─► POST /api/auth/verify-otp         [DONE ✅] (Verify OTP, Login/Register, Get JWT Token)

[STEP 2: PROFILE & REFERENCE BIOMETRICS] ✅
  ├─► GET    /api/auth/profile          [DONE ✅] (Get Profile Info)
  ├─► PATCH  /api/auth/profile          [DONE ✅] (Unified Profile Update: Text Details + Photo Upload)
  ├─► GET    /api/face-recognition/reference [DONE ✅] (Check Biometric Status)
  └─► DELETE /api/face-recognition/reference [DONE ✅] (Delete Reference Face)

[STEP 3: STORE CONTAINERS] ✅
  ├─► POST /api/wardrobe/create-wardrobe [DONE ✅] (Create Almari / Store Container)
  └─► GET  /api/wardrobe/get-wardrobes   [DONE ✅] (List User Almaris / Stores)

[STEP 4: AI CLOTH DIGITIZATION & GALLERY SCANNING] ✅
  ├─► POST /api/cloth-analysis/extract-dress        [DONE ✅] (Direct Dress: Single / 1-100 Photos -> AI Auto-Crop & Store)
  ├─► POST /api/cloth-analysis/extract-from-gallery [DONE ✅] (Gallery Photos: User Face Match + Auto Clothes Extract & Store)
  └─► POST /api/face-recognition/verify-user-face   [DONE ✅] (Face Match Check: Verify if User Exists in Photo)

[STEP 5: DRESS & STORE ITEMS] ✅
  ├─► POST   /api/wardrobe/add-item           [DONE ✅] (Directly Add Item to Almari)
  ├─► GET    /api/wardrobe/get-all-items      [DONE ✅] (Search, Filter & Paginate Items)
  ├─► GET    /api/wardrobe/get-item-details/:id [DONE ✅] (Get Full Item Details)
  ├─► PATCH  /api/wardrobe/update-item/:id    [DONE ✅] (Update Item Details)
  └─► DELETE /api/wardrobe/delete-item/:id    [DONE ✅] (Delete Item from Almari)
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

### 3.4 Verify User Face in Photo (Face Recognition Verification Only)
- **Overview & Functionality:** 
  Scans an uploaded image to detect human faces, extracts facial landmark embeddings, and computes vector similarity against the authenticated user's registered reference face. 
  > ℹ️ **Note:** This endpoint performs **biometric face verification only**; it **does NOT extract or crop clothing items**.
- **When to Use:**
  - When the user selects or captures a photo, and the app wants to immediately show a *"Face verified / Matched (Green Tick)"* badge in the UI before proceeding.
  - To implement client-side photo filtering (e.g., separating user photos from non-user photos in a local gallery preview).
  - To verify photo ownership and check confidence/similarity scores without writing items to the database.
- **How to Use (Step-by-Step):**
  1. Send a `POST` request with the authenticated user's Bearer JWT in the `Authorization` header.
  2. Provide the image file in `multipart/form-data` under the key `photo` (or `image`).
  3. *(Optional)* Pass a custom cosine distance `threshold` (default is `0.55`; lower values require stricter face matches).
  4. Inspect the `matched` boolean in the response. If `matched: true`, display the matched indicator along with the detected similarity score.
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/verify-user-face` *(Aliases: `/api/face-recognition/scan-gallery-photo`, `/api/face-recognition/scan-gallery`, `/api/face-recognition/scan`)*
- **Request:**
  - Headers: 
    - `Authorization: Bearer <JWT_TOKEN>`
    - `Content-Type: multipart/form-data`
  - Form-Data:
    - `photo` (or `image`) *(file, required)*: Photo file to scan (JPEG, PNG, WEBP, max 20MB)
    - `threshold` *(number, optional)*: Match distance threshold (Default: `0.55`)
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
        "distance": 0.28,
        "boundingBox": {
          "x": 210,
          "y": 140,
          "width": 180,
          "height": 220
        }
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

# SECTION 5: AI CLOTH DIGITIZATION & ANALYSIS (`/api/cloth-analysis`)

### 5.1 Direct Dress Extraction & Auto-Digitization (Single or Bulk 1 to 100 Photos)
- **Overview & Functionality:**
  Processes standalone clothing photos (flat lays, hanger displays, showroom mannequins, or online shopping screenshots) using Gemini Vision AI and Sharp segmentation. 
  - Automatically identifies clothing items, fabric types, color schemes, silhouettes, patterns, and suitable occasions.
  - Crops the garment and removes background clutter to generate a clean, transparent WebP image.
  - Checks for duplicate items against the user's existing wardrobe to prevent accidental double entries.
  - Automatically persists newly detected garments as `WardrobeItem` records in the user's wardrobe.
  > ℹ️ **No Face Verification Required:** This endpoint skips facial recognition since it processes clothing-only photos.
- **When to Use:**
  - When the user photographs their clothes laid on a bed/table or hanging in a closet.
  - When digitizing a physical wardrobe in bulk (e.g., uploading 10 to 50 dress photos at once).
  - When importing catalog, boutique, or online shopping product photos.
- **How to Use (Step-by-Step):**
  1. Add `Authorization: Bearer <JWT_TOKEN>` header.
  2. Send a `POST` request with `multipart/form-data`.
  3. Attach 1 to 100 images under field key `photos` (or `photo`, `image`, `images`).
  4. *(Optional)* Provide `wardrobeId` to deposit garments into a specific closet container (defaults to the user's primary/default wardrobe).
  5. *(Optional)* Provide `storagePlace` (e.g. `"Top Shelf"`, `"Hanger Section 2"`).
  6. The response returns the total garments detected, newly created `WardrobeItem` IDs, and existing duplicate matches.
- **Method:** `POST`
- **Endpoint:** `/api/cloth-analysis/extract-dress` *(Aliases: `/api/cloth-analysis/analyze-photo`, `/api/cloth-analysis/bulk-add-photos`, `/api/cloth-analysis/bulk-add`, `/api/cloth-analysis/analyze`)*
- **Request:**
  - Headers: 
    - `Authorization: Bearer <JWT_TOKEN>`
    - `Content-Type: multipart/form-data`
  - Form-Data:
    - `photos` (or `photo`, `image`, `images`) *(file / array, required)*: 1 to 100 clothing photo files (JPEG, PNG, WEBP)
    - `wardrobeId` *(text, optional)*: Target wardrobe closet ID (Defaults to user's default wardrobe)
    - `storagePlace` *(text, optional)*: Physical storage tag (Default: `"Main Closet"`)
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Clothing processed: 2 items added to wardrobe, 0 existing items matched",
  "data": {
    "totalPhotosReceived": 2,
    "totalGarmentsExtracted": 2,
    "newItemsCreated": [
      {
        "_id": "6aba317270f26b72d852616f",
        "name": "Navy Blue Slim Fit Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "fabric": "LINEN",
        "pattern": "SOLID",
        "images": [
          {
            "url": "/uploads/crops/crop-1790589292535-0.webp",
            "isPrimary": true
          }
        ],
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
    ],
    "existingMatches": []
  }
}
```

---

### 5.2 Gallery Photos Ingestion (Face Verification + Clothes Auto-Extraction Pipeline)
- **Overview & Functionality:**
  End-to-end automated ingestion pipeline designed specifically for personal camera roll / phone gallery photos.
  1. **Face Verification Filter:** Scans all uploaded photos and matches faces against the logged-in user's biometric reference face. Photos where the user is NOT present are safely filtered out.
  2. **Targeted Clothes Extraction:** For photos where the user IS present, AI Vision extracts **only the clothes worn by the target user** (spatial coordinates beneath the user's face), ignoring clothes worn by other people in group photos.
  3. **Auto-Crop & Background Removal:** Crops clothing items with precision bounds and removes background noise.
  4. **Wardrobe Digitization & Duplicate Check:** Automatically persists new garments into the user's digital wardrobe while updating wear counts for already registered outfits.
- **When to Use:**
  - When the user syncs or uploads personal gallery photos, event snapshots, or vacation albums.
  - When digitizing outfits directly from real-life portraits and group pictures.
- **How to Use (Step-by-Step):**
  1. Add `Authorization: Bearer <JWT_TOKEN>` header.
  2. Send a `POST` request with `multipart/form-data`.
  3. Upload 1 to 100 gallery photos under key `photos` (or `photo`, `image`, `images`).
  4. *(Optional)* Pass `wardrobeId` to store detected garments in a specific closet container.
  5. *(Optional)* Set `threshold` (default `0.50`) for facial recognition sensitivity.
  6. The response reports how many photos matched the user's face, details of unmatched photos, and all newly created digital wardrobe items.
- **Method:** `POST`
- **Endpoint:** `/api/cloth-analysis/extract-from-gallery` *(Aliases: `/api/cloth-analysis/ingest-gallery`, `/api/cloth-analysis/scan-gallery-photo`, `/api/cloth-analysis/ingest`, `/api/cloth-analysis/scan`)*
- **Request:**
  - Headers: 
    - `Authorization: Bearer <JWT_TOKEN>`
    - `Content-Type: multipart/form-data`
  - Form-Data:
    - `photos` (or `photo`, `image`, `images`) *(file / array, required)*: Gallery photos (1 to 100 files)
    - `wardrobeId` *(text, optional)*: Target closet ID
    - `threshold` *(number, optional)*: Face matching distance threshold (Default: `0.50`)
    - `autoCreateNewItems` *(boolean, optional)*: Automatically persist new items (Default: `true`)
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
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "images": [
          {
            "url": "/uploads/crops/seg-0-1790943556926.webp",
            "isPrimary": true
          }
        ]
      }
    ],
    "details": [
      {
        "filename": "photo-1790938133930.png",
        "originalImageUrl": "/uploads/photo-1790938133930.png",
        "isUserFound": true,
        "userFaceScore": 0.88,
        "garmentsDetected": 1,
        "newItemsAdded": 1,
        "existingItemsMatched": 0
      },
      {
        "filename": "photo-1790938133931.png",
        "originalImageUrl": "/uploads/photo-1790938133931.png",
        "isUserFound": false,
        "facesDetected": 2,
        "message": "User face not detected in this photo. Skipped wardrobe extraction."
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

# SECTION 7: MEDIA UPLOAD & STORAGE APIS

### 7.1 Single Image Upload (Multipart File or Base64)
- **Description:** Single image ko store karta hai (Pravisti style: `/uploads` directory me short unique filename ke sath).
- **Method:** `POST`
- **Endpoint:** `/api/upload/single` (or `/api/v1/upload/single`)
- **Request Format 1 (Multipart FormData):**
  - Body: Form-Data with field `image` (File)
- **Request Format 2 (Base64 JSON):**
  - Headers: `Content-Type: application/json`
  - Body:
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```
- **Response:**
```json
{
  "statusCode": 201,
  "data": {
    "file": {
      "uniqueId": "img_muwkdves_65904c",
      "filename": "img_muwkdves_65904c.jpg",
      "originalName": "photo.jpg",
      "mimeType": "image/jpeg",
      "size": 10240,
      "url": "http://localhost:8085/api/uploads/img_muwkdves_65904c.jpg"
    },
    "url": "http://localhost:8085/api/uploads/img_muwkdves_65904c.jpg"
  },
  "message": "Image uploaded successfully",
  "success": true
}
```

---

### 7.2 Multiple Images Upload
- **Description:** Ek sath multiple images upload karta hai (up to 20 files).
- **Method:** `POST`
- **Endpoint:** `/api/upload/multiple` (or `/api/v1/upload/multiple`)
- **Request Format 1 (Multipart FormData):**
  - Body: Form-Data with field `images` (Multiple Files)
- **Request Format 2 (Base64 JSON):**
  - Body:
```json
{
  "images": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,..."
  ]
}
```
- **Response:**
```json
{
  "statusCode": 201,
  "data": {
    "files": [ ... ],
    "urls": [
      "http://localhost:8085/api/uploads/img_123.jpg",
      "http://localhost:8085/api/uploads/img_456.jpg"
    ],
    "count": 2
  },
  "message": "Images uploaded successfully",
  "success": true
}
```

---

### 7.3 Delete Stored Image
- **Description:** Server ke local storage (`uploads/`) se image file delete karta hai.
- **Method:** `DELETE`
- **Endpoint:** `/api/upload/:filename`
- **Response:**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "Image deleted successfully",
  "success": true
}
```

---

# SECTION 8: SUMMARY OF ALL ACTIVE API ENDPOINTS

| # | Description | Method | Endpoint | Auth |
|---|---|---|---|---|
| 1 | Server Root Info | `GET` | `/` | No |
| 2 | System Health Check | `GET` | `/api/health` | No |
| 3 | Single Image Upload (File / Base64) | `POST` | `/api/upload/single` | No |
| 4 | Multiple Images Upload | `POST` | `/api/upload/multiple` | No |
| 5 | Delete Stored Image | `DELETE` | `/api/upload/:filename` | No |
| 6 | Send WhatsApp OTP | `POST` | `/api/auth/send-otp` | No |
| 7 | Verify OTP & Login | `POST` | `/api/auth/verify-otp` | No |
| 8 | Get User Profile | `GET` | `/api/auth/profile` | Yes |
| 9 | Update Profile (Text + Photo) | `PATCH` | `/api/auth/profile` | Yes |
| 10 | User Logout | `POST` | `/api/auth/logout` | Yes |
| 11 | Validate Reference Face | `POST` | `/api/face-recognition/reference/validate` | Yes |
| 12 | Get Reference Biometric Status | `GET` | `/api/face-recognition/reference` | Yes |
| 13 | Delete Reference Biometric | `DELETE` | `/api/face-recognition/reference` | Yes |
| 14 | Match Face in Gallery Photo | `POST` | `/api/face-recognition/scan-gallery-photo` | Yes |
| 15 | Create Wardrobe Almari | `POST` | `/api/wardrobe/create-wardrobe` | Yes |
| 16 | Get All Wardrobes / Stores | `GET` | `/api/wardrobe/get-wardrobes` | Yes |
| 17 | Direct Dress Digitize (Single / 1-100 Photos) | `POST` | `/api/cloth-analysis/extract-dress` | Yes |
| 18 | Gallery Photos Ingest (Face Match + Auto-Store) | `POST` | `/api/cloth-analysis/extract-from-gallery` | Yes |
| 19 | Add Item to Almari | `POST` | `/api/wardrobe/add-item` | Yes |
| 20 | Get All Items (Filter & Search) | `GET` | `/api/wardrobe/get-all-items` | Yes |
| 21 | Get Item Details by ID | `GET` | `/api/wardrobe/get-item-details/:id` | Yes |
| 22 | Update Wardrobe Item | `PATCH` | `/api/wardrobe/update-item/:id` | Yes |
| 23 | Delete Wardrobe Item | `DELETE` | `/api/wardrobe/delete-item/:id` | Yes |

