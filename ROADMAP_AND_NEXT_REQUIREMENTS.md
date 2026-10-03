# ARANGTIK — FUTURE ROADMAP & UPCOMING REQUIREMENTS SPECIFICATION
## "Kya Karenge, Kaise Karenge, Aur Kyun Karenge?"

**Target System:** Arangtik Platform (AI Wardrobe, Smart Laundry & Personal Styling)  
**Document Purpose:** Complete technical & product specification for upcoming phases.  
**Author:** Arangtik Engineering Team  
**Date:** October 2026  

---

## 🎯 Executive Summary & The "Why" (Kyun Kar Rahe Hain?)

### 1. The Core Problem in Current Architecture:
Abhi tak hamara AI pipeline (**FaceAI + Gemini Vision + ISNet Segmentation + Duplicate Detection**) 100% accurate aur functionally verified hai. Lekin synchronous HTTP request model ki vajah se:
- **1–2 Garments:** ~14–15 seconds me process ho jate hain (Acceptable).
- **8–16 Garments (Multi-Photo Scan):** ~78–104 seconds lagte hain (CPU-bound ONNX inference).
- **Problem:** Agar user mobile/web app se 10 gallery photos ek sath scan kare, toh browser/mobile HTTP connection timeout ho sakta hai aur user ka screen block ho jata hai.

### 2. The Solution & Goal:
User ko **instant response (0.5 second)** dena hai, processing ko background queue me chalana hai, aur user ko **real-time live progress (e.g. "Analyzing Photo 3/10...", "Found 2 Kurtas...")** dikhana hai.

---

## 🗺️ Master Roadmap Overview (Kya Kya Karenge?)

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             UPCOMING PHASES ROADMAP                              │
├──────────────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: BullMQ + Redis Background Job Processing (Scale & No-Timeout)          │
│ PHASE 2: WebSocket / SSE Real-Time Live Progress & Notifications                 │
│ PHASE 3: Smart Laundry Tracker & Wear Rotation Engine                            │
│ PHASE 4: Calendar-Based Weekly Outfit Planner & Weather Automation               │
│ PHASE 5: GPU-Accelerated Visual Vector Embedding Microservice                    │
│ PHASE 6: Virtual Try-On & 2D Avatar Outfit Canvas Visualizer                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 PHASE 1: Asynchronous Background Queue (BullMQ + Redis)

### 📌 Kya Karenge?
Gallery scanning aur bulk photo ingestion ko synchronous HTTP request se hatakar **BullMQ & Redis** background queue architecture me convert karenge.

### 💡 Kyun Karenge?
1. **Zero HTTP Timeouts:** Server immediately `202 Accepted` with `jobId` return karega (<500ms).
2. **Batch Upload Scaling:** User ek sath 20-50 gallery photos upload kar sakta hai bina app crash huye.
3. **Resilience & Safe Retries:** Agar server restart ho ya network drop ho, toh queue automatically un-processed images ko retry karegi without data loss.

### ⚙️ Kaise Karenge? (Architecture):
```text
[Mobile / Web Client]
        │  (Upload 10 Photos)
        ▼
[POST /api/wardrobe/async-scan-gallery]
        │
        ├──► Store raw images in disk/S3
        ├──► Create BullMQ Job with { jobId, userId, photoPaths }
        └──► Return immediate HTTP 202: { jobId: "scan_8921", status: "QUEUED" }
        
[Background BullMQ Worker Pool (Concurrency C=2)]
        │
        ├── Step 1: FaceAI Check (User present?)
        ├── Step 2: Gemini Vision (Extract clothing bounds & attributes)
        ├── Step 3: Sharp Crop & ISNet Segmentation (Transparent WebP)
        ├── Step 4: Multi-Dimensional Similarity Engine (Check Duplicates)
        ├── Step 5: Save new items / Increment wear count in MongoDB
        └── Step 6: Emit Progress Event via WebSocket / Redis PubSub
```

### 📋 New API Endpoints:
* `POST /api/wardrobe/async-scan-gallery` — Starts background batch scan, returns `jobId`.
* `GET /api/wardrobe/scan-job-status/:jobId` — Polling fallback endpoint to check job status.
* `POST /api/wardrobe/cancel-scan-job/:jobId` — Cancel an ongoing batch job.

---

## ⚡ PHASE 2: Real-Time Live Progress Updates (WebSocket / SSE)

### 📌 Kya Karenge?
Frontend UI par dynamic interactive progress modal banayenge jo live updates dikhayega.

### 💡 Kyun Karenge?
User ko exact pata chale ki background me kya ho raha hai, kitne kapde scan ho gaye, aur kaunsi dresses closet me add ho gayi hain.

### ⚙️ Kaise Karenge?
* **Technology:** Socket.io / Server-Sent Events (SSE).
* **Payload Event Schema:**
```json
{
  "event": "SCAN_PROGRESS",
  "jobId": "scan_8921",
  "totalPhotos": 10,
  "completedPhotos": 4,
  "currentStage": "SEGMENTING_CLOTHES",
  "itemsFoundSoFar": [
    {
      "name": "Navy Blue Linen Shirt",
      "status": "EXACT_MATCH_REUSED",
      "thumbnailUrl": "/uploads/crops/crop-123.webp"
    },
    {
      "name": "Maroon Silk Kurta",
      "status": "NEW_ITEM_CREATED",
      "thumbnailUrl": "/uploads/crops/crop-124.webp"
    }
  ],
  "estimatedTimeRemainingSeconds": 45
}
```

---

## 🧺 PHASE 3: Smart Laundry Tracker & Wear Rotation Engine

### 📌 Kya Karenge?
Closet ke kapdon ka automated laundry cycle aur rotation management system.

### 💡 Kyun Karenge?
1. User ko automatically pata chale kaunse kapde dhoone ke liye gaye hain (`IN_LAUNDRY` / `DRY_CLEANING`).
2. "Wardrobe Neglect Alert" — Jo kapde 60+ din se nahi pehne gaye, AI unko use karne ka suggestion dega taaki wardrobe ka full paisa vasool ho.

### ⚙️ Feature Specifications:
* **One-Tap Move to Laundry:** Outfit pehne ke baad user tap karega "Send to Laundry" $\to$ Item status becomes `IN_LAUNDRY`.
* **Laundry Wash Batch Tracking:** Mark entire laundry bag as washed $\to$ Items status restored to `AVAILABLE`.
* **Dry Cleaning Pickup Alert:** Track dry cleaning slips and return due dates.

---

## 📅 PHASE 4: Calendar-Based Weekly Outfit Planner & Weather Automation

### 📌 Kya Karenge?
User ke Google Calendar / Daily schedule aur local weather ke hisab se pure hafte (Monday to Sunday) ke outfits pehle se plan karna.

### 💡 Kyun Karenge?
Roz subah "Aaj kya pehnu?" ka confusion khatam karna.

### ⚙️ Feature Specifications:
* **Meeting / Occasion Detection:** Agar calendar me "Client Meeting" hai $\to$ Suggest Formal Blazer + Trousers.
* **Weather Integration:** Agar barish/cold weather forecast hai $\to$ Outerwear/Jackets ko priority dega.
* **No-Repeat Guard:** Pichle 14 din me pehne huye outfit combinations ko auto-repeat nahi karega.

---

## 🧠 PHASE 5: Visual Vector Embedding Microservice (GPU-Accelerated)

### 📌 Kya Karenge?
Local CPU se heavy visual machine learning models ko alag karke ek dedicated lightweight GPU microservice me move karenge.

### 💡 Kyun Karenge?
1. Pure attribute similarity (category, color, fabric) 93.8% cases me perfect hai, lekin edge cases me (jaise Zara vs H&M plain black shirts) visual texture differentiation chahiye.
2. GPU worker par CLIP / ViT embeddings **<10 milliseconds** me calculate ho jayengi.

---

## 👗 PHASE 6: 2D Virtual Try-On & Outfit Canvas Visualizer

### 📌 Kya Karenge?
Segmented transparent PNG/WebP garments ko ek canvas par mix & match karke full outfit preview create karna.

### 💡 Kyun Karenge?
User apne Top + Bottom + Shoes + Jacket ko ek sath visually dekh sakega ki wo combine hokar kaise lag rahe hain bina actually pehne.

---

## 🛠️ Step-by-Step Implementation Sequence

| Step | Milestone | Tech Stack | Estimated Effort |
| :---: | :--- | :--- | :---: |
| **Step 1** | Setup Redis & BullMQ Queue Infrastructure | Redis, BullMQ, Node.js | 2 Days |
| **Step 2** | Convert `scanGalleryPhoto` into Async Worker Job | BullMQ, Sharp, ISNet | 2 Days |
| **Step 3** | Implement WebSocket / SSE Live Progress Gateway | Socket.io / Express SSE | 1.5 Days |
| **Step 4** | Build Smart Laundry Status Batch APIs | Express, Mongoose | 1.5 Days |
| **Step 5** | Weekly Outfit Calendar & Weather Automation | Gemini Cascade, Weather API | 2 Days |
| **Step 6** | End-to-End Load Testing & Verification | Node:Test, Artillery | 1 Day |

---

## 🎯 Success Metrics for Upcoming Phases
* **Upload Latency to User:** $\le 500$ ms (Instant ticket acknowledgement).
* **Zero HTTP Dropouts:** 100% upload reliability even with 50+ photos.
* **CPU Load Stability:** Server CPU remains $<70\%$ during heavy concurrent queue execution.
* **User Engagement:** Daily active styling and wear logging increased through automated calendar suggestions.
