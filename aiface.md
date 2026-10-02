# Agentik — Phase 1: Face Detection + Face Recognition Backend

## Role

You are working as a senior backend engineer on the existing **Agentik** application.

The application already has an existing backend architecture, authentication system, user/profile system, database, file/image upload system, and other modules.

Your task is to implement **ONLY Phase 1 of the AI Gallery feature**:

> **Face Detection + Face Recognition**

Do NOT implement clothing detection, wardrobe extraction, outfit recognition, clothing classification, recommendations, or any other AI feature in this phase.

The purpose of this phase is to identify whether the **currently logged-in user appears in images from their gallery**.

---

# 1. Existing Product Requirement

Agentik has a user profile.

The user can upload a profile image from their existing profile/settings section.

That profile image will be used as the user's **reference face**.

Later, the user can grant gallery/photo access from the client application.

The client application will send gallery images to the backend for scanning.

The backend should:

1. Receive the logged-in user's identity from authentication.
2. Retrieve the user's existing profile image.
3. Use that profile image as the reference image.
4. Generate a face embedding for the reference face.
5. Receive gallery images.
6. Detect faces inside each gallery image.
7. Generate embeddings for detected faces.
8. Compare detected faces against the logged-in user's reference embedding.
9. Determine whether the user appears in the gallery image.
10. Return matching/non-matching results.
11. Store only the required metadata/results according to the existing Agentik architecture.

The final purpose is:

```text
Logged-in User
      ↓
Existing Profile Image
      ↓
Reference Face
      ↓
Gallery Images
      ↓
Face Detection
      ↓
Face Embedding
      ↓
Similarity Comparison
      ↓
User Found / User Not Found
```

---

# 2. IMPORTANT — Do Not Change Existing Architecture

Before writing code:

1. Inspect the existing backend completely.
2. Identify:

   * Express app entry point
   * existing routes
   * controllers
   * services
   * models
   * middleware
   * authentication middleware
   * user model
   * profile model
   * existing image/file upload logic
   * existing storage system
   * existing error handling
   * existing response format
   * existing validation approach
   * existing logging system
   * existing environment configuration
3. Reuse the existing architecture.
4. Do NOT create a second authentication system.
5. Do NOT create a second user/profile model.
6. Do NOT create duplicate upload/storage systems.
7. Do NOT rewrite existing modules.
8. Do NOT move existing files unnecessarily.
9. Do NOT create a completely separate backend application.

The new face-recognition functionality must fit naturally into the current Agentik backend.

---

# 3. Folder Structure Rule

First inspect the existing project structure.

Follow the project's existing conventions.

If the project already has a modular structure, add the face-recognition feature inside that structure.

Preferred logical structure if compatible with the existing architecture:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── profile/
│   ├── gallery/
│   └── faceRecognition/
│       ├── faceRecognition.controller.js
│       ├── faceRecognition.service.js
│       ├── faceRecognition.routes.js
│       ├── faceRecognition.validation.js
│       └── faceRecognition.constants.js
│
├── services/
│   └── faceAI/
│       ├── faceAI.client.js
│       └── faceAI.service.js
│
└── ...
```

However:

**DO NOT blindly create this exact structure.**

If Agentik already follows another structure, follow the existing convention.

The primary requirement is:

> Keep the existing folder and file organization consistent with the current project.

---

# 4. Technology Decision

The main Agentik backend is:

```text
Node.js
Express
MongoDB
```

The face recognition implementation must integrate cleanly with this backend.

For the actual face-recognition engine, use a production-capable face recognition solution.

Preferred architecture:

```text
Agentik Node.js Backend
        ↓
Face AI Service
        ↓
Face Detection
        ↓
Face Embedding
        ↓
Similarity Comparison
```

If the chosen face recognition model requires Python, use a small dedicated Python AI service with a clean HTTP API.

Do NOT mix Python code directly into the Node.js runtime.

Architecture:

```text
Agentik Backend
Node.js + Express
        │
        │ HTTP
        ▼
Face AI Service
Python
        │
        ▼
Face Detection + Recognition Model
```

The Node.js backend remains the main application backend.

---

# 5. Reference Face

The existing user's profile image is the source of truth.

Do NOT ask the user to upload another special face image in this phase.

Use:

```text
User Profile
     ↓
Existing profile image
     ↓
Face Detection
     ↓
Reference Face
```

Before generating the reference embedding, validate:

### Case 1 — Profile image missing

Return a proper application error:

```text
Profile image is required for face recognition.
```

Use the existing Agentik error-response convention.

### Case 2 — No face detected

Return:

```text
No face detected in the profile image.
Please upload a clear profile photo containing your face.
```

### Case 3 — Multiple faces detected

Do NOT silently choose a random face.

Return a validation error indicating that the profile image should contain exactly one clear face.

### Case 4 — Face is too small / poor quality

Reject the reference image if the AI engine can reliably detect poor-quality input.

Return a user-friendly validation error.

---

# 6. Reference Embedding

After validating the profile image:

```text
Profile Image
      ↓
Face Detection
      ↓
Exactly one face
      ↓
Face Alignment / Preprocessing
      ↓
Face Embedding
      ↓
Reference Embedding
```

Do not generate a new embedding unnecessarily for every gallery image.

The reference embedding should be reusable.

Recommended approach:

```text
User Profile
      ↓
Reference Face Embedding
      ↓
Cache / Persist securely
```

If the profile image changes:

```text
Profile Image Changed
       ↓
Invalidate old face embedding
       ↓
Generate new reference embedding
```

---

# 7. Gallery Image Processing

The backend should support scanning gallery images.

For every gallery image:

```text
Gallery Image
      ↓
Image Validation
      ↓
Face Detection
      ↓
0 / 1 / Multiple Faces
```

If no face exists:

```text
NO_FACE
```

If faces exist:

```text
Face 1
Face 2
Face 3
...
```

Generate an embedding for each detected face.

Then compare every detected face against the logged-in user's reference embedding.

---

# 8. Recognition Logic

The comparison must use face embedding similarity.

Do NOT compare raw images.

Do NOT compare filenames.

Do NOT compare image hashes for identity.

Do NOT use simple pixel comparison.

Use:

```text
Reference Face Embedding
        ↓
Detected Face Embedding
        ↓
Similarity / Distance
        ↓
Threshold
        ↓
MATCH / NO MATCH
```

The similarity threshold must be configurable.

Example environment variable:

```env
FACE_MATCH_THRESHOLD=0.XX
```

Do not hardcode the threshold throughout the codebase.

The exact threshold must be determined through testing with the selected model.

---

# 9. Threshold Handling

Create centralized constants/configuration:

```text
FACE_MATCH_THRESHOLD
```

Do not assume a generic threshold without validating it for the selected model.

The implementation should make threshold tuning easy.

Example:

```javascript
const FACE_MATCH_THRESHOLD =
    Number(process.env.FACE_MATCH_THRESHOLD);
```

Validate that the value exists and is within a valid range for the selected similarity metric.

Document:

* model
* similarity metric
* threshold meaning
* how to tune threshold
* false positive considerations
* false negative considerations

---

# 10. Result Format

For every scanned gallery image, return structured information.

Example:

```json
{
  "imageId": "IMAGE_ID",
  "matched": true,
  "facesDetected": 3,
  "matchedFaces": [
    {
      "faceIndex": 1,
      "confidence": 0.94,
      "boundingBox": {
        "x": 120,
        "y": 80,
        "width": 180,
        "height": 220
      }
    }
  ]
}
```

For a non-matching image:

```json
{
  "imageId": "IMAGE_ID",
  "matched": false,
  "facesDetected": 2,
  "matchedFaces": []
}
```

The exact response structure should follow existing Agentik API conventions.

Do not introduce a completely different response format if the application already has a standard response wrapper.

---

# 11. Bounding Box

For every detected face, capture its bounding box:

```json
{
  "x": 120,
  "y": 80,
  "width": 180,
  "height": 220
}
```

This is required because the frontend may later want to show:

```text
┌─────────────────────────┐
│                         │
│       ┌─────────┐       │
│       │  FACE   │       │
│       └─────────┘       │
│                         │
└─────────────────────────┘
```

Do not implement frontend UI in this phase.

Only provide the backend data required by the frontend.

---

# 12. API Design

Create APIs following the existing Agentik API versioning and routing conventions.

Recommended logical endpoints:

### Validate user's reference face

```http
POST /api/v1/face-recognition/reference/validate
```

Purpose:

Validate the user's existing profile image.

---

### Generate / refresh reference embedding

```http
POST /api/v1/face-recognition/reference
```

Purpose:

Generate/update the reference embedding from the user's existing profile image.

---

### Scan one gallery image

```http
POST /api/v1/face-recognition/scan
```

Purpose:

Scan one image against the logged-in user's reference face.

Request:

```text
multipart/form-data
image=<gallery-image>
```

Response:

```json
{
  "matched": true,
  "facesDetected": 2,
  "matchedFaces": [
    {
      "faceIndex": 0,
      "confidence": 0.94,
      "boundingBox": {
        "x": 120,
        "y": 80,
        "width": 180,
        "height": 220
      }
    }
  ]
}
```

If the existing application already has a gallery/image-upload endpoint, reuse it where appropriate instead of creating duplicate upload APIs.

---

# 13. Authentication

Every face-recognition request must be authenticated.

Use the existing Agentik authentication middleware.

Never accept:

```json
{
  "userId": "someone-else"
}
```

as the source of identity for normal authenticated requests.

The backend must derive the user identity from the authenticated session/JWT.

Example:

```text
req.user.id
```

or whatever convention the existing project uses.

The profile image must belong to the authenticated user.

---

# 14. User Isolation

This is extremely important.

User A must never be able to use User B's reference face.

Every database query must enforce ownership.

Conceptually:

```javascript
{
    _id: profileId,
    userId: req.user.id
}
```

Do not trust client-provided ownership IDs.

---

# 15. Image Validation

Validate incoming images.

At minimum:

* MIME type
* file extension
* file size
* readable image
* supported formats

Supported formats can include:

```text
JPEG
JPG
PNG
WEBP
```

Follow the existing Agentik upload configuration where possible.

Do not create an independent upload policy if one already exists.

---

# 16. Security Requirements

Face data is sensitive.

Follow strict security practices.

Do not:

* log face embeddings
* expose embeddings in API responses
* expose embeddings in frontend responses
* put embeddings in URLs
* store embeddings in plain application logs
* allow one user to access another user's face data

Do:

* authenticate every request
* authorize every resource
* isolate users
* use HTTPS in production
* protect stored images
* validate uploads
* limit upload size
* implement rate limiting where appropriate
* provide deletion/invalidation support
* keep face data only as long as necessary

Do not use the face data for model training unless explicitly required and separately consented to.

---

# 17. Privacy Architecture

The user explicitly grants gallery/photo permission from the client application.

The backend must NOT assume it automatically owns the user's complete gallery.

The mobile/client application is responsible for obtaining the appropriate OS-level permission.

The backend receives only the images that the client is authorized to send.

Architecture:

```text
Mobile App
    │
    │ User grants photo permission
    │
    ▼
Selected/authorized photos
    │
    ▼
Agentik API
    │
    ▼
Face Recognition
```

Do not implement OS-level gallery permissions in the Node.js backend.

---

# 18. Do Not Scan the Entire Gallery Synchronously

This phase should support single-image scanning first.

Do NOT implement the complete 10,000-image background scanning system yet.

That will be a later phase.

For this phase:

```text
1 image
   ↓
detect faces
   ↓
recognize user
   ↓
return result
```

Once this works reliably, Phase 2 can add:

```text
10,000 images
   ↓
Queue
   ↓
Background workers
   ↓
Progress
   ↓
Bulk recognition
```

---

# 19. Performance

Do not reload the AI model for every request.

The AI service should load the face model once during startup.

Bad:

```text
Request
 ↓
Load model
 ↓
Process image
 ↓
Unload model
```

Good:

```text
AI Service starts
       ↓
Load model once
       ↓
Wait for requests

Request
 ↓
Process image
```

---

# 20. AI Service API

If Python is used, expose a minimal internal API.

Example:

```http
POST /internal/face/embedding
```

Input:

```multipart/form-data
image=<image>
```

Response:

```json
{
  "faceCount": 1,
  "faces": [
    {
      "embedding": "...internal-only...",
      "boundingBox": {
        "x": 120,
        "y": 80,
        "width": 180,
        "height": 220
      }
    }
  ]
}
```

IMPORTANT:

The raw embedding must remain internal to the AI service.

Do not return it to the public Agentik frontend.

Preferably Node.js should receive/process the embedding internally and only return recognition results to the client.

---

# 21. Better Internal AI Contract

If possible, create an internal service contract like:

```json
{
  "faces": [
    {
      "embedding": "<internal-vector>",
      "bbox": {
        "x": 120,
        "y": 80,
        "width": 180,
        "height": 220
      },
      "quality": 0.91
    }
  ]
}
```

Keep this endpoint private.

Only the Agentik backend should communicate with it.

---

# 22. Error Handling

Handle at least these cases:

```text
PROFILE_IMAGE_NOT_FOUND
PROFILE_FACE_NOT_FOUND
PROFILE_MULTIPLE_FACES
PROFILE_FACE_LOW_QUALITY

INVALID_IMAGE
IMAGE_TOO_LARGE
UNSUPPORTED_IMAGE

NO_FACE_DETECTED
FACE_MODEL_ERROR
FACE_SERVICE_UNAVAILABLE

FACE_MATCH_FAILED
INTERNAL_ERROR
```

Use the existing Agentik error contract if one exists.

Do not introduce inconsistent error responses.

---

# 23. Logging

Logs should be useful but privacy-safe.

Good:

```text
Face scan started
Face scan completed
Faces detected: 3
Match result: true
Processing time: 420ms
```

Do NOT log:

```text
face embedding
profile image contents
base64 image
biometric vectors
```

---

# 24. Testing

Create tests for:

### Reference profile

1. Valid profile with one face.
2. Profile without face.
3. Profile with multiple faces.
4. Invalid image.
5. Missing profile image.

### Gallery image

1. Image with user.
2. Image without user.
3. Image with multiple people.
4. Image with no faces.
5. Blurry image.
6. Different lighting.
7. Different face angle.

### Authorization

1. User A can access User A's profile.
2. User A cannot use User B's profile image.
3. User A cannot access User B's scan result.

### Recognition

Test:

```text
Same person
Different person
Similar-looking person
Different lighting
Different angle
Different image quality
```

Measure false positives and false negatives before finalizing the threshold.

---

# 25. Do Not Implement These Yet

This is VERY important.

Do NOT implement:

```text
❌ Clothing detection
❌ Dress extraction
❌ Shirt detection
❌ Pants detection
❌ Color detection
❌ Wardrobe item creation
❌ Outfit recommendation
❌ Clothing embeddings
❌ Outfit matching
❌ Fashion classification
❌ AI stylist
❌ Full gallery background scanning
❌ 10,000-image queue
```

Those are later phases.

Current phase is ONLY:

```text
PROFILE IMAGE
      ↓
REFERENCE FACE
      ↓
GALLERY IMAGE
      ↓
FACE DETECTION
      ↓
FACE EMBEDDING
      ↓
SIMILARITY
      ↓
MATCH / NO MATCH
```

---

# 26. Environment Variables

Add only required environment variables.

Example:

```env
FACE_AI_SERVICE_URL=http://localhost:8001
FACE_MATCH_THRESHOLD=...
FACE_AI_TIMEOUT_MS=10000
```

If model configuration requires additional values, document them.

Never hardcode secrets.

---

# 27. Documentation

Create/update documentation explaining:

1. Face recognition architecture.
2. API endpoints.
3. Request/response examples.
4. Environment variables.
5. AI model used.
6. Similarity metric.
7. Threshold configuration.
8. Local development setup.
9. Production deployment requirements.
10. Privacy/security considerations.
11. Known limitations.

---

# 28. Implementation Process

Follow this order:

## Step 1

Inspect the entire existing Agentik backend.

Do not modify anything yet.

Report:

```text
Existing architecture
Authentication
User/Profile model
Image storage
Routes
Controllers
Services
Database
Error handling
```

## Step 2

Identify the exact existing profile-image field/path.

Example:

```text
User.profileImage
```

or whatever the actual project uses.

Do not assume the field name.

## Step 3

Create the face-recognition module using existing project conventions.

## Step 4

Implement reference-face validation.

## Step 5

Implement reference embedding generation.

## Step 6

Implement single-image face scanning.

## Step 7

Implement face similarity matching.

## Step 8

Implement secure response format.

## Step 9

Add tests.

## Step 10

Run lint/type checks/tests.

## Step 11

Provide API examples for the frontend developer.

---

# 29. Definition of Done

Phase 1 is complete only when:

```text
✓ Existing profile image can be used as reference
✓ Reference image is validated
✓ Exactly one reference face is required
✓ Face embedding is generated
✓ Gallery image can be submitted
✓ Faces are detected
✓ Each detected face gets an embedding
✓ Embeddings are compared
✓ Match threshold is configurable
✓ Matching face bounding box is returned
✓ Match confidence/similarity is returned
✓ No-face case works
✓ Multiple-face case works
✓ Invalid image case works
✓ Authentication works
✓ User isolation works
✓ Embeddings are not exposed publicly
✓ Existing Agentik architecture is preserved
✓ Existing APIs are not broken
✓ Tests pass
✓ Documentation is updated
```

---

# 30. Final Expected Flow

The final backend behavior should be:

```text
USER LOGIN
    ↓
Existing Agentik authentication
    ↓
Get authenticated user
    ↓
Get user's existing profile image
    ↓
Generate/reference face embedding
    ↓
Receive gallery image
    ↓
Detect all faces
    ↓
Generate embeddings
    ↓
Compare against logged-in user's face
    ↓
    ┌─────────────────────┐
    │                     │
    ▼                     ▼
MATCH                 NO MATCH
    │                     │
    ▼                     ▼
Return matched       Return no match
face + bbox          + detected faces
```

Example final API result:

```json
{
  "success": true,
  "data": {
    "matched": true,
    "facesDetected": 3,
    "matchedFaces": [
      {
        "faceIndex": 1,
        "similarity": 0.94,
        "boundingBox": {
          "x": 120,
          "y": 80,
          "width": 180,
          "height": 220
        }
      }
    ]
  }
}
```

The frontend developer can then use this response to visually mark the user's face.

---

# IMPORTANT IMPLEMENTATION RULE

Before coding, inspect the existing Agentik backend and adapt to it.

Do NOT blindly create new architecture.

Do NOT rename existing files.

Do NOT replace existing authentication.

Do NOT replace existing image storage.

Do NOT create duplicate User/Profile models.

Do NOT implement future wardrobe functionality.

Build this as a clean, isolated **Face Recognition module** that can later become the first stage of the complete:

```text
Gallery
   ↓
Face Recognition
   ↓
User Photos
   ↓
Clothing Detection
   ↓
Wardrobe
```

system.
