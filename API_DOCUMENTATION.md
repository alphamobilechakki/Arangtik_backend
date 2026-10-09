# Arangtik Backend API Documentation

**Base URL:** `http://localhost:8085/api` (or `/api/v1/`)

---

## 🧭 System Workflow Overview

> 🔒 **STRICT CONTRACT / DO NOT MODIFY RULE:**
> All endpoints marked with `[DONE ✅]` are fully built, tested, integrated, and active. 
> **Never modify, break, or change the request/response structure of these existing working APIs** in future tasks unless explicitly requested by the user.

```text
[FOUNDATION APIS] ✅
  ├─► POST /api/auth/send-otp           [DONE ✅] (Send WhatsApp OTP)
  ├─► POST /api/auth/verify-otp         [DONE ✅] (Verify OTP, Login/Register, Get JWT Token)
  ├─► GET  /api/auth/profile            [DONE ✅] (Get User Profile Info)
  ├─► PATCH/api/auth/profile            [DONE ✅] (Update Profile Info)
  ├─► POST /api/wardrobe/create-wardrobe[DONE ✅] (Create Almari Container: Name, Owner Name, Optional Face)
  └─► GET  /api/wardrobe/get-wardrobes  [DONE ✅] (List User Almaris / Store Containers)

=============================================================================
FLOW 1: GALLERY PHOTO FLOW (3-STEP MODULAR PIPELINE WITH WARDROBE OWNER FACE)
=============================================================================
  [STEP 1: FACE MATCH] 
    └─► POST /api/face-recognition/verify-user-face 
        (Checks photo against target Wardrobe Owner Face -> returns matched: true/false & face boundingBox)

  [STEP 2: DRESS SCAN & ANALYSIS (Single or Bulk 1-100 Photos)]
    └─► POST /api/wardrobe/analyze-photo             
        (Isolates clothing, removes background, auto-detects name, category, color, fabric, etc.)

  [STEP 3: STORE TO WARDROBE (Single or Bulk 1-100 Photos)]
    └─► POST /api/wardrobe/add-item                 
        (Persists verified dress item into Almari)

=============================================================================
FLOW 2: DIRECT DRESS / CAMERA CLICK FLOW (HANGING / FLAT LAY / MANNEQUIN)
=============================================================================
  [DIRECT DRESS FLOW - NO FACE REQUIRED (Single or Bulk 1-100 Photos)]
    ├─► Option A (Preview First): 
    │     1. POST /api/wardrobe/analyze-photo        [DONE ✅] (AI scans dress & returns pre-fill fields for UI preview)
    │     2. POST /api/wardrobe/add-item             [DONE ✅] (Review/edit fields and save to Almari)
    └─► Option B (1-Click Fast Save):
          └─► POST /api/wardrobe/add-item            [DONE ✅] (Upload 1 or bulk 1-100 photos -> AI auto-fills & stores in 1-shot)

[WARDROBE ITEMS CRUD] ✅
  ├─► GET    /api/wardrobe/get-all-items             [DONE ✅] (Search, Filter & Paginate Items)
  ├─► GET    /api/wardrobe/get-item-details/:id      [DONE ✅] (Get Full Item Details)
  ├─► PATCH  /api/wardrobe/update-item/:id           [DONE ✅] (Update Item Details)
  └─► DELETE /api/wardrobe/delete-item/:id           [DONE ✅] (Delete Item from Almari)
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

### 3.4 Verify User / Wardrobe Owner Face in Photo (Step 1 of Gallery Flow)
- **Overview & Functionality:** 
  Scans an uploaded gallery image to detect human faces, extracts facial landmark embeddings, and computes vector similarity:
  - Agar `wardrobeId` pass kiya gaya hai: toh us specific **Wardrobe Owner ke Face** (`wardrobe.ownerFaceImage` / `wardrobe.referenceFace`) se match karta hai (e.g. "Papa ki Almari" me Papa ka face).
  - Agar `wardrobeId` nahi diya: toh logged-in user ke profile reference face se match karta hai.
  > ℹ️ **Note:** This endpoint performs **biometric face verification only**; it **does NOT extract or crop clothing items**.
- **When to Use:**
  - Gallery Flow ke **Step 1** me: jab user gallery se photos select kare aur frontend ko green tick show karna ho ki target Almari Owner photo me present hai ya nahi.
  - Client-side gallery photo filtering ke liye.
- **How to Use (Step-by-Step):**
  1. Send a `POST` request with the authenticated user's Bearer JWT in the `Authorization` header.
  2. Provide the image file in `multipart/form-data` under the key `photo` (or `image`).
  3. *(Recommended)* Pass `wardrobeId` to match against that specific Almari Owner's face.
  4. *(Optional)* Pass custom `threshold` (default is `0.50`).
  5. Response me `matched: true` aane par UI me "Face Verified ✅" indicator show karein aur bounding box ko Step 2 (`analyze-photo`) me pass karein!
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/verify-user-face` *(Aliases: `/api/face-recognition/scan-gallery-photo`, `/api/face-recognition/scan-photo`, `/api/face-recognition/scan`)*
- **Request:**
  - Headers: 
    - `Authorization: Bearer <JWT_TOKEN>`
    - `Content-Type: multipart/form-data`
  - Form-Data:
    - `photo` (or `image`, `file`) *(file, required)*: Photo file to scan (JPEG, PNG, WEBP, max 20MB)
    - `wardrobeId` *(text, optional)*: Target Almari ID (matches against Wardrobe Owner Face)
    - `threshold` *(number, optional)*: Match distance threshold (Default: `0.50`)
- **Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Face matched successfully (Rajesh Sharma) - 1 face(s) verified",
  "data": {
    "targetPersonName": "Rajesh Sharma",
    "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
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
    "data": {
        "userId": "6ac34c5bfd79ed5569324cd1",
        "name": "Master Bedroom Almari",
        "storeType": "WARDROBE",
        "type": "PERSONAL",
        "ownerName": "Rahul Sharma",
        "coverImage": "",
        "ownerFaceImage": "",
        "referenceFace": {
            "embedding": []
        },
        "isDefault": true,
        "isActive": true,
        "_id": "6ac622afe824410c3e3221bf",
        "createdAt": "2026-10-07T10:45:03.961Z",
        "updatedAt": "2026-10-07T10:45:03.961Z",
        "__v": 0,
        "id": "6ac622afe824410c3e3221bf"
    },
    "message": "Wardrobe closet created successfully",
    "success": true
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
    "data": [
        {
            "_id": "6ac622afe824410c3e3221bf",
            "userId": "6ac34c5bfd79ed5569324cd1",
            "name": "Master Bedroom Almari",
            "storeType": "WARDROBE",
            "type": "PERSONAL",
            "ownerName": "Rahul Sharma",
            "coverImage": "",
            "ownerFaceImage": "",
            "isDefault": true,
            "isActive": true,
            "createdAt": "2026-10-07T10:45:03.961Z",
            "updatedAt": "2026-10-07T10:45:03.961Z",
            "__v": 0,
            "id": "6ac622afe824410c3e3221bf"
        }
    ],
    "message": "Wardrobe closets fetched successfully",
    "success": true
}


```

---

# SECTION 5: DRESS & STORE ITEMS MANAGEMENT (`/api/wardrobe`)

### 5.1 Add Item to Almari (Single or 1-100 Bulk Photos with AI Auto-Fill OR Manual JSON)
- **Description:** Naya dress item Almari me add karta hai. Single photo ya ek sath bulk photos (1 se 100 tak) add kar sakte hain:
  1. **Option A (Camera Click / Photo Upload - Single ya 1-100 Bulk Photos):** Kapde ki photo bhejein (`photo` ya `photos` / `image` / `images`). AI dress ko analyze karega, background remove karke transparent WebP crop generate karega, aur saare fields (`name`, `category`, `subCategory`, `color`, `fabric`, `pattern`, `fit`, `neckline`, `sleeveLength`, `occasions`, `seasons`, `tags`) backend me **AUTOMATICALLY AUTO-FILL** karke database me save kar dega! User chahe to sath me custom fields (`name`, `brand`, `size`, `wardrobeId`) bhej kar override bhi kar sakta hai.
     - **Single Photo:** Returns single created `WardrobeItem` object.
     - **Multiple Photos (Bulk 1 to 100):** Ek sath sabhi photos ko process karke items create karta hai aur `{ totalPhotosReceived, totalItemsCreated, items: [...] }` return karta hai.
  2. **Option B (Manual JSON Entry - Application/JSON):** Custom fields manually enter karke add karein.
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/add-item` *(Alias: `/api/wardrobe/items`)*

#### Option A: Camera Click / Photo Upload with AI Auto-Fill (Single or Bulk 1 to 100)
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
  - Form-Data:
    - `photo` (or `photos`, `image`, `images`) *(file / array of files, required)*: Single photo or 1 to 100 photo files of clothes
    - `wardrobeId` *(text, optional)*: Almari container ID (defaults to user's default wardrobe)
    - `name` *(text, optional)*: Custom name (agar pass nahi kiya toh AI auto-generate karega)
    - `brand` *(text, optional)*: e.g. `"Zara"`
    - `size` *(text, optional)*: e.g. `"M"`
    - `isFavorite` *(boolean, optional)*: `true` / `false`
- **Response (Single Photo):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Item added successfully to wardrobe store",
  "data": {
    "_id": "6ac8d17cdaae1c044a53c0e6",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
    "name": "Navy Blue Formal Linen Shirt",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "color": "Navy Blue",
    "fabric": "LINEN",
    "pattern": "SOLID",
    "fit": "SLIM_FIT",
    "neckline": "Collar",
    "sleeveLength": "FULL_SLEEVE",
    "occasion": ["OFFICE", "FORMAL", "PARTY"],
    "season": ["SUMMER", "ALL_SEASON"],
    "style": "Formal",
    "brand": "Zara",
    "size": "M",
    "images": [
      {
        "url": "/uploads/crops/segmented/seg-0-1791545718711.webp",
        "isPrimary": true
      }
    ],
    "sourceType": "CAMERA_CAPTURE",
    "sourcePhotoUrl": "/uploads/img_camera_photo.jpg",
    "isFavorite": false,
    "createdAt": "2026-10-09T11:35:00.000Z"
  }
}
```

- **Response (Bulk Photos Upload - e.g. 2+ Photos):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Processed 2 photo(s): 2 new item(s) created",
  "data": {
    "totalPhotosReceived": 2,
    "totalItemsCreated": 2,
    "items": [
      {
        "_id": "6ac8d17cdaae1c044a53c0e6",
        "name": "Navy Blue Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "fabric": "LINEN",
        "images": [
          {
            "url": "/uploads/crops/segmented/seg-0-1791545718711.webp",
            "isPrimary": true
          }
        ]
      },
      {
        "_id": "6ac8d17cdaae1c044a53c0e7",
        "name": "Beige Chino Trousers",
        "category": "BOTTOM_WEAR",
        "subCategory": "Trousers",
        "color": "Beige",
        "fabric": "COTTON",
        "images": [
          {
            "url": "/uploads/crops/segmented/seg-0-1791545718712.webp",
            "isPrimary": true
          }
        ]
      }
    ]
  }
}
```

#### Option B: Manual JSON Entry
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

### 5.2 Analyze Dress Photo Preview (AI Pre-Fill Preview Endpoint - Single or 1-100 Bulk Photos)
- **Description:** Agar frontend me photo upload karne ke baad UI form me pehle fields prefill karke dikhana ho (user ko verify ya edit karne dene ke liye), toh is endpoint par photo bhejein. AI dress photo ko scan karke clean `autoFilledFields` return karta hai bina database me item create kiye.
  - **Single Photo:** Returns single photo analysis with pre-filled form fields (`autoFilledFields`).
  - **Bulk Photos (1 to 100):** Ek sath sabhi photos analyze karta hai aur `{ totalPhotosAnalyzed, totalGarmentsDetected, items: [...] }` return karta hai.
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/analyze-photo` *(Alias: `/api/cloth-analysis/analyze-photo`)*
- **Request:**
  - Headers: `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: multipart/form-data`
  - Form-Data:
    - `photo` (or `photos`, `image`, `images`) *(file / array of files, required)*: Single dress photo or up to 100 clothing photo files
    - `wardrobeId` *(text, optional)*: Target wardrobe ID
- **Response (Single Photo):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Photo analyzed successfully with clothing recognition",
  "data": {
    "originalImageUrl": "/uploads/img_dress_photo.jpg",
    "sourceImageHash": "a1b2c3d4e5f6...",
    "detectedItemsCount": 1,
    "autoFilledFields": {
      "name": "Navy Blue Formal Linen Shirt",
      "category": "UPPER_WEAR",
      "subCategory": "Shirt",
      "color": "Navy Blue",
      "fabric": "LINEN",
      "pattern": "SOLID",
      "fit": "SLIM_FIT",
      "neckline": "Collar",
      "sleeveLength": "FULL_SLEEVE",
      "sleeveStyle": "FULL_SLEEVE",
      "occasion": ["OFFICE", "FORMAL", "PARTY"],
      "season": ["SUMMER", "ALL_SEASON"],
      "style": "Formal",
      "croppedImageUrl": "/uploads/crops/segmented/seg-0-1791545708048.webp",
      "originalImageUrl": "/uploads/img_dress_photo.jpg",
      "tags": ["Navy Blue", "Shirt", "UPPER_WEAR", "OFFICE"]
    },
    "analysis": [
      {
        "name": "Navy Blue Formal Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/segmented/seg-0-1791545708048.webp"
      }
    ]
  }
}
```

- **Response (Bulk Photos Preview - e.g. 2+ Photos):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Analyzed 2 photo(s): detected 2 garment(s)",
  "data": {
    "totalPhotosAnalyzed": 2,
    "totalGarmentsDetected": 2,
    "items": [
      {
        "photoIndex": 0,
        "originalImageUrl": "/uploads/photo-1.jpg",
        "detectedItemsCount": 1,
        "autoFilledFields": {
          "name": "Navy Blue Formal Linen Shirt",
          "category": "UPPER_WEAR",
          "subCategory": "Shirt",
          "color": "Navy Blue",
          "fabric": "LINEN",
          "croppedImageUrl": "/uploads/crops/segmented/seg-0-1791545708048.webp"
        }
      },
      {
        "photoIndex": 1,
        "originalImageUrl": "/uploads/photo-2.jpg",
        "detectedItemsCount": 1,
        "autoFilledFields": {
          "name": "Beige Chino Trousers",
          "category": "BOTTOM_WEAR",
          "subCategory": "Trousers",
          "color": "Beige",
          "fabric": "COTTON",
          "croppedImageUrl": "/uploads/crops/segmented/seg-1-1791545708049.webp"
        }
      }
    ]
  }
}
```

---

### 5.3 Get All Items (Search, Filter & Pagination)
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

### 5.4 Get Item Details by ID
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

### 5.5 Update Wardrobe Item
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

### 5.6 Delete Item from Wardrobe
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

# SECTION 6: MEDIA UPLOAD & STORAGE APIS

### 6.1 Single Image Upload (Multipart File or Base64)
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

### 6.2 Multiple Images Upload
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

### 6.3 Delete Stored Image
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

# SECTION 7: SUMMARY OF ALL ACTIVE API ENDPOINTS

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
| 14 | Verify User / Owner Face in Photo (Step 1) | `POST` | `/api/face-recognition/verify-user-face` | Yes |
| 15 | Create Wardrobe Almari | `POST` | `/api/wardrobe/create-wardrobe` | Yes |
| 16 | Get All Wardrobes / Stores | `GET` | `/api/wardrobe/get-wardrobes` | Yes |
| 17 | Analyze Dress Photo Preview (Single / 1-100 Bulk) | `POST` | `/api/wardrobe/analyze-photo` | Yes |
| 18 | Add Item to Almari (Single / 1-100 Bulk Photo Auto-Fill OR JSON) | `POST` | `/api/wardrobe/add-item` | Yes |
| 19 | Get All Items (Filter & Search) | `GET` | `/api/wardrobe/get-all-items` | Yes |
| 20 | Get Item Details by ID | `GET` | `/api/wardrobe/get-item-details/:id` | Yes |
| 21 | Update Wardrobe Item | `PATCH` | `/api/wardrobe/update-item/:id` | Yes |
| 22 | Delete Wardrobe Item | `DELETE` | `/api/wardrobe/delete-item/:id` | Yes |
