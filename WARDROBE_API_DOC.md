# Arangtik Wardrobe API Integration Document

> **Version**: 2.0.0 (Clean Architecture & Python AI Offloading)  
> **Last Updated**: November 2026  
> **Base URL**: `http://localhost:5000/api` (Dev) / `https://api.arangtik.com/api` (Prod)  
> **Auth Header**: `Authorization: Bearer <JWT_USER_TOKEN>`

---

## 🎯 User Journey & Flow: User Aayega Toh Kaise Karega? (End-to-End User Experience)

Ye naya architecture is tarah design kiya gaya hai ki **user ko app me kabhi bhi wait na karna pade** aur UI super-smooth rahe:

```
[1. User App Kholega & Almari me "Add Item" click karega]
                         │
                         ▼
[2. Photo Select Karega (Camera ya Gallery se 1 ya multiple photos)]
                         │
                         ▼
[3. UI par 2 Simple Options dikhenge]
    ├── Option 1: "With Person" (Agar photo me model ya insaan ne kapda pehna hai)
    └── Option 2: "Without Person" (Agar sirf kapde ki photo hai - flat lay ya hanger)
                         │
                         ▼
[4. "Upload / Save" button dabayega]
                         │
                         ▼
[5. Instant Response (< 200 milliseconds)]:
   • User ko rukna nahi padega! Screen par koi blocking full-screen loader nahi aayega.
   • User ki Almari me kapde ka card TURANT appear ho jayega with an active Timer / Loading Badge:
     ⏳ "Analyzing outfit details... (Processing in background)"
   • User back ja sakta hai, dusre kapde dekh sakta hai, ya naya kapda add kar sakta hai.
                         │
                         ▼
[6. Background me AI Pipeline chalega (Zero User Waiting)]:
   Step A: Backend photo ko PYTHON AI Microservice ke paas bhejega.
           • Option A ("without_person" - Sirf kapda): 
             Backend photo ko Live Python Background-Removal endpoint par bhejega:
             URL: https://bg.arangtik.com/api/background-removal (fallback: http://bg.arangtik.com/api/background-removal)
             Method: POST, Field Name: "file" (multipart/form-data)
             Python background strip karke clean transparent PNG/WEBP cutout return karega.
           • Option B ("with_person" - Model / Human pehne hue hai): 
             Python person parsing karega, kapde ko body aur background se alag karega, 
             agar Shirt + Pants dono hain toh split karke alag-alag garments banayega, 
             aur fingers/hands se dhake hisson ko inpaint karke clean cutout dega.
   Step B: Python clean cutout kapde ki photo wapas Node.js ko dega.
   Step C: Node.js ab GEMINI VISION AI ko ye clean kapda bhejega.
           • Gemini kapde ka Color, Fabric, Pattern, Category, Fit, Neckline aur Occasions exact accuracy se extract karega.
   Step D: Database me usi kapde ka record UPDATE ho jayega:
           • status: "COMPLETED"
           • Clean cutout image set ho jayegi
           • Saari fashion details save ho jayengi.
                         │
                         ▼
[7. App UI Auto-Update]:
   • Almari me us card ka timer/loader hat jayega.
   • Clean transparent kapde ki photo, Name, Color aur Fabric tags screen par chamakne lagenge!
```

---

## ⚠️ 1. REMOVED ENDPOINTS (Mobile App me se turant hatayein)

Neeche diye gaye sabhi endpoints backend se **permanently delete** kar diye gaye hain. Agar mobile app me inka koi call ho raha hai to use turant code se hata dein:

| Removed Endpoint | Status | Reason / Replacement |
| :--- | :--- | :--- |
| `POST /api/cloth-analysis/*` (All Routes) | ❌ **DELETED** | Duplicate module deleted. Use single `/api/wardrobe/add-item`. |
| `POST /api/wardrobe/scan-item` | ❌ **DELETED** | Preview scan removed. Directly use `/api/wardrobe/add-item`. |
| `POST /api/wardrobe/bulk-add-photos` | ❌ **DELETED** | Merged into `/api/wardrobe/add-item` (1 to 50 photos supported). |
| `POST /api/wardrobe/ingest-gallery` | ❌ **DELETED** | Merged into `/api/wardrobe/add-item`. |
| `POST /api/wardrobe/generate-3d/:id` | ❌ **DELETED** | 3D feature temporarily removed (will be handled by Python later). |
| `ALL /api/face-recognition/*` | ❌ **DELETED** | Biometric face scanning completely removed from wardrobe flow. |

---

## ⭐ 2. SINGLE UNIFIED CLOTH ADD API

Ab kapda add karne ke liye **poore app me sirf 1 Single API Endpoint** use karna hai. Ye Single Photo aur Gallery se Multi-Photo (1 to 50 photos) dono ko handle karta hai.

### `POST /api/wardrobe/add-item`
* **Method**: `POST`
* **Headers**:
  ```http
  Authorization: Bearer <USER_JWT_TOKEN>
  Content-Type: multipart/form-data
  ```

### Request Parameters (Form-Data):
| Field | Type | Mandatory? | Description |
| :--- | :--- | :---: | :--- |
| **`image`** *(ya `photo`)* | File | Yes (Single) | 1 Photo upload karne ke liye. |
| **`photos`** *(ya `images`)* | File[] | Yes (Multiple)| Gallery se ek sath 1 to 50 photos upload karne ke liye. |
| **`mode`** | String | **YES** | UI ke do buttons se aayega:<br>• `"with_person"` (Insaan/Model ne pehna hua hai)<br>• `"without_person"` (Sirf kapde ki flat-lay/hanger photo) |
| **`wardrobeId`** | String | No | Target Almari ka ObjectId. Agar nahi bhejenge to user ki default Almari me save hoga. |
| **`name`** | String | No | Optional manual title override. |
| **`category`** | String | No | Optional manual category override (`UPPER_WEAR`, `LOWER_WEAR`, etc.). |

---

### Case A: Single Photo Upload Example

#### Mobile App Request:
```http
POST /api/wardrobe/add-item HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="image"; filename="outfit_selfie.jpg"
Content-Type: image/jpeg

<binary_data>
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="mode"

with_person
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="wardrobeId"

67290d810f3c5b9e11223344
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

#### Immediate Response (<200ms me):
User ko screen par loader me nahi rokna padega. Backend se turant ye response milega:

```json
{
  "statusCode": 201,
  "success": true,
  "message": "Item added successfully to wardrobe store",
  "data": {
    "_id": "672a1b9201f98bc19203a111",
    "name": "Analyzing Outfit...",
    "category": "PENDING",
    "processingStatus": "PROCESSING",
    "images": [
      {
        "url": "http://localhost:5000/uploads/photo_17308000.jpg",
        "type": "ORIGINAL",
        "isPrimary": true
      }
    ],
    "sourcePhotoUrl": "http://localhost:5000/uploads/photo_17308000.jpg",
    "createdAt": "2026-11-05T16:00:00.000Z"
  }
}
```

---

### Case B: Multi-Photo Upload Example (Gallery se 10 Photos ek sath)

#### Mobile App Request:
```http
POST /api/wardrobe/add-item HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="photos"; filename="cloth1.jpg"
<binary>
------WebKitFormBoundary
Content-Disposition: form-data; name="photos"; filename="cloth2.jpg"
<binary>
... (up to 50 photos)
------WebKitFormBoundary
Content-Disposition: form-data; name="mode"

without_person
------WebKitFormBoundary--
```

#### Immediate Response:
```json
{
  "statusCode": 201,
  "success": true,
  "message": "10 item(s) added successfully! Processing each photo in background.",
  "data": {
    "totalUploaded": 10,
    "totalCreated": 10,
    "totalDuplicates": 0,
    "items": [
      { "_id": "672a1b92...", "processingStatus": "PROCESSING", "images": [...] },
      { "_id": "672a1b93...", "processingStatus": "PROCESSING", "images": [...] }
    ],
    "duplicates": []
  }
}
```

---

## 📱 3. Mobile UI Integration Guide (Timer / Loader Animation)

App me user experience super-smooth banane ke liye:

1. **Upload ke baad Item Card dikhayein:**
   - Jaise hi `POST /api/wardrobe/add-item` ka response aaye, user ke wardrobe list me turant wo card add kar dein.
2. **`processingStatus` Check Karein:**
   - Agar `item.processingStatus === "PROCESSING"`:
     - Card par original uploaded image dikhayein.
     - Card ke corner par **Animated Timer / Progress Badge** dikhayein:
       > ⏳ *"Processing cloth details..."*
   - User ko screen par rukaane ki zaroorat nahi hai, user back ja sakta hai ya dusra kapda add kar sakta hai.
3. **Background Process Complete Hone Par:**
   - 5 se 8 seconds me backend background worker:
     1. Python se kapda split/clean karwayega.
     2. Clean kapde ko Gemini se analyze karwayega.
     3. Database me status `COMPLETED` aur saare fields bhar dega.
   - Jab user list refresh karega (ya polling se update aayega), `processingStatus === "COMPLETED"` ho jayega aur:
     - Timer hat jayega.
     - Clean cutout photo dikhegi.
     - Name, Category, Color, Fabric, Pattern display ho jayenge.

---

## 📋 4. Wardrobe Items CRUD APIs (Active Endpoints)

### A. Get All Items in Closet
* **Method**: `GET`
* **Endpoint**: `/api/wardrobe/get-items`
* **Query Params**:
  - `wardrobeId`: Filter by Almari ID.
  - `category`: `UPPER_WEAR`, `LOWER_WEAR`, `TRADITIONAL`, `FOOTWEAR`, etc.
  - `color`: `Navy Blue`, `Black`, etc.
  - `search`: Search query string.
  - `page`: Page number (Default: `1`).
  - `limit`: Items per page (Default: `20`).

#### Response:
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "totalItems": 45,
    "totalPages": 3,
    "currentPage": 1,
    "items": [
      {
        "_id": "672a1b9201f98bc19203a111",
        "name": "Men's Navy Blue Oxford Cotton Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "color": "Navy Blue",
        "processingStatus": "COMPLETED",
        "images": [
          {
            "url": "http://localhost:5000/uploads/crops/garment_17308000_0.webp",
            "type": "SEGMENTED",
            "isPrimary": true
          },
          {
            "url": "http://localhost:5000/uploads/photo_17308000.jpg",
            "type": "ORIGINAL",
            "isPrimary": false
          }
        ],
        "attributes": {
          "primaryColor": "Navy Blue",
          "fabric": "COTTON",
          "pattern": "SOLID",
          "fit": "SLIM_FIT",
          "neckline": "Collar",
          "sleeveStyle": "FULL_SLEEVE"
        },
        "tags": ["Navy Blue", "Shirt", "COTTON", "CASUAL"]
      }
    ]
  }
}
```

---

### B. Get Single Item Details
* **Method**: `GET`
* **Endpoint**: `/api/wardrobe/get-item/:id`
* **Response**: Returns full details of the specific wardrobe item by `_id`.

---

### C. Update Item Details (Edit)
* **Method**: `PATCH`
* **Endpoint**: `/api/wardrobe/edit-item/:id`
* **Body (JSON)**:
  ```json
  {
    "name": "My Favorite Formal Blue Shirt",
    "color": "Navy Blue",
    "fabric": "100% Linen",
    "isFavorite": true
  }
  ```

---

### D. Delete Item
* **Method**: `DELETE`
* **Endpoint**: `/api/wardrobe/delete-item/:id`
* **Response**: Permanently removes the clothing item from the wardrobe.

---

## 🗄️ 5. Almari / Closet Containers APIs

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/wardrobe/create-wardrobe` | `POST` | Nayi Almari create karein (`name`, `storeTypeId`, `coverImage`). |
| `/api/wardrobe/get-wardrobes` | `GET` | User ki saari Almaris list karein with item counts. |
| `/api/wardrobe/get-wardrobe/:id` | `GET` | Single Almari details fetch karein. |
| `/api/wardrobe/update-wardrobe/:id`| `PATCH` | Almari rename karein ya cover photo update karein. |
| `/api/wardrobe/delete-wardrobe/:id`| `DELETE` | Almari soft delete karein (`?hard=true` for permanent). |
| `/api/wardrobe/restore-wardrobe/:id`| `PATCH`| Soft-deleted Almari restore karein. |

---

## ⚙️ 6. Python Background Removal & AI Service (Live Config)

Node.js background worker aapke live Python microservice se connect karta hai:

* **Live Endpoint**: `https://bg.arangtik.com/api/background-removal`  
  *(Fallback: `http://bg.arangtik.com/api/background-removal` agar SSL active na ho)*
* **HTTP Method**: `POST`
* **Content-Type**: `multipart/form-data`
* **Form-Data Fields**:
  - **`file`**: Image file buffer / stream (Node.js uploaded photo bhejta hai)
  - **`mode`**: `"with_person"` ya `"without_person"`

* **Expected Python Response**:
  - **Binary Image**: Direct `image/png` ya `image/webp` transparent cutout stream, **YA**
  - **JSON Payload**:
    ```json
    {
      "success": true,
      "image": "data:image/webp;base64,...",
      "garments": [
        { "type": "upper_wear", "image": "data:image/webp;base64,..." },
        { "type": "lower_wear", "image": "data:image/webp;base64,..." }
      ]
    }
    ```

Python se clean, transparent kapda aane ke baad Node.js turant Gemini Vision AI ko bulakar kapde ka Color, Fabric, Pattern, Fit aur Category fill karta hai aur item ko `COMPLETED` mark karta hai.
