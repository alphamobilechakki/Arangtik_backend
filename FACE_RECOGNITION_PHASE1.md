# Face Detection & Face Recognition Backend (Phase 1)

## Overview & Architecture

Phase 1 implements high-accuracy, privacy-first **Face Detection and Face Recognition** for Agentik. It determines whether the currently logged-in user appears in single gallery photos uploaded by the client application.

```text
                        ┌─────────────────────────────────────────┐
                        │          Authenticated User             │
                        └────────────────────┬────────────────────┘
                                             │ JWT Authentication
                        ┌────────────────────▼────────────────────┐
                        │   User Profile Image (Source of Truth)  │
                        └────────────────────┬────────────────────┘
                                             │
                        ┌────────────────────▼────────────────────┐
                        │ Reference Face Validation (Exactly 1)   │
                        │ SSD MobileNet V1 + Landmark 68          │
                        └────────────────────┬────────────────────┘
                                             │
                        ┌────────────────────▼────────────────────┐
                        │ Generate 128-d Reference Face Embedding │
                        │ Secure Cache in DB (select: false)      │
                        └────────────────────┬────────────────────┘
                                             │
                                             │ (Saved for fast reuse)
    ┌────────────────────────┐               │
    │  Client Gallery Photo  ├───────────────┤
    └───────────┬────────────┘               │
                │                            │
    ┌───────────▼────────────┐               │
    │ Detect All Faces & BBox│               │
    └───────────┬────────────┘               │
                │                            │
    ┌───────────▼────────────┐               │
    │ Generate 128-d Vectors │               │
    └───────────┬────────────┘               │
                │                            │
                └─────────────►┌─────────────▼────────────┐
                               │ Similarity Comparison    │
                               │ Euclidean Distance (L2)  │
                               │ Cosine Similarity        │
                               └─────────────┬────────────┘
                                             │
                                ┌────────────▼────────────┐
                                │ Match / No Match Result │
                                │ Bounding Boxes & Scores │
                                └─────────────────────────┘
```


---

## 1. AI Technology & Models

| Component | Technology / Model | Details |
|---|---|---|
| **Runtime Backend** | `@tensorflow/tfjs-backend-wasm` | High-performance WASM acceleration in Node.js |
| **Face Detector** | SSD MobileNet V1 (`ssdMobilenetv1`) | Single Shot MultiBox Detector with MobileNet backbone |
| **Landmark Alignment** | 68-Point Face Landmark Net (`faceLandmark68Net`) | Affine alignment & pose normalization |
| **Face Descriptor** | ResNet-34 FaceRecognitionNet | Produces 128-dimensional L2-normalized biometric vectors |
| **Image Preprocessing**| `sharp` | EXIF auto-rotation, RGB channel normalization, fast decoding |

---

## 2. Similarity Metric & Threshold Tuning

### Euclidean Distance ($d$)
Given two L2-normalized 128-dimensional vectors $\mathbf{u}$ and $\mathbf{v}$:
$$d(\mathbf{u}, \mathbf{v}) = \sqrt{\sum_{i=1}^{128} (u_i - v_i)^2}$$

- **Range:** `0.0` (identical) to `~1.414` (orthogonal / inverted).
- **Default Threshold (`FACE_MATCH_THRESHOLD`):** `0.60`
  - $d \le 0.60 \implies \text{MATCH}$
  - $d > 0.60 \implies \text{NO MATCH}$

### Tuning Recommendations
| Threshold Value | Behavior | Use Case |
|---|---|---|
| **0.50 (Strict)** | Lowest false positives; may miss profile angles or varying lighting | High-security identity verification |
| **0.60 (Standard - Recommended)** | Optimal balance between recall (finding user) and precision | General photo gallery matching |
| **0.65 (Lenient)** | Higher recall; catches partially occluded faces; slight risk of false matches | Casual group photo scanning |

### Normalized Similarity Score
To give frontend clients a convenient `0.0` to `1.0` (0% - 100%) display metric:
$$\text{similarity} = \max\left(0, \min\left(1, 1 - \frac{d}{2 \cdot \text{threshold}}\right)\right)$$

---

## 3. Reference Face Validation Rules

Before generating the reference embedding, the profile photo must satisfy:

1. **Profile Image Missing:** Returns `400 Bad Request` (`PROFILE_IMAGE_NOT_FOUND`).
2. **No Face Detected:** Returns `422 Unprocessable Entity` (`PROFILE_FACE_NOT_FOUND`).
3. **Multiple Faces Detected:** Returns `422 Unprocessable Entity` (`PROFILE_MULTIPLE_FACES`). Prevents ambiguous reference assignment.
4. **Low Quality / Confidence:** Returns `422 Unprocessable Entity` (`PROFILE_FACE_LOW_QUALITY`) if confidence $< 0.50$ or face size $< 50\text{px}$.

---

## 4. API Endpoints

All endpoints require JWT Bearer Authentication (`Authorization: Bearer <token>`).

### 1. Upload/Update Profile Image
- **Endpoint:** `POST /api/auth/profile-image`
- **Body:** `multipart/form-data` with `image` file
- **Invalidation:** Automatically invalidates cached reference face embedding when photo changes.

### 2. Validate Reference Face
- **Endpoint:** `POST /api/face-recognition/reference/validate`
- **Purpose:** Verifies that the existing profile photo has exactly 1 valid face.

### 3. Generate / Refresh Reference Face
- **Endpoint:** `POST /api/face-recognition/reference`
- **Purpose:** Generates and caches the 128-d reference face embedding in MongoDB.

### 4. Get Reference Status
- **Endpoint:** `GET /api/face-recognition/reference`
- **Purpose:** Returns reference embedding status and bounding box metadata without leaking raw biometrics.

### 5. Scan Gallery Image
- **Endpoint:** `POST /api/face-recognition/scan`
- **Body:** `multipart/form-data` with `image` file
- **Query (Optional):** `?threshold=0.6`
- **Returns:**
  - `matched`: `true` or `false`
  - `facesDetected`: Total count of detected faces
  - `matchedFaces`: Array of matched faces with `faceIndex`, `confidence`, `similarity`, `distance`, `boundingBox`
  - `allDetectedFaces`: Full array of all detected faces with bounding boxes for client rendering
  - `processingTimeMs`: Processing latency

---

## 5. Security & Privacy Safeguards

1. **No Embedding Leakage:** Raw 128-d float embeddings are stored with Mongoose `select: false` and are never exposed in API responses or logs.
2. **Strict User Isolation:** Every query strictly enforces `req.user.id`. User A can never access or query against User B's reference face.
3. **Sanitized Logs:** Only non-sensitive metrics (`facesDetected`, `matched`, `processingTimeMs`) are logged.
4. **Resource Management:** TensorFlow tensors are deterministically disposed via `try...finally` blocks to guarantee zero memory leaks in production.

---

## 6. Running Tests

```bash
# Run all Face Recognition unit & integration tests
npm test
```
