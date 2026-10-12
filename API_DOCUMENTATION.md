# 👗 Arangtik Backend API Documentation

> **Next-Generation AI Digital Wardrobe, Closet Ingestion, Biometric Face Match & Smart Styling Engine**  
> **Base URL:** `http://localhost:8085/api` *(or `/api/v1/`)*  
> **Version:** `v1.2.0` • **Environment:** `Development & Production` • **Auth:** `Bearer JWT Token` / `x-api-key`

---

## 📑 Table of Contents (Series by Series)

- [🧭 Complete System Workflow Architecture](#-complete-system-workflow-architecture)
- [SERIES 1: System & Health Checks (`/api`)](#series-1-system--health-checks-api)
  - [1.1 GET / — Root Server Info](#11-get---root-server-info)
  - [1.2 GET /api/health — System Health & DB Connectivity](#12-get-apihealth---system-health--db-connectivity)
- [SERIES 2: Authentication & User Profile (`/api/auth`)](#series-2-authentication--user-profile-apiauth)
  - [2.1 POST /api/auth/send-otp — Send WhatsApp OTP](#21-post-apiauthsend-otp---send-whatsapp-otp)
  - [2.2 POST /api/auth/verify-otp — Verify OTP & Login](#22-post-apiauthverify-otp---verify-otp--login)
  - [2.3 GET /api/auth/profile — Get Current Profile](#23-get-apiauthprofile---get-current-profile)
  - [2.4 PATCH /api/auth/profile — Update Profile & Reference Photo](#24-patch-apiauthprofile---update-profile--reference-photo)
  - [2.5 POST /api/auth/profile-image — Dedicated Profile Image Upload](#25-post-apiauthprofile-image---dedicated-profile-image-upload)
  - [2.6 POST /api/auth/logout — User Session Logout](#26-post-apiauthlogout---user-session-logout)
- [SERIES 3: Biometric Face Recognition Pipeline (`/api/face-recognition`)](#series-3-biometric-face-recognition-pipeline-apiface-recognition)
  - [3.1 POST /api/face-recognition/register — Register User Reference Face](#31-post-apiface-recognitionregister---register-user-reference-face)
  - [3.2 POST /api/face-recognition/verify — Verify Face in Photo](#32-post-apiface-recognitionverify---verify-face-in-photo)
  - [3.3 GET /api/face-recognition/status — Get Face Registration Status](#33-get-apiface-recognitionstatus---get-face-registration-status)
- [SERIES 4: Store Containers & Almari Management (`/api/wardrobe`)](#series-4-store-containers--almari-management-apiwardrobe)
  - [4.1 POST /api/wardrobe/create-wardrobe — Create Wardrobe Closet Container](#41-post-apiwardrobecreate-wardrobe---create-wardrobe-closet-container)
  - [4.2 GET /api/wardrobe/get-wardrobes — List User Wardrobes / Closets](#42-get-apiwardrobeget-wardrobes---list-user-wardrobes--closets)
- [SERIES 5: Clothing AI Scan & Extraction Pipeline (`/api/wardrobe`)](#series-5-clothing-ai-scan--extraction-pipeline-apiwardrobe)
  - [5.1 POST /api/wardrobe/scan-item — AI Scan Clothes (1 to 100 Photos)](#51-post-apiwardrobescan-item---ai-scan-clothes-1-to-100-photos)
  - [5.2 POST /api/wardrobe/extract-item — Extract & Save Item to Wardrobe (1 to 100 Photos)](#52-post-apiwardrobeextract-item---extract--save-item-to-wardrobe-1-to-100-photos)
- [SERIES 6: 3D Garment Model Generation (`/api/wardrobe`)](#series-6-3d-garment-model-generation-apiwardrobe)
  - [6.1 POST /api/wardrobe/generate-3d/:id — 3D Model Generation (Hugging Face TripoSR)](#61-post-apiwardrobegenerate-3did---3d-model-generation-hugging-face-triposr)
- [SERIES 7: Wardrobe Items Catalog & Management (`/api/wardrobe`)](#series-7-wardrobe-items-catalog--management-apiwardrobe)
  - [7.1 GET /api/wardrobe/get-items — Get All Clothes (Filter, Search & Paginate)](#71-get-apiwardrobeget-items---get-all-clothes-filter-search--paginate)
  - [7.2 GET /api/wardrobe/get-item/:id — Get Item Details by ID](#72-get-apiwardrobeget-itemid---get-item-details-by-id)
  - [7.3 PATCH /api/wardrobe/edit-item/:id — Edit Item Attributes](#73-patch-apiwardrobeedit-itemid---edit-item-attributes)
  - [7.4 DELETE /api/wardrobe/delete-item/:id — Delete Item from Wardrobe](#74-delete-apiwardrobedelete-itemid---delete-item-from-wardrobe)
- [SERIES 8: Smart Outfit Suggestion & Stylist (`/api/outfit`)](#series-8-smart-outfit-suggestion--stylist-apioutfit)
  - [8.1 POST /api/outfit/suggest — Generate Occasion-Based Outfits](#81-post-apioutfitsuggest---generate-occasion-based-outfits)
  - [8.2 POST /api/outfit/save — Save Favorite Outfit](#82-post-apioutfitsave---save-favorite-outfit)
  - [8.3 GET /api/outfit/saved — List Saved Closet Outfits](#83-get-apioutfitsaved---list-saved-closet-outfits)
  - [8.4 DELETE /api/outfit/saved/:id — Delete Saved Outfit](#84-delete-apioutfitsavedid---delete-saved-outfit)
- [SERIES 9: Media Upload & Static Storage (`/api/upload`)](#series-9-media-upload--static-storage-apiupload)
  - [9.1 POST /api/upload/single — Upload Single Image (Multipart / Base64)](#91-post-apiuploadsingle---upload-single-image-multipart--base64)
  - [9.2 POST /api/upload/multiple — Upload Multiple Images (Up to 20)](#92-post-apiuploadmultiple---upload-multiple-images-up-to-20)
  - [9.3 DELETE /api/upload/:filename — Delete Stored Image](#93-delete-apiuploadfilename---delete-stored-image)
- [SERIES 10: External Integration & Admin Sync (`/api/integration`)](#series-10-external-integration--admin-sync-apiintegration)
  - [10.1 GET /api/integration/stats — System Inventory & Biometric Analytics](#101-get-apiintegrationstats---system-inventory--biometric-analytics)
  - [10.2 GET /api/integration/users — Synchronize System Users](#102-get-apiintegrationusers---synchronize-system-users)
  - [10.3 GET /api/integration/users/:identifier — Get Detailed User Record](#103-get-apiintegrationusersidentifier---get-detailed-user-record)
- [SERIES 11: Complete Master Endpoint Reference Table](#series-11-complete-master-endpoint-reference-table)

---

## 🧭 Complete System Workflow Architecture

### 📊 Codebase API Overview (Total: 30 Core Unified Endpoints)

Currently in the codebase, all functionalities are grouped into **10 logical series (30 unified endpoints)**, eliminating confusion while preserving 100% backward compatibility:

| Series | Module | Endpoints Count | Key Endpoints | Primary Purpose |
|---|---|:---:|---|---|
| **Series 1** | System & Health | **2** | `/api/health`, `/` | Server uptime & database connectivity check |
| **Series 2** | Auth & User Profile | **6** | `/send-otp`, `/verify-otp`, `/profile`, `/profile-image`, `/logout` | WhatsApp OTP auth, biometrics & profile image |
| **Series 3** | Face Recognition | **3** | `/register`, `/verify`, `/status` | Enrolls reference face, verifies owner in photo, checks status |
| **Series 4** | Closet Containers | **2** | `/create-wardrobe`, `/get-wardrobes` | Manages physical/digital Almari closet partitions |
| **Series 5** | Cloth AI Scan & Extract | **2** | `/scan-item`, `/extract-item` | AI clothes detection (1-100 photos) & 1-shot extract to closet |
| **Series 6** | 3D Garment Modeling | **1** | `/generate-3d/:id` | TripoSR background 3D mesh model reconstruction (.glb) |
| **Series 7** | Wardrobe Items CRUD | **4** | `/get-items`, `/get-item/:id`, `/edit-item/:id`, `/delete-item/:id` | Full catalog filtering, search, edit & delete |
| **Series 8** | Outfit Stylist AI | **4** | `/suggest`, `/save`, `/saved`, `/saved/:id` | Smart occasion styling, color harmony & closet bookmarks |
| **Series 9** | Media Uploads | **3** | `/single`, `/multiple`, `/:filename` | Direct static image storage & CDN serving |
| **Series 10** | Admin & Integration | **3** | `/stats`, `/users`, `/users/:identifier` | Syncs metrics & user records across external systems |
| **TOTAL** | **Full System** | **30** | — | **Complete production digital wardrobe pipeline** |

---

### 🔄 End-to-End User Journeys (Kaun sa API Kahan Aur Kaise Use Hota Hai)

```text
==================================================================================================
FLOW 1: USER ONBOARDING & DIGITAL ALMARI SETUP
==================================================================================================
  Step 1: User Login
    └─► POST /api/auth/send-otp
        Input: phone ("919876543210") ──► WhatsApp OTP sent
    └─► POST /api/auth/verify-otp
        Input: phone + 6-digit code ──► Returns JWT Bearer Token

  Step 2: Profile & Face Biometrics Setup (Optional but recommended)
    └─► POST /api/auth/profile-image
        Uploads avatar profile picture
    └─► POST /api/face-recognition/register
        Extracts 128-D reference face biometric vector (from uploaded photo or avatar)
    └─► GET  /api/face-recognition/status
        Verifies face enrollment status (returns hasReferenceFace: true)

  Step 3: Create Wardrobe Containers (Almari Setup)
    └─► POST /api/wardrobe/create-wardrobe
        Creates Almari (e.g. "Master Bedroom Almari", ownerName: "Rahul Sharma", optional ownerFaceImage)
    └─► GET  /api/wardrobe/get-wardrobes
        Fetches all user closets to populate Almari selector in UI

==================================================================================================
FLOW 2: GALLERY PHOTO INGESTION (OWNER FACE MATCH + MULTI-GARMENT EXTRACTION)
==================================================================================================
  Used when user uploads photos from phone gallery/events where multiple people might be present:

  [STEP 1: OWNER FACE VERIFICATION]
    └─► POST /api/face-recognition/verify  (Alias: /verify-user-face)
        • Form-Data: photo (<file>), wardrobeId ("<id>"), threshold (0.50)
        • Action: Checks if the target wardrobe owner is in this photo.
        • Output: matched: true/false, confidence score, boundingBox.
        • Rule: If matched: false, photo is skipped (or user is warned).

  [STEP 2: MULTI-GARMENT AI SCANNING (1 to 100 Photos)]
    └─► POST /api/wardrobe/scan-item  (Alias: /analyze-photo)
        • Form-Data: photo or photos (<1 to 100 files>), wardrobeId ("<id>")
        • Action: Background removal with ghost mannequin contouring, garment segmentation
                  (UPPER_WEAR, LOWER_WEAR, TRADITIONAL), color extraction & taxonomy tagging.
        • Output: Preview payload containing detectedItemsCount & autoFilledFields for UI review.

  [STEP 3: PERSIST CLOTHES TO WARDROBE]
    └─► POST /api/wardrobe/extract-item  (Alias: /add-item)
        • JSON: { wardrobeId, items: [...] } (selected items approved by user)
        • Action: Saves items into database wardrobe collection with high-res cropped images.

==================================================================================================
FLOW 3: DIRECT DRESS / CAMERA CLICK FLOW (1 TO 100 DRESS PHOTOS)
==================================================================================================
  Used when user takes photos of clothes directly on a hanger, flat lay, or shop mannequin:

  Option A: Scan & Review First (Interactive Mode)
    ├─► 1. POST /api/wardrobe/scan-item
    │      Input: 1 or multiple dress photos (field: "photo" or "photos")
    │      Action: Detects dress type, colors, pattern, occasion & extracts clean cutout.
    │      Returns: Pre-filled fields for user to inspect, edit, or adjust in UI.
    └─► 2. POST /api/wardrobe/extract-item
           Input: Confirmed clothing details (JSON array or single object)
           Action: Persists confirmed clothes to Almari.

  Option B: 1-Click Fast Save (Batch Ingestion Mode)
    └─► POST /api/wardrobe/extract-item
        • Form-Data: photo (1 photo) or photos (up to 100 photos), wardrobeId, storagePlace
        • Action: AI automatically segments, extracts attributes, checks duplicate items,
                  and saves all new garments directly into the closet in 1 shot!

==================================================================================================
FLOW 4: CLOTHES CATALOG MANAGEMENT (CRUD)
==================================================================================================
  Used inside the wardrobe view to browse, filter, inspect, edit, or delete items:

  1. Browse & Filter Clothes:
     └─► GET /api/wardrobe/get-items
         Query: ?wardrobeId=...&category=UPPER_WEAR&occasion=OFFICE&color=Navy+Blue&page=1
         Returns: Paginated list of clothes with thumbnail images & badges.

  2. View Single Garment Details:
     └─► GET /api/wardrobe/get-item/:id
         Returns: Full garment specifications (fabric, fit, collar, sleeve, tags, 3D model status).

  3. Edit Garment Attributes:
     └─► PATCH /api/wardrobe/edit-item/:id
         Body: { name: "Royal Linen Shirt", isFavorite: true, fabric: "PURE_LINEN" }
         Returns: Updated garment record.

  4. Delete Garment:
     └─► DELETE /api/wardrobe/delete-item/:id
         Action: Removes item from Almari closet.

==================================================================================================
FLOW 5: 3D GARMENT MODEL GENERATION PIPELINE (HUGGING FACE TRIPOSR)
==================================================================================================
  Dedicated background 3D mesh reconstruction from 2D cropped garment photos:

  [TRIGGER 3D RECONSTRUCTION]
    └─► POST /api/wardrobe/generate-3d/:id
        • Path Param: id ("6aba317270f26b72d852616f")
        • Action: Dispatches garment cropped image to TripoSR inference engine.
        • Output: Generates 3D mesh model (.glb / .obj) and updates item.model3d status:
                  { status: "COMPLETED", url: "/uploads/models/model-6aba31.glb", engine: "TripoSR" }
        • UI Use: Renders interactive 360-degree 3D viewer on clothing detail card.

==================================================================================================
FLOW 6: SMART OUTFIT SUGGESTION & STYLIST ENGINE (MULTI-STEP WIZARD)
==================================================================================================
  Non-chatbot interactive user flow for smart styling recommendations:

  Step 1: Selection & Intent
    • User chooses whether to style from "All Wardrobes" or a specific Almari.
    • User picks the occasion: Casual, Office, Party, Wedding, Date, Travel.

  Step 2: Generate Coordinated Looks
    └─► POST /api/outfit/suggest
        Body: { wardrobeId: "optional", occasion: "OFFICE", season: "SUMMER", limit: 4 }
        Fashion Engine Logic:
        • Fetches real clothes only (Zero Hallucination — never creates fake clothes).
        • Checks color harmony: Neutrals (White/Black/Beige) + Contrast (Navy/Olive/Wine).
        • Evaluates occasion appropriateness & pattern harmony.
        • If user has no footwear, gracefully suggests look without shoes and sets missingSlots.
        Returns: 3 to 6 curated looks with harmonyScore, stylistAdvice, and slot items.

  Step 3: Save Favorite Look
    └─► POST /api/outfit/save
        Body: { name: "Monday Office Power Look", items: [topId, bottomId], occasion: "OFFICE" }
        Action: Bookmarks outfit combination into closet collection.

  Step 4: View / Manage Saved Looks
    └─► GET    /api/outfit/saved        ──► Lists all saved looks
    └─► DELETE /api/outfit/saved/:id    ──► Deletes a saved look
```

---

## SERIES 1: System & Health Checks (`/api`)

### 1.1 GET / — Root Server Info
- **Description:** Verifies server execution and returns current running service version.
- **Method:** `GET`
- **Endpoint:** `/`
- **Authentication:** `None`
- **Headers:** `None`

#### Response (`200 OK`)
```json
{
  "name": "Arangtik Backend API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/api/health"
}
```

---

### 1.2 GET /api/health — System Health & DB Connectivity
- **Description:** Checks MongoDB database connectivity, server uptime, and system status.
- **Method:** `GET`
- **Endpoint:** `/api/health`
- **Authentication:** `None`
- **Headers:** `None`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "System is healthy",
  "data": {
    "status": "UP",
    "timestamp": "2026-10-12T11:00:00.000Z",
    "services": {
      "database": "connected",
      "server": "running"
    }
  }
}
```

---

## SERIES 2: Authentication & User Profile (`/api/auth`)

### 2.1 POST /api/auth/send-otp — Send WhatsApp OTP
- **Description:** Sends a 6-digit login OTP code to the user's WhatsApp number via API24 gateway.
- **Method:** `POST`
- **Endpoint:** `/api/auth/send-otp`
- **Authentication:** `None`
- **Headers:** `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | **Yes** | 10 to 12 digit phone number (e.g. `"919876543210"`) |

```json
{
  "phone": "919876543210"
}
```

#### Response (`200 OK`)
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

### 2.2 POST /api/auth/verify-otp — Verify OTP & Login
- **Description:** Verifies the 6-digit WhatsApp OTP, logs in or registers user, and issues a Bearer JWT.
- **Method:** `POST`
- **Endpoint:** `/api/auth/verify-otp`
- **Authentication:** `None`
- **Headers:** `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | **Yes** | Mobile phone number |
| `otp` | `string` | **Yes** | 6-digit verification code |
| `name` | `string` | *Optional* | Name for new user registration |

```json
{
  "phone": "919876543210",
  "otp": "123456",
  "name": "Rahul Sharma"
}
```

#### Response (`200 OK`)
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

### 2.3 GET /api/auth/profile — Get Current Profile
- **Description:** Returns the logged-in user's profile details and biometric registration status.
- **Method:** `GET`
- **Endpoint:** `/api/auth/profile` *(Alias: `/api/auth/me`)*
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Rahul Sharma",
    "phone": "919876543210",
    "gender": "MALE",
    "country": "India",
    "currency": "INR",
    "profileImage": "/uploads/profile_1.jpg",
    "hasReferenceFace": true,
    "createdAt": "2026-10-05T07:06:03.821Z"
  }
}
```

---

### 2.4 PATCH /api/auth/profile — Update Profile & Reference Photo
- **Description:** Updates profile details (name, gender, country). When a photo file (`image`) is uploaded, it automatically validates a single clear face and generates/saves a 128-D reference face embedding.
- **Method:** `PATCH` *(Alias: `PUT /api/auth/profile`)*
- **Endpoint:** `/api/auth/profile`
- **Authentication:** `Bearer <TOKEN>`

#### Request Options
- **Option A (JSON - Text Fields):** `Content-Type: application/json`
```json
{
  "name": "Rahul Sharma",
  "gender": "MALE",
  "country": "India",
  "preferredLanguage": "en"
}
```
- **Option B (Multipart Form-Data - Text + Photo File):**
  - `name`: text
  - `gender`: text
  - `image`: file *(JPEG, PNG, WEBP)*

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Rahul Sharma",
    "profileImage": "/uploads/image-1718000000000.jpg",
    "hasReferenceFace": true
  }
}
```

---

### 2.5 POST /api/auth/profile-image — Dedicated Profile Image Upload
- **Description:** Uploads a profile image directly, verifies the face, and persists reference biometric data.
- **Method:** `POST`
- **Endpoint:** `/api/auth/profile-image`
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: multipart/form-data` (field: `image`)

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile image uploaded and reference biometric generated",
  "data": {
    "profileImage": "/uploads/profile_photo_123.jpg",
    "hasReferenceFace": true
  }
}
```

---

### 2.6 POST /api/auth/logout — User Session Logout
- **Description:** Logs out user and invalidates client session.
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## SERIES 3: Biometric Face Recognition Pipeline (`/api/face-recognition`)

### 3.1 POST /api/face-recognition/register — Register User Reference Face
- **Description:** Registers or updates the user's reference face biometric embedding. Extracts a 128-dimensional face embedding vector from an uploaded photo or from the user's existing profile photo.
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/register` *(Legacy Alias: `/reference`)*
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: multipart/form-data`

#### Multipart Form Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` (or `image`) | `file` | *Optional* | Photo containing user's face (if omitted, uses current profile picture) |

#### Response (`200 OK` / `201 Created`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Reference face registered successfully",
  "data": {
    "hasReferenceFace": true,
    "confidence": 0.988,
    "imagePath": "/uploads/ref_face_1.jpg"
  }
}
```

---

### 3.2 POST /api/face-recognition/verify — Verify Face in Photo
- **Description:** Scans an uploaded photo, detects faces, and checks Euclidean distance against the target user or **Wardrobe Owner Face**. Biometric face check only; does not segment clothes.
- **Method:** `POST`
- **Endpoint:** `/api/face-recognition/verify` *(Legacy Aliases: `/verify-user-face`, `/scan-photo`, `/scan-gallery-photo`)*
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: multipart/form-data`

#### Multipart Form Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` | `file` | **Yes** | Photo file to scan (JPEG, PNG, WEBP) |
| `wardrobeId` | `string` | *Optional* | Match against target Wardrobe Owner Face (if omitted, matches logged-in user) |
| `threshold` | `number` | *Optional* | Match threshold distance (default: `0.50`) |

#### Response (`200 OK`)
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

### 3.3 GET /api/face-recognition/status — Get Face Registration Status
- **Description:** Retrieves reference face registration status, profile photo availability, and biometric metadata.
- **Method:** `GET`
- **Endpoint:** `/api/face-recognition/status` *(Legacy Aliases: `/get`, `/reference`)*
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Face status retrieved successfully",
  "data": {
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "hasProfileImage": true,
    "profileImage": "/uploads/profile_1.jpg",
    "hasReferenceFace": true
  }
}
```

---

## SERIES 4: Store Containers & Almari Management (`/api/wardrobe`)

### 4.1 POST /api/wardrobe/create-wardrobe — Create Wardrobe Closet Container
- **Description:** Creates an Almari / closet container with optional cover photo or owner face image.
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/create-wardrobe`
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: application/json` or `multipart/form-data`

#### Request Body
```json
{
  "name": "Master Bedroom Almari",
  "ownerName": "Rahul Sharma",
  "type": "PERSONAL",
  "isDefault": true
}
```

#### Response (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Wardrobe closet created successfully",
  "data": {
    "_id": "6ac622afe824410c3e3221bf",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Master Bedroom Almari",
    "storeType": "WARDROBE",
    "type": "PERSONAL",
    "ownerName": "Rahul Sharma",
    "isDefault": true,
    "isActive": true,
    "createdAt": "2026-10-07T10:45:03.961Z"
  }
}
```

---

### 4.2 GET /api/wardrobe/get-wardrobes — List User Wardrobes / Closets
- **Description:** Retrieves all active closets and containers created by the user.
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-wardrobes`
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe closets fetched successfully",
  "data": [
    {
      "_id": "6ac622afe824410c3e3221bf",
      "name": "Master Bedroom Almari",
      "ownerName": "Rahul Sharma",
      "storeType": "WARDROBE",
      "type": "PERSONAL",
      "isDefault": true,
      "ownerFaceImage": "/uploads/owner_face_1.jpg"
    }
  ]
}
```

---

## SERIES 5: Clothing AI Scan & Extraction Pipeline (`/api/wardrobe`)

### 5.1 POST /api/wardrobe/scan-item — AI Scan Clothes (1 to 100 Photos)
- **Description:** Scans photo(s), isolates wearable clothes, removes background with 3D ghost mannequin contouring, extracts colors/attributes, and returns structured pre-filled taxonomy fields. **Can process 1 photo or up to 100 bulk photos in a single API call!**
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/scan-item` *(Aliases: `/analyze-photo`, `/scan`, `/scan-gallery-photo`)*
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: multipart/form-data`

#### Multipart Form Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` (or `photos`) | `file` / `files` | **Yes** | Single photo or multiple photos (up to 100) |
| `wardrobeId` | `string` | *Optional* | Target wardrobe ID to scope duplicates or owner face |
| `verifyFace` | `boolean` | *Optional* | Check if wardrobe owner face is in photo (`true` / `false`) |

#### Response (`200 OK`)
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
      "occasion": ["OFFICE", "FORMAL"],
      "croppedImageUrl": "/uploads/crops/segmented/seg-0-1791545708048.webp"
    }
  }
}
```

---

### 5.2 POST /api/wardrobe/extract-item — Extract & Save Item to Wardrobe (1 to 100 Photos)
- **Description:** Extracts and persists clothing items into the wardrobe store in 1 shot. **Supports 1 photo, up to 100 bulk photos (`photos`), or an array of reviewed items (`{ items: [...] }`) from scan preview.**
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/extract-item` *(Aliases: `/add-item`, `/items`, `/extract-dress`, `/bulk-add-photos`, `/ingest-gallery`)*
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: multipart/form-data` OR `application/json`

#### Multipart Form Fields (Option A: Direct Photo / Bulk Photos)
| Field | Type | Required | Description |
|---|---|---|---|
| `photo` (or `photos`) | `file` / `files` | **Yes** | 1 photo or up to 100 photos to extract & store |
| `wardrobeId` | `string` | *Optional* | Target Almari closet container ID |
| `storagePlace` | `string` | *Optional* | Shelf/rack location (default: `Main Closet`) |

#### JSON Payload (Option B: Confirm Reviewed Scan Array)
```json
{
  "wardrobeId": "6ac622afe824410c3e3221bf",
  "items": [
    {
      "name": "Navy Blue Formal Linen Shirt",
      "category": "UPPER_WEAR",
      "subCategory": "Shirt",
      "color": "Navy Blue",
      "fabric": "LINEN",
      "croppedImageUrl": "/uploads/crops/segmented/seg-0-1791545708048.webp"
    }
  ]
}
```

#### Response (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Item added successfully to wardrobe store",
  "data": {
    "_id": "6ac8d17cdaae1c044a53c0e6",
    "name": "Navy Blue Formal Linen Shirt",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "color": "Navy Blue",
    "fabric": "LINEN",
    "images": [
      {
        "url": "/uploads/crops/segmented/seg-0-1791545718711.webp",
        "isPrimary": true
      }
    ],
    "isFavorite": false
  }
}
```

---

### 5.3 POST /api/wardrobe/generate-3d/:id — 3D Garment Model Generation
- **Description:** Triggers background 3D mesh model reconstruction (`.obj` / `.glb`) for a segmented garment using TripoSR.
- **Method:** `POST`
- **Endpoint:** `/api/wardrobe/generate-3d/:id` *(Alias: `/items/:id/generate-3d`)*
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "3D model generation completed",
  "data": {
    "itemId": "6aba317270f26b72d852616f",
    "model3d": {
      "status": "COMPLETED",
      "url": "/uploads/models/model-6aba31.glb",
      "engine": "TripoSR",
      "generatedAt": "2026-10-10T12:00:00.000Z"
    }
  }
}
```

---

## SERIES 6: Wardrobe Items Catalog & Management (`/api/wardrobe`)

### 6.1 GET /api/wardrobe/get-items — Get All Clothes (Filter, Search & Paginate)
- **Description:** Retrieves all clothes in wardrobe with search keyword queries, pagination, and multi-attribute filters.
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-items` *(Aliases: `/get-all-items`, `/items`)*
- **Authentication:** `Bearer <TOKEN>`

#### Query Parameters
| Parameter | Type | Description |
|---|---|---|
| `wardrobeId` | `string` | Filter by specific wardrobe |
| `category` | `string` | `UPPER_WEAR`, `LOWER_WEAR`, `TRADITIONAL`, `OUTERWEAR`, `FOOTWEAR`, `ACCESSORIES` |
| `subCategory` | `string` | `Kurta`, `Jeans`, `Shirt`, `T-Shirt`, `Saree` |
| `color` | `string` | Filter color shade |
| `occasion` | `string` | `CASUAL`, `OFFICE`, `PARTY`, `WEDDING`, `DATE`, `TRAVEL` |
| `season` | `string` | `SUMMER`, `WINTER`, `ALL_SEASON` |
| `favorite` | `boolean` | Filter favorite items (`true` / `false`) |
| `search` | `string` | Keyword search query |
| `page` | `number` | Page number (Default: `1`) |
| `limit` | `number` | Items per page (Default: `20`) |

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe items fetched successfully",
  "data": {
    "items": [
      {
        "_id": "6aba317270f26b72d852616f",
        "name": "Navy Blue Formal Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "images": [{ "url": "/uploads/crops/shirt.webp", "isPrimary": true }],
        "isFavorite": false
      }
    ],
    "pagination": {
      "totalItems": 1,
      "totalPages": 1,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```

---

### 6.2 GET /api/wardrobe/get-item/:id — Get Item Details by ID
- **Description:** Fetches full attributes, dimensions, tags, and images of a specific clothing item.
- **Method:** `GET`
- **Endpoint:** `/api/wardrobe/get-item/:id` *(Aliases: `/get-item-details/:id`, `/items/:id`)*
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item details fetched successfully",
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "name": "Navy Blue Formal Linen Shirt",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "color": "Navy Blue",
    "fabric": "LINEN",
    "fit": "SLIM_FIT",
    "occasion": ["OFFICE", "FORMAL"],
    "images": [{ "url": "/uploads/crops/shirt.webp", "isPrimary": true }]
  }
}
```

---

### 6.3 PATCH /api/wardrobe/edit-item/:id — Edit Item Attributes
- **Description:** Modifies existing garment attributes (name, color, fabric, fit, tags, favorite state).
- **Method:** `PATCH`
- **Endpoint:** `/api/wardrobe/edit-item/:id` *(Aliases: `/update-item/:id`, `/items/:id`)*
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: application/json`

#### Request Body
```json
{
  "name": "Navy Blue Royal Linen Shirt (Updated)",
  "isFavorite": true,
  "fabric": "PURE_LINEN"
}
```

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item updated successfully",
  "data": {
    "_id": "6aba317270f26b72d852616f",
    "name": "Navy Blue Royal Linen Shirt (Updated)",
    "isFavorite": true
  }
}
```

---

### 6.4 DELETE /api/wardrobe/delete-item/:id — Delete Item from Wardrobe
- **Description:** Permanently removes a clothing item from the wardrobe store.
- **Method:** `DELETE`
- **Endpoint:** `/api/wardrobe/delete-item/:id` *(Alias: `/items/:id`)*
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
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

## SERIES 7: Smart Outfit Suggestion & Stylist (`/api/outfit`)

### 7.1 POST /api/outfit/suggest — Generate Occasion-Based Outfits
- **Description:** Analyzes garments strictly available in the user's selected wardrobe (or across All Wardrobes) and generates multiple coordinated, color-harmonized outfit combinations.
  - **Zero Hallucination Guarantee:** Never invents or assumes missing items. If user has no shoes, outfits are suggested without shoes and `missingSlots: ["footwear"]` is reported transparently.
  - **Fashion Compatibility Engine:** Evaluates color harmony (Neutrals, Complementary, Monochromatic), contrast, pattern balance (solid + print), and occasion appropriateness.
- **Method:** `POST`
- **Endpoint:** `/api/outfit/suggest` *(Alias: `/api/outfit/generate`)*
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `wardrobeId` | `string` | *Optional* | Target Wardrobe ID. Omit or pass `"all"` to style across all closets |
| `occasion` | `string` | **Yes** | `CASUAL`, `OFFICE`, `PARTY`, `WEDDING`, `DATE`, `TRAVEL` |
| `season` | `string` | *Optional* | `ALL_SEASON`, `SUMMER`, `WINTER`, `MONSOON` |
| `limit` | `number` | *Optional* | Number of combinations to generate (1 to 20, default: `5`) |

```json
{
  "wardrobeId": "6ac622afe824410c3e3221bf",
  "occasion": "OFFICE",
  "season": "ALL_SEASON",
  "limit": 5
}
```

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Outfit recommendations generated successfully",
  "data": {
    "count": 3,
    "availableItemsCount": 14,
    "wardrobeId": "6ac622afe824410c3e3221bf",
    "occasion": "OFFICE",
    "missingSlots": ["footwear"],
    "outfits": [
      {
        "id": "outfit_1_m5x7z",
        "title": "Crisp Corporate • White & Charcoal Trousers",
        "occasion": "OFFICE",
        "items": [
          {
            "itemId": "6aba317270f26b72d852616f",
            "slot": "UPPER_WEAR",
            "name": "White Formal Oxford Shirt",
            "category": "UPPER_WEAR",
            "subCategory": "Shirt",
            "color": "white",
            "imageUrl": "/uploads/crops/shirt_1.png"
          },
          {
            "itemId": "6ac8d17cdaae1c044a53c0e7",
            "slot": "LOWER_WEAR",
            "name": "Charcoal Slim Fit Trousers",
            "category": "LOWER_WEAR",
            "subCategory": "Trousers",
            "color": "charcoal",
            "imageUrl": "/uploads/crops/pant_1.png"
          }
        ],
        "missingSlots": ["footwear", "outerwear", "accessories"],
        "colorHarmony": {
          "palette": ["white", "charcoal"],
          "harmonyType": "TIMELESS_NEUTRALS",
          "contrast": "HIGH_ELEGANCE",
          "score": 98
        },
        "matchScore": 95,
        "stylingNotes": "Tuck in the White Formal Oxford Shirt cleanly into your Charcoal Slim Fit Trousers for a sharp executive line."
      }
    ]
  }
}
```

---

### 7.2 POST /api/outfit/save — Save Favorite Outfit
- **Description:** Saves a generated outfit combination to the user's permanent closet collection.
- **Method:** `POST`
- **Endpoint:** `/api/outfit/save`
- **Authentication:** `Bearer <TOKEN>`
- **Headers:** `Content-Type: application/json`

#### Request Body
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | **Yes** | Outfit display title |
| `occasion` | `string` | **Yes** | Target occasion (e.g. `"OFFICE"`) |
| `items` | `array` | **Yes** | Array of `{ itemId, slot, name, category, color, imageUrl }` |
| `wardrobeId` | `string` | *Optional* | Wardrobe ID association |
| `stylingNotes` | `string` | *Optional* | Stylist advice text |
| `matchScore` | `number` | *Optional* | Harmony match score (0-100) |

```json
{
  "title": "Crisp Corporate Minimalist",
  "occasion": "OFFICE",
  "wardrobeId": "6ac622afe824410c3e3221bf",
  "items": [
    {
      "itemId": "6aba317270f26b72d852616f",
      "slot": "UPPER_WEAR",
      "name": "White Formal Oxford Shirt"
    },
    {
      "itemId": "6ac8d17cdaae1c044a53c0e7",
      "slot": "LOWER_WEAR",
      "name": "Charcoal Slim Fit Trousers"
    }
  ],
  "stylingNotes": "Tuck in shirt cleanly for a sharp silhouette.",
  "matchScore": 95
}
```

#### Response (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Outfit saved to your closet collection",
  "data": {
    "_id": "670aa21f3d4e5f6a7b8c9e44",
    "userId": "65f1a2b3c4d5e6f7a8b9c0d1",
    "title": "Crisp Corporate Minimalist",
    "occasion": "OFFICE",
    "isFavorite": true,
    "createdAt": "2026-10-12T11:20:00.000Z"
  }
}
```

---

### 7.3 GET /api/outfit/saved — List Saved Closet Outfits
- **Description:** Returns all bookmarked outfits saved by the user with populated wardrobe items.
- **Method:** `GET`
- **Endpoint:** `/api/outfit/saved`
- **Authentication:** `Bearer <TOKEN>`
- **Query Params:**
  - `wardrobeId` *(optional)*: Filter by wardrobe ID
  - `occasion` *(optional)*: Filter by occasion (`CASUAL`, `OFFICE`, etc.)

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Saved outfits retrieved successfully",
  "data": [
    {
      "_id": "670aa21f3d4e5f6a7b8c9e44",
      "title": "Crisp Corporate Minimalist",
      "occasion": "OFFICE",
      "items": [
        {
          "slot": "UPPER_WEAR",
          "name": "White Formal Oxford Shirt",
          "color": "white"
        },
        {
          "slot": "LOWER_WEAR",
          "name": "Charcoal Slim Fit Trousers",
          "color": "charcoal"
        }
      ],
      "stylingNotes": "Tuck in shirt cleanly for a sharp silhouette.",
      "matchScore": 95,
      "isFavorite": true
    }
  ]
}
```

---

### 7.4 DELETE /api/outfit/saved/:id — Delete Saved Outfit
- **Description:** Deletes a saved outfit combination by its ID.
- **Method:** `DELETE`
- **Endpoint:** `/api/outfit/saved/:id`
- **Authentication:** `Bearer <TOKEN>`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Saved outfit removed successfully",
  "data": {
    "success": true,
    "message": "Outfit removed successfully"
  }
}
```

---

## SERIES 8: Media Upload & Static Storage (`/api/upload`)

### 8.1 POST /api/upload/single — Upload Single Image (Multipart / Base64)
- **Description:** Stores an image file or Base64 string to `/uploads` with a unique short ID.
- **Method:** `POST`
- **Endpoint:** `/api/upload/single`
- **Authentication:** `None`

#### Response (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "http://localhost:8085/api/uploads/img_muwkdves_65904c.jpg",
    "file": {
      "filename": "img_muwkdves_65904c.jpg",
      "mimeType": "image/jpeg",
      "size": 10240
    }
  }
}
```

---

### 8.2 POST /api/upload/multiple — Upload Multiple Images (Up to 20)
- **Description:** Uploads up to 20 images simultaneously in batch.
- **Method:** `POST`
- **Endpoint:** `/api/upload/multiple`
- **Authentication:** `None`

#### Response (`201 Created`)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Images uploaded successfully",
  "data": {
    "urls": [
      "http://localhost:8085/api/uploads/img_123.jpg",
      "http://localhost:8085/api/uploads/img_456.jpg"
    ],
    "count": 2
  }
}
```

---

### 8.3 DELETE /api/upload/:filename — Delete Stored Image
- **Description:** Deletes a media file from local storage.
- **Method:** `DELETE`
- **Endpoint:** `/api/upload/:filename`
- **Authentication:** `None`

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Image deleted successfully",
  "data": null
}
```

---

## SERIES 9: External Integration & Admin Sync (`/api/integration`)

> 🔒 **Security Notice:** All integration endpoints require `x-api-key: <ADMIN_SYNC_API_KEY>` header.

### 9.1 GET /api/integration/stats — System Inventory & Biometric Analytics
- **Description:** Returns aggregate telemetry metrics on registered users, wardrobes, items, and biometrics.
- **Method:** `GET`
- **Endpoint:** `/api/integration/stats`
- **Authentication:** `x-api-key` header

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Integration metrics retrieved successfully",
  "data": {
    "totalUsers": 142,
    "totalWardrobes": 190,
    "totalItems": 1845,
    "totalBiometricsEnrolled": 118,
    "timestamp": "2026-10-12T11:00:00.000Z"
  }
}
```

---

### 9.2 GET /api/integration/users — Synchronize System Users
- **Description:** Returns list of registered users for external admin sync.
- **Method:** `GET`
- **Endpoint:** `/api/integration/users`
- **Authentication:** `x-api-key` header

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "users": [
      {
        "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
        "name": "Rahul Sharma",
        "phone": "919876543210",
        "status": "active"
      }
    ],
    "count": 1
  }
}
```

---

### 9.3 GET /api/integration/users/:identifier — Get Detailed User Record
- **Description:** Fetches complete user metadata by MongoDB ObjectId or phone number.
- **Method:** `GET`
- **Endpoint:** `/api/integration/users/:identifier`
- **Authentication:** `x-api-key` header

#### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Rahul Sharma",
      "phone": "919876543210",
      "wardrobeCount": 2,
      "itemsCount": 18
    }
  }
}
```

---

## SERIES 10: Complete Master Endpoint Reference Table

| # | Series | Method | Endpoint Path | Auth Required | Description |
|---|---|---|---|---|---|
| **1** | System | `GET` | `/` | No | Server Root Status |
| **2** | System | `GET` | `/api/health` | No | System & DB Health Check |
| **3** | Auth | `POST` | `/api/auth/send-otp` | No | Send 6-digit WhatsApp OTP |
| **4** | Auth | `POST` | `/api/auth/verify-otp` | No | Verify OTP & Generate JWT |
| **5** | Auth | `GET` | `/api/auth/profile` | **Yes (Bearer)** | Get Current User Profile |
| **6** | Auth | `PATCH` | `/api/auth/profile` | **Yes (Bearer)** | Update Profile & Reference Photo |
| **7** | Auth | `POST` | `/api/auth/profile-image` | **Yes (Bearer)** | Upload Profile Photo Directly |
| **8** | Auth | `POST` | `/api/auth/logout` | **Yes (Bearer)** | Logout User Session |
| **9** | Face AI | `POST` | `/api/face-recognition/register` | **Yes (Bearer)** | Register Reference Face via Photo |
| **10** | Face AI | `POST` | `/api/face-recognition/verify` | **Yes (Bearer)** | Verify Face in Photo against User |
| **11** | Face AI | `GET` | `/api/face-recognition/status` | **Yes (Bearer)** | Get Face Biometric Registration Status |
| **12** | Wardrobe | `POST` | `/api/wardrobe/create-wardrobe` | **Yes (Bearer)** | Create Wardrobe Closet Container |
| **13** | Wardrobe | `GET` | `/api/wardrobe/get-wardrobes` | **Yes (Bearer)** | List User Closets / Containers |
| **14** | Clothing AI | `POST` | `/api/wardrobe/scan-item` | **Yes (Bearer)** | AI Scan Clothes (1 to 100 Photos) |
| **15** | Wardrobe | `POST` | `/api/wardrobe/extract-item` | **Yes (Bearer)** | Extract & Add Items (1 to 100 Photos) |
| **16** | 3D AI | `POST` | `/api/wardrobe/generate-3d/:id` | **Yes (Bearer)** | TripoSR 3D Garment Model Generation |
| **17** | Wardrobe | `GET` | `/api/wardrobe/get-items` | **Yes (Bearer)** | Filter, Search & Paginate Clothes |
| **18** | Wardrobe | `GET` | `/api/wardrobe/get-item/:id` | **Yes (Bearer)** | Get Full Item Details by ID |
| **19** | Wardrobe | `PATCH` | `/api/wardrobe/edit-item/:id` | **Yes (Bearer)** | Edit Clothing Item Attributes |
| **20** | Wardrobe | `DELETE`| `/api/wardrobe/delete-item/:id` | **Yes (Bearer)** | Delete Clothing Item from Closet |
| **21** | Stylist | `POST` | `/api/outfit/suggest` | **Yes (Bearer)** | Generate Smart Occasion Outfits |
| **22** | Stylist | `POST` | `/api/outfit/save` | **Yes (Bearer)** | Save Outfit to Closet Collection |
| **23** | Stylist | `GET` | `/api/outfit/saved` | **Yes (Bearer)** | List Saved Outfits |
| **24** | Stylist | `DELETE`| `/api/outfit/saved/:id` | **Yes (Bearer)** | Delete Saved Outfit from Closet |
| **25** | Media | `POST` | `/api/upload/single` | No | Upload Single Image File / Base64 |
| **26** | Media | `POST` | `/api/upload/multiple` | No | Upload Multiple Images (Up to 20) |
| **27** | Media | `DELETE`| `/api/upload/:filename` | No | Delete Stored Media File |
| **28** | Admin | `GET` | `/api/integration/stats` | **x-api-key** | System Inventory & AI Metrics |
| **29** | Admin | `GET` | `/api/integration/users` | **x-api-key** | Synchronize System Users |
| **30** | Admin | `GET` | `/api/integration/users/:identifier` | **x-api-key** | Get Detailed User Record |

---

*Documentation maintained by Arangtik Engineering Team.*
