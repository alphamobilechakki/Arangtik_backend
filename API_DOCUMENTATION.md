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
- [SERIES 11: Push Notifications & Device Tokens (`/api/notifications`)](#series-11-push-notifications--device-tokens-apinotifications)
  - [11.1 POST /api/notifications/device-token — Register FCM Device Token](#111-post-apinotificationsdevice-token---register-fcm-device-token)
  - [11.2 DELETE /api/notifications/device-token — Remove Device Token](#112-delete-apinotificationsdevice-token---remove-device-token)
  - [11.3 GET /api/notifications — User Notification Inbox](#113-get-apinotifications---user-notification-inbox)
  - [11.4 PATCH /api/notifications/:id/read — Mark Notification as Read](#114-patch-apinotificationsidread---mark-notification-as-read)
- [SERIES 12: Laundry & Work Order Dispatch (`/api/laundry`)](#series-12-laundry--work-order-dispatch-apilaundry)
  - [12.1 GET /api/v1/laundry/vendors/lookup — Lookup Partner / Dhobi](#121-get-apiv1laundryvendorslookup---lookup-partner--dhobi)
  - [12.2 POST /api/v1/laundry/orders — Create Laundry Work Order](#122-post-apiv1laundryorders---create-laundry-work-order)
  - [12.3 GET /api/v1/laundry/orders — List User Work Orders](#123-get-apiv1laundryorders---list-user-work-orders)
  - [12.4 GET /api/v1/laundry/orders/:id — Work Order Detailed Breakdown](#124-get-apiv1laundryordersid---work-order-detailed-breakdown)
  - [12.5 PATCH /api/v1/laundry/orders/:id/status — User Order Status Update](#125-patch-apiv1laundryordersidstatus---user-order-status-update)
  - [12.6 POST /api/v1/laundry/orders/:id/resend-whatsapp — Re-send WhatsApp PDF](#126-post-apiv1laundryordersidresend-whatsapp---re-send-whatsapp-pdf)
- [SERIES 13: Vendor Partner Network & Order Management (`/api/vendor`)](#series-13-vendor-partner-network--order-management-apivendor)
  - [13.1 GET /api/vendor/categories — Public Service Categories](#131-get-apivendorcategories---public-service-categories)
  - [13.2 POST /api/vendor/auth/register — Vendor Partner Registration](#132-post-apivendorauthregister---vendor-partner-registration)
  - [13.3 POST /api/vendor/auth/login — Vendor Password Login](#133-post-apivendorauthlogin---vendor-password-login)
  - [13.4 POST /api/vendor/auth/forgot-password, verify, reset — Password Reset Flow](#134-vendor-password-reset-flow)
  - [13.5 GET /api/vendor/profile — Fetch Vendor Profile](#135-get-apivendorprofile---fetch-vendor-profile)
  - [13.6 GET /api/vendor/orders — List Assigned Work Orders](#136-get-apivendororders---list-assigned-work-orders)
  - [13.7 GET /api/vendor/orders/:id — Work Order Details by ID](#137-get-apivendorordersid---work-order-details-by-id)
  - [13.8 PATCH /api/vendor/orders/:id/status — Vendor Order Status Update](#138-patch-apivendorordersidstatus---vendor-order-status-update)
- [SERIES 14: Complete Master Endpoint Reference Table](#series-14-complete-master-endpoint-reference-table)

---

## 🧭 Complete System Workflow Architecture

### 📊 Codebase API Overview (Total: 30 Core Unified Endpoints)

Currently in the codebase, all functionalities are grouped into **13 logical series (48 unified endpoints)**, eliminating confusion while preserving 100% backward compatibility:

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
| **Series 11** | Push Notifications | **4** | `/device-token`, `/notifications`, `/:id/read` | FCM device token management & in-app notification inbox |
| **Series 12** | Laundry Work Orders | **6** | `/vendors/lookup`, `/orders`, `/orders/:id`, `/status`, `/resend-whatsapp` | Multi-dress Almari laundry orders, PDF generation & WhatsApp dispatch |
| **Series 13** | Vendor Partner Hub | **8** | `/categories`, `/register`, `/login`, `/profile`, `/orders`, `/orders/:id/status` | Partner registration, business profile & 4-step work order fulfillment |
| **TOTAL** | **Full System** | **48** | — | **Complete production digital wardrobe & partner network platform** |

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
    │              Runs Multi-Tier Duplicate Check against Almari (EXACT_MATCH, AMBIGUOUS_MATCH, NEW_ITEM).
    │      Returns: Pre-filled fields, duplicate confidenceScore, and existing matched items for comparison.
    └─► 2. POST /api/wardrobe/extract-item
           Input: Confirmed clothing details (JSON array or single object)
                  Optional Flags: { allowDuplicate: true, forceAdd: true }
           Action: Persists confirmed clothes to Almari.

  Option B: 1-Click Fast Save (Batch Ingestion Mode)
    └─► POST /api/wardrobe/extract-item
        • Form-Data: photo (1 photo) or photos (up to 100 photos), wardrobeId, storagePlace
        • Optional Flags: autoAddAll=true / allowDuplicate=true (to force add separate items with matching styles)
        • Action: AI automatically segments, extracts attributes, checks duplicate items,
                  and saves all garments directly into the closet in 1 shot!

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
    • User chooses whether to style from "All Wardrobes" or specific Almari(s) (supports multi-selection checkboxes: e.g. 5 selected out of 10 wardrobes).
    • User picks the occasion: Casual, Office, Party, Wedding, Date, Travel.

  Step 2: Generate Coordinated Looks
    └─► POST /api/outfit/suggest
        Body: { 
          wardrobeIds: ["wardrobeId_1", "wardrobeId_2"], // Multi-wardrobe selection: Array of ticked wardrobe IDs (e.g. 5 selected out of 10)
          wardrobeId: "optionalSingleIdOrAll",           // Single wardrobe ID or "all"
          occasion: "OFFICE", 
          season: "SUMMER", 
          limit: 4 
        }
        Fashion Engine Logic:
        • Fetches real clothes only (Zero Hallucination — never creates fake clothes).
        • Strictly scopes items to the checked wardrobes (e.g. if 5 of 10 checked, only evaluates clothes in those 5).
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

#### Response (`200 OK`) — Includes Multi-Tier Duplicate Detection Metadata
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Photo analyzed successfully with clothing recognition",
  "data": {
    "originalImageUrl": "/uploads/img_dress_photo.jpg",
    "sourceImageHash": "a1b2c3d4e5f6...",
    "detectedItemsCount": 1,
    "isExactDuplicateImage": false,
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
    },
    "analysis": [
      {
        "tempDetectionId": "det_xyz123",
        "name": "Navy Blue Formal Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/segmented/seg-0-1791545708048.webp",
        "selected": true,
        "isDuplicate": false,
        "isAmbiguous": false,
        "matchType": "NEW_ITEM",
        "matchResult": {
          "status": "NEW_ITEM",
          "confidenceScore": 0.0,
          "message": "New dress detected! Ready to add to wardrobe.",
          "matchedItem": null,
          "candidateMatches": []
        }
      }
    ]
  }
}
```

> [!NOTE]
> **Duplicate Detection Schema Values:**
> - When `matchResult.status === "EXACT_MATCH"` (confidenceScore >= 0.72): The dress already exists in the wardrobe. `isDuplicate` is `true` and `selected` is automatically `false`.
> - When `matchResult.status === "AMBIGUOUS_MATCH"` (0.52 <= confidenceScore < 0.72): A similar dress exists in the wardrobe. `isAmbiguous` is `true`.
> - When `matchResult.status === "NEW_ITEM"`: Brand new item detected.

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
| `allowDuplicate` / `forceAdd` / `autoAddAll` | `boolean` / `string` | *Optional* | Set to `true` to force adding distinct items that have identical attributes (e.g. 4 different pairs of blue jeans). If not set, exact duplicate items already in the wardrobe are reused by default to prevent clutter. |

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

## SERIES 6: 3D Garment Model Generation (`/api/wardrobe`)

### 6.1 POST /api/wardrobe/generate-3d/:id — 3D Model Generation (Hugging Face TripoSR)
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

## SERIES 7: Wardrobe Items Catalog & Management (`/api/wardrobe`)

### 7.1 GET /api/wardrobe/get-items — Get All Clothes (Filter, Search & Paginate)
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

### 7.2 GET /api/wardrobe/get-item/:id — Get Item Details by ID
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

### 7.3 PATCH /api/wardrobe/edit-item/:id — Edit Item Attributes
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

### 7.4 DELETE /api/wardrobe/delete-item/:id — Delete Item from Wardrobe
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

## SERIES 8: Smart Outfit Suggestion & Stylist (`/api/outfit`)

### 8.1 POST /api/outfit/suggest — Generate Occasion-Based Outfits
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

### 8.2 POST /api/outfit/save — Save Favorite Outfit
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

### 8.3 GET /api/outfit/saved — List Saved Closet Outfits
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

### 8.4 DELETE /api/outfit/saved/:id — Delete Saved Outfit
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

## SERIES 9: Media Upload & Static Storage (`/api/upload`)

### 9.1 POST /api/upload/single — Upload Single Image (Multipart / Base64)
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

### 9.2 POST /api/upload/multiple — Upload Multiple Images (Up to 20)
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

### 9.3 DELETE /api/upload/:filename — Delete Stored Image
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

## SERIES 10: External Integration & Admin Sync (`/api/integration`)

> 🔒 **Security Notice:** All integration endpoints require `x-api-key: <ADMIN_SYNC_API_KEY>` header.

### 10.1 GET /api/integration/stats — System Inventory & Biometric Analytics
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

### 10.2 GET /api/integration/users — Synchronize System Users
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

### 10.3 GET /api/integration/users/:identifier — Get Detailed User Record
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

## SERIES 11: Complete Master Endpoint Reference Table

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
| **31** | Notifications | `POST` | `/api/notifications/device-token` | **Yes (Bearer)** | Register / Update FCM Device Token |
| **32** | Notifications | `DELETE`| `/api/notifications/device-token` | **Yes (Bearer)** | Remove FCM Device Token |
| **33** | Notifications | `GET` | `/api/notifications` | **Yes (Bearer)** | Get Notification History / Inbox |
| **34** | Notifications | `PATCH` | `/api/notifications/:id/read` | **Yes (Bearer)** | Mark Notification as Read |
| **35** | Notifications | `PATCH` | `/api/notifications/read-all` | **Yes (Bearer)** | Mark All Notifications as Read |

---

## SERIES 11: Push Notifications & Device Token Management (`/api/notifications`)

### 11.1 POST /api/notifications/device-token — Register FCM Device Token
Registers or refreshes the FCM device token for the authenticated user's mobile device (Android / iOS).

- **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "token": "dK_3f9z...fcm_registration_token...",
  "platform": "ANDROID",
  "deviceId": "uuid_device_hardware_id",
  "deviceModel": "Google Pixel 8",
  "appVersion": "1.2.0"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Device token registered successfully",
  "data": {
    "id": "67a3f890b1234567890abcdef",
    "userId": "67a3f890b1234567890abc11",
    "token": "dK_3f9z...fcm_registration_token...",
    "platform": "ANDROID",
    "isActive": true,
    "lastUsedAt": "2026-10-17T11:00:00.000Z"
  }
}
```

### 11.2 DELETE /api/notifications/device-token — Remove FCM Device Token
Deactivates a device token upon user logout or notification disable.

- **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "token": "dK_3f9z...fcm_registration_token..."
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Device token removed successfully",
  "data": {
    "removed": true,
    "deactivatedCount": 1
  }
}
```

### 11.3 GET /api/notifications — User Notification Inbox
Retrieves in-app notification history and unread badge count for the user.

- **Headers:** `Authorization: Bearer <JWT>`
- **Query Params:** `?page=1&limit=20&unreadOnly=false`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [
      {
        "_id": "67b0c1...",
        "title": "Laundry Order Update #WO-20261017-1058",
        "body": "Your work order is now: Ready for Delivery.",
        "type": "LAUNDRY_ORDER_STATUS",
        "data": {
          "orderId": "67b0c0...",
          "orderNumber": "WO-20261017-1058",
          "status": "READY_FOR_DELIVERY"
        },
        "isRead": false,
        "createdAt": "2026-10-17T11:00:00.000Z"
      }
    ],
    "unreadCount": 1,
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

## SERIES 12: Laundry & Work Order Dispatch (`/api/laundry` & `/api/v1/laundry`)

Digital work order pipeline bridging user wardrobe clothes with local laundry, dhobi, and garment care services. Generates automated high-resolution PDF work orders with visual dress cutouts and dispatches them directly to the vendor's WhatsApp.

### 12.1 GET /api/v1/laundry/vendors/lookup — Lookup Partner / Dhobi
Checks whether a vendor phone number is an Arangtik registered partner or direct contact.

- **Headers:** `Authorization: Bearer <JWT>`
- **Query Params:** `?phone=919876543210`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Registered vendor found",
  "data": {
    "isRegistered": true,
    "vendor": {
      "id": "67b3f890b1234567890abcde",
      "vendorId": "VND-482910",
      "name": "Ramesh Patel",
      "phone": "919876543210",
      "businessName": "Ramesh Super Dry Cleaners",
      "rating": 5.0,
      "totalOrdersHandled": 14,
      "isVerified": true
    }
  }
}
```

### 12.2 POST /api/v1/laundry/orders — Create Laundry Work Order
Creates a new work order from selected closet garments, generates a PDF receipt, and dispatches via WhatsApp.

- **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "vendorPhone": "919876543210",
  "vendorName": "Ramesh Patel",
  "pickupDate": "2026-10-19T09:00:00.000Z",
  "expectedDeliveryDate": "2026-10-21T18:00:00.000Z",
  "specialInstructions": "Handle silk kurta with care.",
  "items": [
    {
      "wardrobeItemId": "67a4d1001234567890abcdef",
      "serviceType": "DRY_CLEAN",
      "specialInstructions": "Dry clean only"
    },
    {
      "wardrobeItemId": "67a4d1001234567890abcdeg",
      "serviceType": "WASH_AND_IRON",
      "specialInstructions": "Starch collar"
    }
  ]
}
```
- **Allowed Service Types:** `WASH` | `IRON` | `DRY_CLEAN` | `WASH_AND_IRON` | `OTHER`
- **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Laundry Work Order created and dispatched successfully",
  "data": {
    "_id": "67b0c0f81234567890abcdef",
    "orderNumber": "WO-20261018-4921",
    "userId": "67a3f890b1234567890abcdef",
    "userName": "Rahul Sharma",
    "userPhone": "919876543210",
    "vendorName": "Ramesh Patel",
    "vendorPhone": "919876543210",
    "isRegisteredVendor": true,
    "totalItems": 2,
    "status": "PENDING_PICKUP",
    "pdfUrl": "/uploads/laundry_pdfs/WO-20261018-4921.pdf",
    "whatsappNotification": {
      "sent": true,
      "status": "DELIVERED_TO_GATEWAY"
    },
    "createdAt": "2026-10-18T10:00:00.000Z"
  }
}
```

### 12.3 GET /api/v1/laundry/orders — List User Work Orders
- **Headers:** `Authorization: Bearer <JWT>`
- **Query Params:** `?status=PENDING_PICKUP&page=1&limit=20`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Laundry Work Orders retrieved successfully",
  "data": {
    "orders": [ ... ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

### 12.4 GET /api/v1/laundry/orders/:id — Work Order Detailed Breakdown
- **Headers:** `Authorization: Bearer <JWT>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work Order details retrieved",
  "data": {
    "_id": "67b0c0f81234567890abcdef",
    "orderNumber": "WO-20261018-4921",
    "status": "PENDING_PICKUP",
    "items": [ ... ],
    "statusHistory": [ ... ]
  }
}
```

### 12.5 PATCH /api/v1/laundry/orders/:id/status — User Order Status Update
Users can cancel their pending orders or record progression.

- **Headers:** `Authorization: Bearer <JWT>`, `Content-Type: application/json`
- **Request Body (Cancel Order):**
```json
{
  "status": "CANCELLED",
  "note": "Plans changed, cancelling order"
}
```
- **Strict Role Rules for Customer Status Update:**
  - ✅ **Customer CAN CANCEL (`CANCELLED`):** While awaiting pickup or before delivery. Triggers push notification to vendor.
  - ❌ **Customer CANNOT REJECT (`REJECTED`):** Sending `status: "REJECTED"` returns **HTTP 400** (`"Customers cannot reject orders. Please use CANCELLED if you wish to cancel this order."`).
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work Order status updated successfully",
  "data": {
    "_id": "67b0c0f81234567890abcdef",
    "orderNumber": "WO-20261018-4921",
    "status": "CANCELLED"
  }
}
```

### 12.6 POST /api/v1/laundry/orders/:id/resend-whatsapp — Re-send WhatsApp PDF
- **Headers:** `Authorization: Bearer <JWT>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "WhatsApp Work Order re-dispatched successfully",
  "data": {
    "orderId": "67b0c0f81234567890abcdef",
    "whatsappNotification": { "sent": true, "status": "DELIVERED_TO_GATEWAY" }
  }
}
```

---

## SERIES 13: Vendor Partner Network & Order Management (`/api/vendor` & `/api/v1/vendor`)

Dedicated service provider ecosystem for local partners (Dhobis, Tailors, Ironing pros, Milkmen). Includes dedicated partner authentication, business profile management, and live order pipeline fulfillment.

### 13.1 GET /api/vendor/categories — Public Service Categories
Returns registered operational partner categories with icons and descriptions.

- **Headers:** Public (No Auth Required)
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor categories retrieved successfully",
  "data": {
    "categories": [
      { "id": "dhobi", "name": "Dhobi", "icon": "🧺", "description": "Laundry, Dry Cleaning & Garment Care" },
      { "id": "press_ironing", "name": "Press / Ironing", "icon": "👔", "description": "Clothes Pressing & Fold Delivery" },
      { "id": "tailor", "name": "Tailor", "icon": "✂️", "description": "Stitching & Garment Alteration" },
      { "id": "doodh_wala", "name": "Doodh Wala", "icon": "🥛", "description": "Fresh Milk & Dairy Delivery" }
    ]
  }
}
```

### 13.2 POST /api/vendor/auth/register — Vendor Partner Registration
Registers a new verified partner with automatic unique Vendor ID (`VND-XXXXXX`).

- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Ramesh Patel",
  "phone": "919876543210",
  "password": "VendorSecretPassword123",
  "category": "Dhobi",
  "businessName": "Ramesh Super Dry Cleaners",
  "address": {
    "street": "Shop 4, Gandhi Market",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Vendor registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "vendor": {
      "_id": "67b3f890b1234567890abcde",
      "vendorId": "VND-482910",
      "name": "Ramesh Patel",
      "phone": "919876543210",
      "category": "Dhobi",
      "businessName": "Ramesh Super Dry Cleaners",
      "rating": 5.0,
      "totalOrdersHandled": 0,
      "isVerified": true,
      "isRegistered": true,
      "status": "ACTIVE"
    }
  }
}
```

### 13.3 POST /api/vendor/auth/login — Vendor Password Login
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "919876543210",
  "password": "VendorSecretPassword123"
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
      "_id": "67b3f890b1234567890abcde",
      "vendorId": "VND-482910",
      "name": "Ramesh Patel",
      "phone": "919876543210",
      "category": "Dhobi",
      "businessName": "Ramesh Super Dry Cleaners",
      "isVerified": true
    }
  }
}
```

### 13.4 Vendor Password Reset Flow
1. **Request Reset OTP:** `POST /api/vendor/auth/forgot-password` with `{ "phone": "919876543210" }`
2. **Verify Reset OTP:** `POST /api/vendor/auth/verify-reset-otp` with `{ "phone": "919876543210", "otp": "1234" }`
3. **Set New Password:** `POST /api/vendor/auth/reset-password` with `{ "phone": "919876543210", "otp": "1234", "newPassword": "NewPassword123" }`

### 13.5 GET /api/vendor/profile — Fetch Vendor Profile
Returns authenticated vendor's full profile, metrics, rating, and address details.

- **Headers:** `Authorization: Bearer <VENDOR_TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor profile retrieved successfully",
  "data": {
    "_id": "67b3f890b1234567890abcde",
    "vendorId": "VND-482910",
    "name": "Ramesh Patel",
    "phone": "919876543210",
    "category": "Dhobi",
    "businessName": "Ramesh Super Dry Cleaners",
    "address": {
      "street": "Shop 4, Gandhi Market",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    },
    "rating": 5.0,
    "totalOrdersHandled": 14,
    "isVerified": true,
    "isRegistered": true,
    "status": "ACTIVE"
  }
}
```
*(Alias: `GET /api/vendor/auth/me`)*

### 13.6 GET /api/vendor/orders — List Assigned Work Orders
Lists all work orders assigned to this partner, with multi-status filtering, text search, and pagination.

- **Headers:** `Authorization: Bearer <VENDOR_TOKEN>`
- **Query Params:**
  - `status`: Optional filter (`ALL`, `PENDING_PICKUP`, `PICKED_UP`, `IN_PROCESS`, `DELIVERED`, `REJECTED`)
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`, max: `100`)
  - `search`: Search string (matches orderNumber, customer name, or phone)
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor work orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "67b0c0f81234567890abcdef",
        "orderNumber": "WO-20261018-4921",
        "userName": "Rahul Sharma",
        "userPhone": "919876543210",
        "pickupDate": "2026-10-19T09:00:00.000Z",
        "expectedDeliveryDate": "2026-10-21T18:00:00.000Z",
        "totalItems": 2,
        "status": "PENDING_PICKUP",
        "pdfUrl": "/uploads/laundry_pdfs/WO-20261018-4921.pdf"
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

### 13.7 GET /api/vendor/orders/:id — Work Order Details by ID
- **Headers:** `Authorization: Bearer <VENDOR_TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor work order details retrieved",
  "data": {
    "_id": "67b0c0f81234567890abcdef",
    "orderNumber": "WO-20261018-4921",
    "userName": "Rahul Sharma",
    "userPhone": "919876543210",
    "pickupDate": "2026-10-19T09:00:00.000Z",
    "expectedDeliveryDate": "2026-10-21T18:00:00.000Z",
    "status": "PENDING_PICKUP",
    "items": [ ... ],
    "statusHistory": [ ... ]
  }
}
```

### 13.8 PATCH /api/vendor/orders/:id/status — Vendor Order Status Update
Advances the order through the streamlined 4-step process or declines/rejects the order.

- **Headers:** `Authorization: Bearer <VENDOR_TOKEN>`, `Content-Type: application/json`
- **Request Body (Step Forward):**
```json
{
  "status": "PICKED_UP",
  "note": "Garments picked up from customer"
}
```
- **Request Body (Decline / Reject Order):**
```json
{
  "status": "REJECTED",
  "note": "Shop closed today / Over capacity"
}
```

#### 🚦 Strict Business Rules for Vendor Status Updates:
1. **Vendors CANNOT CANCEL:**  
   Sending `"status": "CANCELLED"` returns **HTTP 400**:
   ```json
   {
     "success": false,
     "statusCode": 400,
     "message": "Vendors cannot cancel orders. Please use REJECTED if you wish to decline this order."
   }
   ```
2. **Vendors CAN REJECT (`REJECTED`):**  
   Vendors can decline orders (when in `PENDING_PICKUP`). Records `changedBy: "VENDOR"` and sends instant FCM notification to customer (`Vendor [Name] has rejected your work order. Reason: [Note]`).
3. **4-Step Progressive Workflow:**
   - **Step 1:** `PENDING_PICKUP` (Awaiting pickup)
   - **Step 2:** `PICKED_UP` (Garments collected)
   - **Step 3:** `IN_PROCESS` (Washing / Ironing / Dry cleaning underway)
   - **Step 4:** `DELIVERED` (Returned to customer / completed)
4. **Auto-Increment Counter:**  
   Marking an order as `DELIVERED` automatically increments the vendor's `totalOrdersHandled` in the database.

- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Work order status updated successfully by vendor",
  "data": {
    "_id": "67b0c0f81234567890abcdef",
    "orderNumber": "WO-20261018-4921",
    "status": "PICKED_UP",
    "statusHistory": [ ... ]
  }
}
```

---

*Documentation maintained by Arangtik Engineering Team.*
