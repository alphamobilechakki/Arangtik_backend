# WARDROBE MODULE & AI DRESS ANALYSIS — REQUIREMENTS SPECIFICATION

---

## 1. Core Concept: "The Universal Personal Store" (Maha-Store Model)

Arangtik ko ek **Universal Personal Store** ke roop mein treat kiya gaya hai:
* Jaise ek bade Store ke andar alag-alag **Departments / Sections** hote hain, usi tarah Arangtik ke andar multiple stores honge:
  - 🏪 **Wardrobe Store (Phase 1 Priority):** Kapde, Traditional Wear, Shoes, Accessories, Bags.
  - 🏪 **Kitchen Store (Future):** Bartan, Appliances, Cookware, Storage Containers.
  - 🏪 **Electronics Store (Future):** Laptops, Cameras, Gadgets, Devices.
  - 🏪 **Household & Valuables Store (Future):** Furniture, Tools, Jewelry, Documents.

### 1.1 Zero Schema Change in Future (Universal Architecture)
* Har item chahe kapda ho ya mixer ya camera, ek hi **Universal Item Engine** se manage hoga.
* Har item ke sath uske category-specific dynamic attributes rahenge.
* Kal ko 100+ nayi categories ya stores add karne par bhi **koi naya table ya database schema change nahi karna padega**.

---

## 2. Wardrobe Store: Multi-Purpose Item Lifecycle & Actions

Wardrobe Store ke kapde sirf ek almari mein band nahi rehte, balki real life mein unke sath kafi saare actions hote hain. System in sabhi flows ko support karega:

```text
                                  ┌──────────────────────────────┐
                                  │   WARDROBE STORE (CLOSET)    │
                                  │      Status: AVAILABLE       │
                                  └──────────────┬───────────────┘
                                                 │
         ┌────────────────────────┬──────────────┴──────────────┬────────────────────────┐
         │ (Pehenne ke liye)      │ (Kisi ko diya)              │ (Dhulne bheja)         │ (Repair ke liye)
         ▼                        ▼                             ▼                        ▼
 ┌───────────────┐        ┌───────────────┐             ┌───────────────┐        ┌───────────────┐
 │   SELF-WORN   │        │   LENT OUT    │             │  IN LAUNDRY   │        │   IN REPAIR   │
 │ Status: IN_USE│        │(Dost/Relative)│             │ (Dhobi/Wash)  │        │   (Tailor)    │
 └───────┬───────┘        └───────┬───────┘             └───────┬───────┘        └───────┬───────┘
         │                        │                             │                        │
         ▼                        ▼                             ▼                        ▼
  Log Wear Count           Return Due Date               Dhobi Pricing & Status    Repair Complete
         │                        │                             │                        │
         └────────────────────────┴──────────────┬──────────────┴────────────────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────┐
                                  │     WAPAS STORE MEIN AAYA    │
                                  │      Status: AVAILABLE       │
                                  └──────────────────────────────┘
```

### 2.1 Action 1: Self Wear & Gallery Photo Extraction
* User apni gallery se apni photo upload karega (e.g. kisi event ya function ki photo jisme usne kapde pehne hue hain).
* **AI Garment Isolation & Crop:** AI full-body photo me se pehni hui dress (Shirt, Kurta, Pant, Shoes) ko detect karke extract/crop karega aur standalone visual card banayega.
* AI check karega ki ye dress wardrobe store mein already hai ya nayi hai.
* Wear history log hogi aur item ka wear count increment hoga.

### 2.2 Action 2: Given to Someone / Lent Out (Kisi ko Pehenne ke Liye Dena)
* Maan lo user ne apna coat, sherwani, suit ya dress kisi dost ya relative ko pehenne ke liye diya:
  - User item select karega $\rightarrow$ **"Give / Lend Item"**.
  - Recipient Details: Naam, Phone number, Given Date, Expected Return Date, Purpose (e.g. "Friend's Wedding").
  - Item Status update hoga: `AVAILABLE` $\rightarrow$ `LENT_OUT`.
  - Current Location update hogi: e.g. *"With Amit (Friend)"*.
* **Photo-Based Identification:** Agar user kisi dost ki photo upload karta hai jisme dost ne user ki dress pehni hui hai, to system identify karke alert karega ki *"Ye aapki blue sherwani hai jo Amit ke paas hai."*
* **Return Due Notification:** Return date aane par automatic reminder aayega aur return confirm hone par status wapas `AVAILABLE` ho jayega.

### 2.3 Action 3: Laundry / Dhobi Handover & Charges Management
* Gande kapde select karke Dhobi ko assign karna (Wash, Iron, Dry Clean, Repair).
* **Pricing & Charges Tracking:**
  - Har item ki service ke according charge set hona (e.g. Wash & Iron: ₹20, Dry Clean: ₹150).
  - Total order amount calculate hona.
  - Payment Status track hona (`PENDING`, `PAID`) aur Payment Mode (`UPI`, `CASH`).
* **Visual Handover:** Dhobi app par kapdo ke photos dikhenge taaki kapde mix-up na hon.
* **Dhobi Status Updates:** `Received` $\rightarrow$ `Washing` $\rightarrow$ `Ironing` $\rightarrow$ `Ready` $\rightarrow$ `Delivered`.
* Delivery confirm hone par item wapas `AVAILABLE` ho jayega aur wash count increment ho jayega.

### 2.4 Action 4: Repair / Tailor / Alteration
* Fitting, stitching ya button repair ke liye tailor ko dena.
* Item Status update hoga: `AVAILABLE` $\rightarrow$ `IN_REPAIR`.

---

## 3. AI Dress Analysis & Smart Matching Engine (User Side)

### 3.1 AI Recognition & Garment Extraction from Gallery Photos
* **Photo Upload & Crop Extraction:** User gallery se photo upload karega; AI image mein se kapdo ko pehchan kar unka alag-alag cropped visual generate karega (Topwear, Bottomwear, Traditional, Footwear, Accessories).
* **Attributes Extraction:** Category, Primary & Secondary Color, Pattern, Fabric/Material, Fit, Sleeve, Occasion, Season.

### 3.2 Duplicate Detection & Ambiguity Confirmation Logic
Jab AI kisi dress ko photo se analyze karega, to existing wardrobe store se match karega:

#### 1. High Match ($\ge 90\%$ Certainty)
* **Message:** *"Ye dress already aapke wardrobe store mein '[Item Name]' ke naam se registered hai."*
* **Options:** Duplicate create nahi hoga; user ise **"Log Worn Today"** ya **"Update Location/Status"** kar sakta hai.

#### 2. Ambiguous / Confusion Match ($65\% - 89\%$ Similarity)
* **AI Confusion Alert:** Jab do similar dresses hon ya AI 100% sure na ho:
  > *"Hume aapke wardrobe store mein ek milti-julti dress mili: '[Existing Dress Name]'. Kya ye wahi dress hai, ya ye nayi dress hai?"*
* **User Confirmation:**
  - *"Haan, ye wahi hai"* $\rightarrow$ Existing item update hoga.
  - *"Nahi, ye nayi hai"* $\rightarrow$ Nayi dress store mein add hogi.

#### 3. New Dress ($< 65\%$ Similarity)
* **Action:** *"Nayi dress detect hui hai!"* $\rightarrow$ Pre-filled attributes ke sath 1-tap save.

---

## 4. AI Outfit Stylist & Smart Suggestions (Occasion & Color Match)

User Arangtik se poochh sakta hai ya context de sakta hai ki use kahan jaana hai. AI user ke **existing available wardrobe collection** mein se best matching combination suggest karega.

### 4.1 Occasion-Based Intelligent Matching
1. **Interview / Formal Meeting:**
   - AI formal rules follow karega (e.g. Light Blue/White Formal Shirt + Dark Navy/Grey Trousers + Black/Brown Formal Shoes).
   - Occasion suitability aur professional color combinations match karega.
2. **Shaadi / Wedding / Festive Event:**
   - Traditional section se matching (e.g. Silk Kurta + Contrast Pajama / Churidar + Matching Nehru Jacket + Mojari/Jutti).
3. **Casual Outing / Party / Dinner:**
   - Trendy color combinations (e.g. Olive Green T-Shirt + Black Chinos/Jeans + White Sneakers).

### 4.2 Wardrobe Availability Rule for Suggestions
* AI suggestion dete waqt **sirf wahi kapde choose karega jo currently `AVAILABLE` hain**.
* Jo kapde abhi **Dhobi ke paas (`IN_LAUNDRY`)** hain ya **kisi dost ko diye hue hain (`LENT_OUT`)**, AI unhe automatically ignore karega taaki user confused na ho.
* Har suggestion ke sath AI short explanation dega: *"Ye combination interview ke liye perfect hai kyunki ye formal aur clean color contrast deta hai."*

---

## 5. Universal Item Model Fields (Logical Definition)

Sabhi categories (Wardrobe, Kitchen, Electronics, etc.) ke liye single universal structure:

* `_id`: Unique Identifier
* `userId`: Owner user ka reference
* `name`: Item display name (e.g. "Royal Blue Silk Sherwani")
* `storeType` / `category`: Broad category (e.g. `WARDROBE`, `KITCHEN`, `ELECTRONICS`)
* `subCategory`: Sub-category (e.g. `Traditional / Sherwani`, `Appliance / Mixer`)
* `images`: Photos list (Image URL, isPrimary flag, AI visual vector)
* `attributes`: Dynamic key-value bag:
  - *Wardrobe:* color, pattern, fabric, gender, size, brand, fit, sleeveLength, occasions, seasons.
  - *Kitchen/Other:* capacity, material, warrantyDate, serialNumber, modelNumber.
* `currentStatus`: Current state (`AVAILABLE`, `IN_USE`, `DIRTY`, `IN_LAUNDRY`, `LENT_OUT`, `IN_REPAIR`, `ARCHIVED`)
* `currentLocation`: Physical location details:
  - `storagePlace`: Closet Shelf, Room Cabinet, Kitchen Rack, etc.
  - `holderPerson`: Agar kisi ko diya hai to person ka naam, phone number aur relation.
* `usageStats`:
  - `useCount` / `wearCount`: Total times used/worn
  - `lastUsedDate`: Last use timestamp
  - `washCount`: Total laundry cycles
  - `lastWashedDate`: Last wash date
  - `isFavorite`: Favorite bookmark
* `activeAssignment`: (Agar item bahar kisi ke paas hai)
  - `assignedTo`: Person Name / Dhobi Name / Tailor Name
  - `assignedPhone`: Mobile number
  - `purpose`: `LENT_FOR_WEARING` | `WASH_AND_IRON` | `DRY_CLEAN` | `REPAIR`
  - `givenDate`: Date given
  - `expectedReturnDate`: Due date
* `laundryCare`: Wash type preference (Machine wash, Dry clean only), Iron preference
* `tags`: Search tags list
* `createdAt` & `updatedAt`: Timestamps

---

## 6. Clean REST API Endpoints Specification

Sabhi APIs ke naam simple, intuitive aur purpose-clear hain. **Sabhi update operations ke liye strictly `PATCH` use hoga.**

### 6.1 Wardrobe & AI Photo Analysis APIs (User Side)

| Method | Endpoint Name | Description |
|---|---|---|
| `POST` | `/api/wardrobe/analyze-photo` | Gallery photo upload karke dress extract/crop karna, identify karna aur duplicate check karna. |
| `POST` | `/api/wardrobe/add-item` | Wardrobe store mein naya item save karna (AI data ya manual). |
| `GET` | `/api/wardrobe/get-all-items` | User ke sabhi wardrobe items list karna (status, category, color filters ke sath). |
| `GET` | `/api/wardrobe/get-item-details/:id` | Item ki poori details, photos, location aur movement history dekhna. |
| `PATCH` | `/api/wardrobe/update-item/:id` | Item ke attributes, photo ya details update karna (**PATCH** use hoga). |
| `PATCH` | `/api/wardrobe/update-item-status/:id` | Item ka status change karna (e.g. Available $\rightarrow$ Dirty $\rightarrow$ In Laundry). |
| `DELETE` | `/api/wardrobe/delete-item/:id` | Item ko delete ya archive karna. |
| `POST` | `/api/wardrobe/log-worn-dress` | Pehni gayi dress ko wear history mein record karna (wearCount increment hoga). |
| `GET` | `/api/wardrobe/get-wear-history` | User ki previous wear history dekhna. |
| `POST` | `/api/wardrobe/suggest-outfit` | Occasion (Shaadi, Interview, Party) ke liye available wardrobe se best matching combination suggest karna. |

---

### 6.2 Item Handover / Lending APIs (Kisi ko Dena ya Wapas Lena)

| Method | Endpoint Name | Description |
|---|---|---|
| `POST` | `/api/wardrobe/lend-item` | Item kisi dost/relative ko pehenne ke liye dena (Status `LENT_OUT` hoga, return date set hogi). |
| `PATCH` | `/api/wardrobe/return-lent-item/:id` | Diya hua item wapas receive karna (Status wapas `AVAILABLE` ho jayega). |
| `GET` | `/api/wardrobe/get-lent-items` | Jo kapde/items abhi bahar kisi ke paas hain unki list dekhna. |

---

### 6.3 Laundry & Dhobi Management APIs (With Pricing & Payments)




| Method | Endpoint Name | Description |
|---|---|---|
| `POST` | `/api/laundry/create-order` | Wardrobe se kapde select karke Dhobi ko bhejna (Charges/Services select karke). |
| `GET` | `/api/laundry/get-user-orders` | User ke active aur past laundry orders dekhna with billing amounts. |
| `GET` | `/api/laundry/get-order-details/:id` | Order details, kapdo ki photos aur payment status dekhna. |
| `POST` | `/api/laundry/confirm-order-received/:id` | Dhule kapde receive hone ki confirmation (Status wapas `AVAILABLE` hoga). |
| `GET` | `/api/dhobi/get-assigned-orders` | Dhobi portal: Dhobi ke paas aaye orders with photos aur pricing. |
| `PATCH` | `/api/dhobi/update-order-status/:id` | Dhobi dwara stage update karna (`RECEIVED` $\rightarrow$ `WASHING` $\rightarrow$ `IRONING` $\rightarrow$ `READY` $\rightarrow$ `DELIVERED`). |
| `PATCH` | `/api/dhobi/update-order-payment/:id` | Dhobi dwara payment status update karna (`PAID` / `PENDING`, amount, payment mode). |

---

## 7. Implementation Progress Tracker & Status

### Phase 1A: User-Side Wardrobe Core & AI Analysis
- [x] **Universal Store Item Mongoose Model** (`src/modules/wardrobe/wardrobe.model.js`) — `[COMPLETED ✅]`
- [x] **`POST /api/wardrobe/add-item`** — Item creation with extensible dynamic attributes — `[COMPLETED ✅]`
- [x] **`GET /api/wardrobe/get-all-items`** — Multi-filters (category, status, color, occasion, season, search) + pagination — `[COMPLETED ✅]`
- [x] **`GET /api/wardrobe/get-item-details/:id`** — Single item full details view with 404 validation — `[COMPLETED ✅]`
- [x] **`POST /api/wardrobe/analyze-photo`** — Gallery/camera upload + AI clothing detection + Sharp auto-cropping + Hybrid Wardrobe Duplicate Matcher (`EXACT_MATCH`, `AMBIGUOUS_MATCH`, `NEW_ITEM`) — `[COMPLETED ✅]`
- [x] **`PATCH /api/wardrobe/update-item/:id`** — Partial/full item details and dynamic attributes update — `[COMPLETED ✅]`
- [x] **`PATCH /api/wardrobe/update-item-status/:id`** — Quick status update (`AVAILABLE`, `DIRTY`, `IN_LAUNDRY`, etc.) — `[COMPLETED ✅]`
- [x] **`DELETE /api/wardrobe/delete-item/:id`** — Soft archive & permanent delete — `[COMPLETED ✅]`
- [x] **`POST /api/wardrobe/log-worn-dress` & `GET /api/wardrobe/get-wear-history`** — Log outfit worn on date, increment `wearCount`, update `lastWornDate` — `[COMPLETED ✅]`
- [x] **`POST /api/wardrobe/suggest-outfit`** — AI smart stylist recommendation for Occasions (Interview, Wedding, Casual, Party) from user's available closet — `[COMPLETED ✅]`
- [x] **`POST /api/wardrobe/lend-item` & `PATCH /api/wardrobe/return-lent-item/:id`** — Handover clothes to friends/relatives with return date reminders — `[COMPLETED ✅]`

---

### Phase 1B: Upcoming Next Implementation Steps (In Order)
- [ ] **Step 7:** Laundry & Dhobi Module (`POST /api/laundry/create-order`, `PATCH /api/dhobi/update-order-status/:id`, `PATCH /api/dhobi/update-order-payment/:id`) — `[NEXT ⏳]`

---

## 8. Developer Instructions & Implementation Rules

1. **User Side First:** Pehle User-side Wardrobe CRUD, AI photo extraction/crop, duplicate confirmation dialog, occasion outfit suggestions, aur lending/return tracking complete aur test hoga.
2. **Strict HTTP Methods:** Kisi bhi update API ke liye `PUT` use **nahi** hoga; mandatory **`PATCH`** use hoga.
3. **Available Items Only for Stylist:** AI outfit suggestion dete waqt hamesha filter lagayega ki items ka `currentStatus === 'AVAILABLE'` hona chahiye.
4. **Dhobi Pricing & Payments:** Laundry order mein item-level services (Wash, Iron, Dry Clean) ke sath individual aur total charges calculate honge aur payment mode track hoga.
5. **No Hardcoded Column Logic:** Schema mein specific columns hardcode karne ke bajaye generic `attributes` aur `activeAssignment` structure follow hoga taaki future mein Kitchen ya Electronics seamlessly fit ho sakein.
6. **Intuitive Naming:** Sabhi route paths, controller methods aur helper functions standard, easy-to-read names ke sath honge.
7. **Mandatory Documentation:** Har API endpoint banne aur test hone ke baad [API_DOCUMENTATION.md](file:///d:/my%20codes/Arangtik/backend/API_DOCUMENTATION.md) mein document hoga.

