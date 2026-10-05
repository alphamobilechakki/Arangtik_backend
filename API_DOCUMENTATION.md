# Arangtik Backend API Documentation & Developer Integration Guide

**Base URL:** `http://localhost:8085/api` (or `/api/v1/`)

---

## 🧭 Developer Integration Flow

Frontend / Client application ko in steps ke anusaar APIs integrate karni chahiye:

```text
========================================================================================
[STEP 1] AUTHENTICATION (Quick Mobile Login)
  ├─► POST /api/auth/send-otp           (WhatsApp OTP dispatch)
  └─► POST /api/auth/verify-otp         (Verify OTP, login/register, receive JWT token)
         │
[STEP 2] PROFILE SETUP & REFERENCE BIOMETRIC
  ├─► PATCH /api/auth/profile           (Set Profile: Name, Gender [MALE/FEMALE for AI Styling], Account Type [INDIVIDUAL/COMMERCIAL/INDUSTRIAL])
  ├─► POST /api/auth/profile-image      (Upload Photo -> Auto 1-Face Validate -> Auto 128-d Biometric Embedding Cache)
  └─► GET  /api/face-recognition/reference (Optional: Check biometric status / metadata)
         │
[STEP 3] CLOSETS & COLLECTIONS SETUP (Optional / Organizing)
  ├─► POST /api/wardrobe/create-wardrobe (Create Closet, e.g. "My Wardrobe", "Mummy Wardrobe")
  ├─► GET  /api/wardrobe/get-wardrobes   (List all active closets)
  ├─► POST /api/wardrobe/create-collection (Create tags/collections, e.g. "Festive", "Office")
  └─► GET  /api/wardrobe/get-collections (Fetch collections)
         │
[STEP 4] AI VISION & SMART GALLERY PIPELINE
  ├─► POST /api/face-recognition/scan    (Detect & match user face in gallery photo)
  ├─► POST /api/wardrobe/analyze-photo   (AI extract garments, auto-crop, detect duplicates)
  ├─► POST /api/wardrobe/scan-gallery-photo (Single photo: Face match + garment extraction)
  ├─► POST /api/wardrobe/bulk-add-photos (Bulk 1-100 standalone dress photos ingestion)
  └─► POST /api/wardrobe/ingest-gallery  (End-to-end: Face match -> AI clothes -> Wardrobe DB)
         │
[STEP 5] DIGITAL WARDROBE STORE MANAGEMENT
  ├─► POST   /api/wardrobe/add-item           (Manual or verified item addition)
  ├─► GET    /api/wardrobe/get-all-items      (Search, filter, paginate wardrobe items)
  ├─► GET    /api/wardrobe/get-item-details/:id (Get single item complete details)
  ├─► PATCH  /api/wardrobe/update-item/:id    (Edit item metadata/attributes)
  ├─► PATCH  /api/wardrobe/update-item-status/:id (Update status: AVAILABLE, DIRTY, etc.)
  └─► DELETE /api/wardrobe/delete-item/:id    (Soft archive or permanent delete)
========================================================================================
```

---

## 📌 Standard API Response Structure

Sabhi API responses uniform format follow karte hain:

### Success Response:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Action completed successfully",
  "data": { ... }
}
```

### Error Response:
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Specific error description",
  "errors": []
}
```

---

# ========================================================================
# ==================== STEP 0: SERVER HEALTH & STATUS ====================
# ========================================================================

## 1. Health Check & Root

### 1.1 Root Info
- **Method:** `GET`
- **Endpoint:** `/`
- **Access:** Public
- **Description:** Server status aur basic metadata check karne ke liye.

#### Response `200 OK`:
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
- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Access:** Public
- **Description:** Backend service uptime aur health monitoring ke liye.

#### Response `200 OK`:
```json
{
  "status": "ok",
  "message": "Arangtik Backend API is healthy"
}
```

---

# ========================================================================
# ==================== STEP 1: AUTHENTICATION & PROFILE ==================
# ========================================================================

## 2. Authentication Module (`/api/auth`)

### 2.1 Send OTP (WhatsApp)
- **Method:** `POST`
- **Endpoint:** `/api/auth/send-otp`
- **Access:** Public
- **Description:** WhatsApp par 4-digit OTP bhejta hai aur check karta hai ki user registered hai ya new.

#### Request Headers:
`Content-Type: application/json`

#### Request Body:
```json
{
  "phone": "9876543210"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | Yes | 10-digit mobile number (country code optional, auto-formats to 91...) |

#### Response `200 OK` (Success):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP sent successfully to your WhatsApp number",
  "data": {
    "phone": "919876543210",
    "isExistingUser": false,
    "expiresInMinutes": 5,
    "devOtp": "4821"
  }
}
```
*(Note: `devOtp` sirf development / testing environment me aata hai).*

#### Response `400 Bad Request`:
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Please provide a valid 10-digit mobile number"
}
```

---

### 2.2 Verify OTP & Login / Register
- **Method:** `POST`
- **Endpoint:** `/api/auth/verify-otp`
- **Access:** Public
- **Description:** OTP verify karke user ko login ya new account register karta hai aur JWT access token return karta hai.

#### Request Headers:
`Content-Type: application/json`

#### Request Body:
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
| `otp` | `string` | Yes | 4-digit OTP code |
| `name` | `string` | Optional | User ka name (new user registration ke time) |

#### Response `200 OK` (Success):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdhOGI5YzBkMSIsInBob25lIjoiOTE5ODc2NTQzMjEwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3MTIwMDAwMDB9...",
    "user": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Rahul Sharma",
      "phone": "919876543210",
      "gender": "UNSPECIFIED",
      "accountType": "INDIVIDUAL",
      "role": "user",
      "status": "active"
    },
    "isNewUser": true
  }
}
```

#### Response `400 Bad Request` (Invalid OTP):
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid or expired OTP"
}
```

#### Response `403 Forbidden` (Account Blocked):
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Your account has been deactivated or blocked. Please contact support."
}
```

---

### 2.3 Get Current User Profile (`/me`)
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Logged-in user ki profile details fetch karta hai.

#### Request Headers:
- `Authorization: Bearer <JWT_TOKEN>`

#### Response `200 OK` (Success):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "phone": "919876543210",
    "name": "Rahul Sharma",
    "gender": "MALE",
    "accountType": "INDIVIDUAL",
    "role": "user",
    "status": "active",
    "profileImage": "/uploads/image-1712000000000.jpg",
    "createdAt": "2026-09-26T10:00:00.000Z",
    "updatedAt": "2026-09-26T10:00:00.000Z"
  }
}
```

---

### 2.4 Update Profile Details (Edit Profile)
- **Method:** `PATCH`
- **Endpoint:** `/api/auth/profile`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User ki profile details edit karta hai jaise Name, Gender (`MALE`/`FEMALE`/`OTHER`), Account Type (`INDIVIDUAL`/`COMMERCIAL`/`INDUSTRIAL`), aur Profile Image URL.

#### Request Headers:
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

#### Request Body:
```json
{
  "name": "Rahul Sharma",
  "gender": "MALE",
  "accountType": "COMMERCIAL",
  "profileImage": "/uploads/image-1712000000000.jpg"
}
```

| Field | Type | Required | Allowed Values | Description |
|---|---|---|---|---|
| `name` | `string` | Optional | Any valid string | User display name |
| `gender` | `string` | Optional | `'MALE'`, `'FEMALE'`, `'OTHER'`, `'UNSPECIFIED'` | AI suggestion customization ke liye |
| `accountType` | `string` | Optional | `'INDIVIDUAL'`, `'COMMERCIAL'`, `'INDUSTRIAL'`, `'OTHER'` | Individual person vs Commercial store vs Industrial setup |
| `profileImage` | `string` | Optional | Image URL / path | Profile image link |

#### Response `200 OK`:
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
    "accountType": "COMMERCIAL",
    "role": "user",
    "status": "active",
    "profileImage": "/uploads/image-1712000000000.jpg",
    "updatedAt": "2026-10-02T14:30:00.000Z"
  }
}
```

---

### 2.5 Upload Profile Photo & Auto-Register Face Biometric (1-Step Unified Setup)
- **Method:** `POST`
- **Endpoint:** `/api/auth/profile-image`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** **1-Step Unified API:** User ki profile photo upload karta hai, backend par automatically check karta hai ki photo me exactly 1 clear single face hai, aur sath hi 128-d reference face embedding generate karke database me cache kar deta hai. *(Frontend ko alag se validation ya embedding generation API call karne ki koi zaroorat nahi hai).*

#### Request Headers:
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: multipart/form-data`

#### Multipart Form Data:
| Field | Type | Required | Description |
|---|---|---|---|
| `image` | `file` | Yes | Profile photo file (JPEG, PNG, WebP) |

#### Response `200 OK` (Success):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile image uploaded and reference face biometric registered successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Rahul Sharma",
    "phone": "919876543210",
    "role": "user",
    "status": "active",
    "profileImage": "/uploads/image-1712000000000-123456789.jpg",
    "referenceFace": {
      "hasReferenceFace": true,
      "boundingBox": {
        "x": 120,
        "y": 80,
        "width": 180,
        "height": 220
      },
      "detectionConfidence": 0.9921,
      "lastGeneratedAt": "2026-10-02T12:00:00.000Z"
    }
  }
}
```

#### Response `422 Unprocessable Entity` (Multiple Faces in Photo):
```json
{
  "statusCode": 422,
  "success": false,
  "message": "Multiple faces (2) detected in the profile image. Please upload a photo with only yourself."
}
```

#### Response `422 Unprocessable Entity` (No Face Detected):
```json
{
  "statusCode": 422,
  "success": false,
  "message": "No face detected in the profile image. Please upload a clear profile photo containing your face."
}
```

---

### 2.6 Logout
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User session logout karta hai.

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

# ========================================================================
# ================= STEP 2: FACE RECOGNITION & BIOMETRICS ===============
# ========================================================================

## 3. Face Recognition Module (`/api/face-recognition` or `/api/v1/face-recognition`)

### 3.1 Validate Reference Profile Photo
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/reference/validate`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User ki existing profile photo ko scan karke verify karta hai ki usme exactly 1 clear face maujood hai ya nahi.

#### Response `200 OK` (Valid Single Face):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile image validated for face recognition",
  "data": {
    "isValid": true,
    "profileImage": "/uploads/image-1712000000000.jpg",
    "faceDetected": true,
    "confidence": 0.9921,
    "boundingBox": {
      "x": 120,
      "y": 80,
      "width": 180,
      "height": 220
    },
    "message": "Profile image contains a valid single reference face ready for recognition."
  }
}
```

#### Response `422 Unprocessable Entity` (Multiple Faces Detected):
```json
{
  "statusCode": 422,
  "success": false,
  "message": "Multiple faces (2) detected in the profile image. Please upload a photo with only yourself."
}
```

---

### 3.2 Generate / Refresh Reference Face Embedding
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/reference`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User ki profile image se 128-d reference face embedding calculate karke secure database me cache karta hai.

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Reference face embedding generated successfully",
  "data": {
    "hasReferenceFace": true,
    "profileImage": "/uploads/image-1712000000000.jpg",
    "boundingBox": {
      "x": 120,
      "y": 80,
      "width": 180,
      "height": 220
    },
    "detectionConfidence": 0.9921,
    "lastGeneratedAt": "2026-10-02T12:00:00.000Z"
  }
}
```

---

### 3.3 Get Reference Face Status
- **Method:** `GET`
- **Endpoint:** `/api/face-recognition/reference`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Reference face embedding status aur metadata retrieve karta hai.

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Reference face status retrieved successfully",
  "data": {
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "hasProfileImage": true,
    "profileImage": "/uploads/image-1712000000000.jpg",
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
      "imagePath": "/uploads/image-1712000000000.jpg"
    }
  }
}
```

---

### 3.4 Delete Reference Face Embedding
- **Method:** `DELETE`
- **Endpoint:** `/api/face-recognition/reference`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User ka cached reference face embedding delete karta hai.

#### Response `200 OK`:
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

### 3.5 Scan Single Gallery Photo for Face Matching
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/scan`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Ek gallery photo me sabhi chehre scan karke authenticated user ke reference face ke sath Euclidean distance & cosine similarity compare karta hai.

#### Request Options:
1. **Multipart Form-Data:** `image` file
2. **JSON Body:** `{ "imageUrl": "/uploads/photo.jpg" }`
3. **Query Parameter (Optional):** `?threshold=0.55` (Default: `0.60`)

#### Response `200 OK` (User Face Matched):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Gallery image scan completed",
  "data": {
    "imageId": "image-1712000045000-987654321.jpg",
    "matched": true,
    "facesDetected": 2,
    "matchedFaces": [
      {
        "faceIndex": 0,
        "confidence": 0.9854,
        "similarity": 0.78,
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
        "similarity": 0.78,
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
      }
    ],
    "thresholdUsed": 0.6,
    "processingTimeMs": 312
  }
}
```

---

# ========================================================================
# ================= STEP 3: CLOSETS & COLLECTIONS =======================
# ========================================================================

## 4. Closets & Collections Management (`/api/wardrobe` or `/api/v1/wardrobe`)

### 4.1 Create Wardrobe / Closet
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/create-wardrobe` *(Aliases: `/create-closet`, `/closets`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Ek naya Wardrobe container (jaise "My Wardrobe", "Mummy Wardrobe", "Summer Capsule") create karta hai. Optional photo upload karne par closet owner ka face embedding automatically extract ho jata hai.

#### Request Headers:
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: multipart/form-data` ya `application/json`

#### Request Fields:
| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Closet ka name (e.g. "Main Bedroom Wardrobe") |
| `description` | `string` | No | Description |
| `type` | `string` | No | `'PERSONAL'`, `'FAMILY'`, `'CAPSULE'`, `'SHARED'`, `'SEASONAL'`, `'OTHER'` (Default: `PERSONAL`) |
| `ownerName` | `string` | No | Closet owner name |
| `isDefault` | `boolean` | No | Primary default wardrobe banana hai ya nahi (`true`/`false`) |
| `coverImage` / `photo` / `image` | `file` / `string` | No | Cover photo ya owner face photo |

#### Response `201 Created`:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Wardrobe closet created successfully",
  "data": {
    "_id": "674f1b2c3d4e5f6a7b8c9d10",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Main Bedroom Wardrobe",
    "description": "Daily and office wear collection",
    "type": "PERSONAL",
    "ownerName": "Rahul Sharma",
    "coverImage": "/uploads/closet-1790000.jpg",
    "isDefault": true,
    "isActive": true,
    "createdAt": "2026-10-02T14:00:00.000Z",
    "updatedAt": "2026-10-02T14:00:00.000Z"
  }
}
```

---

### 4.2 Get All Wardrobes / Closets
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-wardrobes` *(Aliases: `/get-closets`, `/closets`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Logged-in user ke sabhi active closets fetch karta hai.

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe closets fetched successfully",
  "data": [
    {
      "_id": "674f1b2c3d4e5f6a7b8c9d10",
      "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Main Bedroom Wardrobe",
      "type": "PERSONAL",
      "isDefault": true,
      "isActive": true,
      "createdAt": "2026-10-02T14:00:00.000Z"
    }
  ]
}
```

---

### 4.3 Create Collection Inside a Wardrobe
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/create-collection` *(Alias: `/collections`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Kisi specific wardrobe ke andar Collection/Album create karta hai (e.g. "Festive Wear", "Office Formals").

#### Request Body (`application/json`):
```json
{
  "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
  "name": "Office Formals",
  "type": "CUSTOM",
  "description": "Shirts, blazers and trousers for corporate work",
  "colorTheme": {
    "primary": "#1E3A8A",
    "secondary": "#93C5FD",
    "accent": "#F59E0B"
  },
  "season": ["ALL_SEASON"],
  "occasion": ["OFFICE", "FORMAL"],
  "style": ["FORMAL", "SMART_CASUAL"]
}
```

#### Response `201 Created`:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Collection created successfully",
  "data": {
    "_id": "674f1b2c3d4e5f6a7b8c9d20",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
    "name": "Office Formals",
    "type": "CUSTOM",
    "isActive": true,
    "createdAt": "2026-10-02T14:15:00.000Z"
  }
}
```

---

### 4.4 Get Collections
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-collections` *(Alias: `/collections`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Query Parameter:** `?wardrobeId=674f1b2c3d4e5f6a7b8c9d10` (Optional filter)
- **Description:** User ke sabhi collections fetch karta hai.

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Collections fetched successfully",
  "data": [
    {
      "_id": "674f1b2c3d4e5f6a7b8c9d20",
      "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
      "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
      "name": "Office Formals",
      "type": "CUSTOM",
      "isActive": true
    }
  ]
}
```

---

# ========================================================================
# ================= STEP 4: AI SCAN & SMART GALLERY INGESTION ===========
# ========================================================================

## 5. AI Vision & Ingestion Module (`/api/wardrobe` or `/api/v1/wardrobe`)

### 5.1 Analyze Single Photo (AI Garment Recognition & Crop)
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/analyze-photo` *(Alias: `/analyze`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Photo upload karke usme maujood kapde recognize karta hai, auto-crop karke transparent/segmented images banata hai, aur user ke existing wardrobe ke sath similarity match evaluate karta hai.

#### Request Form-Data:
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` | `file` | Yes | Uploaded photo file (JPEG, PNG, WebP) |

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Photo analyzed successfully with clothing recognition",
  "data": {
    "originalImageUrl": "/uploads/photo-1790589292516.jpg",
    "sourceImageHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "detectedItemsCount": 2,
    "analysis": [
      {
        "tempDetectionId": "det_1",
        "name": "Navy Blue Slim Fit Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/crop-1790589292535-0-2425.webp",
        "attributes": {
          "primaryColor": "Navy Blue",
          "secondaryColors": ["Dark Blue"],
          "pattern": "SOLID",
          "fabric": "LINEN",
          "fit": "SLIM_FIT",
          "sleeveLength": "FULL_SLEEVE",
          "occasions": ["OFFICE", "FORMAL", "PARTY"],
          "seasons": ["SUMMER", "ALL_SEASON"]
        },
        "matchResult": {
          "status": "NEW_ITEM",
          "confidenceScore": 0.1,
          "message": "New dress detected! Ready to add to wardrobe.",
          "existingItem": null,
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
          "pattern": "SOLID",
          "fabric": "DENIM",
          "fit": "REGULAR_FIT",
          "occasions": ["CASUAL", "DAILY"]
        },
        "matchResult": {
          "status": "EXACT_MATCH",
          "confidenceScore": 1.0,
          "message": "This dress is already registered in your wardrobe as \"Light Blue Denim Jeans\".",
          "existingItem": {
            "_id": "6aba317270f26b72d852616f",
            "name": "Light Blue Denim Jeans",
            "category": "LOWER_WEAR"
          }
        }
      }
    ]
  }
}
```

---

### 5.2 Scan Single Gallery Photo (Face Verification + Clothes Extract)
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/scan-gallery-photo` *(Alias: `/scan`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Gallery photo me authenticated user ka face check karta hai. Agar user match hota hai to keval uske dwara pehne hue garments extract karta hai. Agar user match nahi hota to unnecessary analysis skip kar deta hai.

#### Request Form-Data:
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` / `image` | `file` | Yes | Gallery photo file |
| `threshold` | `number` | No | Optional face matching distance threshold (Default: `0.50`) |
| `wardrobeId` | `string` | No | Target wardrobe ID |
| `collectionId` | `string` | No | Target collection ID |

#### Response `200 OK` (User Found):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User matched successfully! Extracted 1 clothing items.",
  "data": {
    "matched": true,
    "matchedFace": {
      "confidence": 0.9999,
      "similarity": 1.0,
      "distance": 0,
      "boundingBox": { "x": 420, "y": 180, "width": 160, "height": 160 }
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
        "matchType": "NEW_ITEM"
      }
    ]
  }
}
```

#### Response `200 OK` (User Not in Photo):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User face not detected in this photo. Skipped clothing extraction.",
  "data": {
    "matched": false,
    "reason": "USER_NOT_FOUND",
    "facesDetected": 1,
    "originalImageUrl": "/uploads/photo-1790941677639.jpg",
    "items": []
  }
}
```

---

### 5.3 Bulk Add Dress Photos (1 to 100 Standalone Photos)
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/bulk-add-photos`
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Multiple standalone kapdo ki photos ko ek sath batch me AI analysis karke direct wardrobe me add karta hai.

#### Request Form-Data:
| Field | Type | Required | Description |
|---|---|---|---|
| `photos` | `file[]` | Yes | Array of image files (1 to 100 files) |
| `wardrobeId` | `string` | No | Target wardrobe ID |
| `collectionId` | `string` | No | Target collection ID |
| `storagePlace` | `string` | No | Storage location (Default: `"Main Closet"`) |

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Bulk processing complete: 5 items added to wardrobe, 1 existing items matched",
  "data": {
    "totalImagesProcessed": 6,
    "newItemsCreated": [ ... ],
    "existingMatches": [ ... ]
  }
}
```

---

### 5.4 Ingest Entire Gallery (End-to-End Pipeline)
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/ingest-gallery` *(Alias: `/api/face-recognition/scan-and-ingest`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User ki gallery photos (up to 100) upload karke pura pipeline chalata hai:
  1. User face detect & verify karta hai.
  2. Matched photos se kapde extract karta hai.
  3. Jo kapda pehle se wardrobe me hai uske liye wear log update karta hai.
  4. Jo naya kapda hai use automatically `WardrobeItem` database me store karta hai.

#### Request Form-Data:
| Field | Type | Required | Description |
|---|---|---|---|
| `photos` | `file[]` | Yes | Array of image files |
| `wardrobeId` | `string` | No | Target wardrobe ID |
| `collectionId` | `string` | No | Target collection ID |
| `autoCreateNewItems` | `boolean` | No | Automatic DB item creation (`true`/`false`, default: `true`) |
| `threshold` | `number` | No | Face match threshold (Default: `0.50`) |

#### Response `200 OK`:
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
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "images": [
          {
            "url": "/uploads/crops/crop-179093-0-1234.webp",
            "isPrimary": true
          }
        ],
        "attributes": {
          "primaryColor": "Navy Blue",
          "fabric": "LINEN",
          "fit": "SLIM_FIT"
        },
        "currentStatus": "AVAILABLE",
        "createdAt": "2026-10-02T15:28:00.000Z"
      }
    ],
    "wearLogsCreated": [],
    "details": [
      {
        "filename": "gallery_1.jpg",
        "isUserFound": true,
        "garmentsDetected": 2,
        "newItemsAdded": 2
      },
      {
        "filename": "landscape.jpg",
        "isUserFound": false,
        "message": "User face not detected in this photo. Skipped wardrobe extraction."
      }
    ]
  }
}
```

---

# ========================================================================
# ================= STEP 5: DIGITAL WARDROBE STORE ======================
# ========================================================================

## 6. Wardrobe Store & Items Management (`/api/wardrobe` or `/api/v1/wardrobe`)

### 6.1 Add Item Manually
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/add-item` *(Alias: `/items`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User ke digital wardrobe me naya kapda ya accessory add karta hai.

#### Request Body (`application/json`):
```json
{
  "name": "Navy Blue Formal Linen Shirt",
  "wardrobeId": "674f1b2c3d4e5f6a7b8c9d10",
  "collectionId": "674f1b2c3d4e5f6a7b8c9d20",
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
    "careInstructions": "Use mild detergent"
  },
  "tags": ["formal", "linen", "blue", "office"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Item display name |
| `category` | `string` | Yes | Category (`UPPER_WEAR`, `LOWER_WEAR`, `TRADITIONAL`, `FOOTWEAR`, `OUTERWEAR`, etc.) |
| `subCategory` | `string` | No | Sub-type (`Shirt`, `Jeans`, `Kurta`, etc.) |
| `wardrobeId` | `string` | No | Target Wardrobe ID |
| `collectionId` | `string` | No | Target Collection ID |
| `images` | `array` | No | Array of image objects `[{ url, isPrimary }]` |
| `attributes` | `object` | No | Dynamic attributes bag (`primaryColor`, `fabric`, `brand`, etc.) |
| `currentStatus` | `string` | No | `AVAILABLE`, `IN_USE`, `DIRTY`, `IN_LAUNDRY`, `LENT_OUT`, `IN_REPAIR`, `ARCHIVED` (Default: `AVAILABLE`) |
| `storageLocation` | `object` | No | `{ storagePlace: "Shelf 2" }` |
| `tags` | `array` | No | Keywords array |

#### Response `201 Created`:
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
    "currentStatus": "AVAILABLE",
    "createdAt": "2026-09-28T09:20:50.125Z"
  }
}
```

---

### 6.2 Get All Items (Filter, Search & Paginate)
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-all-items` *(Aliases: `/get-items`, `/items`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** User ke wardrobe items ki list fetch karta hai. Search aur filtering support karta hai.

#### Query Parameters:
| Parameter | Type | Description | Example |
|---|---|---|---|
| `wardrobeId` | `string` | Specific closet filter | `674f1b2c...` |
| `collectionId` | `string` | Specific collection filter | `674f1b2c...` |
| `category` | `string` | Category filter | `UPPER_WEAR` |
| `subCategory` | `string` | Sub-category filter | `Shirt` |
| `status` | `string` | Operational status | `AVAILABLE`, `DIRTY` |
| `color` | `string` | Color filter | `Blue` |
| `occasion` | `string` | Occasion filter | `OFFICE` |
| `season` | `string` | Season filter | `SUMMER` |
| `favorite` | `boolean` | Favorites only | `true` |
| `search` | `string` | Keyword search in name, brand, tags | `zara linen` |
| `sort` | `string` | `newest`, `oldest`, `mostWorn`, `lastWorn` | `newest` |
| `page` | `number` | Page number (Default: `1`) | `1` |
| `limit` | `number` | Items per page (Default: `20`, Max: `100`) | `20` |

#### Response `200 OK`:
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
        "name": "Navy Blue Formal Linen Shirt",
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
          "brand": "Zara",
          "fit": "SLIM_FIT"
        },
        "currentStatus": "AVAILABLE",
        "isFavorite": false,
        "wearCount": 0,
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
  }
}
```

---

### 6.3 Get Item Details by ID
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-item-details/:id` *(Aliases: `/get-item/:id`, `/items/:id`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Kisi ek kapde ki complete information fetch karta hai.

#### Response `200 OK`:
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
      "pattern": "SOLID",
      "fabric": "LINEN",
      "brand": "Zara"
    },
    "currentStatus": "AVAILABLE",
    "currentLocation": {
      "storagePlace": "Master Bedroom Closet - Shelf 2"
    },
    "laundryCare": {
      "washTypePreferred": "HAND_WASH",
      "ironPreferred": true
    },
    "wearCount": 0,
    "tags": ["formal", "linen", "blue", "office"],
    "createdAt": "2026-09-28T09:20:50.125Z",
    "updatedAt": "2026-09-28T09:20:50.125Z"
  }
}
```

---

### 6.4 Update Wardrobe Item
- **Method:** `PATCH`
- **Endpoint:** `/api/wardrobe/update-item/:id` *(Alias: `/items/:id`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Existing wardrobe item ke metadata, attributes, tags, images ya storage location ko update karta hai.

#### Request Body (`application/json`):
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

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item updated successfully",
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "name": "Navy Blue Royal Linen Shirt (Updated)",
    "updatedAt": "2026-09-28T09:58:20.123Z"
  }
}
```

---

### 6.5 Quick Update Item Status
- **Method:** `PATCH`
- **Endpoint:** `/api/wardrobe/update-item-status/:id` *(Alias: `/items/:id/status`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Description:** Item ka status quick change karta hai (`AVAILABLE`, `IN_USE`, `DIRTY`, `IN_LAUNDRY`, `LENT_OUT`, `IN_REPAIR`, `ARCHIVED`).

#### Request Body (`application/json`):
```json
{
  "status": "DIRTY"
}
```

#### Response `200 OK`:
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Item status updated to DIRTY successfully",
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "name": "Navy Blue Royal Linen Shirt",
    "currentStatus": "DIRTY",
    "updatedAt": "2026-09-28T09:59:10.456Z"
  }
}
```

---

### 6.6 Delete / Archive Item
- **Method:** `DELETE`
- **Endpoint:** `/api/wardrobe/delete-item/:id` *(Alias: `/items/:id`)*
- **Access:** Private (`Bearer <JWT_TOKEN>`)
- **Query Parameter:** `?permanent=true` (Optional: Permanent deletion ke liye. Agar omit kiya to soft-archive ho jayega).

#### Response `200 OK` (Soft Archived):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item deleted/archived successfully",
  "data": {
    "deleted": true,
    "archived": true
  }
}
```

#### Response `200 OK` (Permanent Deleted):
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item deleted/archived successfully",
  "data": {
    "deleted": true,
    "permanent": true
  }
}
```

---

# ========================================================================
# ==================== SUMMARY OF IMPLEMENTED ENDPOINTS ==================
# ========================================================================

| Module | Method | Endpoint & Aliases | Purpose | Access |
|---|---|---|---|---|
| **System** | `GET` | `/` | Base root health & status | Public |
| **System** | `GET` | `/api/health` | Health Check | Public |
| **Auth** | `POST` | `/api/auth/send-otp` | Send WhatsApp OTP | Public |
| **Auth** | `POST` | `/api/auth/verify-otp` | Verify OTP & JWT login | Public |
| **Auth** | `GET` | `/api/auth/me` | Fetch logged-in user profile | Private |
| **Auth** | `PATCH`| `/api/auth/profile` | Update profile name, gender, accountType | Private |
| **Auth** | `POST` | `/api/auth/profile-image` | Upload profile photo | Private |
| **Auth** | `POST` | `/api/auth/logout` | Logout user | Private |
| **Face AI** | `POST` | `/api/face-recognition/reference/validate` | Validate profile picture (1 face check) | Private |
| **Face AI** | `POST` | `/api/face-recognition/reference` | Generate/cache reference embedding | Private |
| **Face AI** | `GET` | `/api/face-recognition/reference` | Get reference status & metadata | Private |
| **Face AI** | `DELETE`| `/api/face-recognition/reference` | Delete reference embedding | Private |
| **Face AI** | `POST` | `/api/face-recognition/scan` | Scan single photo for user match | Private |
| **Wardrobe** | `POST` | `/api/wardrobe/create-wardrobe` (`/closets`) | Create Closet container | Private |
| **Wardrobe** | `GET` | `/api/wardrobe/get-wardrobes` (`/closets`) | List user closets | Private |
| **Wardrobe** | `POST` | `/api/wardrobe/create-collection` (`/collections`) | Create collection in closet | Private |
| **Wardrobe** | `GET` | `/api/wardrobe/get-collections` (`/collections`) | List user collections | Private |
| **AI Vision**| `POST` | `/api/wardrobe/analyze-photo` (`/analyze`) | AI Clothing detection & crop | Private |
| **AI Vision**| `POST` | `/api/wardrobe/scan-gallery-photo` (`/scan`)| Face match + Garments extract | Private |
| **AI Vision**| `POST` | `/api/wardrobe/bulk-add-photos` | Bulk 1-100 dress photos ingest | Private |
| **AI Vision**| `POST` | `/api/wardrobe/ingest-gallery` (`/scan-and-ingest`)| End-to-end gallery scan & DB auto-add | Private |
| **Items** | `POST` | `/api/wardrobe/add-item` (`/items`) | Add item to wardrobe store | Private |
| **Items** | `GET` | `/api/wardrobe/get-all-items` (`/items`) | Fetch all items with filters & pagination | Private |
| **Items** | `GET` | `/api/wardrobe/get-item-details/:id` (`/items/:id`)| Get single item details | Private |
| **Items** | `PATCH`| `/api/wardrobe/update-item/:id` (`/items/:id`) | Update item fields | Private |
| **Items** | `PATCH`| `/api/wardrobe/update-item-status/:id` (`/items/:id/status`)| Quick status update | Private |
| **Items** | `DELETE`| `/api/wardrobe/delete-item/:id` (`/items/:id`)| Soft archive / permanent delete | Private |
