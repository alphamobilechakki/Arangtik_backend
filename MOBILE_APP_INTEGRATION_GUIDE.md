# 📱 Arangtik Mobile App Integration Guide & API Contract
> **Native Mobile Application Integration Handbook (iOS • Android • Flutter • React Native)**  
> **Backend Base URL:** `http://localhost:8083/api` *(Production: `https://api.arangtik.com/api`)*  
> **API Version:** `v1.2.0` • **Auth Mechanism:** `Bearer JWT Token` (Header: `Authorization: Bearer <TOKEN>`)  
> **Global Content-Type:** `application/json` (or `multipart/form-data` for photo uploads)

---

## 📌 Mobile App Architecture & Integration Overview

Arangtik is designed as a **Native Mobile-First Application**. The backend powers automated camera/gallery cloth scanning, biometric face recognition, multi-Almari management, duplicate prevention with side-by-side comparison, 3D clothing reconstruction, and smart outfit styling.

### 🌐 Global API Response Structure
Every endpoint returns a predictable standard JSON response:

```json
// Success Response (HTTP 200 / 201)
{
  "success": true,
  "statusCode": 200,
  "message": "Human-friendly success message",
  "data": { ... }
}

// Error Response (HTTP 400 / 401 / 403 / 404 / 422 / 500)
{
  "success": false,
  "statusCode": 400,
  "message": "Clear explanation of what went wrong",
  "errors": [ ... ]
}
```

---

================================================================================
## FEATURE 1: AUTHENTICATION & WHATSAPP OTP LOGIN
================================================================================

### 1. Overview
Secure passwordless authentication using mobile phone numbers and 6-digit WhatsApp OTP. Upon successful verification, the backend generates a persistent JWT session token.

### 2. Endpoints

#### A. Send OTP
- **Method:** `POST`
- **Path:** `/api/auth/send-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "919876543210"
}
```
- **Response (200 OK):**
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

#### B. Verify OTP & Issue Token
- **Method:** `POST`
- **Path:** `/api/auth/verify-otp`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "phone": "919876543210",
  "otp": "123456"
}
```
- **Response (200 OK):**
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
      "profileImage": "/uploads/avatar_123.jpg",
      "hasReferenceFace": true,
      "defaultWardrobeId": "6ac8e4471dd51c1c79a52e6d"
    }
  }
}
```

#### C. User Logout
- **Method:** `POST`
- **Path:** `/api/auth/logout`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully"
}
```

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Phone Number Sanitization:**
   - Trim spaces, dashes, parentheses (`+`, `-`, ` `).
   - Must include country code without `+` (e.g. `919876543210`).
   - Regex Validation: `/^[0-9]{10,14}$/`. If invalid, show: *"Please enter a valid phone number with country code"*.
2. **OTP Input Validation:**
   - Must be exactly 6 numeric digits (`/^[0-9]{6}$/`).
   - Disable "Verify" button until all 6 digits are typed.
   - Show a 60-second countdown timer before enabling "Resend OTP".
3. **Session Token Storage:**
   - Store the received `token` in secure mobile storage:
     - **Flutter:** `flutter_secure_storage`
     - **React Native:** `react-native-keychain` / `expo-secure-store`
     - **iOS / Android Native:** iOS Keychain / Android EncryptedSharedPreferences
   - Never store JWT in unencrypted SharedPreferences or AsyncStorage.
4. **401 Unauthorized Interceptor:**
   - If any API call returns 401, purge stored token, clear state, and redirect user to Login Screen.

================================================================================
## FEATURE 2: USER PROFILE & REFERENCE FACE ENROLLMENT
================================================================================

### 1. Overview
Manages the user's personal profile (Name, Gender, Height, Body Type) and enrolls their reference biometric face vector (128-D embedding). This face vector powers automatic clothes filtering in gallery photos.

### 2. Endpoints

#### A. Get Current Profile
- **Method:** `GET`
- **Path:** `/api/auth/profile`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "67a3f890b1234567890abcdef",
    "name": "Rahul Sharma",
    "phone": "919876543210",
    "gender": "MALE",
    "height": 178,
    "bodyType": "ATHLETIC",
    "profileImage": "/uploads/profile_123.jpg",
    "hasReferenceFace": true
  }
}
```

#### B. Update Profile (PATCH Only)
- **Method:** `PATCH` *(Never use PUT)*
- **Path:** `/api/auth/profile`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Rahul Sharma",
  "gender": "MALE",
  "height": 180,
  "bodyType": "ATHLETIC"
}
```

#### C. Upload Profile Image & Enroll Reference Face
- **Method:** `POST`
- **Path:** `/api/auth/profile-image` *(or `/api/face-recognition/register`)*
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
- **FormData Body:**
  - `photo`: File (Selfie / Clear Portrait Photo)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile picture updated and reference face enrolled successfully",
  "data": {
    "profileImage": "/uploads/profile_rahul_9823.jpg",
    "hasReferenceFace": true,
    "facesDetected": 1,
    "confidence": 0.98
  }
}
```

#### D. Check Face Enrollment Status
- **Method:** `GET`
- **Path:** `/api/face-recognition/status`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "isEnrolled": true,
    "hasReferenceFace": true,
    "enrolledAt": "2026-10-13T10:00:00.000Z"
  }
}
```

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Name Field Validation:**
   - Must be between 2 and 60 characters. Disallow pure numbers or special symbols.
2. **Face Photo Capture Constraints:**
   - Image format: JPEG, PNG, WEBP.
   - Max file size: 10 MB.
   - Client-side crop: Prefer 1:1 square crop or portrait aspect ratio (3:4 / 4:5).
   - Compress photo client-side to maximum dimensions `1200x1200` with JPEG quality `85%` before uploading to reduce mobile data usage and speed up API response.
3. **Lighting & Face Warning:**
   - Show an in-app tip: *"Ensure your face is well-lit, looking straight at the camera without sunglasses or masks"*.
   - If backend returns `facesDetected === 0`, prompt user: *"No face detected. Please take a clear selfie"*.
   - If backend returns `facesDetected > 1`, prompt user: *"Multiple faces found. Please upload a photo with only you"*.

================================================================================
## FEATURE 3: DIGITAL ALMARI / MULTI-WARDROBE CONTAINERS
================================================================================

### 1. Overview
Users can create separate Almari containers for different rooms, seasons, or family members (e.g. *"Master Bedroom Almari"*, *"Winter Wardrobe"*, *"Kids Closet"*, *"Pooja Almari"*). Each Almari can have its own designated owner name and reference face photo.

### 2. Endpoints

#### A. List User Wardrobes / Closets
- **Method:** `GET`
- **Path:** `/api/wardrobe/get-wardrobes`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Params:** `?storeType=WARDROBE` *(optional, default: WARDROBE)*
- **Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6ac8e4471dd51c1c79a52e6d",
      "name": "Master Almari",
      "ownerName": "Rahul",
      "ownerFaceImage": "/uploads/owner_rahul.jpg",
      "isDefault": true,
      "itemsCount": 18,
      "storagePlaces": ["Hanger Section", "Top Shelf", "Drawer 1"]
    },
    {
      "_id": "6ac8e4471dd51c1c79a52e6e",
      "name": "Pooja & Ethnic Almari",
      "ownerName": "Pooja",
      "isDefault": false,
      "itemsCount": 6
    }
  ]
}
```

#### B. Create New Wardrobe Container
- **Method:** `POST`
- **Path:** `/api/wardrobe/create-wardrobe`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data` *(or `application/json`)*
- **FormData / JSON Body:**
```json
{
  "name": "Winter Closet",
  "ownerName": "Rahul Sharma",
  "storeType": "WARDROBE",
  "isDefault": false,
  "storagePlaces": ["Box 1", "Hanger Left"]
}
```
*(Optional: attach `ownerFace`: File to set a specific person's face for this Almari)*
- **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Wardrobe container created successfully",
  "data": {
    "_id": "6ac8e4471dd51c1c79a52e70",
    "name": "Winter Closet",
    "ownerName": "Rahul Sharma",
    "isDefault": false,
    "itemsCount": 0
  }
}
```

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Container Name:** Required, 2-50 characters. Check for duplicate names locally.
2. **Default Wardrobe Persistence:**
   - Mobile app must persist the currently active `selectedWardrobeId` in local storage.
   - If user hasn't selected an Almari, auto-select the one with `isDefault: true`.
3. **Multi-Almari Selection Checkboxes (Mobile-First):**
   - In filtering or outfit recommendation screens, present Almari selection as multi-select checkboxes or pill chips so user can choose which Almaris to include.

================================================================================
## FEATURE 4: DIRECT CAMERA/GALLERY CLOTH EXTRACTION & DUPLICATE PREVENTION
================================================================================

### 1. Overview
The core digitization engine. The user clicks a picture of a garment or selects 1 to 100 photos from their gallery. With **ONE single button click**, the AI:
1. Detects & segments garments with automatic background removal.
2. Identifies category, subcategory, color, fabric, pattern, and style.
3. Automatically suppresses noise, accessories, and cut-off clothes.
4. Performs **2-level duplicate detection**:
   - Level 1: Exact image hash & perceptual dHash ($\ge 92\%$ visual match).
   - Level 2: AI Vision attribute match against items in the Almari.
5. Directly adds unique clothes to Almari, while isolating duplicate clothes and offering a side-by-side comparison modal.

### 2. Endpoints

#### Single Unified Action Endpoint
- **Method:** `POST`
- **Path:** `/api/wardrobe/add-item` *(or `/api/wardrobe/extract-item`)*
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
- **FormData Parameters:**
  - `photos` *(or `photo`)*: 1 to 100 Image files (from Camera capture or Gallery picker)
  - `wardrobeId`: Target Almari container ID (String, e.g. `6ac8e4471dd51c1c79a52e6d`)
  - `storagePlace`: (Optional, String, e.g. `"Main Closet"` or `"Drawer 2"`)
  - `autoAddAll`: `"true"` (Boolean string)

- **Response Scenarios:**

##### Scenario A: Unique Dress (Newly Added)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Item added successfully to wardrobe store",
  "data": {
    "_id": "67a4e91234567890abcdef12",
    "name": "Navy Blue Formal Shirt",
    "category": "UPPER_WEAR",
    "subCategory": "Shirt",
    "color": "Navy Blue",
    "fabric": "Cotton",
    "pattern": "Solid",
    "images": [
      {
        "url": "/uploads/seg_dress_1712398.png",
        "isPrimary": true
      }
    ],
    "isDuplicate": false
  }
}
```

##### Scenario B: Duplicate Dress Detected (Auto-Skipped)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "This dress already exists in your Almari as \"Navy Blue Formal Shirt\" (skipped duplicate addition).",
  "data": {
    "isDuplicate": true,
    "duplicates": [
      {
        "_id": "67a3f890b1234567890abcdef",
        "name": "Navy Blue Formal Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "fabric": "Cotton",
        "pattern": "Solid",
        "images": [
          { "url": "/uploads/seg_dress_existing.png", "isPrimary": true }
        ],
        "isDuplicate": true,
        "isExistingItem": true,
        "duplicateReason": "PERCEPTUAL_HASH",
        "similarityScore": 0.96,
        "uploadedPhotoUrl": "/uploads/raw_camera_shot_123.jpg",
        "uploadedDetectedGarment": {
          "name": "Navy Blue Formal Shirt",
          "category": "UPPER_WEAR",
          "color": "Navy Blue",
          "fabric": "Cotton"
        }
      }
    ],
    "items": []
  }
}
```

##### Scenario C: Bulk Batch Upload (Multiple Photos)
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Bulk processing complete: 3 new item(s) added, 1 duplicate dress(es) already in Almari (skipped).",
  "data": {
    "totalPhotosReceived": 4,
    "totalItemsCreated": 3,
    "duplicateItemsSkipped": 1,
    "items": [ /* array of 3 newly created wardrobe documents */ ],
    "duplicates": [ /* array of 1 duplicate item document */ ]
  }
}
```

#### Force Add / Override Duplicate Endpoint
When the user reviews the duplicate in the Comparison Modal and says *"Nahi, ye alag dress hai (Add Karein)"*:
- **Method:** `POST`
- **Path:** `/api/wardrobe/add-item`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Navy Blue Linen Shirt",
  "category": "UPPER_WEAR",
  "subCategory": "Shirt",
  "color": "Navy Blue",
  "fabric": "Linen",
  "wardrobeId": "6ac8e4471dd51c1c79a52e6d",
  "forceAdd": true,
  "allowDuplicate": true,
  "images": [
    { "url": "/uploads/seg_dress_1712398.png", "isPrimary": true }
  ],
  "sourcePhotoUrl": "/uploads/raw_camera_shot_123.jpg"
}
```
- **Response (201 Created):**
Forces the addition to the Almari regardless of perceptual or hash similarity.

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Single Action Button Architecture:**
   - Show only **ONE primary action button**: `"Extract & Add to Almari"`.
   - Never show confusing separate buttons like "Preview" and "Extract". The single button must execute the full pipeline.
2. **File Selection & Compression:**
   - Allow 1 to 100 images from mobile gallery/camera (`image/*`).
   - Block non-image file types (PDF, MP4, etc.). Show error: *"Only image files (JPG, PNG, WEBP) are supported"*.
   - If selected files $> 100$, slice to 100 and alert: *"Maximum 100 photos can be processed at once"*.
   - Compress high-resolution camera photos (e.g. 48MP/108MP) to maximum `1600px` longest edge at `85%` JPEG quality before building `FormData`. This prevents app memory crashes and upload timeouts.
3. **Empty File Check:**
   - If `selectedFiles.length === 0`, disable button and show toast: *"Please select or capture at least 1 clothing photo"*.
4. **Mandatory Wardrobe Selection:**
   - Verify `wardrobeId` is present. If missing, prompt user to select an Almari first.
5. **Results Presentation UI:**
   - If `items.length > 0`: Show green banner and display newly added cards.
   - If `duplicates.length > 0`: Show amber banner: *"Already in Almari (Skipped X Duplicate Items)"*.
   - On each duplicate card, render a **"Compare"** button.
6. **Side-by-Side Duplicate Comparison Modal:**
   - When user taps "Compare", open a full-screen or bottom-sheet modal:
     - Left / Top Card: *"Already in Almari"* (Existing dress image, name, fabric, times worn).
     - Right / Bottom Card: *"Newly Detected"* (Current photo, detected color, similarity percentage).
     - Action 1: **"Same Dress (Skip)"** $\rightarrow$ Dismiss modal and keep excluded.
     - Action 2: **"Different Dress (Add to Almari)"** $\rightarrow$ Dispatch `forceAdd: true` request, show success toast, and move card into "Newly Added".

================================================================================
## FEATURE 5: BULK GALLERY / EVENT INGESTION WITH BIOMETRIC FACE FILTER
================================================================================

### 1. Overview
Allows user to dump 50-100 event, party, or wedding photos. The AI scans each photo, finds the Almari owner's face, excludes photos of other people, segments only the owner's clothing, and automatically stores them into that person's Almari.

### 2. Endpoints

#### Verify Face in Photo
- **Method:** `POST`
- **Path:** `/api/face-recognition/verify`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
- **FormData Parameters:**
  - `photo`: File (Photo to test)
  - `wardrobeId`: (Optional) If provided, checks against Almari owner's face. If omitted, checks against User's profile face.
  - `threshold`: `0.50` (Float, range 0.30 to 0.70; default: 0.50)
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "matched": true,
    "confidenceScore": 0.88,
    "targetPersonName": "Rahul Sharma",
    "facesDetected": 2,
    "matchedFaces": [
      { "faceIndex": 0, "similarity": 0.88, "isMatch": true }
    ]
  }
}
```

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Target Person Banner:**
   - Before scanning, display a banner showing the Almari owner's face avatar and name:
     *"Scanning for Rahul Sharma. Only Rahul's clothes will be added to this Almari"*.
2. **Threshold Slider:**
   - Provide a sensitivity slider with range `0.30` to `0.70` (default `0.50`).
   - Lower threshold (0.40) = Stricter match.
   - Higher threshold (0.60) = More lenient match.
3. **Chunked Processing for Large Batches:**
   - For 50+ photos, process in concurrent chunks of 5 photos client-side to prevent network socket drops. Show a progress bar: *"Scanning photo 12 of 60..."*.
4. **Summary Breakdown:**
   - Display stats: *"Total Photos: 50 • Rahul Found in: 18 • Other People: 32 • Items Added: 24"*.

================================================================================
## FEATURE 6: WARDROBE CATALOG, FILTERING, SEARCH & PAGINATION
================================================================================

### 1. Overview
Browse all clothing items stored across the user's Almaris. Supports text search, multi-category tabs, color filters, season filters, occasions, and favorite filters.

### 2. Endpoints

#### Get All Wardrobe Items
- **Method:** `GET`
- **Path:** `/api/wardrobe/get-items` *(or `/api/wardrobe/get-all-items`)*
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Query Parameters:**
  - `wardrobeId`: Filter by specific Almari ID (optional)
  - `category`: `UPPER_WEAR` | `LOWER_WEAR` | `ONE_PIECE` | `FOOTWEAR` | `ACCESSORIES` (optional)
  - `subCategory`: e.g. `Shirt`, `Jeans`, `Kurta`, `Saree`, `Sneakers` (optional)
  - `color`: e.g. `Black`, `Navy Blue`, `Red` (optional)
  - `occasion`: `CASUAL` | `FORMAL` | `PARTY` | `ETHNIC` | `SPORTS` (optional)
  - `season`: `SUMMER` | `WINTER` | `MONSOON` | `ALL_SEASON` (optional)
  - `search`: Keyword search on name, tags, fabric (optional)
  - `favorite`: `true` | `false` (optional)
  - `page`: Page number (Integer, default: 1)
  - `limit`: Items per page (Integer, default: 20, max: 100)

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "items": [
      {
        "_id": "67a3f890b1234567890abcdef",
        "name": "Navy Blue Formal Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "fabric": "Cotton",
        "pattern": "Solid",
        "isFavorite": true,
        "wearCount": 4,
        "lastWornAt": "2026-10-10T14:30:00.000Z",
        "storagePlace": "Hanger 4",
        "images": [
          { "url": "/uploads/shirt_cutout.png", "isPrimary": true }
        ],
        "model3d": {
          "status": "COMPLETED",
          "glbUrl": "/uploads/models/model_shirt_67a3f.glb"
        }
      }
    ]
  }
}
```

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Search Debounce:**
   - Debounce search input by 350ms before firing GET request to avoid flooding the server.
2. **Infinite Scroll / Pagination:**
   - Implement pagination with `onEndReached` (React Native / Flutter ListView). Stop requesting when `page >= totalPages`.
3. **Category Tab Icons:**
   - Map standard mobile UI icons:
     - `UPPER_WEAR` $\rightarrow$ Shirt icon
     - `LOWER_WEAR` $\rightarrow$ Trousers/Pants icon
     - `ONE_PIECE` $\rightarrow$ Dress/Saree icon
     - `FOOTWEAR` $\rightarrow$ Shoe icon
     - `ACCESSORIES` $\rightarrow$ Watch/Bag icon
4. **Offline Caching:**
   - Cache the items list locally using SQLite / Realm / Room / Hive for instant offline rendering on app launch.

================================================================================
## FEATURE 7: ITEM DETAILS, PATCH UPDATES & DELETION
================================================================================

### 1. Overview
View garment specs, update fields (favorite status, times worn, color, storage place), or delete an item from the wardrobe.

### 2. Endpoints

#### A. Get Item Details
- **Method:** `GET`
- **Path:** `/api/wardrobe/get-item/:id` *(or `/api/wardrobe/get-item-details/:id`)*
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):** Returns full garment document.

#### B. Update Item Attributes (STRICT: PATCH ONLY, NEVER PUT)
- **Method:** `PATCH`
- **Path:** `/api/wardrobe/edit-item/:id` *(or `/api/wardrobe/update-item/:id`)*
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body (Pass only modified fields):**
```json
{
  "name": "Navy Blue Linen Casual Shirt",
  "isFavorite": true,
  "storagePlace": "Drawer 3",
  "wearCount": 5,
  "lastWornAt": "2026-10-13T18:00:00.000Z"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Wardrobe item updated successfully",
  "data": { /* updated item object */ }
}
```

#### C. Delete Item
- **Method:** `DELETE`
- **Path:** `/api/wardrobe/delete-item/:id`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Wardrobe item deleted successfully",
  "data": { "deleted": true, "itemId": "67a3f890b1234567890abcdef" }
}
```

### 3. Frontend & Mobile Client-Side Validation Rules
1. **HTTP Method Constraint (Rule 4):**
   - Strictly use `PATCH` for updates. Never use `PUT`.
2. **Optimistic UI Updates:**
   - When tapping the Heart (Favorite) icon, update the UI state immediately. If API fails, roll back and show toast: *"Failed to update favorite status"*.
3. **Delete Confirmation Dialog:**
   - Always prompt user with an alert: *"Are you sure you want to remove this garment from your Almari? This action cannot be undone."* before calling `DELETE`.

================================================================================
## FEATURE 8: 3D GARMENT MODEL GENERATION (TRIPOSR ENGINE)
================================================================================

### 1. Overview
Transforms 2D segmented dress photos into interactive 3D `.glb` mesh models using Hugging Face TripoSR. Users can rotate and examine the garment in 360 degrees.

### 2. Endpoints

#### Trigger 3D Model Generation
- **Method:** `POST`
- **Path:** `/api/wardrobe/generate-3d/:id`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK / 202 Accepted):**
```json
{
  "success": true,
  "message": "3D garment model generation initiated",
  "data": {
    "itemId": "67a3f890b1234567890abcdef",
    "status": "PROCESSING",
    "message": "Generating 3D mesh via TripoSR AI..."
  }
}
```

#### Checking 3D Model Status
Check `item.model3d.status` in `GET /api/wardrobe/get-item/:id`.
Status lifecycle: `NOT_STARTED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` *(or `FAILED`)*.
When `COMPLETED`, `item.model3d.glbUrl` contains the downloadable 3D asset (e.g. `/uploads/models/model_shirt_67a3f.glb`).

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Mobile 3D Model Rendering:**
   - **Flutter:** Use `model_viewer_plus` widget.
   - **React Native:** Use `@react-three/fiber` or `react-native-3d-model-view`.
   - **iOS / Android Native:** SceneKit / Filament / ARCore Sceneform.
2. **Polling / Liveness:**
   - When status is `PROCESSING`, poll `GET /api/wardrobe/get-item/:id` every 5 seconds (maximum 60 seconds).
   - Display a spinner: *"AI is building 3D model (estimated ~15s)..."*.
3. **Fallback:**
   - If `status === 'FAILED'`, show button: *"Retry 3D Generation"*.
   - Never block 2D image viewing while 3D model is processing.

================================================================================
## FEATURE 9: SMART AI OUTFIT SUGGESTIONS & OCCASION STYLIST
================================================================================

### 1. Overview
The stylist engine analyses clothes from the user's Almari(s) to create coordinated outfit combinations (Top + Bottom + Footwear or One-piece Dress + Shoes) based on occasion, weather, and color harmony.

### 2. Endpoints

#### A. Generate Outfit Suggestions
- **Method:** `POST`
- **Path:** `/api/outfit/suggest`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "occasion": "FORMAL",
  "wardrobeIds": ["6ac8e4471dd51c1c79a52e6d"],
  "temperature": 24,
  "gender": "MALE",
  "limit": 5
}
```
- **Allowed Occasion Enum:**
  `CASUAL` | `FORMAL` | `PARTY` | `WEDDING` | `SPORTS` | `ETHNIC` | `DATE_NIGHT` | `TRAVEL`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "occasion": "FORMAL",
    "totalSuggestions": 3,
    "suggestions": [
      {
        "outfitId": "outfit_rec_1",
        "score": 92,
        "colorHarmonyScore": 95,
        "occasionScore": 90,
        "reasoning": "Classic navy shirt paired with beige trousers creates a sharp, professional contrast.",
        "items": {
          "top": {
            "_id": "67a3f890b1234567890abcdef",
            "name": "Navy Blue Formal Shirt",
            "category": "UPPER_WEAR",
            "imageUrl": "/uploads/shirt_cutout.png"
          },
          "bottom": {
            "_id": "67a3f890b1234567890abcdeg",
            "name": "Beige Chinos",
            "category": "LOWER_WEAR",
            "imageUrl": "/uploads/chinos_cutout.png"
          },
          "shoes": {
            "_id": "67a3f890b1234567890abcdeh",
            "name": "Brown Leather Oxfords",
            "category": "FOOTWEAR",
            "imageUrl": "/uploads/oxfords.png"
          }
        }
      }
    ]
  }
}
```

#### B. Save Favorite Outfit
- **Method:** `POST`
- **Path:** `/api/outfit/save`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "name": "Monday Office Look",
  "occasion": "FORMAL",
  "itemIds": [
    "67a3f890b1234567890abcdef",
    "67a3f890b1234567890abcdeg",
    "67a3f890b1234567890abcdeh"
  ]
}
```

#### C. List Saved Outfits
- **Method:** `GET`
- **Path:** `/api/outfit/saved`
- **Headers:** `Authorization: Bearer <TOKEN>`

#### D. Delete Saved Outfit
- **Method:** `DELETE`
- **Path:** `/api/outfit/saved/:id`
- **Headers:** `Authorization: Bearer <TOKEN>`

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Occasion Dropdown/Pills:**
   - Display occasions as visually distinct chips with icons (e.g. 💼 Formal, ☕ Casual, 💍 Wedding, 🏃 Sports).
2. **Multi-Wardrobe Selection (Rule 8):**
   - Provide multi-select checkboxes for Almaris so user can mix and match clothes between different containers (e.g. *"Include Master Almari + Winter Almari"*).
3. **Empty Closet State:**
   - If user has fewer than 2 items in their wardrobe, show a guide: *"Add at least 1 top and 1 bottom to your Almari to get AI outfit recommendations"*.
4. **"Wear Today" One-Tap Counter:**
   - When user chooses to wear an outfit, send `PATCH` to increment `wearCount` and set `lastWornAt` to today for all items in that outfit.

================================================================================
## FEATURE 10: MEDIA STORAGE & IMAGE URL RESOLUTION
================================================================================

### 1. Overview
The backend returns image URLs as relative paths (e.g. `/uploads/image_name.png`). The mobile client must resolve these paths into absolute URLs using the base server domain.

### 2. URL Resolution Rule
```typescript
const BASE_URL = 'http://localhost:8083'; // In production: 'https://api.arangtik.com'

export function getImageUrl(path?: string): string {
  if (!path) return 'https://placehold.co/400x400?text=No+Image';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
}
```

### 3. Frontend & Mobile Client-Side Validation Rules
1. **Image Caching (Crucial for Mobile Performance):**
   - Use aggressive image caching libraries:
     - **React Native:** `react-native-fast-image`
     - **Flutter:** `cached_network_image`
     - **iOS / Android:** Kingfisher (Swift) / Glide / Coil (Kotlin)
2. **Placeholder & Error Image:**
   - Always display a shimmer/skeleton loader while image loads.
   - If image returns 404, fallback gracefully to a clothing icon.

================================================================================
## FEATURE 11: ERROR HANDLING, TIMEOUTS & NETWORK RESILIENCE
================================================================================

### 1. HTTP Status Code Conventions
| Status Code | Meaning | Mobile Action |
|:---:|---|---|
| **200** | Success (OK) | Render data normally |
| **201** | Resource Created | Show success toast / refresh list |
| **400** | Bad Request | Display `message` from backend in a friendly alert |
| **401** | Unauthorized | Token expired/invalid $\rightarrow$ Clear token & navigate to Login |
| **403** | Forbidden | User doesn't own this Almari/item $\rightarrow$ Show access denied error |
| **404** | Not Found | Item deleted or missing $\rightarrow$ Pop navigation stack |
| **422** | Validation Error | Highlight specific input fields that failed |
| **500** | Internal Server Error | Show *"Server is currently busy. Please try again"* |

### 2. Mobile Network Timeouts
- **Normal API calls (Auth, Wardrobe CRUD, Outfits):** `timeout = 10,000 ms` (10 seconds).
- **AI Vision Scanning & Ingestion (1 to 100 photos):** `timeout = 90,000 ms` (90 seconds) to allow multi-model processing and background removal.

### 3. Offline & Retry Handling
- Check device connectivity with NetInfo / ConnectivityManager before firing heavy multipart upload requests.
- If offline, alert user: *"No internet connection. Please check your network and try again"*.

================================================================================
## FEATURE 12: SMART LAUNDRY MANAGEMENT & WORK ORDERS
================================================================================

### 1. Overview
The Laundry module allows mobile users to select multiple dresses from their Almaris, choose a laundry vendor (by entering a phone number or selecting from device contacts), set a **Pickup Date** and an **Expected Delivery Date**, and create a professional **Work Order**.

The backend automatically:
1. Validates and snapshots all selected garments with photos, colors, and fabrics.
2. Identifies whether the vendor is **Registered** or **Unregistered** (saving unregistered vendors to a dedicated table).
3. Generates a branded **Arangtik Work Order PDF** with user details, dates, and garment inventory.
4. Dispatches a WhatsApp notification containing the Work Order details and PDF attachment to the vendor via **API24**.
5. When an unregistered vendor later registers/logs into Arangtik, their records are automatically converted to a verified registered vendor and past work orders are linked.

---

### 2. Mobile Endpoints

#### A. Vendor Phone Lookup (Contacts or Manual Input)
When the user types a number or picks a contact from their device:
- **Method:** `GET`
- **Path:** `/api/v1/laundry/vendors/lookup?phone=919876543210`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK — Registered Vendor):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Registered vendor found",
  "data": {
    "isRegistered": true,
    "vendor": {
      "id": "670c5e1b4f1a2c3d4e5f6a7b",
      "vendorId": "VND-489201",
      "name": "CleanWash Express",
      "phone": "919876543210",
      "businessName": "CleanWash Express Laundromat",
      "rating": 5,
      "totalOrdersHandled": 14,
      "isVerified": true
    }
  }
}
```
- **Response (200 OK — Unregistered Vendor / New Contact):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Vendor details retrieved",
  "data": {
    "isRegistered": false,
    "vendor": {
      "id": null,
      "vendorId": null,
      "name": "",
      "phone": "919876543210",
      "businessName": "",
      "isVerified": false
    }
  }
}
```
> **Mobile UI Tip:** If `isRegistered === true`, automatically fill and lock the vendor name input and show a green **"Verified Vendor"** checkmark badge. If `false`, keep the vendor name field editable so the user can label their local laundry/dhobi.

---

#### B. Create Laundry Work Order
- **Method:** `POST`
- **Path:** `/api/v1/laundry/orders`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "vendorPhone": "919876543210",
  "vendorName": "CleanWash Express",
  "pickupDate": "2026-10-15T10:00:00.000Z",
  "expectedDeliveryDate": "2026-10-17T18:00:00.000Z",
  "specialInstructions": "Please handle delicate silk items with gentle wash",
  "items": [
    {
      "wardrobeItemId": "670b8a1c9e2d3f4a5b6c7d8e",
      "serviceType": "WASH_AND_IRON",
      "specialInstructions": "Mild starch on collar"
    },
    {
      "wardrobeItemId": "670b8a2c9e2d3f4a5b6c7d8f",
      "serviceType": "DRY_CLEAN",
      "specialInstructions": "Dry clean only"
    }
  ]
}
```
> **Service Types Allowed:** `WASH` | `IRON` | `DRY_CLEAN` | `WASH_AND_IRON` | `OTHER`
- **Response (201 Created):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Laundry Work Order created and dispatched successfully",
  "data": {
    "_id": "670d8f1e2a3b4c5d6e7f8a9b",
    "orderNumber": "WO-20261014-4821",
    "userName": "Rahul Sharma",
    "userPhone": "919888800001",
    "vendorName": "CleanWash Express",
    "vendorPhone": "919876543210",
    "isRegisteredVendor": true,
    "pickupDate": "2026-10-15T10:00:00.000Z",
    "expectedDeliveryDate": "2026-10-17T18:00:00.000Z",
    "status": "PENDING_PICKUP",
    "totalItems": 2,
    "pdfUrl": "https://api.arangtik.com/uploads/work-orders/WO-20261014-4821.pdf",
    "whatsappNotification": {
      "sent": true,
      "templateUsed": "laundry_order_registered",
      "status": "DELIVERED_TO_GATEWAY"
    }
  }
}
```

---

#### C. List Laundry Orders
- **Method:** `GET`
- **Path:** `/api/v1/laundry/orders?status=PENDING_PICKUP&page=1&limit=20`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [ ... ],
    "pagination": { "total": 1, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

---

#### D. Get Single Work Order Details
- **Method:** `GET`
- **Path:** `/api/v1/laundry/orders/:id`
- **Headers:** `Authorization: Bearer <TOKEN>`

---

#### E. Update Work Order Status (User Self-Service)
- **Method:** `PATCH` *(Strict Rule: never use PUT)*
- **Path:** `/api/v1/laundry/orders/:id/status`
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Request Body:**
```json
{
  "status": "PICKED_UP",
  "note": "Vendor collected garments from doorstep"
}
```
- **Allowed Status Enum:**
  - `PENDING_PICKUP` (Order placed, awaiting pickup)
  - `PICKED_UP` (Garments collected by vendor)
  - `IN_PROCESS` (Washing / dry cleaning underway)
  - `READY_FOR_DELIVERY` (Cleaned, pressed and packed)
  - `DELIVERED` (Handed back to user / completed)
  - `CANCELLED` (Cancelled)

---

#### F. Re-Send WhatsApp PDF to Vendor
- **Method:** `POST`
- **Path:** `/api/v1/laundry/orders/:id/resend-whatsapp`
- **Headers:** `Authorization: Bearer <TOKEN>`

---

### 3. Mobile UI/UX Recommendations
1. **Garment Multi-Selection:**
   - In wardrobe Almari view, provide a floating action button **"Send to Laundry"** that enables multi-selection checkboxes on clothes.
2. **Contact Picker Permission:**
   - On iOS (`contacts_service` / `react-native-contacts`) and Android (`READ_CONTACTS`), request permission to let users pick their dhobi/laundry shop contact directly.
3. **Date Pickers:**
   - Default `pickupDate` to tomorrow morning.
   - Restrict `expectedDeliveryDate` so it cannot be before `pickupDate`.
4. **PDF Viewer / Share:**
   - In the Work Order detail screen, render a **"View PDF Receipt"** button opening `order.pdfUrl` in an in-app browser or native share sheet.

================================================================================
## FEATURE 11: FIREBASE CLOUD MESSAGING (FCM) PUSH NOTIFICATIONS
================================================================================

### 1. Overview
Arangtik mobile app receives real-time push notifications for key lifecycle events:
- **Laundry Work Orders:** Order placed confirmation, vendor notifications, and real-time status updates (`PENDING_PICKUP` -> `PICKED_UP` -> `IN_PROCESS` -> `READY_FOR_DELIVERY` -> `DELIVERED`).
- **3D Garment Models:** Notified as soon as TripoSR finishes 3D mesh reconstruction (`GARMENT_3D_COMPLETED`).
- **Wardrobe Digitization:** Notified when bulk photo digitization or gallery ingestion finishes adding garments (`WARDROBE_DIGITIZED`).
- **Vendor Hub:** Newly converted vendors notified when their profile is activated (`VENDOR_ACTIVATED`).

---

### 2. Device Token Registration Lifecycle

#### Step 1: Obtain FCM Token on Mobile Client
- **Flutter:** `String? token = await FirebaseMessaging.instance.getToken();`
- **React Native:** `const token = await messaging().getToken();`
- **Native Android (Kotlin):** `FirebaseMessaging.getInstance().token.addOnCompleteListener { ... }`
- **Native iOS (Swift):** `Messaging.messaging().token { token, error in ... }`

#### Step 2: Register Token with Backend (Immediately upon Login & Token Refresh)
- **Method:** `POST`
- **Path:** `/api/notifications/device-token` *(also available as `/api/auth/device-token`)*
- **Headers:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
- **Payload:**
```json
{
  "token": "dK_3f9z...fcm_registration_token...",
  "platform": "ANDROID", // or "IOS"
  "deviceId": "unique_hardware_uuid",
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
    "token": "dK_3f9z...",
    "platform": "ANDROID",
    "isActive": true
  }
}
```

#### Step 3: Remove Token on Logout
When the user logs out, include the device token in `POST /api/auth/logout`:
```json
{
  "deviceToken": "dK_3f9z...fcm_registration_token..."
}
```
Or call:
- **Method:** `DELETE`
- **Path:** `/api/notifications/device-token`
- **Body:** `{ "token": "dK_3f9z..." }`

---

### 3. Notification Handling & Deep Linking Routing

All push notifications sent by Arangtik include structured `data` fields with `type` for client deep linking:

| `data.type` | Target Screen / Deep Link | Key Data Fields |
|---|---|---|
| `LAUNDRY_ORDER_NEW` | Work Order Detail Screen | `orderId`, `orderNumber`, `totalItems` |
| `LAUNDRY_ORDER_STATUS` | Work Order Detail Screen | `orderId`, `orderNumber`, `status` |
| `GARMENT_3D_COMPLETED` | 3D Garment Interactive Viewer | `itemId`, `modelUrl` |
| `GARMENT_3D_FAILED` | Garment Detail Screen (Retry) | `itemId` |
| `WARDROBE_DIGITIZED` | Almari Closet Screen | `wardrobeId`, `count` |
| `VENDOR_ACTIVATED` | Laundry Vendor Dashboard | `vendorId` |

---

### 4. In-App Notification Inbox APIs

#### A. Fetch User Notifications
- **Method:** `GET`
- **Path:** `/api/notifications?page=1&limit=20&unreadOnly=false`
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [ ... ],
    "unreadCount": 3,
    "pagination": { "total": 12, "page": 1, "limit": 20, "pages": 1 }
  }
}
```

#### B. Mark Single as Read
- **Method:** `PATCH`
- **Path:** `/api/notifications/:id/read`
- **Headers:** `Authorization: Bearer <TOKEN>`

#### C. Mark All as Read
- **Method:** `PATCH`
- **Path:** `/api/notifications/read-all`
- **Headers:** `Authorization: Bearer <TOKEN>`

================================================================================
## 📋 QUICK INTEGRATION CHECKLIST FOR MOBILE DEVELOPERS
================================================================================

- [ ] Store Bearer Token in secure hardware keychain (`flutter_secure_storage` / `react-native-keychain`).
- [ ] Attach `Authorization: Bearer <TOKEN>` header to all requests except `/auth/send-otp` and `/auth/verify-otp`.
- [ ] Register FCM device token via `POST /api/notifications/device-token` upon login and on token refresh.
- [ ] Deactivate device token on logout via `POST /api/auth/logout` with `{ deviceToken }`.
- [ ] Listen to foreground notifications (`FirebaseMessaging.onMessage`) and display in-app toast / banner.
- [ ] Handle notification click / background tap (`FirebaseMessaging.onMessageOpenedApp`) and navigate according to `data.type`.
- [ ] Add 401 response interceptor to auto-logout on expired token.
- [ ] Use `GET /api/wardrobe/get-wardrobes` on app start and persist active Almari.
- [ ] Implement single primary button `"Extract & Add to Almari"` for camera/gallery photo digitization.
- [ ] Render duplicate cards with **"Compare"** button to open the side-by-side resolution modal.
- [ ] When user clicks *"Different Dress"*, call `/api/wardrobe/add-item` with `forceAdd: true`.
- [ ] Never send `PUT` requests for updates; strictly use `PATCH`.
- [ ] Resolve all image paths with `getImageUrl()` and enable local image caching (`FastImage` / `CachedNetworkImage`).
- [ ] Compress camera photos client-side to maximum `1600px` before sending multipart `FormData`.
- [ ] Render 3D garment models using `model_viewer_plus` or Three.js GLB viewer.
- [ ] Laundry Module: Use `GET /api/v1/laundry/vendors/lookup?phone=` to auto-detect registered vs unregistered vendors.
- [ ] Laundry Module: Use `PATCH /api/v1/laundry/orders/:id/status` for user status updates.

