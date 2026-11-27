# Arangtik Backend API Documentation

Welcome to the **Arangtik REST API** documentation. This document details the endpoints, authentication flow, headers, request parameters, status codes, and exact request-response cycles verified through live integration testing.

---

## 1. General Architecture & Standards

### Base URL
```
Development: http://localhost:8083/api
Production:  https://api.arangtik.com/api
```

### Standard Response Structure
All API responses adhere to a consistent JSON envelope format:

#### Success Response Envelope (HTTP 200 / 201)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Human-readable status message",
  "data": { ... }
}
```

#### Error Response Envelope (HTTP 400 / 401 / 403 / 404 / 500)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Specific error description",
  "errors": []
}
```

### Authentication Header
Endpoints marked **Protected / Authenticated** require a standard Bearer JSON Web Token (JWT) in the HTTP headers:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 2. Authentication & User Profile Module (`/api/auth`)

The Auth module handles passwordless OTP-based authentication via WhatsApp/SMS, user registration, JWT issuance, profile management, biometric Face AI reference enrollment, and push notification device token management.

---

### 2.1. Send OTP
*Initiates passwordless login or registration by sending a 4-digit verification OTP via VoiceNSMS.*

- **Method**: `POST`
- **Full Endpoint**: `/api/auth/send-otp`
- **Access**: `Public` (No Authorization required)
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | Phone number including country code (e.g., `918949056321` or `+918949056321`). |

##### Request Example
```json
{
  "phone": "918949056321"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "data": {
    "phone": "918949056321",
    "isExistingUser": true,
    "expiresInMinutes": 10
  }
}
```

##### HTTP 400 Bad Request
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Phone number is required",
  "errors": []
}
```

---

### 2.2. Verify OTP & Login / Register
*Validates the OTP entered by the user. If the user already exists, logs them in; if new, creates a user account. Optionally registers the device's FCM push token in the same atomic call.*

- **Method**: `POST`
- **Full Endpoint**: `/api/auth/verify-otp`
- **Access**: `Public` (No Authorization required)
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | Phone number used to request OTP. |
| `otp` | `string` | **Yes** | 4-digit verification code (e.g., `"1234"`). |
| `name` | `string` | No | Name for new user registration (defaults to empty string if omitted). |
| `location` | `object` or `string` | No | User location. Accepts GeoJSON `{ "type": "Point", "coordinates": [longitude, latitude] }`, `{ "latitude": 28.6139, "longitude": 77.2090 }`, `{ "lat": 28.6139, "lng": 77.2090 }`, or stringified JSON. |
| `latitude` / `lat` | `number` | No | Flat latitude coordinate (between -90 and 90). |
| `longitude` / `lng` | `number` | No | Flat longitude coordinate (between -180 and 180). |
| `fcmToken` / `deviceToken` | `string` | No | FCM device push notification token to register immediately on login. |
| `platform` | `string` | No | Operating system platform: `"ANDROID"`, `"IOS"`, `"WEB"`, or `"OTHER"`. |
| `deviceId` | `string` | No | Unique hardware / device identifier string. |
| `deviceModel` | `string` | No | Device model name (e.g., `"Pixel 8"`, `"iPhone 15"`). |
| `appVersion` | `string` | No | Client application release version (e.g., `"1.0.0"`). |

##### Request Example
```json
{
  "phone": "918949056321",
  "otp": "1234",
  "name": "Monika",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "fcmToken": "fcm_sample_token_xyz987",
  "platform": "ANDROID",
  "deviceId": "device_pixel_8_uuid",
  "deviceModel": "Pixel 8",
  "appVersion": "1.0.0"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYzA5NTJjODAyMzk3ODhlNzY0YzBmOSIsImlhdCI6MTc2MTU0OTUyMCwiZXhwIjoxNzY0MTQxNTIwfQ.SampleSignature",
    "user": {
      "_id": "6ac0952c80239788e764c0f9",
      "name": "Monika",
      "phone": "918949056321",
      "gender": "FEMALE",
      "accountType": "INDIVIDUAL",
      "country": "India",
      "currency": "INR",
      "preferredLanguage": "en",
      "location": {
        "type": "Point",
        "coordinates": [77.2090, 28.6139]
      },
      "wallet": 0,
      "profileImage": "https://api.arangtik.com/uploads/img_mv6gxfw5_31f57b.jpg",
      "role": "user",
      "status": "active"
    },
    "isNewUser": false,
    "fcmToken": "fcm_sample_token_xyz987",
    "deviceRegistered": true
  }
}
```

##### HTTP 400 Bad Request (Invalid OTP)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid OTP. Please try again.",
  "errors": []
}
```

---

### 2.3. Get Current User Profile
*Fetches profile information for the currently authenticated user.*

- **Method**: `GET`
- **Full Endpoints**:
  - `/api/auth/me` *(Canonical)*
  - `/api/auth/profile` *(Alias)*
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Request Body
None.

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User profile fetched successfully",
  "data": {
    "_id": "6ac0952c80239788e764c0f9",
    "name": "Monika",
    "phone": "918949056321",
    "role": "user",
    "status": "active",
    "gender": "FEMALE",
    "accountType": "INDIVIDUAL",
    "country": "India",
    "currency": "INR",
    "preferredLanguage": "en",
    "location": {
      "type": "Point",
      "coordinates": [77.2090, 28.6139]
    },
    "wallet": 0,
    "profileImage": "https://api.arangtik.com/uploads/img_mv6gxfw5_31f57b.jpg",
    "createdAt": "2026-10-03T05:39:56.149Z",
    "updatedAt": "2026-10-27T07:28:41.531Z"
  }
}
```

##### HTTP 401 Unauthorized (Missing or Invalid Token)
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Not authorized to access this route",
  "errors": []
}
```

---

### 2.4. Update Profile
*Updates profile metadata (name, gender, country, currency, language, account type, location). Supports either JSON format or Multipart/Form-Data if attaching a profile photo (`image` or `profileImage`).*

- **Method**: `PATCH` or `PUT`
- **Full Endpoint**: `/api/auth/profile`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```
  *(or `multipart/form-data` when uploading an image file)*

#### Request Body Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | User's full name. |
| `gender` | `string` | No | `"MALE"`, `"FEMALE"`, `"OTHER"`, or `"UNSPECIFIED"`. |
| `accountType` | `string` | No | `"INDIVIDUAL"` or `"COMMERCIAL"`. |
| `country` | `string` | No | User country (e.g., `"India"`). |
| `currency` | `string` | No | User currency code (e.g., `"INR"`, `"USD"`). |
| `preferredLanguage` | `string` | No | Preferred ISO language code (e.g., `"en"`, `"hi"`). |
| `location` | `object` or `string` or `null` | No | GeoJSON `{ "type": "Point", "coordinates": [longitude, latitude] }`, `{ "latitude": 28.6, "longitude": 77.2 }`, `{ "lat": 28.6, "lng": 77.2 }`, stringified JSON, or `null` to clear location. |
| `latitude` / `lat` | `number` | No | Flat latitude coordinate (between -90 and 90). |
| `longitude` / `lng` | `number` | No | Flat longitude coordinate (between -180 and 180). |
| `image` / `profileImage` | `file` or `string` | No | Image file upload (multipart) or existing image URL string. |

##### JSON Request Example
```json
{
  "name": "Verified Test User",
  "gender": "MALE",
  "accountType": "INDIVIDUAL",
  "country": "India",
  "currency": "INR",
  "preferredLanguage": "en",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "_id": "6ac0952c80239788e764c0f9",
    "name": "Verified Test User",
    "phone": "918949056321",
    "role": "user",
    "status": "active",
    "gender": "MALE",
    "accountType": "INDIVIDUAL",
    "country": "India",
    "currency": "INR",
    "preferredLanguage": "en",
    "location": {
      "type": "Point",
      "coordinates": [77.2090, 28.6139]
    },
    "wallet": 0,
    "profileImage": "http://localhost:8083/uploads/img_mv6gxfw5_31f57b.jpg",
    "createdAt": "2026-10-03T05:39:56.149Z",
    "updatedAt": "2026-10-27T07:28:41.531Z"
  }
}
```

---

### 2.5. Upload Profile Image & Face Biometric Registration
*Uploads a profile picture and automatically executes the Face AI pipeline to validate that the photo contains exactly 1 clear human face. Computes a 128-dimensional facial embedding vector and stores it as the user's reference biometric for AI Try-On and Face Recognition.*

- **Method**: `POST`
- **Full Endpoint**: `/api/auth/profile-image`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: multipart/form-data
  ```

#### Form Data Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `image` | `file` (binary) | **Yes** | Image file (`.jpg`, `.jpeg`, `.png`, `.webp`). Must contain a single clear human face. |

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Profile image uploaded and reference face biometric registered successfully",
  "data": {
    "_id": "6ac0952c80239788e764c0f9",
    "name": "Verified Test User",
    "phone": "918949056321",
    "role": "user",
    "status": "active",
    "profileImage": "http://localhost:8083/uploads/img_profile_6ac095.jpg",
    "referenceFace": {
      "hasReferenceFace": true,
      "boundingBox": {
        "x": 124,
        "y": 88,
        "width": 240,
        "height": 290
      },
      "detectionConfidence": 0.9982,
      "lastGeneratedAt": "2026-10-27T07:30:00.000Z"
    }
  }
}
```

##### HTTP 400 Bad Request (Missing File)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "No profile image file uploaded"
}
```

##### HTTP 400 Bad Request (Biometric Face AI Validation Failure)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "No face detected in the image. Please upload a clear photo showing your face."
}
```

---

### 2.6. Register FCM Device Token
*Registers or updates an FCM device push token associated with the authenticated user account.*

- **Method**: `POST`
- **Full Endpoint**: `/api/auth/device-token`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | `string` | **Yes** | FCM registration device token. |
| `platform` | `string` | No | `"ANDROID"`, `"IOS"`, `"WEB"`, or `"OTHER"`. |
| `deviceId` | `string` | No | Device identifier. |
| `deviceModel` | `string` | No | Device hardware model. |
| `appVersion` | `string` | No | Mobile or web app version. |

##### Request Example
```json
{
  "token": "fcm_sample_device_token_xyz987",
  "platform": "ANDROID",
  "deviceId": "device_unique_id_101",
  "deviceModel": "Pixel 8",
  "appVersion": "1.0.0"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "id": "6ae052a94e3e0342eb053cf8",
    "userId": "6ac0952c80239788e764c0f9",
    "token": "fcm_sample_device_token_xyz987",
    "platform": "ANDROID",
    "isActive": true,
    "lastUsedAt": "2026-10-27T07:28:41.595Z"
  }
}
```

##### HTTP 400 Bad Request (Invalid Platform or Token)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid platform. Allowed values: ANDROID, IOS, WEB, OTHER",
  "errors": []
}
```

---

### 2.7. Remove FCM Device Token
*Removes/deactivates a registered FCM device token so the device no longer receives push notifications.*

- **Method**: `DELETE`
- **Full Endpoint**: `/api/auth/device-token`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```

#### Request Body *(or URL Query Param `?token=...`)*
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | `string` | **Yes** | FCM device token to remove. |

##### Request Example
```json
{
  "token": "fcm_sample_device_token_xyz987"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Device token removed successfully",
  "data": {
    "removed": true,
    "deletedCount": 1,
    "deactivatedCount": 1
  }
}
```

##### HTTP 400 Bad Request
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Device token is required to remove",
  "errors": []
}
```

---

### 2.8. Logout
*Logs out the user. If an FCM token is provided, it de-registers only that specific device token; otherwise, it clears all active device tokens associated with the user.*

- **Method**: `POST`
- **Full Endpoint**: `/api/auth/logout`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```

#### Request Body (Optional)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` / `fcmToken` / `deviceToken` | `string` | No | Specific device token to remove on logout. If omitted, all devices for this user are logged out. |

##### Request Example
```json
{
  "token": "fcm_sample_device_token_xyz987"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logged out successfully",
  "data": null
}
```

---

## 3. Quick Reference Table

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-otp` | Public | Send verification OTP to user via SMS (VoiceNSMS) |
| `POST` | `/api/auth/verify-otp` | Public | Verify OTP, authenticate/register user, return JWT token |
| `GET` | `/api/auth/me` | Protected | Fetch authenticated user's profile details |
| `GET` | `/api/auth/profile` | Protected | Alias route to fetch authenticated user's profile |
| `PATCH` | `/api/auth/profile` | Protected | Update profile details (JSON or Multipart image upload) |
| `PUT` | `/api/auth/profile` | Protected | Alias route to update profile details |
| `POST` | `/api/auth/profile-image` | Protected | Upload profile photo & extract 128-d reference face biometric |
| `POST` | `/api/auth/device-token` | Protected | Register FCM device token for push notifications |
| `DELETE` | `/api/auth/device-token` | Protected | Remove / deactivate FCM device token |
| `POST` | `/api/auth/logout` | Protected | Logout user and de-register device push notification token(s) |

---

///////////////////////////////// "Wardrobe " /////////////////////////////////

## 3. Wardrobe / Closet Container Module (`/api/wardrobe`)

The Wardrobe module manages user wardrobe closet containers (e.g., "Personal Almari", "Office Wardrobe", "Party & Festive Wear", "Mummy Wardrobe") associated with specific Store Types (`storeTypeId`), custom cover images, owner face recognition references, and soft/hard deletion lifecycles.

All routes under `/api/wardrobe` are **Protected** and require:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

### 3.1. Create Wardrobe Container
*Creates a new wardrobe/closet container for the authenticated user, linked to a storeTypeId (or default WARDROBE store type), with optional custom cover image and owner face photo for biometric clustering.*

- **Method**: `POST`
- **Full Endpoint**: `/api/wardrobe/create-wardrobe`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```
  *(or `multipart/form-data` if uploading `ownerFaceImage` / `coverImage`)*

#### Request Body Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Unique descriptive display name for the wardrobe (e.g., `"Party & Festive Wear"`). |
| `storeTypeId` | `string` (ObjectId) | No | Target store type ID. Automatically defaults to active `"WARDROBE"` store type if omitted. |
| `type` | `string` | No | Wardrobe classification: `"PERSONAL"`, `"SHARED"`, `"FAMILY"`, etc. (Default: `"PERSONAL"`). |
| `ownerName` | `string` | No | Name of the person who owns clothes in this closet (e.g., `"Monika"`). |
| `isDefault` | `boolean` | No | Set to `true` to make this the primary/default wardrobe container. |
| `coverImage` | `file` or `string` | No | Optional cover image file (multipart) or URL string. |
| `ownerFaceImage` | `file` or `string` | No | Optional face reference image for automatic clothes attribution. |

##### Request Example (JSON)
```json
{
  "name": "Party & Festive Wear",
  "type": "PERSONAL",
  "ownerName": "Monika",
  "isDefault": false
}
```

#### Response Cycle

##### HTTP 201 Created (Tested)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Wardrobe closet created successfully",
  "data": {
    "_id": "6ae0551433480f1d0fb8d9e2",
    "userId": "6ac0952c80239788e764c0f9",
    "name": "Party & Festive Wear",
    "storeTypeId": {
      "_id": "6ae03a499b2993a9455fc54f",
      "name": "wardrobe",
      "code": "WARDROBE",
      "image": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
      "id": "6ae03a499b2993a9455fc54f"
    },
    "type": "PERSONAL",
    "ownerName": "Monika",
    "coverImage": "",
    "ownerFaceImage": "",
    "isDefault": false,
    "isActive": true,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-27T07:39:00.727Z",
    "updatedAt": "2026-10-27T07:39:00.727Z",
    "__v": 0,
    "storeType": "WARDROBE",
    "id": "6ae0551433480f1d0fb8d9e2",
    "itemCount": 0
  }
}
```

##### HTTP 400 Bad Request
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Wardrobe name is required",
  "errors": []
}
```

---

### 3.2. Get All Wardrobes / Stores
*Lists all active wardrobe containers for the authenticated user, with populated `storeTypeId` objects and dynamically aggregated `itemCount` (total clothes inside each closet).*

- **Method**: `GET`
- **Full Endpoint**: `/api/wardrobe/get-wardrobes`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `storeTypeId` | `string` (ObjectId) | No | Filter wardrobes by specific store type ObjectId. |
| `storeType` | `string` | No | Filter by store type code or name (e.g., `"WARDROBE"`). Pass `"ALL"` to list all. |
| `clusterId` | `string` (ObjectId) | No | Discover wardrobes belonging to all active members of the specified cluster (requires `WARDROBE` feature enabled). |
| `ownerId` | `string` (ObjectId) | No | Target specific cluster member's wardrobes (requires shared cluster with `WARDROBE` feature). |
| `includeDeleted` | `boolean` | No | Pass `true` to include soft-deleted containers in the response. |

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobes fetched successfully",
  "data": [
    {
      "_id": "6ac0952d80239788e764c0ff",
      "userId": "6ac0952c80239788e764c0f9",
      "name": "My Wardrobe",
      "storeTypeId": {
        "_id": "6ae03a499b2993a9455fc54f",
        "name": "wardrobe",
        "code": "WARDROBE",
        "image": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
        "id": "6ae03a499b2993a9455fc54f"
      },
      "type": "PERSONAL",
      "ownerName": "Monika",
      "coverImage": "",
      "ownerFaceImage": "",
      "isDefault": true,
      "isActive": true,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-10-03T05:39:57.123Z",
      "updatedAt": "2026-10-03T05:39:57.123Z",
      "itemCount": 12
    },
    {
      "_id": "6ae0551433480f1d0fb8d9e2",
      "userId": "6ac0952c80239788e764c0f9",
      "name": "Party & Festive Wear",
      "storeTypeId": {
        "_id": "6ae03a499b2993a9455fc54f",
        "name": "wardrobe",
        "code": "WARDROBE",
        "image": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
        "id": "6ae03a499b2993a9455fc54f"
      },
      "type": "PERSONAL",
      "ownerName": "Monika",
      "coverImage": "",
      "ownerFaceImage": "",
      "isDefault": false,
      "isActive": true,
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-10-27T07:39:00.727Z",
      "updatedAt": "2026-10-27T07:39:00.727Z",
      "itemCount": 0
    }
  ]
}
```

---

### 3.3. Get Single Wardrobe Container
*Retrieves complete details for a specific wardrobe container by its ID, including populated store type and live garment count.*

- **Method**: `GET`
- **Full Endpoint**: `/api/wardrobe/get-wardrobe/:id`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | The unique `_id` of the wardrobe container. |

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `includeDeleted` | `boolean` | No | Set to `true` if querying an archived/soft-deleted wardrobe. |

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe container retrieved successfully",
  "data": {
    "_id": "6ae0551433480f1d0fb8d9e2",
    "userId": "6ac0952c80239788e764c0f9",
    "name": "Party & Festive Wear",
    "storeTypeId": {
      "_id": "6ae03a499b2993a9455fc54f",
      "name": "wardrobe",
      "code": "WARDROBE",
      "image": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
      "id": "6ae03a499b2993a9455fc54f"
    },
    "type": "PERSONAL",
    "ownerName": "Monika",
    "coverImage": "",
    "ownerFaceImage": "",
    "isDefault": false,
    "isActive": true,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-27T07:39:00.727Z",
    "updatedAt": "2026-10-27T07:39:00.727Z",
    "storeType": "WARDROBE",
    "itemCount": 0
  }
}
```

##### HTTP 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Wardrobe container not found",
  "errors": []
}
```

---

### 3.4. Update Wardrobe Container
*Modifies an existing wardrobe container's name, store type link, owner details, default status, or cover/face pictures.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/wardrobe/update-wardrobe/:id`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```
  *(or `multipart/form-data` if attaching image files)*

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | The unique `_id` of the wardrobe container to update. |

#### Request Body Parameters
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | New name for the wardrobe container. |
| `storeTypeId` | `string` (ObjectId) | No | New store type ObjectId to reassign the wardrobe to. |
| `type` | `string` | No | `"PERSONAL"`, `"SHARED"`, `"FAMILY"`, etc. |
| `ownerName` | `string` | No | Updated owner name. |
| `isDefault` | `boolean` | No | Mark as default wardrobe (automatically unmarks previous default). |
| `isActive` | `boolean` | No | Set active/inactive status. |
| `coverImage` | `file` or `string` | No | New cover image file or URL. |
| `ownerFaceImage` | `file` or `string` | No | New owner face picture file or URL. |

##### Request Example (JSON)
```json
{
  "name": "Party & Wedding Collection",
  "ownerName": "Monika Sharma"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe container updated successfully",
  "data": {
    "_id": "6ae0551433480f1d0fb8d9e2",
    "userId": "6ac0952c80239788e764c0f9",
    "name": "Party & Wedding Collection",
    "storeTypeId": {
      "_id": "6ae03a499b2993a9455fc54f",
      "name": "wardrobe",
      "code": "WARDROBE",
      "image": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
      "id": "6ae03a499b2993a9455fc54f"
    },
    "type": "PERSONAL",
    "ownerName": "Monika Sharma",
    "coverImage": "",
    "ownerFaceImage": "",
    "isDefault": false,
    "isActive": true,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-27T07:39:00.727Z",
    "updatedAt": "2026-10-27T07:39:01.017Z",
    "storeType": "WARDROBE",
    "itemCount": 0
  }
}
```

---

### 3.5. Delete Wardrobe Container (Soft Delete by Default)
*Performs safe soft-deletion on a wardrobe container (`isDeleted: true`, `deletedAt: Date`, `isActive: false`). If clothes are assigned to this wardrobe, they are automatically migrated to the user's default wardrobe to prevent data loss. Default wardrobes cannot be deleted.*

- **Method**: `DELETE`
- **Full Endpoint**: `/api/wardrobe/delete-wardrobe/:id`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | The unique `_id` of the wardrobe container. |

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `hard` | `boolean` | No | If `true`, permanently removes the document from MongoDB. Default is `false` (safe soft delete). |

#### Response Cycle

##### HTTP 200 OK — Soft Deletion (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe container \"Party & Wedding Collection\" soft deleted successfully",
  "data": {
    "message": "Wardrobe container \"Party & Wedding Collection\" soft deleted successfully"
  }
}
```

##### HTTP 200 OK — Hard Deletion (`?hard=true`) (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe container \"Party & Wedding Collection\" permanently deleted successfully",
  "data": {
    "message": "Wardrobe container \"Party & Wedding Collection\" permanently deleted successfully"
  }
}
```

##### HTTP 400 Bad Request (Attempting to delete Default Almari)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Cannot delete your default Almari",
  "errors": []
}
```

---

### 3.6. Restore Soft-Deleted Wardrobe Container
*Restores a previously soft-deleted wardrobe container back to active status (`isDeleted: false`, `deletedAt: null`, `isActive: true`).*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/wardrobe/restore-wardrobe/:id`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | The unique `_id` of the soft-deleted wardrobe container. |

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe container restored successfully",
  "data": {
    "_id": "6ae0551433480f1d0fb8d9e2",
    "userId": "6ac0952c80239788e764c0f9",
    "name": "Party & Wedding Collection",
    "storeTypeId": {
      "_id": "6ae03a499b2993a9455fc54f",
      "name": "wardrobe",
      "code": "WARDROBE",
      "image": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
      "id": "6ae03a499b2993a9455fc54f"
    },
    "type": "PERSONAL",
    "ownerName": "Monika Sharma",
    "coverImage": "",
    "ownerFaceImage": "",
    "isDefault": false,
    "isActive": true,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-10-27T07:39:00.727Z",
    "updatedAt": "2026-10-27T07:39:01.260Z",
    "__v": 0,
    "storeType": "WARDROBE",
    "id": "6ae0551433480f1d0fb8d9e2",
    "itemCount": 0
  }
}
```

##### HTTP 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Wardrobe container not found",
  "errors": []
}
```

---

### 3.7. Add Clothing Item to Wardrobe (Single & Multi-Photo AI Ingestion)
*Adds one or multiple clothing items to the user's wardrobe closet. Supports uploading 1 image or batch-uploading up to 50 gallery photos in a single request, as well as a JSON fallback for manual entries. The endpoint operates asynchronously: it immediately saves the garment record with `processingStatus: "PROCESSING"` and responds in < 200ms (HTTP 201 Created), while dispatching background 3D Ghost-Mannequin extraction, background removal, and visual taxonomy analysis to the BullMQ Redis queue (`garment-ai-queue`).*

> [!NOTE]
> **No Person Mode Parameter Required:** The API automatically detects whether a garment photo contains a person, flat-lay, or hanger clothing. Callers do **NOT** need to send `with_person` or `without_person`.

- **Method**: `POST`
- **Full Endpoint**: `/api/wardrobe/add-item`
- **Access**: `Protected` (Requires Bearer Token)
- **Quota Enforced**: `clothingItems` (based on user tier)
- **Content-Type**:
  - `multipart/form-data` (Recommended for image uploads)
  - `application/json` (For manual cataloguing without image file)

#### Request Headers
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: multipart/form-data
```

#### Request Parameters (Multipart / Form-Data)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `photo` / `image` / `file` | `file` (binary) | Optional* | Single garment image file (JPEG, PNG, WebP up to 15MB). |
| `photos` / `images` / `files` | `files[]` (binary) | Optional* | Multiple image files for batch gallery ingestion (up to 50 images). |
| `wardrobeId` | `string` (ObjectId) | No | Target wardrobe closet ID. Defaults to the user's active/default wardrobe if omitted. |
| `name` | `string` | No | Optional display name (e.g. `"Navy Blue Embroidered Kurta"`). Defaults to `"Analyzing Outfit..."` until AI completes. |
| `category` | `string` | No | Optional category hint (e.g., `"UPPER_WEAR"`, `"LOWER_WEAR"`). Overridden by AI classifier. |
| `subCategory` | `string` | No | Optional subcategory hint (e.g., `"SHIRT"`, `"JEANS"`, `"KURTA"`). |
| `color` | `string` | No | Optional primary color hint. Overridden by AI color extractor. |
| `allowDuplicate` / `forceAdd` | `boolean` | No | Pass `true` to force adding the garment even if an exact perceptual visual duplicate already exists in the wardrobe. (Default: `false`). |
| `sourceType` | `string` | No | Origin of the photo: `"CAMERA_CAPTURE"` (default) or `"GALLERY"`. |

*\* Note: At least one image file OR a JSON body must be provided.*

##### Request Example (Multipart Form-Data — Single Photo)
```http
POST /api/wardrobe/add-item HTTP/1.1
Host: localhost:8083
Authorization: Bearer eyJhbGciOi...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW

------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="photo"; filename="blue_shirt.jpg"
Content-Type: image/jpeg

<binary content>
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="wardrobeId"

6ae0551433480f1d0fb8d9e2
------WebKitFormBoundary7MA4YWxkTrZu0gW
Content-Disposition: form-data; name="sourceType"

CAMERA_CAPTURE
------WebKitFormBoundary7MA4YWxkTrZu0gW--
```

##### Request Example (Fallback JSON — Manual Entry Without Image)
```json
{
  "wardrobeId": "6ae0551433480f1d0fb8d9e2",
  "name": "Black Formal Trousers",
  "category": "LOWER_WEAR",
  "subCategory": "TROUSERS",
  "color": "Black",
  "sourceType": "MANUAL"
}
```

#### Response Cycles

##### HTTP 201 Created (Single Photo Upload — Fast Response < 200ms)
*Returns immediately with `processingStatus: "PROCESSING"`. The AI worker processes segmentation & taxonomy in the background.*
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Item added successfully to wardrobe store",
  "data": {
    "_id": "6ae05a9033480f1d0fb8d9f5",
    "userId": "6ac0952c80239788e764c0f9",
    "wardrobeId": "6ae0551433480f1d0fb8d9e2",
    "name": "Analyzing Outfit...",
    "category": "PENDING",
    "subCategory": "",
    "color": "",
    "processingStatus": "PROCESSING",
    "images": [
      {
        "url": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
        "type": "ORIGINAL",
        "isPrimary": true,
        "filename": "img_mvq9gr7f_f3515d.jpeg"
      }
    ],
    "sourceType": "CAMERA_CAPTURE",
    "sourcePhotoUrl": "http://localhost:8083/uploads/img_mvq9gr7f_f3515d.jpeg",
    "sourceImageHash": "a1b2c3d4e5f67890...",
    "isActive": true,
    "status": "ACTIVE",
    "createdAt": "2026-11-23T11:00:00.000Z",
    "updatedAt": "2026-11-23T11:00:00.000Z"
  }
}
```

##### HTTP 201 Created (Batch Gallery Upload — Up to 50 Photos)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "3 item(s) added successfully! Processing each photo in background.",
  "data": {
    "totalUploaded": 3,
    "totalCreated": 3,
    "totalDuplicates": 0,
    "items": [
      {
        "_id": "6ae05a9033480f1d0fb8d9f5",
        "name": "Analyzing Outfit...",
        "processingStatus": "PROCESSING",
        "sourcePhotoUrl": "http://localhost:8083/uploads/img_1.jpeg"
      },
      {
        "_id": "6ae05a9033480f1d0fb8d9f6",
        "name": "Analyzing Outfit...",
        "processingStatus": "PROCESSING",
        "sourcePhotoUrl": "http://localhost:8083/uploads/img_2.jpeg"
      },
      {
        "_id": "6ae05a9033480f1d0fb8d9f7",
        "name": "Analyzing Outfit...",
        "processingStatus": "PROCESSING",
        "sourcePhotoUrl": "http://localhost:8083/uploads/img_3.jpeg"
      }
    ],
    "duplicates": []
  }
}
```

##### HTTP 200 OK (Duplicate Photo Detected)
*Triggered when perceptual image hashing detects that the identical garment photo is already catalogued in the user's wardrobe and `allowDuplicate=false`.*
```json
{
  "statusCode": 200,
  "success": true,
  "message": "This dress already exists in your Almari as \"Navy Blue Embroidered Kurta\" (skipped duplicate addition).",
  "data": {
    "isDuplicate": true,
    "item": {
      "_id": "6ae0551433480f1d0fb8d9e2",
      "name": "Navy Blue Embroidered Kurta",
      "category": "ETHNIC_WEAR",
      "color": "Navy Blue",
      "processingStatus": "COMPLETED",
      "sourceImageHash": "a1b2c3d4e5f67890..."
    },
    "duplicates": [ ... ],
    "items": []
  }
}
```

##### HTTP 400 Bad Request
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Please upload an image or provide valid garment details",
  "errors": []
}
```

##### HTTP 403 Forbidden (Quota Exceeded)
```json
{
  "statusCode": 403,
  "success": false,
  "message": "Clothing items quota limit reached for your account tier. Please upgrade to add more items.",
  "errors": []
}
```

---

### 3.8. Get Clothing Items with Filters & Pagination
*Lists clothing items belonging to the user or discoverable across a shared Frequent Connect cluster, with multifaceted filtering by wardrobe, store type, category, subcategory, color, occasion, season, and keyword search.*

- **Method**: `GET`
- **Full Endpoint**: `/api/wardrobe/get-items`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `wardrobeId` | `string` (ObjectId) | No | Filter items by specific wardrobe container ID. |
| `storeTypeId` / `storeType` | `string` | No | Filter by store type ObjectId or code (`WARDROBE`, `PANTRY`, `ALL`). |
| `category` | `string` | No | Category filter (e.g. `UPPER_WEAR`, `LOWER_WEAR`, `ETHNIC_WEAR`, `DRESS`). |
| `subCategory` | `string` | No | Sub-category filter (e.g. `SHIRT`, `JEANS`, `TSHIRT`, `SAREE`). |
| `color` | `string` | No | Filter by garment primary color (e.g. `Blue`, `Black`, `Red`). |
| `occasion` | `string` | No | Filter by occasion (e.g. `CASUAL`, `FORMAL`, `PARTY`, `FESTIVE`). |
| `season` | `string` | No | Filter by season (e.g. `SUMMER`, `WINTER`, `ALL_SEASON`). |
| `favorite` | `boolean` | No | Filter bookmarked favorite outfits (`true` / `false`). |
| `search` | `string` | No | Text search across item name, tags, fabric, and description. |
| `status` | `string` | No | Filter by lifecycle status: `ACTIVE` (default) or `INACTIVE`. |
| `clusterId` | `string` (ObjectId) | No | Discover clothes across all active members of the specified cluster. |
| `ownerId` | `string` (ObjectId) | No | Discover clothes of a specific member in the shared cluster. |
| `page` | `integer` | No | Page number (default: `1`). |
| `limit` | `integer` | No | Items per page (default: `20`, max: `100`). |
| `sort` | `string` | No | Sort order, e.g. `-createdAt` (newest first). |

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe items fetched successfully",
  "data": {
    "items": [
      {
        "_id": "6ae05a9033480f1d0fb8d9f5",
        "userId": "6ac0952c80239788e764c0f9",
        "wardrobeId": "6ae0551433480f1d0fb8d9e2",
        "name": "White Real Madrid Jersey",
        "category": "UPPER_WEAR",
        "subCategory": "JERSEY",
        "color": "White",
        "processingStatus": "COMPLETED",
        "images": [
          {
            "url": "https://bg.arangtik.com/api/outputs/73ed_garment_001.png",
            "type": "CUTOUT",
            "isPrimary": true
          },
          {
            "url": "http://localhost:8083/uploads/jersey.jpg",
            "type": "ORIGINAL",
            "isPrimary": false
          }
        ],
        "isFavorite": false,
        "isActive": true,
        "createdAt": "2026-11-23T11:00:00.000Z"
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

---

### 3.9. Get Single Clothing Item Details
*Retrieves complete details of an individual clothing item, including original and 3D cutout image URLs, AI taxonomy analysis, care instructions, and wear history.*

- **Method**: `GET`
- **Full Endpoint**: `/api/wardrobe/get-item/:id`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | The unique `_id` of the wardrobe item. |

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item details fetched successfully",
  "data": {
    "_id": "6ae05a9033480f1d0fb8d9f5",
    "userId": "6ac0952c80239788e764c0f9",
    "wardrobeId": "6ae0551433480f1d0fb8d9e2",
    "name": "White Real Madrid Jersey",
    "category": "UPPER_WEAR",
    "subCategory": "JERSEY",
    "color": "White",
    "fabric": "Polyester Dri-FIT",
    "occasion": "SPORTS",
    "season": "ALL_SEASON",
    "processingStatus": "COMPLETED",
    "images": [
      {
        "url": "https://bg.arangtik.com/api/outputs/73ed_garment_001.png",
        "type": "CUTOUT",
        "isPrimary": true
      }
    ],
    "sourceType": "CAMERA_CAPTURE",
    "isFavorite": false,
    "isActive": true,
    "createdAt": "2026-11-23T11:00:00.000Z",
    "updatedAt": "2026-11-23T11:00:45.000Z"
  }
}
```

##### HTTP 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Wardrobe item not found",
  "errors": []
}
```

---

### 3.10. Update Clothing Item Attributes
*Modifies an existing clothing item's metadata such as title, category, subcategory, color, tags, occasion, season, or favorite status.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/wardrobe/edit-item/:id`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  Content-Type: application/json
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | The unique `_id` of the wardrobe item to update. |

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | New title for the clothing item. |
| `wardrobeId` | `string` (ObjectId) | No | Move item to a different wardrobe closet. |
| `category` | `string` | No | Updated category. |
| `subCategory` | `string` | No | Updated subcategory. |
| `color` | `string` | No | Primary color. |
| `fabric` | `string` | No | Fabric / material name. |
| `occasion` | `string` | No | Occasion classification. |
| `season` | `string` | No | Suitable season. |
| `isFavorite` | `boolean` | No | Toggle favorite status. |

##### Request Example
```json
{
  "name": "Real Madrid Home Kit 2026",
  "isFavorite": true,
  "occasion": "CASUAL"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item updated successfully",
  "data": {
    "_id": "6ae05a9033480f1d0fb8d9f5",
    "name": "Real Madrid Home Kit 2026",
    "isFavorite": true,
    "occasion": "CASUAL",
    "updatedAt": "2026-11-23T11:05:00.000Z"
  }
}
```

---

### 3.11. Delete / Archive Clothing Item
*Safely soft-deletes or permanently removes a clothing item from the wardrobe closet.*

- **Method**: `DELETE`
- **Full Endpoint**: `/api/wardrobe/delete-item/:id`
- **Access**: `Protected` (Requires Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | The unique `_id` of the wardrobe item to delete. |

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `permanent` | `boolean` | No | Pass `true` to delete permanently. Default is `false` (safe soft delete / archived). |

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wardrobe item deleted/archived successfully",
  "data": {
    "success": true,
    "message": "Wardrobe item deleted successfully"
  }
}
```

---

## 4. Wardrobe Quick Reference Table

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/wardrobe/create-wardrobe` | Protected | Create new closet container linked to storeTypeId |
| `GET` | `/api/wardrobe/get-wardrobes` | Protected | List all active closets with live items count |
| `GET` | `/api/wardrobe/get-wardrobe/:id` | Protected | Retrieve single closet container by ID |
| `PATCH` | `/api/wardrobe/update-wardrobe/:id` | Protected | Update closet attributes, storeType, or media |
| `DELETE` | `/api/wardrobe/delete-wardrobe/:id` | Protected | Soft-delete closet (or permanent via `?hard=true`) |
| `PATCH` | `/api/wardrobe/restore-wardrobe/:id` | Protected | Restore soft-deleted closet container back to active |
| `POST` | `/api/wardrobe/add-item` | Protected | Add clothing item(s) (1 to 50 photos, async BullMQ AI processing) |
| `GET` | `/api/wardrobe/get-items` | Protected | List clothes with filters (category, color, season, search) |
| `GET` | `/api/wardrobe/get-item/:id` | Protected | Retrieve detailed attributes and cutout images of single item |
| `PATCH` | `/api/wardrobe/edit-item/:id` | Protected | Edit clothing item attributes (name, category, colors, favorite) |
| `DELETE` | `/api/wardrobe/delete-item/:id` | Protected | Archive or permanently delete clothing item (`?permanent=true`) |



---

## 5. Vendor Management, Authentication & Profile Module (`/api/vendor`)

The Vendor Module manages passwordless OTP-based authentication, registration, onboarding with geographic location coordinates, profile management, direct Vendor CRUD operations, marketplace discovery, and assigned work orders for registered business partners.

**Base URL:**
- **Local:** `http://localhost:8083/api/vendor`
- **Production:** `https://api.arangtik.com/api/vendor`

**Authentication Header (for protected vendor endpoints):**
```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
```

**Test Account (Bypass OTP):**
- Phone: `918949056321` (or mobile numbers ending with `8949056321`)
- Test OTP: `1234`

---

### Vendor Document Schema Reference
Every vendor document in the `vendor` collection adheres to the following data model:

```json
{
  "_id": "6ae1daea122c8779111670bf",
  "vendorId": "VND-264302",
  "name": "Ramdhani Dhobi & Dry Cleaners",
  "phone": "919810112233",
  "businessName": "Shri Ramdhani Express Laundry",
  "address": {
    "street": "Shop 4, Main Market, Sector 14",
    "city": "Gurugram",
    "state": "Haryana",
    "pincode": "122001"
  },
  "location": {
    "type": "Point",
    "coordinates": [77.0423, 28.4732]
  },
  "status": "ACTIVE",
  "isVerified": true,
  "verifiedAt": "2026-10-25T11:00:00.000Z",
  "rating": 4.8,
  "totalOrdersHandled": 142,
  "createdAt": "2026-10-25T10:30:00.000Z",
  "updatedAt": "2026-10-29T12:00:00.000Z"
}
```

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | `ObjectId` | Auto-generated MongoDB primary key. |
| `vendorId` | `string` | Unique, immutable identifier code (e.g., `VND-264302`). Indexed uniquely. |
| `name` | `string` | Vendor contact / owner full name (1 to 100 characters). Required. |
| `phone` | `string` | Primary mobile number (10 to 15 digits). Indexed uniquely. Required. |
| `businessName` | `string` | Registered shop or trade brand name (maximum 150 characters). |
| `address` | `object` | Embedded address object containing `street`, `city`, `state`, and `pincode`. |
| `location` | `object` | GeoJSON Point `[longitude, latitude]` indexed with MongoDB `2dsphere`. |
| `status` | `string` | Lifecycle status enum: `'ACTIVE'`, `'INACTIVE'`, or `'SUSPENDED'`. Default: `'ACTIVE'`. |
| `isVerified` | `boolean` | Verification badge indicator. Default: `false`. |
| `verifiedAt` | `date` | Timestamp when the vendor was verified (or `null`). |
| `rating` | `number` | Aggregated customer review rating (between $0.0$ and $5.0$). Default: `0`. |
| `totalOrdersHandled` | `number` | Count of successfully processed service work orders. Default: `0`. |
| `createdAt` | `date` | ISO 8601 creation timestamp. |
| `updatedAt` | `date` | ISO 8601 last update timestamp. |

---

### 5.1. Send Vendor OTP
*Sends a 4-digit verification code to the vendor's mobile number via VoiceNSMS SMS to initiate registration or sign in.*

- **Method**: `POST`
- **Full Endpoint**: `/api/vendor/send-otp`
- **Access**: `Public` (No Authorization required)
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | 10-digit mobile number or standard international digits (e.g., `919810112233`). |

##### Request Example
```json
{
  "phone": "919810112233"
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "OTP sent successfully to vendor mobile number",
  "data": {
    "phone": "919810112233",
    "isExistingVendor": true,
    "expiresInMinutes": 5
  }
}
```

##### HTTP 400 Bad Request
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Please provide a valid 10-digit mobile number"
}
```

---

### 5.2. Verify Vendor OTP & Login / Register
*Validates the 4-digit OTP. Returns a vendor JWT token and vendor profile document. Automatically converts existing unregistered customer records and provisions a unique `vendorId` on first signup.*

- **Method**: `POST`
- **Full Endpoint**: `/api/vendor/verify-otp`
- **Access**: `Public` (No Authorization required)
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | Vendor mobile number. |
| `otp` | `string` | **Yes** | 4-digit verification code received. |
| `name` | `string` | No (Yes on signup) | Contact person / owner full name (max 100 characters). |
| `businessName` | `string` | No | Trade shop or business name (max 150 characters). |
| `address` | `object` | No | Object containing `street`, `city`, `state`, `pincode`. |
| `location` | `object` | No | GeoJSON Point or `{ latitude, longitude }` coordinates. |
| `services` | `array` | No | Optional initial list of services to configure during signup. |

##### Request Example
```json
{
  "phone": "919810112233",
  "otp": "1234",
  "name": "Ramdhani Dhobi & Dry Cleaners",
  "businessName": "Shri Ramdhani Express Laundry",
  "address": {
    "street": "Shop 4, Main Market, Sector 14",
    "city": "Gurugram",
    "state": "Haryana",
    "pincode": "122001"
  },
  "location": {
    "type": "Point",
    "coordinates": [77.0423, 28.4732]
  }
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewVendor": true,
    "vendor": {
      "_id": "6ae1daea122c8779111670bf",
      "vendorId": "VND-264302",
      "name": "Ramdhani Dhobi & Dry Cleaners",
      "phone": "919810112233",
      "businessName": "Shri Ramdhani Express Laundry",
      "address": {
        "street": "Shop 4, Main Market, Sector 14",
        "city": "Gurugram",
        "state": "Haryana",
        "pincode": "122001"
      },
      "location": {
        "type": "Point",
        "coordinates": [77.0423, 28.4732]
      },
      "status": "ACTIVE",
      "isVerified": false,
      "verifiedAt": null,
      "rating": 0,
      "totalOrdersHandled": 0,
      "createdAt": "2026-10-29T12:00:00.000Z",
      "updatedAt": "2026-10-29T12:00:00.000Z"
    }
  }
}
```

---

### 5.3. Get Authenticated Vendor Profile
*Retrieves the profile document and configured active services for the currently logged-in vendor.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/profile`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor profile fetched successfully",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "phone": "919810112233",
    "businessName": "Shri Ramdhani Express Laundry",
    "address": {
      "street": "Shop 4, Main Market, Sector 14",
      "city": "Gurugram",
      "state": "Haryana",
      "pincode": "122001"
    },
    "location": {
      "type": "Point",
      "coordinates": [77.0423, 28.4732]
    },
    "status": "ACTIVE",
    "isVerified": true,
    "verifiedAt": "2026-10-25T11:00:00.000Z",
    "rating": 4.8,
    "totalOrdersHandled": 142,
    "createdAt": "2026-10-25T10:30:00.000Z",
    "updatedAt": "2026-10-29T12:00:00.000Z",
    "services": [
      {
        "_id": "6ae1daeb122c8779111670c5",
        "vendorId": "6ae1daea122c8779111670bf",
        "serviceId": {
          "_id": "6ae1d67116f1760c3281ff84",
          "name": "Wash & Steam Iron",
          "basePrice": 60,
          "unit": "PIECE"
        },
        "price": 55,
        "durationMinutes": 60,
        "isAvailable": true,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 5.4. Update Authenticated Vendor Profile
*Allows an authenticated vendor to update their contact name, business trade name, address, and GPS coordinates.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/vendor/profile`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | Vendor contact name (1 to 100 characters). |
| `businessName` | `string` | No | Business trade name (maximum 150 characters). |
| `address` | `object` | No | Address object with `street`, `city`, `state`, `pincode`. |
| `location` | `object` | No | GeoJSON Point or `{ latitude, longitude }` coordinates. |

##### Request Example
```json
{
  "businessName": "Shri Ramdhani Express Laundry (Verified Partner)",
  "address": {
    "street": "Shop 4-A, Ground Floor, Sector 14",
    "city": "Gurugram",
    "state": "Haryana",
    "pincode": "122001"
  }
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor profile updated successfully",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "phone": "919810112233",
    "businessName": "Shri Ramdhani Express Laundry (Verified Partner)",
    "address": {
      "street": "Shop 4-A, Ground Floor, Sector 14",
      "city": "Gurugram",
      "state": "Haryana",
      "pincode": "122001"
    },
    "location": {
      "type": "Point",
      "coordinates": [77.0423, 28.4732]
    },
    "status": "ACTIVE",
    "isVerified": true,
    "verifiedAt": "2026-10-25T11:00:00.000Z",
    "rating": 4.8,
    "totalOrdersHandled": 142,
    "createdAt": "2026-10-25T10:30:00.000Z",
    "updatedAt": "2026-10-29T12:10:00.000Z"
  }
}
```

---

### 5.5. Get Vendor Services Summary
*Returns all custom services and selling prices configured by the authenticated vendor.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/services`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor services fetched successfully",
  "data": {
    "vendorId": "6ae1daea122c8779111670bf",
    "services": [
      {
        "_id": "6ae1daeb122c8779111670c5",
        "vendorId": "6ae1daea122c8779111670bf",
        "serviceId": {
          "_id": "6ae1d67116f1760c3281ff84",
          "name": "Wash & Steam Iron",
          "basePrice": 60,
          "unit": "PIECE"
        },
        "price": 55,
        "durationMinutes": 60,
        "isAvailable": true,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 5.6. Update Vendor Offered Services
*Replaces or updates the list of services offered by the authenticated vendor.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/vendor/services`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `services` | `array` | **Yes** | Array of service assignment objects with `serviceId`, `price`, `durationMinutes`. |

##### Request Example
```json
{
  "services": [
    {
      "serviceId": "6ae1d67116f1760c3281ff84",
      "price": 55,
      "durationMinutes": 60
    }
  ]
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor services updated successfully",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "businessName": "Shri Ramdhani Express Laundry",
    "status": "ACTIVE",
    "services": [
      {
        "_id": "6ae1daeb122c8779111670c5",
        "serviceId": "6ae1d67116f1760c3281ff84",
        "price": 55,
        "durationMinutes": 60,
        "isAvailable": true
      }
    ]
  }
}
```

---

### 5.7. Discover Nearby Vendors via 2dsphere Index
*Performs fast geospatial proximity queries to discover active vendors within a radial distance (in km) using the MongoDB `2dsphere` index on `location`.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/nearby`
- **Access**: `Public` (No Authorization required)

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `latitude` | `number` | **Yes** | Geographic latitude coordinate (between `-90` and `90`). Alias: `lat`. |
| `longitude` | `number` | **Yes** | Geographic longitude coordinate (between `-180` and `180`). Alias: `lng`. |
| `radius` | `number` | No | Search radius in kilometers (default: `20` km). Alias: `maxDistance`. |
| `status` | `string` | No | Filter by account status: `ACTIVE`, `INACTIVE`, `SUSPENDED`, or `ALL` (default: `ACTIVE`). |
| `isVerified` | `boolean` | No | Filter by verified partner badge status: `true`, `false`, or `ALL`. |
| `limit` | `number` | No | Maximum number of results to return (default: `50`, max: `100`). |

##### Request Example
```http
GET /api/vendor/nearby?latitude=28.4732&longitude=77.0423&radius=25&status=ACTIVE&limit=10
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Nearby vendors retrieved successfully",
  "data": [
    {
      "_id": "6ae1daea122c8779111670bf",
      "vendorId": "VND-264302",
      "name": "Ramdhani Dhobi & Dry Cleaners",
      "phone": "919810112233",
      "businessName": "Shri Ramdhani Express Laundry",
      "address": {
        "street": "Shop 4, Main Market, Sector 14",
        "city": "Gurugram",
        "state": "Haryana",
        "pincode": "122001"
      },
      "location": {
        "type": "Point",
        "coordinates": [77.0423, 28.4732]
      },
      "status": "ACTIVE",
      "isVerified": true,
      "verifiedAt": "2026-10-25T11:00:00.000Z",
      "rating": 4.8,
      "totalOrdersHandled": 142,
      "createdAt": "2026-10-25T10:30:00.000Z",
      "updatedAt": "2026-10-29T12:00:00.000Z"
    }
  ]
}
```

##### HTTP 400 Bad Request
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Both latitude and longitude are required for nearby vendor search"
}
```

---

### 5.8. Discover Eligible Vendors
*Finds active vendors by service category and required services, with optional geospatial proximity filtering.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/eligible`
- **Access**: `Public` (No Authorization required)

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category` | `string` | No | Category name (e.g., `Washerman`, `Tailor & Alterations`). |
| `services` | `string` | No | Comma-separated list or service IDs. |
| `latitude` | `number` | No | Latitude coordinate (e.g., `28.4732`). |
| `longitude` | `number` | No | Longitude coordinate (e.g., `77.0423`). |
| `radius` | `number` | No | Search radius in km (default: `20`). |

##### Request Example
```http
GET /api/vendor/eligible?category=Washerman&latitude=28.4732&longitude=77.0423&radius=30
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Eligible vendors retrieved successfully",
  "data": [
    {
      "_id": "6ae1daea122c8779111670bf",
      "vendorId": "VND-264302",
      "name": "Ramdhani Dhobi & Dry Cleaners",
      "businessName": "Shri Ramdhani Express Laundry",
      "phone": "919810112233",
      "rating": 4.8,
      "totalOrdersHandled": 142,
      "isVerified": true,
      "address": {
        "street": "Shop 4, Main Market, Sector 14",
        "city": "Gurugram",
        "state": "Haryana",
        "pincode": "122001"
      },
      "location": {
        "type": "Point",
        "coordinates": [77.0423, 28.4732]
      },
      "services": [
        {
          "_id": "6ae1daeb122c8779111670c5",
          "serviceId": {
            "_id": "6ae1d67116f1760c3281ff84",
            "name": "Wash & Steam Iron",
            "basePrice": 60,
            "unit": "PIECE"
          },
          "price": 55,
          "durationMinutes": 60,
          "isAvailable": true
        }
      ]
    }
  ]
}
```

---

### 5.9. Get Public Vendor Services Catalog
*Allows customers and frontend apps to inspect the public catalog and prices offered by a specific vendor.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/:id/services`
- **Access**: `Public` (No Authorization required)

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Vendor MongoDB `_id` or custom `vendorId` (e.g., `VND-264302`). |

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor offered services retrieved successfully",
  "data": {
    "vendorId": "6ae1daea122c8779111670bf",
    "vendorCode": "VND-264302",
    "vendorName": "Ramdhani Dhobi & Dry Cleaners",
    "businessName": "Shri Ramdhani Express Laundry",
    "rating": 4.8,
    "isVerified": true,
    "services": [
      {
        "_id": "6ae1daeb122c8779111670c5",
        "vendorId": "6ae1daea122c8779111670bf",
        "serviceId": {
          "_id": "6ae1d67116f1760c3281ff84",
          "name": "Wash & Steam Iron",
          "basePrice": 60,
          "unit": "PIECE"
        },
        "price": 55,
        "durationMinutes": 60,
        "isAvailable": true,
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 5.10. Get Active Service Categories
*Lists all active marketplace parent service categories.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/categories`
- **Access**: `Public` (No Authorization required)

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Categories fetched successfully",
  "data": [
    {
      "id": "6ae1d67116f1760c3281ff77",
      "name": "Washerman",
      "code": "WASHERMAN",
      "icon": "washerman.png",
      "imageUrl": "https://example.com/washerman.jpg",
      "description": "Professional wash, iron and dry clean"
    }
  ]
}
```

---

### 5.11. Get Category Services
*Lists all catalog services belonging to a specified category.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/categories/:category/services`
- **Access**: `Public` (No Authorization required)

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category` | `string` | **Yes** | Category name (e.g., `Washerman`) or Category MongoDB `_id`. |

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Category services fetched successfully",
  "data": [
    {
      "_id": "6ae1d67116f1760c3281ff84",
      "categoryId": "6ae1d67116f1760c3281ff77",
      "name": "Wash & Steam Iron",
      "code": "WASH_STEAM_IRON",
      "basePrice": 60,
      "unit": "PIECE",
      "isActive": true
    }
  ]
}
```

---

### 5.12. Get Paginated List of Vendors (CRUD Index)
*Retrieves a filtered, paginated catalog of vendor documents matching text search, status, verification flag, rating range, and address filters.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor`
- **Access**: `Public / Management`

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | No | Page number for pagination (default: `1`). |
| `limit` | `number` | No | Number of records per page (default: `10`, max: `100`). |
| `status` | `string` | No | Filter by account status: `ACTIVE`, `INACTIVE`, `SUSPENDED`, or `ALL`. |
| `isVerified` | `boolean` | No | Filter by verified partner status (`true`, `false`, or `ALL`). |
| `search` | `string` | No | Case-insensitive search matching `name`, `phone`, `businessName`, `vendorId`, or `city`. |
| `city` | `string` | No | Case-insensitive filter matching `address.city`. |
| `state` | `string` | No | Case-insensitive filter matching `address.state`. |
| `pincode` | `string` | No | Filter matching `address.pincode`. |
| `minRating` | `number` | No | Minimum rating filter ($0.0$ to $5.0$). |
| `maxRating` | `number` | No | Maximum rating filter ($0.0$ to $5.0$). |
| `sortBy` | `string` | No | Sort field: `createdAt`, `rating`, `totalOrdersHandled`, `name`, `status` (default: `createdAt`). |
| `sortOrder` | `string` | No | Sort direction: `desc` or `asc` (default: `desc`). |

##### Request Example
```http
GET /api/vendor?page=1&limit=10&status=ACTIVE&search=Ramdhani&sortBy=rating&sortOrder=desc
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendors retrieved successfully",
  "data": {
    "vendors": [
      {
        "_id": "6ae1daea122c8779111670bf",
        "vendorId": "VND-264302",
        "name": "Ramdhani Dhobi & Dry Cleaners",
        "phone": "919810112233",
        "businessName": "Shri Ramdhani Express Laundry",
        "address": {
          "street": "Shop 4, Main Market, Sector 14",
          "city": "Gurugram",
          "state": "Haryana",
          "pincode": "122001"
        },
        "location": {
          "type": "Point",
          "coordinates": [77.0423, 28.4732]
        },
        "status": "ACTIVE",
        "isVerified": true,
        "verifiedAt": "2026-10-25T11:00:00.000Z",
        "rating": 4.8,
        "totalOrdersHandled": 142,
        "createdAt": "2026-10-25T10:30:00.000Z",
        "updatedAt": "2026-10-29T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 5.13. Create New Vendor Directly
*Creates a new vendor partner record adhering to the Vendor schema, automatically generating a unique immutable `vendorId` and verifying phone uniqueness.*

- **Method**: `POST`
- **Full Endpoint**: `/api/vendor`
- **Access**: `Public / Management`
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Vendor contact name (1-100 characters). |
| `phone` | `string` | **Yes** | 10-digit mobile number or standard digits. Must be unique. |
| `businessName` | `string` | No | Registered trade / business name (max 150 characters). |
| `address` | `object` | No | Object containing `street`, `city`, `state`, and `pincode`. |
| `location` | `object` | No | GeoJSON `{ type: "Point", coordinates: [lng, lat] }` or `{ latitude, longitude }`. |
| `status` | `string` | No | Account status: `'ACTIVE'`, `'INACTIVE'`, or `'SUSPENDED'` (default: `'ACTIVE'`). |
| `isVerified` | `boolean` | No | Initial verification flag (default: `false`). Sets `verifiedAt` when `true`. |
| `rating` | `number` | No | Initial rating ($0.0$ to $5.0$, default: `0`). |
| `totalOrdersHandled` | `number` | No | Count of handled orders (default: `0`). |

##### Request Example
```json
{
  "name": "Ramdhani Dhobi & Dry Cleaners",
  "phone": "919810112233",
  "businessName": "Shri Ramdhani Express Laundry",
  "address": {
    "street": "Shop 4, Main Market, Sector 14",
    "city": "Gurugram",
    "state": "Haryana",
    "pincode": "122001"
  },
  "location": {
    "type": "Point",
    "coordinates": [77.0423, 28.4732]
  },
  "status": "ACTIVE",
  "isVerified": true,
  "rating": 4.8,
  "totalOrdersHandled": 0
}
```

#### Response Cycle

##### HTTP 201 Created
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Vendor created successfully",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "phone": "919810112233",
    "businessName": "Shri Ramdhani Express Laundry",
    "address": {
      "street": "Shop 4, Main Market, Sector 14",
      "city": "Gurugram",
      "state": "Haryana",
      "pincode": "122001"
    },
    "location": {
      "type": "Point",
      "coordinates": [77.0423, 28.4732]
    },
    "status": "ACTIVE",
    "isVerified": true,
    "verifiedAt": "2026-10-29T12:00:00.000Z",
    "rating": 4.8,
    "totalOrdersHandled": 0,
    "createdAt": "2026-10-29T12:00:00.000Z",
    "updatedAt": "2026-10-29T12:00:00.000Z"
  }
}
```

##### HTTP 409 Conflict
```json
{
  "statusCode": 409,
  "success": false,
  "message": "A vendor with phone number 919810112233 already exists"
}
```

---

### 5.14. Get Vendor Details by ID or Code
*Retrieves the complete vendor document and configured active services using either the vendor's MongoDB `_id` or unique business code (e.g., `VND-264302`).*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/:id`
- **Access**: `Public` (No Authorization required)

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Vendor MongoDB `_id` or custom `vendorId` code (e.g., `VND-264302`). |

##### Request Example
```http
GET /api/vendor/6ae1daea122c8779111670bf
GET /api/vendor/VND-264302
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor retrieved successfully",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "phone": "919810112233",
    "businessName": "Shri Ramdhani Express Laundry",
    "address": {
      "street": "Shop 4, Main Market, Sector 14",
      "city": "Gurugram",
      "state": "Haryana",
      "pincode": "122001"
    },
    "location": {
      "type": "Point",
      "coordinates": [77.0423, 28.4732]
    },
    "status": "ACTIVE",
    "isVerified": true,
    "verifiedAt": "2026-10-25T11:00:00.000Z",
    "rating": 4.8,
    "totalOrdersHandled": 142,
    "createdAt": "2026-10-25T10:30:00.000Z",
    "updatedAt": "2026-10-29T12:00:00.000Z",
    "services": [
      {
        "_id": "6ae1daeb122c8779111670c5",
        "vendorId": "6ae1daea122c8779111670bf",
        "serviceId": {
          "_id": "6ae1d67116f1760c3281ff84",
          "name": "Wash & Steam Iron",
          "basePrice": 60,
          "unit": "PIECE"
        },
        "price": 55,
        "durationMinutes": 60,
        "isAvailable": true,
        "status": "ACTIVE"
      }
    ]
  }
}
```

##### HTTP 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Vendor not found"
}
```

---

### 5.15. Update Vendor Details by ID
*Updates personal name, phone number, trade business name, contact address, GPS location coordinates, status, or business metrics for a specific vendor.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/vendor/:id`
- **Access**: `Public / Management`
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Vendor MongoDB `_id` or custom `vendorId` code. |

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | Vendor contact name (1-100 characters). |
| `phone` | `string` | No | Updated mobile number. Verified for uniqueness. |
| `businessName` | `string` | No | Updated business trade name (max 150 characters). |
| `address` | `object` | No | Updated address object (`street`, `city`, `state`, `pincode`). |
| `location` | `object` | No | Updated GeoJSON Point coordinates `[longitude, latitude]`. |
| `status` | `string` | No | Updated status (`ACTIVE`, `INACTIVE`, `SUSPENDED`). |
| `isVerified` | `boolean` | No | Toggle verification badge. Synchronizes `verifiedAt`. |
| `rating` | `number` | No | Rating score ($0.0$ to $5.0$). |
| `totalOrdersHandled` | `number` | No | Updated count of completed orders. |

##### Request Example
```json
{
  "businessName": "Shri Ramdhani Express Laundromat & Steam Press",
  "address": {
    "street": "Shop 4-B, Main Market, Sector 14",
    "city": "Gurugram",
    "state": "Haryana",
    "pincode": "122001"
  },
  "rating": 4.9
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor updated successfully",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "phone": "919810112233",
    "businessName": "Shri Ramdhani Express Laundromat & Steam Press",
    "address": {
      "street": "Shop 4-B, Main Market, Sector 14",
      "city": "Gurugram",
      "state": "Haryana",
      "pincode": "122001"
    },
    "location": {
      "type": "Point",
      "coordinates": [77.0423, 28.4732]
    },
    "status": "ACTIVE",
    "isVerified": true,
    "verifiedAt": "2026-10-25T11:00:00.000Z",
    "rating": 4.9,
    "totalOrdersHandled": 142,
    "createdAt": "2026-10-25T10:30:00.000Z",
    "updatedAt": "2026-10-29T12:15:00.000Z"
  }
}
```

---

### 5.16. Update Vendor Lifecycle Status
*Transitions the operational status of a vendor partner between `ACTIVE`, `INACTIVE`, and `SUSPENDED`.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/vendor/:id/status`
- **Access**: `Public / Management`
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Vendor MongoDB `_id` or custom `vendorId` code. |

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | Target lifecycle status: must be one of `ACTIVE`, `INACTIVE`, or `SUSPENDED`. |

##### Request Example
```json
{
  "status": "SUSPENDED"
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor status updated to SUSPENDED",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "phone": "919810112233",
    "status": "SUSPENDED",
    "isVerified": true,
    "updatedAt": "2026-10-29T12:20:00.000Z"
  }
}
```

---

### 5.17. Verify Vendor Partner
*Grants or revokes the verified partner badge for a vendor partner. Automatically sets `verifiedAt` timestamp on verification or clears it on revocation.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/vendor/:id/verify`
- **Access**: `Public / Management`
- **Headers**:
  ```http
  Content-Type: application/json
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Vendor MongoDB `_id` or custom `vendorId` code. |

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `isVerified` | `boolean` | No | `true` to approve verification badge; `false` to revoke (default: `true`). |

##### Request Example
```json
{
  "isVerified": true
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor verified successfully",
  "data": {
    "_id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "name": "Ramdhani Dhobi & Dry Cleaners",
    "phone": "919810112233",
    "isVerified": true,
    "verifiedAt": "2026-10-29T12:25:00.000Z",
    "updatedAt": "2026-10-29T12:25:00.000Z"
  }
}
```

---

### 5.18. Delete / Deactivate Vendor
*Performs a soft delete (marking status as `INACTIVE`) by default, or permanently deletes the vendor record and associated service pricing when `?hard=true` is passed.*

- **Method**: `DELETE`
- **Full Endpoint**: `/api/vendor/:id`
- **Access**: `Public / Management`

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Vendor MongoDB `_id` or custom `vendorId` code. |

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `hard` | `boolean` | No | Pass `true` for permanent document purging; omit for soft delete. |

##### Request Example
```http
DELETE /api/vendor/6ae1daea122c8779111670bf
DELETE /api/vendor/VND-264302?hard=true
```

#### Response Cycle

##### HTTP 200 OK (Soft Delete)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor marked as INACTIVE (soft deleted)",
  "data": {
    "id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "status": "INACTIVE",
    "message": "Vendor marked as INACTIVE (soft deleted)"
  }
}
```

##### HTTP 200 OK (Hard Delete)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor and associated services permanently deleted",
  "data": {
    "id": "6ae1daea122c8779111670bf",
    "vendorId": "VND-264302",
    "message": "Vendor and associated services permanently deleted"
  }
}
```

---

### 5.19. Lookup Vendor by Customer Phone
*Allows customer app to check if a phone contact is a registered vendor or saved as an unregistered offline vendor.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/lookup`
- **Access**: `Protected` (Requires Customer JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <CUSTOMER_JWT_TOKEN>
  ```

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `phone` | `string` | **Yes** | 10-digit mobile number to search. |

##### Request Example
```http
GET /api/vendor/lookup?phone=919810112233
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor lookup successful",
  "data": {
    "isRegistered": true,
    "vendor": {
      "_id": "6ae1daea122c8779111670bf",
      "vendorId": "VND-264302",
      "name": "Ramdhani Dhobi & Dry Cleaners",
      "phone": "919810112233",
      "businessName": "Shri Ramdhani Express Laundry",
      "rating": 4.8
    }
  }
}
```

---

### 5.20. List Unregistered Customer Vendors
*Retrieves offline/unregistered vendor contacts saved by users.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/unregistered`
- **Access**: `Protected` (Requires Customer or Admin Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <JWT_TOKEN>
  ```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Unregistered vendors retrieved successfully",
  "data": [
    {
      "_id": "6ae1daea122c8779111670a1",
      "name": "Kallu Dhobi",
      "phone": "919899001122",
      "totalOrders": 14,
      "isConvertedToRegistered": false
    }
  ]
}
```

---

### 5.21. Get Vendor Assigned Work Orders
*Retrieves work orders assigned to the authenticated vendor with status, pagination, and search filters.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/orders`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | No | Filter by order status: `PENDING_PICKUP`, `PICKED_UP`, `IN_PROCESS`, `DELIVERED`, `CANCELLED`, or `ALL`. |
| `page` | `number` | No | Page number (default: `1`). |
| `limit` | `number` | No | Orders per page (default: `20`). |
| `search` | `string` | No | Filter by order number, customer name, or phone. |
| `category` | `string` | No | Service category filter. |

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor work orders retrieved successfully",
  "data": {
    "orders": [
      {
        "_id": "6ae1db3fa3a311b358f5528a",
        "orderNumber": "ORD-20261029-001",
        "orderCategory": "Washerman",
        "status": "PENDING_PICKUP",
        "totalAmount": 175,
        "paymentStatus": "PENDING",
        "createdAt": "2026-10-29T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### 5.22. Get Vendor Work Order Details
*Retrieves full details of a specific assigned work order including wardrobe items, customer contact, and delivery timeline.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/orders/:id`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | Work order MongoDB `_id`. |

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor work order details retrieved",
  "data": {
    "_id": "6ae1db3fa3a311b358f5528a",
    "orderNumber": "ORD-20261029-001",
    "status": "PENDING_PICKUP",
    "totalAmount": 175,
    "paymentStatus": "PENDING",
    "items": [
      {
        "wardrobeItemId": "6ae1d89a22bb456011cce33a",
        "serviceName": "Wash & Steam Iron",
        "price": 55,
        "quantity": 1
      }
    ],
    "timeline": [
      {
        "status": "PENDING_PICKUP",
        "timestamp": "2026-10-29T12:00:00.000Z",
        "actor": "CUSTOMER"
      }
    ]
  }
}
```

---

### 5.23. Update Work Order Lifecycle Status
*Transitions the status of a work order through fulfillment phases.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/vendor/orders/:id/status`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | Work order MongoDB `_id`. |

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | **Yes** | One of: `PENDING_PICKUP`, `PICKED_UP`, `IN_PROCESS`, `READY_FOR_DELIVERY`, `DELIVERED`, `REJECTED`, `CANCELLED`. |
| `note` | `string` | No | Optional audit note recorded in timeline. |
| `cancelReason` | `string` | No | Reason required if status is `REJECTED` or `CANCELLED`. |

##### Request Example
```json
{
  "status": "PICKED_UP",
  "note": "Garments picked up from customer residence"
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Work order status updated successfully by vendor",
  "data": {
    "_id": "6ae1db3fa3a311b358f5528a",
    "status": "PICKED_UP",
    "timeline": [
      {
        "status": "PICKED_UP",
        "timestamp": "2026-10-29T12:15:00.000Z",
        "note": "Garments picked up from customer residence",
        "actor": "VENDOR"
      }
    ]
  }
}
```

---

### 5.24. Update Work Order Payment
*Marks a work order as `PAID` or `UNPAID` and automatically generates a financial transaction record.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/vendor/orders/:id/payment`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```

#### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` (ObjectId) | **Yes** | Work order MongoDB `_id`. |

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `paymentStatus` | `string` | **Yes** | `PAID` or `UNPAID`. |
| `paymentMethod` | `string` | No | Payment method (e.g. `CASH`, `UPI`, `CARD`). |

##### Request Example
```json
{
  "paymentStatus": "PAID",
  "paymentMethod": "CASH"
}
```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Order payment status updated successfully",
  "data": {
    "_id": "6ae1db3fa3a311b358f5528a",
    "paymentStatus": "PAID"
  }
}
```

---

### 5.25. Get Vendor Financial Transactions
*Retrieves settlement and transaction records associated with completed and paid work orders.*

- **Method**: `GET`
- **Full Endpoint**: `/api/vendor/transactions`
- **Access**: `Protected` (Requires Vendor JWT Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```

#### Response Cycle

##### HTTP 200 OK
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Vendor transactions retrieved successfully",
  "data": [
    {
      "_id": "6ae1dc8811b358f55291",
      "orderId": "6ae1db3fa3a311b358f5528a",
      "vendorId": "6ae1daea122c8779111670bf",
      "amount": 175,
      "status": "COMPLETED",
      "paymentMethod": "CASH",
      "createdAt": "2026-10-29T12:20:00.000Z"
    }
  ]
}
```

---

## 6. Comprehensive Vendor Quick Reference Table

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/vendor/send-otp` | Public | Send verification OTP to vendor via SMS (VoiceNSMS) |
| `POST` | `/api/vendor/verify-otp` | Public | Verify OTP, authenticate vendor, return JWT token and profile |
| `GET` | `/api/vendor/profile` | Protected (Vendor) | Retrieve authenticated vendor profile & business details |
| `PATCH` | `/api/vendor/profile` | Protected (Vendor) | Update trade business name, address, and GPS coordinates |
| `GET` | `/api/vendor/services` | Protected (Vendor) | Get custom services and prices configured by vendor |
| `PATCH` | `/api/vendor/services` | Protected (Vendor) | Replace or update full vendor services list |
| `GET` | `/api/vendor/nearby` | Public | Fast geospatial radius discovery via 2dsphere location index |
| `GET` | `/api/vendor/eligible` | Public | Geospatial discovery of nearby eligible vendors |
| `GET` | `/api/vendor/:id/services` | Public | Public catalog view of services offered by specific vendor |
| `GET` | `/api/vendor/categories` | Public | List all active marketplace service categories |
| `GET` | `/api/vendor/categories/:category/services` | Public | List catalog services belonging to a category |
| `GET` | `/api/vendor` | Public / Admin | Filter, search, and paginate through vendor database |
| `POST` | `/api/vendor` | Public / Admin | Create new vendor record based on Vendor model schema |
| `GET` | `/api/vendor/:id` | Public | Retrieve detailed vendor document by Mongo ObjectId or VND code |
| `PATCH` | `/api/vendor/:id` | Public / Admin | Update vendor profile, address, coordinates, and metrics |
| `PATCH` | `/api/vendor/:id/status` | Public / Admin | Transition vendor lifecycle status (`ACTIVE`, `INACTIVE`, `SUSPENDED`) |
| `PATCH` | `/api/vendor/:id/verify` | Public / Admin | Set or toggle vendor verified status and timestamp |
| `DELETE` | `/api/vendor/:id` | Public / Admin | Soft delete (`status: INACTIVE`) or hard delete (`?hard=true`) vendor |
| `GET` | `/api/vendor/lookup` | Protected (User) | Search customer phone contacts for registered or offline vendors |
| `GET` | `/api/vendor/unregistered` | Protected (User/Admin)| List offline/unregistered vendors receiving customer orders |
| `GET` | `/api/vendor/orders` | Protected (Vendor) | Get all work orders assigned to authenticated vendor |
| `GET` | `/api/vendor/orders/:id` | Protected (Vendor) | Get detailed work order information, garments, and timeline |
| `PATCH` | `/api/vendor/orders/:id/status` | Protected (Vendor) | Transition order status (`PICKED_UP`, `IN_PROCESS`, `DELIVERED`)|
| `PATCH` | `/api/vendor/orders/:id/payment` | Protected (Vendor) | Update payment status (`PAID`/`UNPAID`) and record transaction |
| `GET` | `/api/vendor/transactions` | Protected (Vendor) | Retrieve financial payment records and settlements |




---

## 7. Hardware Hub & IoT Module (`/api/hardware/hubs`)

The Hardware Hub module manages smart IoT hubs deployed in households. Users scan the hardware QR code to extract the device `mac_id`, configure hub Wi-Fi credentials, assign it to their account, and activate or deactivate the device.

---

### 7.1. Activate Hub
*Activates a pre-configured physical hub after scanning its QR code, assigns it to the authenticated user, and sets Wi-Fi credentials.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/hardware/hubs/activate`
- **Access**: `Protected (User)`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mac_id` | `string` | **Yes** | Device MAC address extracted from QR scan (e.g., `AA:BB:CC:11:22:33` or `AABBCC112233`). |
| `name` | `string` | No | Custom display name for the hub (e.g., `Smart Kitchen Hub`). |
| `wifi` | `object` | No | Wi-Fi network credentials for the hardware device. |
| `wifi.ssid` | `string` | No | SSID / Network name. |
| `wifi.password` | `string` | No | Wi-Fi password (stored securely, excluded from default queries). |
| `status` | `string` | No | Lifecycle status (defaults to `activated`). |

##### Request Example
```json
{
  "mac_id": "AA:BB:CC:11:22:33",
  "name": "Smart Kitchen Hub Alpha",
  "wifi": {
    "ssid": "Home_WiFi_5G",
    "password": "SecretWifiPassword99"
  },
  "status": "activated"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hub activated successfully",
  "data": {
    "_id": "6ae8612b3f5414cd07ea82d3",
    "name": "Smart Kitchen Hub Alpha",
    "mac_id": "AA:BB:CC:11:22:33",
    "userId": "6ae8612a3f5414cd07ea82b0",
    "wifi": {
      "ssid": "Home_WiFi_5G"
    },
    "status": "activated",
    "qr_code": null,
    "createdAt": "2026-11-02T10:08:43.580Z",
    "updatedAt": "2026-11-02T10:08:43.892Z",
    "__v": 0
  }
}
```

##### HTTP 404 Not Found (Non-existent Hub)
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Hub not found with this MAC ID",
  "errors": []
}
```

---

### 7.2. Get User Hubs
*Retrieves all active or registered hardware hubs belonging to the authenticated user.*

- **Method**: `GET`
- **Full Endpoint**: `/api/hardware/hubs/get-myhubs`
- **Access**: `Protected (User)`
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hubs retrieved successfully",
  "data": [
    {
      "_id": "6ae8612b3f5414cd07ea82d3",
      "name": "Smart Kitchen Hub Alpha",
      "mac_id": "AA:BB:CC:11:22:33",
      "userId": "6ae8612a3f5414cd07ea82b0",
      "wifi": {
        "ssid": "Home_WiFi_5G"
      },
      "status": "activated",
      "qr_code": null,
      "createdAt": "2026-11-02T10:08:43.580Z",
      "updatedAt": "2026-11-02T10:08:43.892Z",
      "__v": 0
    }
  ]
}
```

---

### 7.3. Deactivate Hub
*Deactivates a user's hub using its MAC ID.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/hardware/hubs/deactivate`
- **Access**: `Protected (User)`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mac_id` | `string` | **Yes** | Device MAC address to deactivate. |

##### Request Example
```json
{
  "mac_id": "AA:BB:CC:11:22:33"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hub deactivated successfully",
  "data": {
    "_id": "6ae8612b3f5414cd07ea82d3",
    "name": "Smart Kitchen Hub Alpha",
    "mac_id": "AA:BB:CC:11:22:33",
    "userId": "6ae8612a3f5414cd07ea82b0",
    "wifi": {
      "ssid": "Home_WiFi_5G"
    },
    "status": "deactivated",
    "qr_code": null,
    "createdAt": "2026-11-02T10:08:43.580Z",
    "updatedAt": "2026-11-02T10:08:44.100Z",
    "__v": 0
  }
}
```

##### HTTP 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Hub not found or not assigned to this user",
  "errors": []
}
```

---

### 7.4. Hardware Hub Quick Reference Table

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/api/hardware/hubs/activate` | Protected (User) | Find existing hub by `mac_id`, update details, assign user, and activate |
| `GET` | `/api/hardware/hubs/get-myhubs` | Protected (User) | List all hardware hubs assigned to authenticated user |
| `PATCH` | `/api/hardware/hubs/deactivate` | Protected (User) | Deactivate hub by `mac_id` |



---

## 8. Hardware KitchenBox Module (`/api/hardware/boxes`)

The KitchenBox module manages IoT smart kitchen storage containers. After scanning the box's QR code, the user activates the device, pairs it optionally to a local parent Gateway Hub, specifies stored item details and dimensions, and tracks/deactivates the container.

---

### 8.1. Activate KitchenBox
*Activates a physical KitchenBox after QR code scanning, associates it with the authenticated user, pairs it with an existing parent hub, and configures box details.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/hardware/boxes/activate`
- **Access**: `Protected (User)`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mac_id` | `string` | **Yes** | KitchenBox MAC address from QR scan (e.g., `24:0A:C4:AA:BB:CC` or `240AC4AABBCC`). |
| `name` | `string` | No | Custom friendly name for the box (e.g., `Spice Container Box 1`). |
| `hub_mac_id` | `string` | No | Parent Gateway Hub MAC address this box connects to. |
| `item_name` | `string` | No | Name of grocery/item stored inside (e.g., `Turmeric Powder`). |
| `dimensions` | `string` | No | Physical box dimensions e.g. `150x100x80` (in mm). |
| `status` | `string` | No | Lifecycle status (defaults to `activated`). |

##### Request Example
```json
{
  "mac_id": "24:0A:C4:AA:BB:CC",
  "name": "Spice Container Box 1",
  "hub_mac_id": "24:0A:C4:00:11:22",
  "item_name": "Turmeric Powder",
  "dimensions": "150x100x80",
  "status": "activated"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBox activated successfully",
  "data": {
    "_id": "6ae864ed702b8960a8725334",
    "name": "Spice Container Box 1",
    "mac_id": "24:0A:C4:AA:BB:CC",
    "hub_mac_id": "24:0A:C4:00:11:22",
    "userId": "6ae864ec702b8960a87252fd",
    "item_name": "Turmeric Powder",
    "dimensions": "150x100x80",
    "tof": null,
    "image": null,
    "qr_code": null,
    "status": "activated",
    "createdAt": "2026-11-02T10:24:45.716Z",
    "updatedAt": "2026-11-02T10:24:46.012Z",
    "__v": 0
  }
}
```

##### HTTP 404 Not Found (KitchenBox Not Found)
```json
{
  "statusCode": 404,
  "success": false,
  "message": "KitchenBox not found with this MAC ID",
  "errors": []
}
```

---

### 8.2. Get User KitchenBoxes
*Retrieves all kitchen storage boxes owned by or assigned to the authenticated user.*

- **Method**: `GET`
- **Full Endpoint**: `/api/hardware/boxes/get-myboxes`
- **Access**: `Protected (User)`
- **Headers**:
  ```http
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBoxes retrieved successfully",
  "data": [
    {
      "_id": "6ae864ed702b8960a8725334",
      "name": "Spice Container Box 1",
      "mac_id": "24:0A:C4:AA:BB:CC",
      "hub_mac_id": "24:0A:C4:00:11:22",
      "userId": "6ae864ec702b8960a87252fd",
      "item_name": "Turmeric Powder",
      "dimensions": "150x100x80",
      "tof": null,
      "image": null,
      "qr_code": null,
      "status": "activated",
      "createdAt": "2026-11-02T10:24:45.716Z",
      "updatedAt": "2026-11-02T10:24:46.012Z",
      "__v": 0
    }
  ]
}
```

---

### 8.3. Deactivate KitchenBox
*Deactivates a user's kitchen storage box using its MAC ID.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/hardware/boxes/deactivate`
- **Access**: `Protected (User)`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <JWT_ACCESS_TOKEN>
  ```

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `mac_id` | `string` | **Yes** | Device MAC address of the box to deactivate. |

##### Request Example
```json
{
  "mac_id": "24:0A:C4:AA:BB:CC"
}
```

#### Response Cycle

##### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBox deactivated successfully",
  "data": {
    "_id": "6ae864ed702b8960a8725334",
    "name": "Spice Container Box 1",
    "mac_id": "24:0A:C4:AA:BB:CC",
    "hub_mac_id": "24:0A:C4:00:11:22",
    "userId": "6ae864ec702b8960a87252fd",
    "item_name": "Turmeric Powder",
    "dimensions": "150x100x80",
    "tof": null,
    "image": null,
    "qr_code": null,
    "status": "deactivated",
    "createdAt": "2026-11-02T10:24:45.716Z",
    "updatedAt": "2026-11-02T10:24:46.129Z",
    "__v": 0
  }
}
```

##### HTTP 404 Not Found
```json
{
  "statusCode": 404,
  "success": false,
  "message": "KitchenBox not found or not assigned to this user",
  "errors": []
}
```

---

### 8.4. KitchenBox Quick Reference Table

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `PATCH` | `/api/hardware/boxes/activate` | Protected (User) | Find existing box by `mac_id`, update details, assign user & hub, and activate |
| `GET` | `/api/hardware/boxes/get-myboxes` | Protected (User) | List all kitchen boxes assigned to authenticated user |
| `PATCH` | `/api/hardware/boxes/deactivate` | Protected (User) | Deactivate kitchen box by `mac_id` |

---

## 9. Density Category & Product Admin Management APIs

### 9.1. Density Category Endpoints (`/api/admin/density-categories`)

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/density-categories` | Protected (Admin) | Create a new density category (e.g. Flour, Rice, Oil) |
| `GET` | `/api/admin/density-categories` | Public / Admin | List all density categories (supports `?page=1&limit=10&search=&includeDeleted=false`) |
| `GET` | `/api/admin/density-categories/:id` | Public / Admin | Get a single density category by ID |
| `PATCH` | `/api/admin/density-categories/:id` | Protected (Admin) | Update materialType, defaultDensity, or densityUnit |
| `DELETE` | `/api/admin/density-categories/:id` | Protected (Admin) | Delete a category (blocked if referenced by products) |

#### DensityCategory Schema
```json
{
  "_id": "6ae9852f...",
  "materialType": "Wheat Flour",
  "defaultDensity": 0.59,
  "densityUnit": "g/ml",
  "createdAt": "2026-11-03T06:50:00.000Z",
  "updatedAt": "2026-11-03T06:50:00.000Z"
}
```

---

### 9.2. Product Endpoints (`/api/admin/products`)

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/products` | Protected (Admin) | Create a new product (supports `name`, `aliases`, `densityCategoryId`, `densityOverride`) |
| `GET` | `/api/admin/products` | Public / Admin | List all products with populated category (`?search=` searches name and aliases) |
| `GET` | `/api/admin/products/:id` | Public / Admin | Get single product with populated category and effectiveDensity |
| `PATCH` | `/api/admin/products/:id` | Protected (Admin) | Update product name, aliases, category, or densityOverride |
| `DELETE` | `/api/admin/products/:id` | Protected (Admin) | Delete a product |

#### Product Schema & Virtuals
```json
{
  "_id": "6ae9853a...",
  "name": "Ashirvaad Shudh Chakki Atta",
  "aliases": ["Atta", "Chakki Atta", "Gehu Atta"],
  "densityCategoryId": {
    "_id": "6ae9852f...",
    "materialType": "Wheat Flour",
    "defaultDensity": 0.59,
    "densityUnit": "g/ml"
  },
  "densityOverride": null,
  "effectiveDensity": 0.59,
  "createdAt": "2026-11-03T06:51:00.000Z",
  "updatedAt": "2026-11-03T06:51:00.000Z"
}
```



---

## 14. Subscription & Razorpay Payment Module (`/api/subscription` & `/api/admin/subscription`)

The Subscription Module provides complete lifecycle support for plan discovery, Razorpay order generation, HMAC-SHA256 signature verification, quota snapshots, rolling monthly credit usage tracking, and administrative control over prices and feature limits.

### 14.1 User / Customer Endpoints (`/api/subscription`)

#### 14.1.1 Get Public Active Subscription Plans
- **Method / Endpoint:** `GET /api/subscription/plans`
- **Access:** Public
- **Description:** Returns all active subscription tiers (**Basic**, **Plus**, **Pro**) with their dynamic pricing tiers (1, 3, 6, 12 months with/without jewellery), feature limits, and capability flags.

##### Request
```http
GET /api/subscription/plans HTTP/1.1
Host: api.arangtik.com
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Active plans retrieved successfully",
  "data": [
    {
      "_id": "672b14649bb77b5a5ef01a11",
      "code": "basic",
      "name": "Basic",
      "description": "Essential personal wardrobe organization and styling basics",
      "displayOrder": 1,
      "isPopular": false,
      "pricing": [
        { "durationMonths": 1, "priceWithout": 99, "priceWith": 199 },
        { "durationMonths": 6, "priceWithout": 499, "priceWith": 999 },
        { "durationMonths": 12, "priceWithout": 399, "priceWith": 599 }
      ],
      "limits": {
        "wardrobes": 2,
        "clothingItems": 30,
        "aiOutfitSuggestions": 5,
        "virtualTryOn": 2,
        "laundryOrders": 2,
        "favouriteOutfits": 10,
        "jewelleryCollections": 1,
        "jewelleryItems": 10
      },
      "features": {
        "basicCategorization": true,
        "occasionSuggestions": false,
        "weatherSuggestions": false,
        "colourSuggestions": false,
        "jewelleryEnabled": false
      },
      "isActive": true
    },
    {
      "_id": "672b14649bb77b5a5ef01a12",
      "code": "plus",
      "name": "Plus",
      "description": "Smart styling with occasion, weather and color-coordinated insights",
      "displayOrder": 2,
      "isPopular": true,
      "pricing": [
        { "durationMonths": 1, "priceWithout": 199, "priceWith": 299 },
        { "durationMonths": 6, "priceWithout": 999, "priceWith": 1499 },
        { "durationMonths": 12, "priceWithout": 1999, "priceWith": 2999 }
      ],
      "limits": {
        "wardrobes": 5,
        "clothingItems": 70,
        "aiOutfitSuggestions": 15,
        "virtualTryOn": 5,
        "laundryOrders": 5,
        "favouriteOutfits": 30,
        "jewelleryCollections": 3,
        "jewelleryItems": 45
      },
      "features": {
        "basicCategorization": true,
        "occasionSuggestions": true,
        "weatherSuggestions": true,
        "colourSuggestions": true,
        "jewelleryEnabled": false
      },
      "isActive": true
    },
    {
      "_id": "672b14649bb77b5a5ef01a13",
      "code": "pro",
      "name": "Pro",
      "description": "Unlimited style mastery with maximum wardrobes, AI try-ons, and limits",
      "displayOrder": 3,
      "isPopular": false,
      "pricing": [
        { "durationMonths": 1, "priceWithout": 399, "priceWith": 599 },
        { "durationMonths": 6, "priceWithout": 1799, "priceWith": 2699 },
        { "durationMonths": 12, "priceWithout": 3599, "priceWith": 5399 }
      ],
      "limits": {
        "wardrobes": 10,
        "clothingItems": 150,
        "aiOutfitSuggestions": 30,
        "virtualTryOn": 10,
        "laundryOrders": 10,
        "favouriteOutfits": 80,
        "jewelleryCollections": 5,
        "jewelleryItems": 125
      },
      "features": {
        "basicCategorization": true,
        "occasionSuggestions": true,
        "weatherSuggestions": true,
        "colourSuggestions": true,
        "jewelleryEnabled": false
      },
      "isActive": true
    }
  ]
}
```

---

#### 14.1.2 Create Razorpay Subscription Order
- **Method / Endpoint:** `POST /api/subscription/create-order`
- **Access:** Private (`protect`)
- **Description:** Creates an official Razorpay order (converted to paise) and registers a `pending` subscription record in MongoDB.

##### Request
```http
POST /api/subscription/create-order HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json

{
  "planCode": "plus",
  "durationMonths": 1,
  "includesJewellery": false
}
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Razorpay order created successfully",
  "data": {
    "orderId": "order_Ox871Fas899AqL",
    "amount": 19900,
    "currency": "INR",
    "keyId": "rzp_live_xxxxxxxxxxxx",
    "plan": {
      "code": "plus",
      "name": "Plus",
      "durationMonths": 1,
      "includesJewellery": false,
      "priceInRupees": 199
    }
  }
}
```

---

#### 14.1.3 Verify Razorpay Payment & Activate Subscription
- **Method / Endpoint:** `POST /api/subscription/verify`
- **Access:** Private (`protect`)
- **Description:** Verifies the cryptographic HMAC-SHA256 signature generated by Razorpay Checkout. Activates the subscription, freezes the current plan limits & features into `limitsSnapshot` (protecting against future admin edits), computes the expiration timestamp, and initializes rolling 30-day monthly quotas.

##### Request
```http
POST /api/subscription/verify HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json

{
  "razorpayOrderId": "order_Ox871Fas899AqL",
  "razorpayPaymentId": "pay_Ox8923Nks091Ac",
  "razorpaySignature": "9b1d7cfbf88df253a652d8c3621768469d84635848bbdc0658403bc68112d8a4"
}
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Subscription activated successfully",
  "data": {
    "success": true,
    "subscription": {
      "_id": "672b19289bb77b5a5ef01a22",
      "userId": "670c53802e5a1b32d201a055",
      "planId": "672b14649bb77b5a5ef01a12",
      "planCode": "plus",
      "planName": "Plus",
      "durationMonths": 1,
      "includesJewellery": false,
      "status": "active",
      "razorpayOrderId": "order_Ox871Fas899AqL",
      "razorpayPaymentId": "pay_Ox8923Nks091Ac",
      "amountPaid": 199,
      "currency": "INR",
      "startedAt": "2026-11-06T06:15:00.000Z",
      "expiresAt": "2026-12-06T06:15:00.000Z",
      "monthlyUsage": {
        "aiOutfitSuggestions": 0,
        "virtualTryOn": 0,
        "laundryOrders": 0,
        "cycleStartAt": "2026-11-06T06:15:00.000Z",
        "cycleEndAt": "2026-12-06T06:15:00.000Z"
      },
      "limitsSnapshot": {
        "wardrobes": 5,
        "clothingItems": 70,
        "aiOutfitSuggestions": 15,
        "virtualTryOn": 5,
        "laundryOrders": 5,
        "favouriteOutfits": 30,
        "jewelleryCollections": 3,
        "jewelleryItems": 45
      },
      "featuresSnapshot": {
        "basicCategorization": true,
        "occasionSuggestions": true,
        "weatherSuggestions": true,
        "colourSuggestions": true,
        "jewelleryEnabled": false
      }
    }
  }
}
```

---

#### 14.1.4 Get Current Logged-in User Subscription Status
- **Method / Endpoint:** `GET /api/subscription/my`
- **Access:** Private (`protect`)
- **Description:** Returns the active subscription details, snapshot limits, and current monthly rolling usage. If the 30-day quota cycle has expired, automatically cycles the quota window and resets counters.

##### Request
```http
GET /api/subscription/my HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

##### Response (`200 OK` - Active Subscription)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Current subscription retrieved successfully",
  "data": {
    "hasActiveSubscription": true,
    "subscription": {
      "_id": "672b19289bb77b5a5ef01a22",
      "userId": "670c53802e5a1b32d201a055",
      "planCode": "plus",
      "planName": "Plus",
      "durationMonths": 1,
      "status": "active",
      "amountPaid": 199,
      "startedAt": "2026-11-06T06:15:00.000Z",
      "expiresAt": "2026-12-06T06:15:00.000Z",
      "monthlyUsage": {
        "aiOutfitSuggestions": 4,
        "virtualTryOn": 1,
        "laundryOrders": 2,
        "cycleStartAt": "2026-11-06T06:15:00.000Z",
        "cycleEndAt": "2026-12-06T06:15:00.000Z"
      },
      "limitsSnapshot": {
        "wardrobes": 5,
        "clothingItems": 70,
        "aiOutfitSuggestions": 15,
        "virtualTryOn": 5,
        "laundryOrders": 5,
        "favouriteOutfits": 30
      }
    }
  }
}
```

##### Response (`200 OK` - Free / Expired Tier)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Current subscription retrieved successfully",
  "data": {
    "hasActiveSubscription": false,
    "subscription": null
  }
}
```

---

#### 14.1.5 Razorpay Server Webhook Endpoint
- **Method / Endpoint:** `POST /api/subscription/webhook`
- **Access:** Public (Protected by `X-Razorpay-Signature` validation)
- **Description:** Idempotent server-to-server webhook handler for events like `payment.captured` or `order.paid` to guarantee subscription activation even if user closes the app prematurely.

##### Request
```http
POST /api/subscription/webhook HTTP/1.1
Host: api.arangtik.com
X-Razorpay-Signature: 6e9114ad044434ff1b4...
Content-Type: application/json

{
  "entity": "event",
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_Ox8923Nks091Ac",
        "order_id": "order_Ox871Fas899AqL",
        "amount": 19900,
        "status": "captured"
      }
    }
  }
}
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Webhook handled successfully",
  "data": {
    "status": "processed"
  }
}
```

---

### 14.2 Admin Management Endpoints (`/api/admin/subscription`)

All admin routes require Admin Bearer Authentication or Admin API Key (`x-api-key`).

#### 14.2.1 Get All Subscription Plans (Admin View)
- **Method / Endpoint:** `GET /api/admin/subscription/plans`
- **Access:** Admin (`protectAdmin`)
- **Query Parameters:**
  - `isActive` (optional boolean, e.g. `?isActive=true`)

##### Request
```http
GET /api/admin/subscription/plans HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Subscription plans retrieved successfully",
  "data": [
    {
      "_id": "672b14649bb77b5a5ef01a11",
      "code": "basic",
      "name": "Basic",
      "pricing": [
        { "durationMonths": 1, "priceWithout": 99, "priceWith": 199 },
        { "durationMonths": 6, "priceWithout": 499, "priceWith": 999 },
        { "durationMonths": 12, "priceWithout": 399, "priceWith": 599 }
      ],
      "limits": {
        "wardrobes": 2,
        "clothingItems": 30,
        "aiOutfitSuggestions": 5,
        "virtualTryOn": 2,
        "laundryOrders": 2,
        "favouriteOutfits": 10
      },
      "isActive": true
    }
  ]
}
```

---

#### 14.2.2 Update Plan Pricing & Limits Dynamically
- **Method / Endpoint:** `PUT /api/admin/subscription/plans/:id`
- **Access:** Admin (`protectAdmin`)
- **Description:** Allows the admin to change prices for any duration tier, edit quotas (wardrobes, clothing items, monthly AI try-ons), and toggle features (e.g. enabling the jewellery tier).

##### Request
```http
PUT /api/admin/subscription/plans/672b14649bb77b5a5ef01a11 HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json

{
  "name": "Basic",
  "description": "Essential personal wardrobe organization and styling basics",
  "isPopular": false,
  "pricing": [
    { "durationMonths": 1, "priceWithout": 99, "priceWith": 199 },
    { "durationMonths": 6, "priceWithout": 499, "priceWith": 999 },
    { "durationMonths": 12, "priceWithout": 399, "priceWith": 599 }
  ],
  "limits": {
    "wardrobes": 3,
    "clothingItems": 35,
    "aiOutfitSuggestions": 6,
    "virtualTryOn": 3,
    "laundryOrders": 2,
    "favouriteOutfits": 12
  },
  "features": {
    "basicCategorization": true,
    "occasionSuggestions": false,
    "weatherSuggestions": false,
    "colourSuggestions": false,
    "jewelleryEnabled": false
  }
}
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Subscription plan updated successfully",
  "data": {
    "_id": "672b14649bb77b5a5ef01a11",
    "code": "basic",
    "name": "Basic",
    "limits": {
      "wardrobes": 3,
      "clothingItems": 35,
      "aiOutfitSuggestions": 6,
      "virtualTryOn": 3,
      "laundryOrders": 2,
      "favouriteOutfits": 12
    },
    "updatedAt": "2026-11-06T06:18:00.000Z"
  }
}
```

---

#### 14.2.3 Toggle Plan Active / Disabled Status
- **Method / Endpoint:** `PATCH /api/admin/subscription/plans/:id/toggle`
- **Access:** Admin (`protectAdmin`)

##### Request
```http
PATCH /api/admin/subscription/plans/672b14649bb77b5a5ef01a11/toggle HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Subscription plan is now inactive",
  "data": {
    "_id": "672b14649bb77b5a5ef01a11",
    "code": "basic",
    "name": "Basic",
    "isActive": false
  }
}
```

---

#### 14.2.4 Subscription Analytics Dashboard Stats
- **Method / Endpoint:** `GET /api/admin/subscription/stats`
- **Access:** Admin (`protectAdmin`)
- **Description:** Returns aggregate subscription metrics for the admin dashboard.

##### Request
```http
GET /api/admin/subscription/stats HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Subscription stats retrieved successfully",
  "data": {
    "totalSubscribers": 142,
    "activeSubscriptions": 138,
    "totalRevenue": 48200,
    "distribution": [
      { "_id": "basic", "count": 48 },
      { "_id": "plus", "count": 67 },
      { "_id": "pro", "count": 23 }
    ]
  }
}
```

---

#### 14.2.5 Get User Subscriptions List
- **Method / Endpoint:** `GET /api/admin/subscription/users`
- **Access:** Admin (`protectAdmin`)
- **Query Parameters:**
  - `page` (number, default: `1`)
  - `limit` (number, default: `20`)
  - `status` (string, e.g. `active`, `pending`, `expired`)
  - `planCode` (string, e.g. `basic`, `plus`, `pro`)

##### Request
```http
GET /api/admin/subscription/users?status=active&page=1&limit=2 HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

##### Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User subscriptions retrieved successfully",
  "data": {
    "subscriptions": [
      {
        "_id": "672b19289bb77b5a5ef01a22",
        "userId": {
          "_id": "670c53802e5a1b32d201a055",
          "name": "Abhishek Sharma",
          "phone": "918949056321",
          "profileImage": "https://api.arangtik.com/uploads/user.png"
        },
        "planCode": "plus",
        "planName": "Plus",
        "durationMonths": 1,
        "status": "active",
        "amountPaid": 199,
        "startedAt": "2026-11-06T06:15:00.000Z",
        "expiresAt": "2026-12-06T06:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 2,
      "total": 138,
      "totalPages": 69
    }
  }
}
```


---

## 15. Coin Packages, Wallet & Virtual Currency Module (`/api/coins` & `/api/admin/coin-packages`)

The Coin Module manages dynamic virtual currency packages, Razorpay payment order generation, cryptographic signature verification, atomic wallet crediting with strict idempotency (preventing duplicate credits), atomic coin debits with overdraft prevention, a transaction ledger, and full administrative package management.

All coin endpoints are also accessible via the `/api/subscription/coins/*` sub-route alias for client compatibility.

---

### 15.1 User / Customer Coin Endpoints (`/api/coins`)

#### 15.1.1 Get Active Coin Packages
*Fetches all publicly available, active coin packages sorted by price.*

- **Method**: `GET`
- **Full Endpoint**: `/api/coins/packages`
- **Sub-Route Alias**: `/api/subscription/coins/packages`
- **Access**: `Public` (No Authorization required)
- **Headers**:
  ```http
  Content-Type: application/json
  ```

##### Request Example
```http
GET /api/coins/packages HTTP/1.1
Host: api.arangtik.com
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Active coin packages retrieved successfully",
  "data": [
    {
      "_id": "6af55d0ea41fe69ef52eae9e",
      "name": "Starter Pack",
      "coins": 5000,
      "bonusCoins": 0,
      "price": 10,
      "currency": "INR",
      "description": "Perfect for quick top-ups and trying out AI features",
      "isActive": true,
      "createdAt": "2026-11-12T06:30:38.500Z",
      "updatedAt": "2026-11-12T06:30:38.500Z"
    },
    {
      "_id": "6af55d0ea41fe69ef52eaea1",
      "name": "Value Pack",
      "coins": 10000,
      "bonusCoins": 500,
      "price": 20,
      "currency": "INR",
      "description": "Popular choice! 10,000 coins + 500 bonus coins (5% extra)",
      "isActive": true,
      "createdAt": "2026-11-12T06:30:38.584Z",
      "updatedAt": "2026-11-12T06:30:38.584Z"
    },
    {
      "_id": "6af55d0ea41fe69ef52eaea4",
      "name": "Style Pack",
      "coins": 15000,
      "bonusCoins": 1200,
      "price": 30,
      "currency": "INR",
      "description": "Great for weekly AI outfit suggestions and virtual try-ons (8% extra)",
      "isActive": true,
      "createdAt": "2026-11-12T06:30:38.649Z",
      "updatedAt": "2026-11-12T06:30:38.649Z"
    },
    {
      "_id": "6af55d0ea41fe69ef52eaea7",
      "name": "Pro Pack",
      "coins": 30000,
      "bonusCoins": 3000,
      "price": 50,
      "currency": "INR",
      "description": "Best seller! 30,000 coins + 3,000 bonus coins (10% extra)",
      "isActive": true,
      "createdAt": "2026-11-12T06:30:38.717Z",
      "updatedAt": "2026-11-12T06:30:38.717Z"
    },
    {
      "_id": "6af55d0ea41fe69ef52eaeaa",
      "name": "Super Saver Pack",
      "coins": 50000,
      "bonusCoins": 6000,
      "price": 80,
      "currency": "INR",
      "description": "Generous styling bundle! 50,000 coins + 6,000 bonus coins (12% extra)",
      "isActive": true,
      "createdAt": "2026-11-12T06:30:38.779Z",
      "updatedAt": "2026-11-12T06:30:38.779Z"
    },
    {
      "_id": "6af55d0ea41fe69ef52eaead",
      "name": "Mega Pack",
      "coins": 100000,
      "bonusCoins": 15000,
      "price": 150,
      "currency": "INR",
      "description": "Ultimate value! 100,000 coins + 15,000 bonus coins (15% extra)",
      "isActive": true,
      "createdAt": "2026-11-12T06:30:38.842Z",
      "updatedAt": "2026-11-12T06:30:38.842Z"
    },
    {
      "_id": "6af55d0ea41fe69ef52eaeb0",
      "name": "VIP Wardrobe Master",
      "coins": 250000,
      "bonusCoins": 50000,
      "price": 350,
      "currency": "INR",
      "description": "Maximum power bundle! 250,000 coins + 50,000 bonus coins (20% extra)",
      "isActive": true,
      "createdAt": "2026-11-12T06:30:38.911Z",
      "updatedAt": "2026-11-12T06:30:38.911Z"
    }
  ]
}
```

---

#### 15.1.2 Create Razorpay Order for Coin Package
*Creates an official Razorpay order in paise, generates a unique receipt under 40 characters, and registers a `pending` CoinPurchase document in MongoDB.*

- **Method**: `POST`
- **Full Endpoint**: `/api/coins/create-order`
- **Sub-Route Alias**: `/api/subscription/coins/create-order`
- **Access**: `Protected` (Requires User Bearer Token)
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <USER_JWT_TOKEN>
  ```

##### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `packageId` | `string` | **Yes** | MongoDB ObjectId of the active coin package to purchase. |

##### Request Example
```json
{
  "packageId": "6af55d0ea41fe69ef52eae9e"
}
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Razorpay order created successfully",
  "data": {
    "orderId": "order_TzExAvvZD9EChU",
    "amount": 1000,
    "currency": "INR",
    "keyId": "rzp_live_TwnLtrKVjnzbyb",
    "package": {
      "id": "6af55d0ea41fe69ef52eae9e",
      "name": "Starter Pack",
      "coins": 5000,
      "bonusCoins": 0,
      "totalCoins": 5000,
      "price": 10,
      "currency": "INR"
    },
    "purchaseId": "6af59ca8dce108d9e3733a52"
  }
}
```

###### HTTP 400 Bad Request (Missing Package ID)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Package ID is required",
  "errors": []
}
```

###### HTTP 401 Unauthorized (Missing / Expired Token)
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized access, token missing",
  "errors": []
}
```

###### HTTP 404 Not Found (Invalid Package)
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Active coin package not found",
  "errors": []
}
```

---

#### 15.1.3 Verify Razorpay Payment & Credit Coins
*Verifies the cryptographic HMAC-SHA256 signature returned by Razorpay Checkout. Upon verification, atomically transitions the purchase status to `completed`, credits `totalCoins` (`purchasedCoins + bonusCoins`) directly to `User.wallet`, and writes an immutable audit record in `CoinTransaction`. If called repeatedly or concurrently, returns `alreadyProcessed: true` and safely prevents duplicate crediting.*

- **Method**: `POST`
- **Full Endpoint**: `/api/coins/verify`
- **Sub-Route Alias**: `/api/subscription/coins/verify`
- **Access**: `Protected` (Requires User Bearer Token)
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <USER_JWT_TOKEN>
  ```

##### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `razorpayOrderId` | `string` | **Yes** | Order ID returned by `/create-order` (e.g., `"order_TzExAvvZD9EChU"`). |
| `razorpayPaymentId` | `string` | **Yes** | Payment ID returned by Razorpay Checkout (e.g., `"pay_live_1794481320734"`). |
| `razorpaySignature` | `string` | **Yes** | Cryptographic HMAC-SHA256 verification signature from Razorpay. |

##### Request Example
```json
{
  "razorpayOrderId": "order_TzExAvvZD9EChU",
  "razorpayPaymentId": "pay_live_1794481320734",
  "razorpaySignature": "34c38dc9c719e7fa69910d55e975a5e3e2b260d5bfaeb7a8684eb430d42129cb"
}
```

##### Response Cycle

###### HTTP 200 OK (First-Time Verification & Wallet Credit - Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payment verified and coins credited successfully",
  "data": {
    "success": true,
    "message": "Payment verified and coins credited successfully",
    "creditedCoins": 5000,
    "walletBalance": 5000,
    "purchase": {
      "_id": "6af59ca8dce108d9e3733a52",
      "userId": "6af59ca6dce108d9e37339df",
      "packageId": "6af55d0ea41fe69ef52eae9e",
      "amount": 10,
      "currency": "INR",
      "purchasedCoins": 5000,
      "bonusCoins": 0,
      "totalCoins": 5000,
      "paymentOrderId": "order_TzExAvvZD9EChU",
      "paymentId": "pay_live_1794481320734",
      "paymentStatus": "completed",
      "completedAt": "2026-11-12T11:02:00.810Z"
    },
    "transaction": {
      "_id": "6af59ca8dce108d9e3733a5e",
      "userId": "6af59ca6dce108d9e37339df",
      "type": "credit",
      "amount": 5000,
      "reason": "Purchased Starter Pack",
      "referenceId": "6af59ca8dce108d9e3733a52",
      "status": "success",
      "metadata": {
        "paymentOrderId": "order_TzExAvvZD9EChU",
        "paymentId": "pay_live_1794481320734",
        "purchasedCoins": 5000,
        "bonusCoins": 0,
        "amountPaid": 10,
        "balanceAfter": 5000
      },
      "createdAt": "2026-11-12T11:02:00.813Z"
    }
  }
}
```

###### HTTP 200 OK (Duplicate Call / Idempotency - Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Payment verified and coins credited successfully",
  "data": {
    "success": true,
    "alreadyProcessed": true,
    "message": "Payment was already processed and coins are in your wallet",
    "walletBalance": 5000,
    "purchase": {
      "_id": "6af59ca8dce108d9e3733a52",
      "paymentOrderId": "order_TzExAvvZD9EChU",
      "paymentStatus": "completed",
      "totalCoins": 5000
    }
  }
}
```

###### HTTP 400 Bad Request (Invalid Signature)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid payment signature. Verification failed",
  "errors": []
}
```

---

#### 15.1.4 Get User Coin Wallet Balance & Summary
*Returns the authenticated user's live wallet balance and latest 5 transactions.*

- **Method**: `GET`
- **Full Endpoint**: `/api/coins/wallet`
- **Sub-Route Alias**: `/api/subscription/coins/wallet`
- **Access**: `Protected` (Requires User Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <USER_JWT_TOKEN>
  ```

##### Request Example
```http
GET /api/coins/wallet HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <USER_JWT_TOKEN>
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wallet details retrieved successfully",
  "data": {
    "balance": 5000,
    "recentTransactions": [
      {
        "_id": "6af59ca8dce108d9e3733a5e",
        "userId": "6af59ca6dce108d9e37339df",
        "type": "credit",
        "amount": 5000,
        "reason": "Purchased Starter Pack",
        "referenceId": "6af59ca8dce108d9e3733a52",
        "status": "success",
        "metadata": {
          "paymentOrderId": "order_TzExAvvZD9EChU",
          "paymentId": "pay_live_1794481320734",
          "purchasedCoins": 5000,
          "bonusCoins": 0,
          "amountPaid": 10,
          "balanceAfter": 5000
        },
        "createdAt": "2026-11-12T11:02:00.813Z"
      }
    ]
  }
}
```

---

#### 15.1.5 Debit Coins for Feature Usage
*Atomically debits coins from the user's wallet with balance validation. Guarantees overdraft prevention using MongoDB's atomic `{ _id, wallet: { $gte: amount } }` check. Records a permanent `debit` transaction in `CoinTransaction`.*

- **Method**: `POST`
- **Full Endpoint**: `/api/coins/debit`
- **Sub-Route Alias**: `/api/subscription/coins/debit`
- **Access**: `Protected` (Requires User Bearer Token)
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <USER_JWT_TOKEN>
  ```

##### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `amount` | `number` | **Yes** | Number of coins to debit (positive integer $\ge 1$). |
| `reason` | `string` | **Yes** | Descriptive reason for the debit (e.g., `"AI Outfit Suggestion Feature Usage"`). |
| `referenceId` | `string` | No | Optional external reference ID (e.g., outfit ID, order ID, or session ID). |

##### Request Example
```json
{
  "amount": 450,
  "reason": "AI Outfit Suggestion Feature Usage",
  "referenceId": "ref_outfit_gen_99"
}
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coins debited successfully",
  "data": {
    "success": true,
    "debitedAmount": 450,
    "remainingBalance": 4550,
    "transaction": {
      "_id": "6af59ca9dce108d9e3733a88",
      "userId": "6af59ca6dce108d9e37339df",
      "type": "debit",
      "amount": 450,
      "reason": "AI Outfit Suggestion Feature Usage",
      "referenceId": "ref_outfit_gen_99",
      "status": "success",
      "metadata": {
        "balanceAfter": 4550
      },
      "createdAt": "2026-11-12T11:02:01.181Z"
    }
  }
}
```

###### HTTP 400 Bad Request (Insufficient Balance - Tested)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Insufficient coin balance. Required: 10000, Available: 5000",
  "errors": []
}
```

---

#### 15.1.6 Get Paginated Coin Transaction History
*Retrieves full historical audit ledger of all coin credits and debits for the authenticated user.*

- **Method**: `GET`
- **Full Endpoint**: `/api/coins/transactions`
- **Sub-Route Alias**: `/api/subscription/coins/transactions`
- **Access**: `Protected` (Requires User Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <USER_JWT_TOKEN>
  ```

##### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number for pagination. |
| `limit` | `number` | No | `20` | Items per page (max: 100). |
| `type` | `string` | No | — | Filter by type: `"credit"` or `"debit"`. |

##### Request Example
```http
GET /api/coins/transactions?page=1&limit=10 HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <USER_JWT_TOKEN>
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "_id": "6af59ca9dce108d9e3733a88",
        "userId": "6af59ca6dce108d9e37339df",
        "type": "debit",
        "amount": 450,
        "reason": "AI Outfit Suggestion Feature Usage",
        "referenceId": "ref_outfit_gen_99",
        "status": "success",
        "metadata": {
          "balanceAfter": 4550
        },
        "createdAt": "2026-11-12T11:02:01.181Z"
      },
      {
        "_id": "6af59ca8dce108d9e3733a5e",
        "userId": "6af59ca6dce108d9e37339df",
        "type": "credit",
        "amount": 5000,
        "reason": "Purchased Starter Pack",
        "referenceId": "6af59ca8dce108d9e3733a52",
        "status": "success",
        "metadata": {
          "paymentOrderId": "order_TzExAvvZD9EChU",
          "paymentId": "pay_live_1794481320734",
          "purchasedCoins": 5000,
          "bonusCoins": 0,
          "amountPaid": 10,
          "balanceAfter": 5000
        },
        "createdAt": "2026-11-12T11:02:00.813Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

---

#### 15.1.7 Razorpay Coin Payment Webhook
*Server-to-server webhook endpoint called directly by Razorpay servers upon payment events (`payment.captured` or `order.paid`). Prevents duplicate crediting if `/verify` was already completed by the mobile app or web client.*

- **Method**: `POST`
- **Full Endpoint**: `/api/coins/webhook`
- **Sub-Route Alias**: `/api/subscription/coins/webhook`
- **Access**: `Public / Razorpay Signed`
- **Headers**:
  ```http
  Content-Type: application/json
  x-razorpay-signature: <HMAC_SHA256_HEX_SIGNATURE>
  ```

##### Request Body
Razorpay standardized webhook payload containing `event: "payment.captured"` and `payload.payment.entity`.

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Webhook handled successfully",
  "data": {
    "processed": false,
    "reason": "Event not applicable or already processed"
  }
}
```

---

### 15.2 Admin Coin Package Management Endpoints (`/api/admin/coin-packages`)

#### 15.2.1 Get All Coin Packages (Admin View)
*Returns all coin packages (both active and inactive) with pagination, case-insensitive keyword search, and status filtering.*

- **Method**: `GET`
- **Full Endpoint**: `/api/admin/coin-packages`
- **Access**: `Protected Admin` (Requires Admin Bearer Token)
- **Headers**:
  ```http
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```

##### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | No | Page number (default: `1`). |
| `limit` | `number` | No | Items per page (default: `20`). |
| `search` | `string` | No | Search query matching package name or description. |
| `isActive` | `boolean` | No | Filter by active status (`true` / `false`). |

##### Request Example
```http
GET /api/admin/coin-packages?page=1&limit=10&isActive=true HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin packages retrieved successfully",
  "data": {
    "coinPackages": [
      {
        "_id": "6af55d0ea41fe69ef52eae9e",
        "name": "Starter Pack",
        "coins": 5000,
        "bonusCoins": 0,
        "price": 10,
        "currency": "INR",
        "description": "Perfect for quick top-ups and trying out AI features",
        "isActive": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalCount": 7,
      "totalPages": 1
    }
  }
}
```

---

#### 15.2.2 Create New Coin Package
*Creates a dynamic coin package bundle with optional bonus incentive coins.*

- **Method**: `POST`
- **Full Endpoint**: `/api/admin/coin-packages`
- **Access**: `Protected Admin` (Requires Admin Bearer Token)
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <ADMIN_JWT_TOKEN>
  ```

##### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Unique package title (e.g., `"Mega Gamer Chest"`). |
| `coins` | `number` | **Yes** | Base coin allocation (positive integer $\ge 1$). |
| `bonusCoins` | `number` | No | Extra incentive coins (default: `0`). |
| `price` | `number` | **Yes** | Selling price in currency (number $> 0$). |
| `currency` | `string` | No | Currency code (default: `"INR"`). |
| `description` | `string` | No | Marketing description. |
| `isActive` | `boolean` | No | Availability status (default: `true`). |

##### Request Example
```json
{
  "name": "Mega Gamer Chest",
  "coins": 20000,
  "bonusCoins": 2000,
  "price": 39,
  "currency": "INR",
  "description": "Special promotional bundle for AI styling & virtual try-ons"
}
```

##### Response Cycle

###### HTTP 201 Created (Tested)
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Coin package created successfully",
  "data": {
    "_id": "6af59b7f3f8833ba63d6fe18",
    "name": "Mega Gamer Chest",
    "coins": 20000,
    "bonusCoins": 2000,
    "price": 39,
    "currency": "INR",
    "description": "Special promotional bundle for AI styling & virtual try-ons",
    "isActive": true,
    "createdAt": "2026-11-12T10:57:03.186Z",
    "updatedAt": "2026-11-12T10:57:03.186Z"
  }
}
```

###### HTTP 400 Bad Request (Duplicate Name)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "A coin package with this name already exists",
  "errors": []
}
```

---

#### 15.2.3 Get Single Coin Package by ID
*Retrieves a coin package's configuration by its MongoDB ObjectId.*

- **Method**: `GET`
- **Full Endpoint**: `/api/admin/coin-packages/:id`
- **Access**: `Protected Admin` (Requires Admin Bearer Token)

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin package retrieved successfully",
  "data": {
    "_id": "6af59b7f3f8833ba63d6fe18",
    "name": "Mega Gamer Chest",
    "coins": 20000,
    "bonusCoins": 2000,
    "price": 39,
    "currency": "INR",
    "isActive": true
  }
}
```

---

#### 15.2.4 Update Coin Package
*Modifies an existing package's parameters (e.g. price, coin values, description).*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/admin/coin-packages/:id`
- **Access**: `Protected Admin` (Requires Admin Bearer Token)

##### Request Example
```json
{
  "price": 45,
  "description": "Updated price for holiday promotional bundle"
}
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin package updated successfully",
  "data": {
    "_id": "6af59b7f3f8833ba63d6fe18",
    "name": "Mega Gamer Chest",
    "price": 45,
    "description": "Updated price for holiday promotional bundle",
    "updatedAt": "2026-11-12T10:57:03.450Z"
  }
}
```

---

#### 15.2.5 Activate / Deactivate Coin Package
*Toggles a package's live visibility without deleting its purchase records.*

- **Method**: `PATCH`
- **Full Endpoint**: `/api/admin/coin-packages/:id/status`
- **Access**: `Protected Admin` (Requires Admin Bearer Token)

##### Request Example
```json
{
  "isActive": false
}
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin package deactivated successfully",
  "data": {
    "_id": "6af59b7f3f8833ba63d6fe18",
    "name": "Mega Gamer Chest",
    "isActive": false
  }
}
```

---

### 15.3 Admin Coin Logs & Purchases (`/api/admin/subscription/coins`)
*Administrative endpoints powered by MongoDB aggregation pipelines to monitor coin transactions and purchases. Features lightweight table listings (3-4 essential fields) and complete detailed inspection by ID when clicking "Show More".*

---

#### 15.3.1 Get All Coin Transactions (Light Listing)
*Returns a lightweight paginated ledger of coin transactions containing only the essential table fields: User Name & Phone, Transaction Type, Amount, Reason, Status, and Date.*

- **Method**: `GET`
- **Full Endpoint**: `/api/admin/subscription/coins/transactions`
- **Access**: `Protected Admin` (Requires Admin Bearer Token or `x-api-key`)

##### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | No | Page number (default: `1`). |
| `limit` | `number` | No | Items per page (default: `20`, max: `100`). |
| `type` | `string` | No | `"credit"` or `"debit"`. |
| `status` | `string` | No | `"success"`, `"pending"`, or `"failed"`. |
| `userId` | `string` | No | Filter by user ObjectId. |
| `search` | `string` | No | Case-insensitive search on user name, phone, reason, or reference ID. |
| `startDate` | `string` | No | Filter by creation start date (ISO string). |
| `endDate` | `string` | No | Filter by creation end date (ISO string). |

##### Request Example
```http
GET /api/admin/subscription/coins/transactions?page=1&limit=10&type=credit HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin transactions retrieved successfully",
  "data": {
    "transactions": [
      {
        "_id": "6af6bbe4d7731f37ce36cc4d",
        "user": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Monika",
          "phone": "918949056321"
        },
        "type": "credit",
        "amount": 5000,
        "reason": "Coin package purchase (Starter 100)",
        "status": "success",
        "createdAt": "2026-11-13T07:27:32.178Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

#### 15.3.2 Get Coin Transaction Details by ID (Show More)
*Retrieves complete, un-truncated transaction audit details when an admin clicks "Show More" on a transaction row.*

- **Method**: `GET`
- **Full Endpoint**: `/api/admin/subscription/coins/transactions/:id`
- **Access**: `Protected Admin` (Requires Admin Bearer Token or `x-api-key`)

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin transaction details retrieved successfully",
  "data": {
    "_id": "6af6bbe4d7731f37ce36cc4d",
    "userId": "6ae31cca0c00fa1dfe7e3c99",
    "type": "credit",
    "amount": 5000,
    "reason": "Coin package purchase (Starter 100)",
    "referenceId": "6af6bbe3d7731f37ce36cc3b",
    "status": "success",
    "metadata": {},
    "createdAt": "2026-11-13T07:27:32.178Z",
    "updatedAt": "2026-11-13T07:27:32.178Z",
    "user": {
      "_id": "6ae31cca0c00fa1dfe7e3c99",
      "name": "Monika",
      "phone": "918949056321",
      "wallet": 250,
      "profileImage": "https://api.arangtik.com/uploads/img_mv6gxfw5_31f57b.jpg",
      "status": "active",
      "accountType": "INDIVIDUAL"
    },
    "userPlans": [
      {
        "_id": "6ac0952c80239788e764c0aa",
        "planCode": "plus",
        "planName": "Plus Plan",
        "durationMonths": 1,
        "status": "active",
        "expiresAt": "2026-12-13T07:14:00.000Z",
        "amountPaid": 199
      }
    ]
  }
}
```

---

#### 15.3.3 Get All Coin Purchases (Light Listing)
*Returns a lightweight paginated list of coin purchases containing only the essential table fields: User Name & Phone, Package Name, Purchase Amount, Coins Received, Payment Status, and Date.*

- **Method**: `GET`
- **Full Endpoint**: `/api/admin/subscription/coins/purchases`
- **Access**: `Protected Admin` (Requires Admin Bearer Token or `x-api-key`)

##### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | No | Page number (default: `1`). |
| `limit` | `number` | No | Items per page (default: `20`, max: `100`). |
| `status` / `paymentStatus` | `string` | No | `"completed"`, `"pending"`, or `"failed"`. |
| `userId` | `string` | No | Filter by user ObjectId. |
| `search` | `string` | No | Case-insensitive search on user name, phone, order ID, or package name. |
| `startDate` | `string` | No | Filter by creation start date (ISO string). |
| `endDate` | `string` | No | Filter by creation end date (ISO string). |

##### Request Example
```http
GET /api/admin/subscription/coins/purchases?page=1&limit=10&status=completed HTTP/1.1
Host: api.arangtik.com
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin purchases retrieved successfully",
  "data": {
    "purchases": [
      {
        "_id": "6af6bbe3d7731f37ce36cc3b",
        "user": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Monika",
          "phone": "918949056321"
        },
        "packageName": "Starter Pack",
        "amount": 10,
        "totalCoins": 5000,
        "paymentStatus": "completed",
        "createdAt": "2026-11-13T07:27:31.997Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

#### 15.3.4 Get Coin Purchase Details by ID (Show More)
*Retrieves complete package breakdown, payment identifiers, gateway verification tokens, and user subscription history when clicking "Show More" on a purchase row.*

- **Method**: `GET`
- **Full Endpoint**: `/api/admin/subscription/coins/purchases/:id`
- **Access**: `Protected Admin` (Requires Admin Bearer Token or `x-api-key`)

##### Response Cycle

###### HTTP 200 OK (Tested)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Coin purchase details retrieved successfully",
  "data": {
    "_id": "6af6bbe3d7731f37ce36cc3b",
    "userId": "6ae31cca0c00fa1dfe7e3c99",
    "packageId": "6af59b7f3f8833ba63d6fe18",
    "packageSnapshot": {
      "name": "Starter Pack",
      "coins": 5000,
      "bonusCoins": 0,
      "price": 10,
      "currency": "INR",
      "description": ""
    },
    "amount": 10,
    "currency": "INR",
    "purchasedCoins": 5000,
    "bonusCoins": 0,
    "totalCoins": 5000,
    "paymentOrderId": "order_coin_comp_1794554851",
    "paymentId": "pay_coin_comp_1794554851",
    "paymentSignature": "sample_signature_hmac_hex",
    "paymentStatus": "completed",
    "completedAt": "2026-11-13T07:27:32.000Z",
    "createdAt": "2026-11-13T07:27:31.997Z",
    "updatedAt": "2026-11-13T07:27:32.000Z",
    "user": {
      "_id": "6ae31cca0c00fa1dfe7e3c99",
      "name": "Monika",
      "phone": "918949056321",
      "wallet": 250,
      "profileImage": "https://api.arangtik.com/uploads/img_mv6gxfw5_31f57b.jpg",
      "status": "active",
      "accountType": "INDIVIDUAL"
    },
    "userPlans": [
      {
        "_id": "6ac0952c80239788e764c0aa",
        "planCode": "plus",
        "planName": "Plus Plan",
        "durationMonths": 1,
        "status": "active",
        "expiresAt": "2026-12-13T07:14:00.000Z",
        "amountPaid": 199
      }
    ]
  }
}
```



---

## 16. Frequent Connect Module (`/api/fc`)

Frequent Connect is an instant communication and priority grouping platform that allows Arangtik users to stay connected with frequently contacted people through custom, priority-ordered **Clusters** (e.g., Family, Friends, Office, Custom). It offers one-tap access, real-time text chat, voice messaging, live push-to-talk (walkie-talkie) half-duplex audio streaming, automated 15-minute message self-destruction, in-document bookmarking, home-screen widget synchronization, and an administrative telemetry portal.

---

### 16.1 Architecture & Flow Design

#### High-Level System Architecture (Consolidated 3-Collection Model)

```
                       ┌────────────────────────────────────────┐
                       │          Client (Mobile / Web)         │
                       └──────────┬──────────────────┬──────────┘
                                  │                  │
                         REST API │ (HTTP / JSON)    │ WebSockets (Socket.IO)
                         Auth: Bearer JWT            │ Auth: Handshake JWT
                                  ▼                  ▼
                       ┌────────────────────────────────────────┐
                       │        Express.js & Socket.IO          │
                       │     (Namespace: /fc on Port 8083)      │
                       └──────────┬──────────────────┬──────────┘
                                  │                  │
        ┌─────────────────────────┼──────────────────┼────────────────────────┐
        ▼                         ▼                  ▼                        ▼
 ┌──────────────┐          ┌──────────────┐   ┌──────────────┐         ┌──────────────┐
 │   Clusters   │          │ Conversations│   │ WalkieTalkie │         │ Push Notifs  │
 │  & Members   │          │  & Messages  │   │ Floor Control│         │  (Firebase)  │
 └──────┬───────┘          └──────┬───────┘   └──────┬───────┘         └──────┬───────┘
        │                         │                  │                        │
        │ MongoDB Atlas           │ 15-min Auto-Del  │ Half-Duplex Binary     │ FCM v1 Multicast
        ▼                         ▼                  ▼                        ▼
 ┌──────────────┐          ┌──────────────┐   ┌──────────────┐         ┌──────────────┐
 │ fc_clusters  │          │ fc_messages  │   │ Audio Buffer │         │ Mobile Device│
 │ (Embeds      │          │ (Embeds      │   │ (Relayed, not│         │ Notifications│
 │  members[])  │          │  savedBy[])  │   │  persisted)  │         │              │
 └──────────────┘          └──────────────┘   └──────────────┘         └──────────────┘
                                  │
                                  ▼
                           ┌──────────────┐
                           │fc_conversat's│
                           │(1:1 & Group) │
                           └──────────────┘
```

#### Request-Response & Lifecycle Flows

##### 1. One-Tap Communication & Cluster Priority Flow
```
User Reorders/Views Clusters ────► [GET/PUT /api/fc/clusters] ────► Single Atomic Read on fc_clusters
                                                                           │
                                                                           ▼
User Taps Cluster or Contact ────► [POST /api/fc/conversations/direct] ──► Loads Room & Active Participants
```

##### 2. 15-Minute Auto-Delete & Bookmarking Lifecycle
```
Sender Posts Message ──► Recipient Views (Status: SEEN) ──► Sets seenAt Timestamp & autoDeleteAt = seenAt + 15m
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       User Saves Message?             User Does NOT Save?
               │                               │
       [POST /messages/:id/bookmark]           ▼
               │                       Background Cron (every 60s)
               ▼                               │
     savedBy.push({userId, note})      autoDeleteAt <= Now?
     Exempt from deletion                      │
                                               ▼
                                      isAutoDeleted = true;
                                      Text scrubbed & audio file unlinked from disk
```

##### 3. Walkie-Talkie Push-to-Talk (PTT) Half-Duplex Flow
```
Client A (Presses PTT) ─────────► [Socket: walkie-request-floor] ──► Floor Available?
                                                                           │
                            ┌──────────────────────────────────────────────┴──────────────────────────┐
                            ▼ YES                                                                     ▼ NO (Occupied)
                     Grants Floor                                                             Emits 'walkie-floor-denied'
             Broadcasts 'walkie-incoming'                                                     (Reason: FLOOR_BUSY)
                            │
Client A (Streams Audio) ───┼───► [Socket: walkie-audio-stream (Binary)] ───► Relays Audio Chunks to Room Participants
                            │
Client A (Releases PTT) ────┴───► [Socket: walkie-release-floor] ──────────► Broadcasts 'walkie-ended'
```

---

### 16.2 Endpoints Summary Table

#### Core Client Endpoints (`/api/fc`)

| Method | Endpoint | Description | Protected |
|---|---|---|:---:|
| `GET` | `/api/fc/health` | Frequent Connect subsystem health probe | No |
| `POST` | `/api/fc/clusters` | Create a new priority cluster with enabled features | Yes |
| `GET` | `/api/fc/clusters` | List all clusters for user with populated features | Yes |
| `GET` | `/api/fc/clusters/:id` | Get single cluster details with embedded members & features | Yes |
| `PUT` | `/api/fc/clusters/:id` | Update cluster name, icon, color, type, or features | Yes |
| `PATCH` | `/api/fc/clusters/:id/features` | Toggle or update enabled features for a cluster | Yes |
| `GET` | `/api/fc/features` *(or `/clusters/features`)* | List active cluster features for group creation UI | Yes |
| `DELETE` | `/api/fc/clusters/:id` | Delete cluster and its embedded members (creator only) | Yes |
| `PUT` | `/api/fc/clusters/order` | Reorder cluster priorities | Yes |
| `POST` | `/api/fc/clusters/:id/members` | Add registered users or invite non-registered contacts | Yes |
| `GET` | `/api/fc/clusters/:id/members` | List members of a cluster with roles and status | Yes |
| `DELETE` | `/api/fc/clusters/:id/members/:memberId` | Remove a member from cluster (admin only) | Yes |
| `POST` | `/api/fc/clusters/:id/members/leave` | Leave a cluster (self-removal for normal members) | Yes |
| `POST` | `/api/fc/invites` | Create and dispatch an invitation link/SMS | Yes |
| `GET` | `/api/fc/invites` | List pending outgoing invites sent by user | Yes |
| `POST` | `/api/fc/invites/respond` *(or `/:code/accept`)* | Accept invite by code | Yes |
| `POST` | `/api/fc/conversations/direct` *(or `POST /`)* | Create or fetch a 1:1 direct conversation | Yes |
| `GET` | `/api/fc/conversations` | List user conversations (direct & cluster rooms) | Yes |
| `GET` | `/api/fc/conversations/:id` | Get details of a single conversation | Yes |
| `GET` | `/api/fc/conversations/:id/history` | Retrieve full paginated chat history | Yes |
| `POST` | `/api/fc/conversations/:id/messages` | Send a text message | Yes |
| `GET` | `/api/fc/conversations/:id/messages` | Retrieve conversation message stream | Yes |
| `POST` | `/api/fc/conversations/:id/voice` | Upload and send an instant voice audio recording | Yes |
| `PATCH` | `/api/fc/messages/:id/status` | Update message status (`DELIVERED`, `SEEN`, `PLAYED`) | Yes |
| `POST` | `/api/fc/messages/:id/bookmark` *(or `/save`)* | Bookmark message to exempt from 15-min auto-delete | Yes |
| `DELETE` | `/api/fc/messages/:id/bookmark` *(or `/save`)* | Remove bookmark | Yes |
| `GET` | `/api/fc/messages/saved` *(or `/saved-messages`)* | List user's saved/bookmarked messages | Yes |
| `GET` | `/api/fc/widget/clusters` | Lightweight cluster list with unread badges for mobile widget | Yes |
| `GET` | `/api/fc/widget/recent` | Recent conversation tiles for home screen widget | Yes |
| `GET` | `/api/fc/search/messages` | Full-text search across authorized messages | Yes |
| `GET` | `/api/fc/search/conversations` | Contact and cluster discovery search | Yes |

#### Admin Telemetry & Monitoring Endpoints (`/api/admin/fc`)

| Method | Endpoint | Description | Protected |
|---|---|---|:---:|
| `GET` | `/api/admin/fc/overview` | Platform-wide aggregate metrics, online sockets, active floors | Admin |
| `GET` | `/api/admin/fc/clusters` | Paginated cluster registry with type and search filters | Admin |
| `GET` | `/api/admin/fc/clusters/:id` | Cluster details with full embedded membership roster | Admin |
| `GET` | `/api/admin/fc/members` | Cross-cluster member lookup with status & role filtering | Admin |
| `GET` | `/api/admin/fc/conversations` | Channel and chat room surveillance feed | Admin |
| `GET` | `/api/admin/fc/messages` | Message & voice audit logs with audio playback & scrub states | Admin |
| `GET` | `/api/admin/fc/saved-messages` | Surveillance of messages exempted via bookmarks | Admin |
| `GET` | `/api/admin/fc/auto-delete/logs` | 15-minute auto-deletion audit logs and pending countdowns | Admin |
| `GET` | `/api/admin/fc/invitations` | Outgoing circle invitations and acceptance tracking | Admin |
| `GET` | `/api/admin/fc/walkie/active` | Live Push-to-Talk active floor holders and sessions | Admin |
| `GET` | `/api/admin/fc/walkie/history` | Historical log of finished walkie-talkie sessions | Admin |
| `GET` | `/api/admin/fc/audit-logs` | Query historical `FCAuditLog` event records | Admin |

---

### 16.3 Endpoint Specifications & Request-Response Cycles

#### 16.3.1 Subsystem Health Check
Checks operational status of the Frequent Connect routing module.

- **Method / Path:** `GET /api/fc/health`
- **Authentication:** Public
- **Success Response (200 OK):**
```json
{
  "status": "ok",
  "feature": "Frequent Connect",
  "timestamp": "2026-11-14T10:15:00.000Z"
}
```

---

#### 16.3.2 Create Cluster
Creates a new priority grouping (e.g. Family, Office, Close Friends). The creator is automatically added as an active `ADMIN` member inside the embedded `members` array.

- **Method / Path:** `POST /api/fc/clusters`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <TOKEN>`
- **Request Body:**
```json
{
  "name": "Family Circle",
  "icon": "👨‍👩‍👧",
  "color": "#FF5733",
  "type": "FAMILY",
  "features": ["6739f4a123...", "6739f4b456..."]
}
```
*Constraints: `name` is required (max 50 chars). `type` must be one of `FAMILY`, `FRIENDS`, `OFFICE`, or `CUSTOM`. `color` must be a valid hex code. `features` is optional array of feature ObjectIds or codes (e.g. `["WARDROBE", "LAUNDRY"]`).*

- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Cluster created successfully",
  "data": {
    "_id": "6735fa016ba477c7d42cfb80",
    "name": "Family Circle",
    "icon": "👨‍👩‍👧",
    "color": "#FF5733",
    "type": "FAMILY",
    "creatorId": "6ae31cca0c00fa1dfe7e3c99",
    "priority": 0,
    "memberCount": 1,
    "conversationId": "6735fa026ba477c7d42cfb82",
    "features": [
      {
        "_id": "6739f4a123...",
        "name": "Wardrobe",
        "code": "WARDROBE",
        "icon": "👗",
        "description": "Wardrobe and clothes sharing",
        "isActive": true
      },
      {
        "_id": "6739f4b456...",
        "name": "Laundry",
        "code": "LAUNDRY",
        "icon": "🧺",
        "description": "Laundry work orders",
        "isActive": true
      }
    ],
    "members": [
      {
        "_id": "6735fa016ba477c7d42cfb81",
        "userId": "6ae31cca0c00fa1dfe7e3c99",
        "phone": "+919876543210",
        "displayName": "John Doe",
        "role": "ADMIN",
        "status": "ACTIVE",
        "joinedAt": "2026-11-14T10:15:00.000Z"
      }
    ],
    "createdAt": "2026-11-14T10:15:00.000Z",
    "updatedAt": "2026-11-14T10:15:00.000Z"
  }
}
```

- **Error Responses:**
  - `400 Bad Request`: `{ "success": false, "message": "Cluster name is required" }`
  - `400 Bad Request`: `{ "success": false, "message": "Invalid hex color" }`

---

#### 16.3.3 List Clusters (Sorted by Priority)
Retrieves all clusters created by or joined by the user in a single atomic database query on `fc_clusters`, ordered by priority (`priority: 0` is highest), with populated `features`.

- **Method / Path:** `GET /api/fc/clusters`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Clusters retrieved successfully",
  "data": [
    {
      "_id": "6735fa016ba477c7d42cfb80",
      "name": "Family Circle",
      "icon": "👨‍👩‍👧",
      "color": "#FF5733",
      "type": "FAMILY",
      "priority": 0,
      "memberCount": 4,
      "conversationId": "6735fa026ba477c7d42cfb82",
      "features": [
        {
          "_id": "6739f4a123...",
          "name": "Wardrobe",
          "code": "WARDROBE",
          "icon": "👗",
          "isActive": true
        },
        {
          "_id": "6739f4b456...",
          "name": "Laundry",
          "code": "LAUNDRY",
          "icon": "🧺",
          "isActive": true
        }
      ]
    }
  ]
}
```

---

#### 16.3.3A Update / Toggle Cluster Features
Updates the enabled features for a cluster. Supports clicking a single feature to toggle it on/off, or replacing the full array of feature IDs.

- **Method / Path:** `PATCH /api/fc/clusters/:id/features`
- **Authentication:** Protected (`Bearer <JWT>`, Cluster Admin only)
- **Request Body (Option 1: Single Feature Click-to-Toggle):**
```json
{
  "featureId": "6739f4a123...",
  "action": "toggle"
}
```
*Parameters: `featureId` can be ObjectId or Code (e.g. `"WARDROBE"`). `action` can be `"toggle"` (default), `"add"`, or `"remove"`.*

- **Request Body (Option 2: Batch Array Replace):**
```json
{
  "features": ["6739f4a123...", "6739f4b456..."]
}
```

- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Cluster features updated successfully",
  "data": {
    "_id": "6735fa016ba477c7d42cfb80",
    "name": "Family Circle",
    "features": [
      {
        "_id": "6739f4a123...",
        "name": "Wardrobe",
        "code": "WARDROBE",
        "icon": "👗",
        "isActive": true
      }
    ]
  }
}
```

---

#### 16.3.3B Get Available Cluster Features Catalog
Retrieves the list of active, non-deleted cluster features so the mobile app or web client can render checkboxes/toggles when creating a group.

- **Method / Path:** `GET /api/fc/features` *(or `/api/fc/clusters/features`)*
- **Authentication:** Protected (`Bearer <JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Available cluster features retrieved successfully",
  "data": [
    {
      "_id": "6739f4a123...",
      "name": "Wardrobe",
      "code": "WARDROBE",
      "icon": "👗",
      "description": "Wardrobe and clothes sharing",
      "isActive": true
    },
    {
      "_id": "6739f4b456...",
      "name": "Laundry",
      "code": "LAUNDRY",
      "icon": "🧺",
      "description": "Laundry work orders",
      "isActive": true
    },
    {
      "_id": "6739f4c789...",
      "name": "Walkie-Talkie",
      "code": "WALKIE_TALKIE",
      "icon": "📻",
      "description": "Voice walkie-talkie communication",
      "isActive": true
    }
  ]
}
```

---

#### 16.3.3C Get Cluster Member Wardrobes Overview
Retrieves all wardrobes across every active member of the cluster if the `WARDROBE` feature is enabled. Grouped by member with member profile, wardrobe containers, and live item counts.

- **Method / Path:** `GET /api/fc/clusters/:id/wardrobes`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Cluster wardrobes retrieved successfully",
  "data": {
    "cluster": {
      "id": "6735fa016ba477c7d42cfb80",
      "name": "Family Circle",
      "color": "#6366F1",
      "features": ["WARDROBE", "LAUNDRY"]
    },
    "featureEnabled": true,
    "members": [
      {
        "userId": "6735fa016ba477c7d42cfb81",
        "name": "Priya Sharma",
        "phone": "+919876543210",
        "profileImage": "https://api.arangtik.com/uploads/priya.jpg",
        "isCreator": true,
        "isSelf": true,
        "wardrobes": [
          {
            "id": "6736ab0123...",
            "name": "Ethnic & Festive",
            "type": "PERSONAL",
            "isDefault": true,
            "itemCount": 24,
            "coverImage": "https://api.arangtik.com/uploads/cover1.jpg"
          }
        ]
      },
      {
        "userId": "6735fa016ba477c7d42cfb82",
        "name": "Rahul Sharma",
        "phone": "+919876543211",
        "profileImage": "",
        "isCreator": false,
        "isSelf": false,
        "wardrobes": [
          {
            "id": "6736ab0456...",
            "name": "Casual & Gym",
            "type": "PERSONAL",
            "isDefault": true,
            "itemCount": 18,
            "coverImage": ""
          }
        ]
      }
    ]
  }
}
```

---

#### 16.3.4 Reorder Cluster Priorities
Reorders user clusters by updating the `priority` values in bulk.

- **Method / Path:** `PUT /api/fc/clusters/order`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Request Body:**
```json
{
  "order": [
    { "clusterId": "6735fa506ba477c7d42cfb85", "priority": 0 },
    { "clusterId": "6735fa016ba477c7d42cfb80", "priority": 1 }
  ]
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Clusters reordered successfully",
  "data": {
    "modifiedCount": 2,
    "order": [
      { "clusterId": "6735fa506ba477c7d42cfb85", "priority": 0 },
      { "clusterId": "6735fa016ba477c7d42cfb80", "priority": 1 }
    ]
  }
}
```

---

#### 16.3.5 Add Members to Cluster
Adds members directly into the cluster's embedded `members` array.
- If the phone belongs to an existing Arangtik user, they are added as `ACTIVE`.
- If the phone is unregistered, they are marked as `INVITED` with an auto-generated 7-day `inviteCode`.

- **Method / Path:** `POST /api/fc/clusters/:id/members`
- **Authentication:** Protected (`Bearer <JWT>`, Creator or Admin only)
- **Request Body:**
```json
{
  "members": [
    { "phone": "+919876543211", "displayName": "Mom" },
    { "phone": "+919876543299", "displayName": "Uncle Bob" }
  ]
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Members processed successfully",
  "data": {
    "added": [
      {
        "memberId": "6735fb016ba477c7d42cfb90",
        "userId": "6ae31cca0c00fa1dfe7e3c92",
        "phone": "+919876543211",
        "displayName": "Mom",
        "status": "ACTIVE"
      }
    ],
    "invited": [
      {
        "memberId": "6735fb026ba477c7d42cfb91",
        "phone": "+919876543299",
        "displayName": "Uncle Bob",
        "status": "INVITED",
        "inviteCode": "b7e28f19da3c"
      }
    ],
    "alreadyExists": [],
    "errors": []
  }
}
```

- **Error Responses:**
  - `400 Bad Request`: `{ "success": false, "message": "Cannot exceed 50 members per cluster" }`
  - `403 Forbidden`: `{ "success": false, "message": "Admin access required for this action" }`

---

#### 16.3.6 Accept Invitation Code
Accepts an invite by code. Validates that the logged-in user's phone matches the invited phone and updates the embedded member status to `ACTIVE`.

- **Method / Path:** `POST /api/fc/invites/respond` *(or `POST /api/fc/invites/:code/accept`)*
- **Authentication:** Protected (`Bearer <JWT>`)
- **Request Body (for `/respond`):**
```json
{
  "inviteCode": "b7e28f19da3c"
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Invite accepted successfully",
  "data": {
    "accepted": true,
    "clusterId": "6735fa016ba477c7d42cfb80",
    "inviteCode": "b7e28f19da3c"
  }
}
```

- **Error Responses:**
  - `400 Bad Request`: `{ "success": false, "message": "This invite has expired" }`
  - `403 Forbidden`: `{ "success": false, "message": "This invite is not for your phone number" }`
  - `404 Not Found`: `{ "success": false, "message": "Invite not found or already used" }`

---

#### 16.3.7 Create or Get 1:1 Direct Conversation
Fetches an existing 1:1 direct chat channel between the authenticated user and another contact, or creates one if it does not yet exist.

- **Method / Path:** `POST /api/fc/conversations/direct` *(or `POST /api/fc/conversations`)*
- **Authentication:** Protected (`Bearer <JWT>`)
- **Request Body:**
```json
{
  "participantId": "6ae31cca0c00fa1dfe7e3c92"
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Conversation retrieved successfully",
  "data": {
    "_id": "6735fa026ba477c7d42cfb82",
    "type": "DIRECT",
    "participants": [
      {
        "_id": "6ae31cca0c00fa1dfe7e3c99",
        "name": "John Doe",
        "phone": "+919876543210",
        "profileImage": ""
      },
      {
        "_id": "6ae31cca0c00fa1dfe7e3c92",
        "name": "Jane Smith",
        "phone": "+919876543211",
        "profileImage": ""
      }
    ],
    "createdAt": "2026-11-14T10:15:00.000Z",
    "updatedAt": "2026-11-14T10:15:00.000Z"
  }
}
```
- **Error Responses:**
  - `400 Bad Request`: `{ "success": false, "message": "Cannot create a direct conversation with yourself" }`

---

#### 16.3.8 Send Text Message
Sends an instant text message to a conversation. Broadcasts `new-message` to the room via Socket.IO.

- **Method / Path:** `POST /api/fc/conversations/:id/messages`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Request Body:**
```json
{
  "content": "Hey! Are you free for a quick call?",
  "type": "TEXT"
}
```
- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "_id": "6735fc016ba477c7d42cfba0",
    "conversationId": "6735fa026ba477c7d42cfb82",
    "senderId": {
      "_id": "6ae31cca0c00fa1dfe7e3c99",
      "name": "John Doe",
      "phone": "+919876543210"
    },
    "type": "TEXT",
    "content": "Hey! Are you free for a quick call?",
    "status": "SENT",
    "isAutoDeleted": false,
    "recipientStatuses": [
      {
        "userId": "6ae31cca0c00fa1dfe7e3c92",
        "status": "SENT",
        "statusAt": "2026-11-14T10:18:00.000Z",
        "isAutoDeleted": false,
        "isSaved": false
      }
    ],
    "savedBy": [],
    "createdAt": "2026-11-14T10:18:00.000Z"
  }
}
```

---

#### 16.3.9 Upload & Send Voice Recording
Uploads an audio file (`.m4a`, `.aac`, `.mp3`), saves to `uploads/voice/`, and dispatches a voice message with duration and optional text caption.

- **Method / Path:** `POST /api/fc/conversations/:id/voice`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data Fields:**
  - `audio`: Binary audio file (Max 10MB)
  - `duration`: Duration in seconds (e.g. `14.5`)
  - `caption`: Optional text string
- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Voice message sent successfully",
  "data": {
    "_id": "6735fc206ba477c7d42cfba5",
    "conversationId": "6735fa026ba477c7d42cfb82",
    "type": "VOICE",
    "content": "Listen to this update",
    "voiceUrl": "/uploads/voice/voice-1794651146803.m4a",
    "voiceDuration": 14.5,
    "status": "SENT",
    "isAutoDeleted": false,
    "savedBy": [],
    "createdAt": "2026-11-14T10:20:00.000Z"
  }
}
```

---

#### 16.3.10 Update Message Status (`DELIVERED`, `SEEN`, `PLAYED`)
Updates read receipts. Marking `SEEN` activates the **15-minute auto-deletion timer** (`autoDeleteAt = Now + 15 min`).

- **Method / Path:** `PATCH /api/fc/messages/:id/status`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Request Body:**
```json
{
  "status": "SEEN"
}
```
*Note: Allowed values are `DELIVERED`, `SEEN`, and `PLAYED` (for voice messages).*

- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Message status updated successfully",
  "data": {
    "messageId": "6735fc016ba477c7d42cfba0",
    "status": "SEEN",
    "recipientStatuses": [
      {
        "userId": "6ae31cca0c00fa1dfe7e3c92",
        "status": "SEEN",
        "seenAt": "2026-11-14T10:22:00.000Z",
        "statusAt": "2026-11-14T10:22:00.000Z",
        "isAutoDeleted": false,
        "isSaved": false
      }
    ]
  }
}
```

---

#### 16.3.11 Bookmark / Save Message
Embeds a bookmark record directly into `FCMessage.savedBy`. This exempts the message from being scrubbed by the 15-minute auto-deletion cron.

- **Method / Path:** `POST /api/fc/messages/:id/bookmark` *(or `POST /api/fc/messages/:id/save`)*
- **Authentication:** Protected (`Bearer <JWT>`)
- **Request Body:**
```json
{
  "note": "Important home gate access code"
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Message saved successfully",
  "data": {
    "userId": "6ae31cca0c00fa1dfe7e3c92",
    "messageId": "6735fc016ba477c7d42cfba0",
    "conversationId": "6735fa026ba477c7d42cfb82",
    "savedAt": "2026-11-14T10:25:00.000Z",
    "note": "Important home gate access code"
  }
}
```

---

#### 16.3.12 Remove Bookmark / Unsave
Removes the bookmark from `savedBy`, restoring standard auto-deletion eligibility.

- **Method / Path:** `DELETE /api/fc/messages/:id/bookmark` *(or `DELETE /api/fc/messages/:id/save`)*
- **Authentication:** Protected (`Bearer <JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Message unsaved successfully",
  "data": {
    "unsaved": true,
    "messageId": "6735fc016ba477c7d42cfba0"
  }
}
```

---

#### 16.3.13 List Saved Messages
Returns all bookmarked messages for the authenticated user directly from `fc_messages` using index `{ 'savedBy.userId': 1 }`.

- **Method / Path:** `GET /api/fc/messages/saved` *(or `GET /api/fc/saved-messages`)*
- **Authentication:** Protected (`Bearer <JWT>`)
- **Query Parameters:** `page` (default: 1), `limit` (default: 20)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Saved messages retrieved successfully",
  "data": {
    "savedMessages": [
      {
        "_id": "6735fc016ba477c7d42cfba0",
        "messageId": {
          "_id": "6735fc016ba477c7d42cfba0",
          "content": "Hey! Gate code is 4920",
          "type": "TEXT",
          "senderId": {
            "name": "John Doe",
            "phone": "+919876543210"
          }
        },
        "note": "Important home gate access code",
        "savedAt": "2026-11-14T10:25:00.000Z"
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

---

#### 16.3.14 Home Screen Widget: Clusters
Single-query endpoint returning top-priority cluster cards with unread message counts for mobile home-screen widgets.

- **Method / Path:** `GET /api/fc/widget/clusters`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Widget clusters retrieved successfully",
  "data": {
    "clusters": [
      {
        "id": "6735fa016ba477c7d42cfb80",
        "name": "Family Circle",
        "icon": "👨‍👩‍👧",
        "color": "#FF5733",
        "type": "FAMILY",
        "priority": 0,
        "memberCount": 4,
        "unreadCount": 2,
        "conversationId": "6735fa026ba477c7d42cfb82"
      }
    ],
    "totalClusters": 1,
    "timestamp": "2026-11-14T10:30:00.000Z"
  }
}
```

---

### 16.4 Admin Telemetry & Monitoring APIs (`/api/admin/fc`)

#### 16.4.1 Admin Overview Metrics
Returns aggregate database telemetry and live Socket.IO gateway connection statistics.

- **Method / Path:** `GET /api/admin/fc/overview`
- **Authentication:** Protected (`Bearer <JWT>`, role: `admin`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Frequent Connect overview metrics retrieved successfully",
  "data": {
    "clusters": {
      "total": 12,
      "byType": {
        "FAMILY": 5,
        "FRIENDS": 4,
        "OFFICE": 2,
        "CUSTOM": 1
      }
    },
    "members": {
      "total": 48,
      "active": 42,
      "invited": 6,
      "left": 0,
      "removed": 0
    },
    "messages": {
      "total": 3120,
      "text": 2680,
      "voice": 390,
      "walkieTalkie": 50,
      "saved": 142,
      "autoDeleted": 820
    },
    "conversations": {
      "total": 24,
      "active24h": 16
    },
    "walkieTalkie": {
      "totalSessions": 50,
      "byStatus": { "ACTIVE": 1, "COMPLETED": 49, "EXPIRED": 0 }
    },
    "invitations": {
      "total": 6,
      "pending": 6,
      "accepted": 42
    },
    "runtime": {
      "onlineSockets": 8,
      "activeFloors": 1,
      "timestamp": "2026-11-14T10:35:00.000Z"
    }
  }
}
```

---

#### 16.4.2 Admin Message & Voice Logs
Paginated surveillance log of text and voice communications, audio file streaming URLs, duration, and 15-minute auto-deletion statuses.

- **Method / Path:** `GET /api/admin/fc/messages`
- **Authentication:** Protected (`Bearer <JWT>`, role: `admin`)
- **Query Parameters:** `page`, `limit`, `type` (`TEXT` or `VOICE`), `status` (`SENT`, `DELIVERED`, `SEEN`, `PLAYED`), `isAutoDeleted` (`true`/`false`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Message logs retrieved successfully",
  "data": {
    "messages": [
      {
        "_id": "6735fc206ba477c7d42cfba5",
        "conversationId": "6735fa026ba477c7d42cfb82",
        "senderId": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "John Doe",
          "phone": "+919876543210"
        },
        "type": "VOICE",
        "content": "Listen to this update",
        "voiceUrl": "/uploads/voice/voice-1794651146803.m4a",
        "voiceDuration": 14.5,
        "status": "PLAYED",
        "isAutoDeleted": false,
        "autoDeleteAt": "2026-11-14T10:35:00.000Z",
        "createdAt": "2026-11-14T10:20:00.000Z"
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

---

### 16.5 Real-Time WebSockets & Walkie-Talkie Protocol (`/fc` namespace)

Frequent Connect maintains a low-latency gateway on namespace `/fc`.

#### Connection & Handshake
```javascript
const socket = io('https://api.arangtik.com/fc', {
  auth: { token: 'YOUR_JWT_ACCESS_TOKEN' },
  transports: ['websocket'],
});
```

#### Event Catalog

| Event Name | Direction | Payload Structure & Usage |
|---|:---:|---|
| `join-conversation` | Client $\rightarrow$ Server | `{ conversationId: string }` — Subscribes socket to conversation room. |
| `leave-conversation` | Client $\rightarrow$ Server | `{ conversationId: string }` — Leaves conversation room. |
| `send-message` | Client $\rightarrow$ Server | `{ conversationId, content, type }` — Real-time message dispatch (rate-limited at 40/min). |
| `new-message` | Server $\rightarrow$ Room | Message document broadcast to room; triggers push notification for offline members. |
| `user-typing` | Client $\rightarrow$ Server $\rightarrow$ Room | `{ conversationId, isTyping: boolean }` — Displays live typing animation. |
| `message-status` | Bi-directional | `{ messageId, conversationId, status }` — Real-time delivery and read receipt broadcast. |
| `check-presence` | Client $\rightarrow$ Server | `{ userIds: string[] }` — Queries active online socket status of contacts. |
| `walkie-request-floor` | Client $\rightarrow$ Server | `{ conversationId }` — User requests microphone floor lease. |
| `walkie-floor-granted` | Server $\rightarrow$ Client | `{ conversationId, floorExpiresAt }` — Confirms speaker has acquired exclusive floor. |
| `walkie-floor-denied` | Server $\rightarrow$ Client | `{ conversationId, reason: "FLOOR_BUSY", currentSpeaker }` — Rejects mic request if occupied. |
| `walkie-incoming` | Server $\rightarrow$ Room | `{ conversationId, speakerId, speakerName }` — Alerts listeners to open audio playback stream. |
| `walkie-audio-stream` | Client $\rightarrow$ Server $\rightarrow$ Room | `{ conversationId, chunk: Buffer }` — Relays raw binary audio chunks live to room listeners. |
| `walkie-release-floor` | Client $\rightarrow$ Server | `{ conversationId }` — Speaker releases microphone; broadcasts `walkie-ended`. |
| `walkie-ended` | Server $\rightarrow$ Room | `{ conversationId }` — Closes incoming audio playback stream for listeners. |

---

## 17. Cluster Features Master Module (`/api/admin/cluster-features`)

This module manages the dynamic functional capabilities (e.g. Wardrobe, Laundry, Walkie-Talkie) available to Arangtik groups/clusters. Admins can create, list, update, soft-delete, restore, and seed default features.

### 17.1 Quick Reference Table

| Method | Endpoint | Description | Protected |
|---|---|---|:---:|
| `POST` | `/api/admin/cluster-features` | Create a new cluster feature module | Admin |
| `GET` | `/api/admin/cluster-features` | List all features (`?includeInactive=true`, `?includeDeleted=true`) | Public / Admin |
| `GET` | `/api/admin/cluster-features/:id` | Get single feature details by ObjectId or Code | Public / Admin |
| `PATCH` | `/api/admin/cluster-features/:id` | Update feature name, code, icon, description, or status | Admin |
| `DELETE` | `/api/admin/cluster-features/:id` | Soft-delete feature (`?hard=true` for permanent delete) | Admin |
| `PATCH` | `/api/admin/cluster-features/:id/restore` | Restore a previously soft-deleted feature | Admin |
| `POST` | `/api/admin/cluster-features/seed` | Seed standard initial features (Wardrobe, Laundry, Walkie-Talkie) | Admin |

---

### 17.2 Endpoint Specifications

#### 17.2.1 Create Cluster Feature
Creates a new functional module for clusters. If a soft-deleted record with the same code or name exists, it is automatically restored and updated.

- **Method / Path:** `POST /api/admin/cluster-features`
- **Authentication:** Protected (`Bearer <ADMIN_JWT>`)
- **Request Body:**
```json
{
  "name": "Wardrobe",
  "code": "WARDROBE",
  "icon": "👗",
  "description": "Wardrobe and clothes sharing among cluster members",
  "isActive": true
}
```
*Constraints: `name` is required. `code` is auto-normalized to uppercase alphanumeric with underscores if omitted.*

- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Feature created successfully",
  "data": {
    "_id": "6739f4a123...",
    "name": "Wardrobe",
    "code": "WARDROBE",
    "icon": "👗",
    "description": "Wardrobe and clothes sharing among cluster members",
    "isActive": true,
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-11-17T10:00:00.000Z",
    "updatedAt": "2026-11-17T10:00:00.000Z"
  }
}
```

---

#### 17.2.2 List Cluster Features
Retrieves all features. By default, soft-deleted features are excluded and only active features are returned.

- **Method / Path:** `GET /api/admin/cluster-features`
- **Query Parameters:**
  - `includeInactive` (`boolean`, optional): When `true`, includes inactive features.
  - `includeDeleted` (`boolean`, optional): When `true`, includes soft-deleted features.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Features retrieved successfully",
  "data": [
    {
      "_id": "6739f4a123...",
      "name": "Wardrobe",
      "code": "WARDROBE",
      "icon": "👗",
      "description": "Wardrobe and clothes sharing",
      "isActive": true,
      "isDeleted": false
    },
    {
      "_id": "6739f4b456...",
      "name": "Laundry",
      "code": "LAUNDRY",
      "icon": "🧺",
      "description": "Laundry work orders",
      "isActive": true,
      "isDeleted": false
    },
    {
      "_id": "6739f4c789...",
      "name": "Walkie-Talkie",
      "code": "WALKIE_TALKIE",
      "icon": "📻",
      "description": "Voice walkie-talkie communication",
      "isActive": true,
      "isDeleted": false
    }
  ]
}
```

---

#### 17.2.3 Get Feature Details
Retrieves single feature details by ObjectId or uppercase Code (e.g., `WARDROBE`).

- **Method / Path:** `GET /api/admin/cluster-features/:id`
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feature retrieved successfully",
  "data": {
    "_id": "6739f4a123...",
    "name": "Wardrobe",
    "code": "WARDROBE",
    "icon": "👗",
    "description": "Wardrobe and clothes sharing",
    "isActive": true,
    "isDeleted": false
  }
}
```

---

#### 17.2.4 Update Cluster Feature
Updates feature attributes strictly using `PATCH` per Arangtik Rule 4.

- **Method / Path:** `PATCH /api/admin/cluster-features/:id`
- **Authentication:** Protected (`Bearer <ADMIN_JWT>`)
- **Request Body:**
```json
{
  "name": "Wardrobe & Styling",
  "description": "Full shared wardrobe and virtual styling",
  "icon": "👗"
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feature updated successfully",
  "data": {
    "_id": "6739f4a123...",
    "name": "Wardrobe & Styling",
    "code": "WARDROBE",
    "icon": "👗",
    "description": "Full shared wardrobe and virtual styling",
    "isActive": true,
    "isDeleted": false
  }
}
```

---

#### 17.2.5 Delete Feature (Soft / Hard Delete)
Performs safe soft deletion by setting `isDeleted: true`, `deletedAt: Date.now()`, and `isActive: false`. Pass `?hard=true` for permanent database deletion.

- **Method / Path:** `DELETE /api/admin/cluster-features/:id`
- **Authentication:** Protected (`Bearer <ADMIN_JWT>`)
- **Query Parameters:** `hard` (`boolean`, optional): Set to `true` to permanently purge from database.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feature soft-deleted successfully",
  "data": {
    "deleted": true,
    "hard": false,
    "id": "6739f4a123..."
  }
}
```

---

#### 17.2.6 Restore Soft-Deleted Feature
Restores a previously soft-deleted feature back to active status (`isDeleted: false`, `deletedAt: null`, `isActive: true`).

- **Method / Path:** `PATCH /api/admin/cluster-features/:id/restore`
- **Authentication:** Protected (`Bearer <ADMIN_JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Feature restored successfully",
  "data": {
    "_id": "6739f4a123...",
    "name": "Wardrobe",
    "code": "WARDROBE",
    "icon": "👗",
    "isActive": true,
    "isDeleted": false
  }
}
```

---

#### 17.2.7 Seed Default Features
Idempotently seeds the 3 standard cluster features (`WARDROBE`, `LAUNDRY`, `WALKIE_TALKIE`) into the database if not present, or restores them if deleted.

- **Method / Path:** `POST /api/admin/cluster-features/seed`
- **Authentication:** Protected (`Bearer <ADMIN_JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Default features seeded successfully",
  "data": [
    {
      "_id": "6739f4a123...",
      "name": "Wardrobe",
      "code": "WARDROBE",
      "icon": "👗",
      "isActive": true
    },
    {
      "_id": "6739f4b456...",
      "name": "Laundry",
      "code": "LAUNDRY",
      "icon": "🧺",
      "isActive": true
    },
    {
      "_id": "6739f4c789...",
      "name": "Walkie-Talkie",
      "code": "WALKIE_TALKIE",
      "icon": "📻",
      "isActive": true
    }
  ]
}
```

---

## 18. Smart & Collaborative Outfit Styling Module (`/api/outfit`)

The Outfit module provides AI-driven and collaborative outfit generation, bookmarking, and cross-member styling across Frequent Connect clusters. When a cluster has the `WARDROBE` feature enabled, members can style looks for one another with dual-identity attribution (`createdBy` vs. `targetUserId`), track wear counts, accept/decline suggestions, and receive FCM push notifications.

All routes require:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

### 18.1. Smart Outfit Suggestions
Generates occasion-tailored, color-harmonious outfit combinations strictly using available, active clothes from the user's or selected wardrobes.

- **Method / Path:** `POST /api/outfit/suggest` *(or `/api/outfit/generate`)*
- **Authentication:** Protected (`Bearer <JWT>`)
- **Quota Check:** `aiOutfitSuggestions`
- **Request Body:**
```json
{
  "wardrobeId": "6ae0551433480f1d0fb8d9e2",
  "occasion": "CASUAL",
  "season": "SUMMER",
  "limit": 5
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Outfit recommendations generated successfully",
  "data": [
    {
      "title": "Breezy Casual Look",
      "occasion": "CASUAL",
      "season": "SUMMER",
      "items": [
        {
          "itemId": "6ae0601433480f1d0fb8d9f1",
          "slot": "UPPER_WEAR",
          "name": "Linen White Shirt",
          "category": "Shirts",
          "color": "White",
          "imageUrl": "https://api.arangtik.com/uploads/shirt.jpg"
        },
        {
          "itemId": "6ae0601433480f1d0fb8d9f2",
          "slot": "LOWER_WEAR",
          "name": "Slim Navy Chinos",
          "category": "Pants",
          "color": "Navy Blue",
          "imageUrl": "https://api.arangtik.com/uploads/chinos.jpg"
        }
      ],
      "stylingNotes": "Crisp linen paired with contrast navy chinos for an effortless daytime look.",
      "matchScore": 95,
      "colorHarmony": {
        "palette": ["#FFFFFF", "#000080"],
        "harmonyType": "HARMONIOUS",
        "contrast": "HIGH",
        "score": 96
      }
    }
  ]
}
```

---

### 18.2. Save / Style Outfit (Personal or Collaborative)
Saves an outfit into a user's closet collection. If `targetUserId` is specified and differs from the authenticated user, this acts as **Collaborative Styling** (`createdBy !== targetUserId`). The system asserts that both users share an active cluster with `WARDROBE` enabled, tags individual items with `ownerId` and `ownerName`, marks the status as `SUGGESTED`, and dispatches an instant FCM push notification to the target user.

- **Method / Path:** `POST /api/outfit/save`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Quota Check:** `favouriteOutfits`
- **Request Body:**
```json
{
  "targetUserId": "6735fa016ba477c7d42cfb82",
  "clusterId": "6735fa016ba477c7d42cfb80",
  "title": "Date Night Elegance 👗",
  "occasion": "PARTY",
  "season": "ALL_SEASON",
  "stylingNotes": "Pair with minimalist silver jewelry and heels.",
  "items": [
    {
      "itemId": "6ae0601433480f1d0fb8d9f5",
      "slot": "ONE_PIECE",
      "name": "Black Velvet Dress"
    },
    {
      "itemId": "6ae0601433480f1d0fb8d9f6",
      "slot": "FOOTWEAR",
      "name": "Silver Stilettos"
    }
  ]
}
```
- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Outfit saved to your closet collection",
  "data": {
    "_id": "673b01234ba477c7d42cfa11",
    "userId": "6735fa016ba477c7d42cfb82",
    "targetUserId": "6735fa016ba477c7d42cfb82",
    "createdBy": "6735fa016ba477c7d42cfb81",
    "clusterId": "6735fa016ba477c7d42cfb80",
    "title": "Date Night Elegance 👗",
    "occasion": "PARTY",
    "status": "SUGGESTED",
    "isFavorite": false,
    "items": [
      {
        "itemId": "6ae0601433480f1d0fb8d9f5",
        "slot": "ONE_PIECE",
        "name": "Black Velvet Dress",
        "ownerId": "6735fa016ba477c7d42cfb82",
        "ownerName": "Priya Sharma"
      }
    ]
  }
}
```

---

### 18.3. Get Saved Outfits with Scopes
Lists saved and styled outfits. Supports flexible filtering by scope:
- `scope=mine`: Personal looks styled by the user for themselves.
- `scope=styled_for_me`: Looks styled by family/cluster members for the user.
- `scope=styled_by_me`: Looks the user created and recommended to other members.
- `scope=cluster`: Looks created in the context of a specific cluster (pass `clusterId`).

- **Method / Path:** `GET /api/outfit/saved`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Query Parameters:**
  - `scope`: `'mine' | 'styled_for_me' | 'styled_by_me' | 'cluster' | 'all'`
  - `clusterId`: Filter by cluster ObjectId
  - `occasion`: Filter by occasion (e.g., `PARTY`, `CASUAL`)
  - `status`: Filter by status (`SUGGESTED`, `ACCEPTED`, `DECLINED`, `WORN`, `PERSONAL`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Saved outfits retrieved successfully",
  "data": [
    {
      "_id": "673b01234ba477c7d42cfa11",
      "title": "Date Night Elegance 👗",
      "occasion": "PARTY",
      "status": "SUGGESTED",
      "createdBy": {
        "_id": "6735fa016ba477c7d42cfb81",
        "name": "Rahul Sharma",
        "phone": "+919876543211",
        "profilePicture": ""
      },
      "targetUserId": {
        "_id": "6735fa016ba477c7d42cfb82",
        "name": "Priya Sharma",
        "phone": "+919876543210"
      },
      "clusterId": {
        "_id": "6735fa016ba477c7d42cfb80",
        "name": "Family Circle",
        "color": "#6366F1"
      },
      "items": [...]
    }
  ]
}
```

---

### 18.4. Update Outfit Status (Accept, Decline, Mark Worn)
Allows the recipient or creator of an outfit to update its status. When marked as `WORN`, the outfit's `wearCount` and `lastWornAt` are updated, and the wear count on each constituent wardrobe item is automatically incremented.

- **Method / Path:** `PATCH /api/outfit/saved/:id/status`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Request Body:**
```json
{
  "status": "WORN"
}
```
*(Allowed statuses: `PERSONAL`, `SUGGESTED`, `ACCEPTED`, `DECLINED`, `WORN`)*
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Outfit status updated successfully",
  "data": {
    "_id": "673b01234ba477c7d42cfa11",
    "status": "WORN",
    "wearCount": 1,
    "lastWornAt": "2026-11-18T16:50:00.000Z"
  }
}
```

---

### 18.5. Delete Saved Outfit
Removes an outfit from the collection. Permitted for either the outfit's creator or the target recipient.

- **Method / Path:** `DELETE /api/outfit/saved/:id`
- **Authentication:** Protected (`Bearer <JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Outfit removed successfully",
  "data": {
    "success": true,
    "message": "Outfit removed successfully"
  }
}
```

---

## 19. Arangtik Garment AI Studio & Testing APIs
Dedicated enterprise testing and GPU worker telemetry endpoints for Arangtik Garment AI's Unified 3D Ghost-Mannequin Studio Pipeline.

### 19.1. Garment AI Microservice Health & GPU Telemetry
Probes `https://bg.arangtik.com/health` to verify GPU cluster status, NVIDIA RTX 3090 worker connectivity, and loaded neural models (BiRefNet Lite, ChatGPT Vision, Qwen 2.1).

- **Method / Path:** `GET /api/admin/garment-ai/health`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Garment AI service health checked successfully",
  "data": {
    "online": true,
    "statusCode": 200,
    "latencyMs": 850,
    "data": {
      "status": "ok",
      "service": "arangtik-garment-ai",
      "flow": "Flow A (BiRefNet Lite) + Flow B (ChatGPT Vision + Remote GPU Qwen)",
      "version": "2.0.0",
      "model": "birefnet-general-lite",
      "models_loaded": {
        "flow_a_birefnet": true,
        "openai_vision_configured": true,
        "qwen_gpu_worker_online": true
      },
      "hardware": {
        "cpu_cores": 6,
        "device": "remote_cuda",
        "cuda_available": true,
        "gpu_name": "NVIDIA GeForce RTX 3090",
        "gpu_worker_url": "http://127.0.0.1:8001",
        "gpu_worker_detail": "Connected"
      }
    }
  }
}
```

---

### 19.2. Test Garment Image 3D Studio Pipeline
Uploads an e-commerce model photograph or flat-lay to the RTX 3090 GPU worker and receives isolated 1024×1024 transparent 3D ghost-mannequin cutouts, category classifications, and high-accuracy titles.

- **Method / Path:** `POST /api/admin/garment-ai/test`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Content-Type:** `multipart/form-data`
- **Request Parameters:**
  - `file` (or `image`): Binary image file (JPEG, PNG, WebP up to 15MB)
  - `target_garment`: Optional filter (`"all"`, `"upper_clothes"`, `"pants"`, `"dress"`, `"skirt"`)
  - `response_format`: `"json"`
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Garment processed cleanly through 3D Ghost-Mannequin Pipeline",
  "data": {
    "success": true,
    "status": "success",
    "jobId": "73ed5a1135",
    "executionTimeMs": 48580,
    "processingTimeSec": 48.58,
    "totalGarments": 1,
    "garments": [
      {
        "garmentId": "garment_001",
        "category": "upper_clothes",
        "mappedDbCategory": "UPPER_WEAR",
        "title": "White Real Madrid Football Jersey",
        "url": "https://bg.arangtik.com/api/outputs/73ed5a1135_garment_001.png",
        "outputPngUrl": "https://bg.arangtik.com/api/outputs/73ed5a1135_garment_001.png",
        "resolution": "1024x1024",
        "width": 1024,
        "height": 1024
      }
    ],
    "originalImage": {
      "fileName": "jersey.jpg",
      "size": 140715,
      "mimetype": "image/jpeg",
      "localUrl": "/uploads/jersey.jpg"
    },
    "rawResponse": {
      "status": "success",
      "total_garments": 1,
      "garments": [ ... ],
      "processing_time_sec": 48.58
    }
  }
}
```

---

## 20. Admin Real-Time Developer Live Terminal & In-Memory Logs APIs (`/api/admin/terminal`)

High-performance, zero-database, zero-disk overhead real-time developer terminal APIs designed for monitoring BullMQ Redis queues, Python GPU 3D Ghost-Mannequin job processing, and backend microservice health in real time without polluting MongoDB or file system storage.

- **Base Path:** `/api/admin/terminal`
- **Authentication:** Admin Protected (`Bearer <Admin JWT>` or `x-api-key: <ADMIN_SYNC_API_KEY>`)

### 20.1. Get Real-Time In-Memory Logs & BullMQ Queue Stats
Fetches the circular in-memory buffer of recent server logs (default last 100 entries, capacity 1000) alongside live Redis BullMQ queue performance counters (`waiting`, `active`, `completed`, `failed`, `delayed`).

- **Method / Path:** `GET /api/admin/terminal/logs`
- **Authentication:** Protected (`Bearer <Admin JWT>` or header `x-api-key`)
- **Query Parameters:**
  - `limit` (integer, optional): Number of recent log entries to return (default: `100`, max: `1000`).
  - `level` (string, optional): Filter by minimum log level (`ALL`, `INFO`, `WARN`, `ERROR`, `SUCCESS`, `AI`).
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Logs retrieved successfully",
  "data": {
    "logs": [
      {
        "id": "log_1732338000000_1",
        "timestamp": "2026-11-23T11:00:00.000Z",
        "level": "INFO",
        "module": "WARDROBE",
        "message": "[WardrobePipeline] 🟢 [BULLMQ] Enqueued item 6ae05a9033480f1d0fb8d9f5 (BullMQ Job ID: 12)",
        "metadata": {
          "itemId": "6ae05a9033480f1d0fb8d9f5",
          "userId": "6ac0952c80239788e764c0f9"
        }
      },
      {
        "id": "log_1732338045000_2",
        "timestamp": "2026-11-23T11:00:45.000Z",
        "level": "SUCCESS",
        "module": "GARMENT_AI",
        "message": "[BullMQ] Job 12 finished successfully: 1 garment(s) segmented & analyzed.",
        "metadata": {
          "durationMs": 44820,
          "cutoutUrl": "https://bg.arangtik.com/api/outputs/73ed_garment_001.png"
        }
      }
    ],
    "totalInMemory": 2,
    "bufferCapacity": 1000,
    "queueStats": {
      "isRedisConnected": true,
      "waiting": 0,
      "active": 0,
      "completed": 12,
      "failed": 0,
      "delayed": 0
    },
    "serverTime": "2026-11-23T11:01:00.000Z"
  }
}
```

---

### 20.2. Clear In-Memory Ring Buffer
Flushes the volatile in-memory log array. Has zero disk or database impact.

- **Method / Path:** `DELETE /api/admin/terminal/clear`
- **Authentication:** Protected (`Bearer <Admin JWT>` or header `x-api-key`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Terminal logs cleared successfully",
  "data": {
    "cleared": true,
    "timestamp": "2026-11-23T11:02:00.000Z"
  }
}
```

---

## 21. Jewellery Management Module (`/api/jewellery` & `/api/admin/jewellery-categories`)

The Jewellery Management module provides a complete solution for cataloging, categorizing, organizing, and tracking precious jewellery items.

### Core Concepts:
1. **JewelleryCategory** (Master taxonomy, e.g. `NECKLACE`, `EARRING`, `RING`, `BRACELET`, `BANGLE`, `ANKLET`, `PENDANT`, `BROOCH`, `MAANGTIKA`, `NOSERING`, `OTHER`).
2. **JewelleryBox** (User's storage containers, e.g. "Mummy's Gold Vault", "Bank Safe Locker", with automatic default box handling).
3. **JewellerySet** (Minimalist grouping concept for sets, e.g., 1 necklace + 2 earrings in a single set photo).
4. **Jewellery** (Individual items with `sourceImage`, `generatedImage`, material `type` [`GOLD`, `SILVER`, `ARTIFICIAL`, `CUSTOM`], and physical `status` [`IN_LOCKER`, `LEND`, `CLEANING`, `OTHER`]).

---

### 21.1. Admin Jewellery Categories (`/api/admin/jewellery-categories`)

#### 21.1.1. List All Categories (Admin)
Returns all jewellery categories with pagination, search, and soft-delete visibility.

- **Method / Path:** `GET /api/admin/jewellery-categories`
- **Authentication:** Public or Protected (`Bearer <Admin JWT>`)
- **Query Parameters:**
  - `search` (string, optional): Case-insensitive match on category name or code.
  - `isActive` (boolean, optional): Filter active/inactive categories (`true` / `false`).
  - `includeDeleted` (boolean, optional): Include soft-deleted categories (`true` / `false`).
  - `page` (integer, default: 1): Page number.
  - `limit` (integer, default: 20): Records per page.
  - `paginate` (boolean, optional): Set `false` or `all=true` for unpaginated array.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery categories retrieved successfully",
  "data": {
    "categories": [
      {
        "_id": "6742d4a1b02891f7c81a1001",
        "name": "Necklace",
        "code": "NECKLACE",
        "icon": "https://api.arangtik.com/uploads/necklace_icon.png",
        "description": "Chokers, chains, collars, and beaded necklaces",
        "isActive": true,
        "isDeleted": false,
        "createdAt": "2026-11-23T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 11,
      "totalPages": 1,
      "currentPage": 1,
      "perPage": 20,
      "totalRecords": 11,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### 21.1.2. Create Category (Admin)
Creates a new jewellery category. Automatically normalizes and upper-cases the category `code` if omitted.

- **Method / Path:** `POST /api/admin/jewellery-categories`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request Body:**
  - `name` (string, required): Display name (e.g., `"Tiara"`).
  - `code` (string, optional): Unique uppercase code (e.g., `"TIARA"`).
  - `description` (string, optional): Description up to 500 characters.
  - `icon` (file or string URL/base64, optional): Category icon image.
- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Jewellery category created successfully",
  "data": {
    "_id": "6742d4a1b02891f7c81a1012",
    "name": "Tiara",
    "code": "TIARA",
    "icon": "https://api.arangtik.com/uploads/tiara_icon.png",
    "description": "Crowns and headpieces",
    "isActive": true,
    "isDeleted": false
  }
}
```

#### 21.1.3. Update Category (Admin)
Updates category metadata or icon.

- **Method / Path:** `PATCH /api/admin/jewellery-categories/:id`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request Body (all optional):** `name`, `code`, `description`, `icon`, `isActive`.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery category updated successfully",
  "data": {
    "_id": "6742d4a1b02891f7c81a1012",
    "name": "Tiara & Crown",
    "code": "TIARA",
    "description": "Royal tiaras and ceremonial head crowns",
    "isActive": true
  }
}
```

#### 21.1.4. Soft Delete Category (Admin)
Soft-deletes a category. Prevents deletion if any active jewellery pieces are linked to this category.

- **Method / Path:** `DELETE /api/admin/jewellery-categories/:id`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Query Parameters:** `hard=true` (optional, permanently deletes if unlinked).
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery category deleted successfully",
  "data": {
    "message": "Jewellery category deleted successfully"
  }
}
```

---

### 21.2. Public Category Discovery (`/api/jewellery/categories`)

#### 21.2.1. List Active Categories for App Dropdown
Convenience endpoint for mobile apps to fetch categories for selection during jewellery piece creation.

- **Method / Path:** `GET /api/jewellery/categories`
- **Authentication:** Public or Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):** Identical to 21.1.1.

---

### 21.3. User Jewellery Boxes (`/api/jewellery/boxes`)

#### 21.3.1. List User Boxes
Retrieves all jewellery boxes belonging to the authenticated user, automatically annotated with dynamic active `itemCount`.

- **Method / Path:** `GET /api/jewellery/boxes`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Query Parameters:** `search`, `page`, `limit`, `paginate=false`.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery boxes retrieved successfully",
  "data": {
    "boxes": [
      {
        "_id": "6742d5e2b02891f7c81a2001",
        "userId": "6ac0952c80239788e764c0f9",
        "name": "Mummy's Gold Vault",
        "description": "Master household gold collection",
        "type": "FAMILY",
        "ownerName": "Mummy",
        "coverImage": "https://api.arangtik.com/uploads/vault_cover.jpg",
        "isDefault": true,
        "itemCount": 12,
        "isActive": true,
        "isDeleted": false,
        "createdAt": "2026-11-23T12:15:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### 21.3.2. Create Jewellery Box
Creates a storage box. If this is the user's first box or `isDefault: true` is passed, it becomes the default box and automatically unsets previous defaults.

- **Method / Path:** `POST /api/jewellery/boxes`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request Body:**
  - `name` (string, required): Box name (e.g., `"Bank Safe Locker"`).
  - `description` (string, optional): Box notes.
  - `type` (string, optional): Enum `["PERSONAL", "FAMILY", "SHARED", "OTHER"]` (default: `"PERSONAL"`).
  - `ownerName` (string, optional): Human label for the box owner.
  - `coverImage` (file or string URL, optional): Box cover image.
  - `isDefault` (boolean, optional): Whether this is the default storage box.
- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Jewellery box created successfully",
  "data": {
    "_id": "6742d5e2b02891f7c81a2002",
    "userId": "6ac0952c80239788e764c0f9",
    "name": "Bank Safe Locker",
    "type": "FAMILY",
    "isDefault": false,
    "isActive": true,
    "isDeleted": false
  }
}
```

#### 21.3.3. Get Box by ID
- **Method / Path:** `GET /api/jewellery/boxes/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):** Box details including `itemCount`.

#### 21.3.4. Update Jewellery Box
- **Method / Path:** `PATCH /api/jewellery/boxes/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Request Body (optional):** `name`, `description`, `type`, `ownerName`, `coverImage`, `isDefault`.

#### 21.3.5. Soft-Delete Jewellery Box (With Cascade)
Soft-deletes the box. Also automatically cascades soft-deletion to all jewellery items and sets contained within this box. If the deleted box was the default, the system automatically promotes another active box to default.

- **Method / Path:** `DELETE /api/jewellery/boxes/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery box and its items deleted successfully",
  "data": {
    "message": "Jewellery box and its items deleted successfully"
  }
}
```

---

### 21.4. Jewellery Sets (`/api/jewellery/sets`)

Minimalist grouping document representing items designed or worn together (e.g. 1 necklace + 2 matching earrings).

#### 21.4.1. List Sets
- **Method / Path:** `GET /api/jewellery/sets`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Query Parameters:** `jewelleryBoxId` (optional filter), `search`, `page`, `limit`.
- **Success Response (200 OK):** Returns sets list with `itemCount` and populated `jewelleryBoxId`.

#### 21.4.2. Get Set by ID with Member Pieces
- **Method / Path:** `GET /api/jewellery/sets/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery set retrieved successfully",
  "data": {
    "_id": "6742d7a5b02891f7c81a3001",
    "userId": "6ac0952c80239788e764c0f9",
    "jewelleryBoxId": {
      "_id": "6742d5e2b02891f7c81a2001",
      "name": "Mummy's Gold Vault",
      "type": "FAMILY"
    },
    "name": "Royal Emerald Bridal Set",
    "coverImageUrl": "https://api.arangtik.com/uploads/emerald_set_full.jpg",
    "sourcePhotoUrl": "https://api.arangtik.com/uploads/emerald_set_full.jpg",
    "itemCount": 3,
    "items": [
      {
        "_id": "6742d810b02891f7c81a4001",
        "name": "Emerald Choker Necklace",
        "type": "GOLD",
        "status": "IN_LOCKER",
        "weight": 55,
        "jewelleryCategory": {
          "_id": "6742d4a1b02891f7c81a1001",
          "name": "Necklace",
          "code": "NECKLACE"
        }
      },
      {
        "_id": "6742d810b02891f7c81a4002",
        "name": "Emerald Jhumka Pair",
        "type": "GOLD",
        "status": "IN_LOCKER",
        "weight": 24,
        "jewelleryCategory": {
          "_id": "6742d4a1b02891f7c81a1002",
          "name": "Earring",
          "code": "EARRING"
        }
      }
    ]
  }
}
```

#### 21.4.3. Update Set Details
- **Method / Path:** `PATCH /api/jewellery/sets/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Request Body (optional):** `name`, `jewelleryBoxId` (moving a set moves all member items to that box automatically), `coverImageUrl`.

#### 21.4.4. Delete Set
- **Method / Path:** `DELETE /api/jewellery/sets/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):** Soft-deletes set and member items.

---

### 21.5. Jewellery Pieces (`/api/jewellery`)

#### 21.5.1. Create Jewellery Piece(s) — Image-Only Single & Bulk
Uploads one or multiple photo(s) to create either a single jewellery item or multiple items in bulk. No `name` or `jewelleryCategory` is required at creation time — only image(s) are needed. If `jewelleryBoxId` is omitted, the user's default box is automatically assigned.

- **Method / Path:** `POST /api/jewellery`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request → Response Lifecycle:**
  1. `protect` authenticates the user JWT (`req.user`).
  2. `uploadItemImages` (`multer`) parses up to 20 files per field (`images`, `sourceImage`, `image`, `generatedImage`).
  3. `validateCreateItem` parses `items` (if JSON-stringified in `multipart/form-data`) and validates either the `items` array or single/shared item fields (`name`, `jewelleryCategory`, `type`, `status`, `weight`).
  4. `jewelleryController.create` → `jewelleryService.createItem`:
     - Detects bulk mode when `items` array, `sourceImageUrls` array, or >1 uploaded source image is present.
     - Resolves/caches `jewelleryBoxId` and `jewelleryCategory`, formats image URLs, and inserts via `Jewellery.insertMany`.
     - Returns the single populated item (`data: { ... }`) for single-item requests, or `{ count, items: [...] }` for bulk requests.
- **Fields / Body:**
  - **Single or Shared Fields:**
    - `name` (string, optional): Piece name (e.g. `"Diamond Solitaire Ring"`). In multi-image bulk mode without `items`, auto-names as `"<name> 1"`, `"<name> 2"`, etc. if provided.
    - `jewelleryCategory` (string, optional): Category `_id` or string code (e.g. `"RING"` or `"NECKLACE"`).
    - `jewelleryBoxId` (string, optional): Target box ID (falls back to default box).
    - `setId` (string, optional): ID of a `JewellerySet` if this belongs to a set.
    - `type` (string, optional): Enum `["GOLD", "SILVER", "ARTIFICIAL", "CUSTOM"]` (default: `"GOLD"`).
    - `status` (string, optional): Enum `["IN_LOCKER", "LEND", "CLEANING", "OTHER"]` (default: `"IN_LOCKER"`).
    - `color` (string, optional): Material tint / color (e.g. `"Rose Gold"`, `"Yellow Gold"`).
    - `gemstone` (string, optional): Inset stones (e.g. `"VVS1 Diamond"`, `"Emerald"`).
    - `weight` (number, optional): Weight in grams (e.g. `5.2`).
    - `brand` (string, optional): Brand / Jeweller name (e.g. `"Tanishq"`, `"CaratLane"`).
    - `sourceImage` / `image` / `images` (file or up to 20 files, optional): Uploaded original picture(s).
    - `generatedImage` (file or up to 20 files, optional): Background-removed or AI-rendered picture(s).
    - `sourceImageUrl` (string, optional): Single image URL or base64 alternative.
    - `generatedImageUrl` (string, optional): Single generated image URL or base64 alternative.
  - **Bulk-Specific Fields:**
    - `items` (array or JSON string in `multipart/form-data`, optional): Array of item objects (`{ name, jewelleryCategory, jewelleryBoxId?, setId?, type?, status?, color?, gemstone?, weight?, brand?, sourceImageUrl?, generatedImageUrl? }`). Matched by index to uploaded `images`/`sourceImage`/`generatedImage` files if provided.
    - `sourceImageUrls` (array or JSON string, optional): Array of image URLs/base64 strings to create one item per image using shared metadata.
- **Success Response — Single Item (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Jewellery item created successfully",
  "data": {
    "_id": "6742d810b02891f7c81a4005",
    "userId": "6ac0952c80239788e764c0f9",
    "jewelleryBoxId": {
      "_id": "6742d5e2b02891f7c81a2001",
      "name": "Mummy's Gold Vault",
      "color": "#FFD700",
      "isDefault": true
    },
    "jewelleryCategory": {
      "_id": "6742d4a1b02891f7c81a1003",
      "name": "Ring",
      "code": "RING",
      "icon": "https://api.arangtik.com/uploads/ring_icon.png"
    },
    "setId": null,
    "name": "Diamond Solitaire Ring",
    "sourceImage": {
      "url": "https://api.arangtik.com/uploads/ring_source.jpg",
      "filename": "ring_source.jpg"
    },
    "generatedImage": {
      "url": "https://api.arangtik.com/uploads/ring_generated.png",
      "filename": "ring_generated.png",
      "generatedAt": "2026-11-23T12:20:00.000Z"
    },
    "type": "GOLD",
    "status": "IN_LOCKER",
    "color": "Rose Gold",
    "gemstone": "VVS1 Diamond",
    "weight": 5.2,
    "brand": "CaratLane",
    "isFavorite": false,
    "isActive": true,
    "isDeleted": false,
    "createdAt": "2026-11-23T12:20:00.000Z"
  }
}
```
- **Success Response — Bulk / Multiple Images (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "2 jewellery items created successfully",
  "data": {
    "count": 2,
    "items": [
      {
        "_id": "6742d810b02891f7c81a4005",
        "name": "Necklace 1",
        "sourceImage": { "url": "https://api.arangtik.com/uploads/n1.jpg", "filename": "n1.jpg" },
        "type": "GOLD",
        "status": "IN_LOCKER"
      },
      {
        "_id": "6742d810b02891f7c81a4006",
        "name": "Necklace 2",
        "sourceImage": { "url": "https://api.arangtik.com/uploads/n2.jpg", "filename": "n2.jpg" },
        "type": "GOLD",
        "status": "IN_LOCKER"
      }
    ]
  }
}
```

#### 21.5.2. Create Set with Items from Single Photo
Atomically creates a `JewellerySet` and all contained `Jewellery` items from a single multi-piece photograph (e.g. 1 necklace and 2 matching earrings).

- **Method / Path:** `POST /api/jewellery/set-with-items`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request Body:**
```json
{
  "setName": "Bridal Emerald & Diamond Set",
  "jewelleryBoxId": "6742d5e2b02891f7c81a2001",
  "sourcePhotoUrl": "https://api.arangtik.com/uploads/emerald_set_full.jpg",
  "items": [
    {
      "name": "Emerald Centerpiece Choker",
      "jewelleryCategory": "NECKLACE",
      "type": "GOLD",
      "status": "IN_LOCKER",
      "weight": 55,
      "color": "Yellow Gold",
      "gemstone": "Emerald & Diamond"
    },
    {
      "name": "Emerald Jhumka Left",
      "jewelleryCategory": "EARRING",
      "type": "GOLD",
      "status": "IN_LOCKER",
      "weight": 14,
      "color": "Yellow Gold"
    },
    {
      "name": "Emerald Jhumka Right",
      "jewelleryCategory": "EARRING",
      "type": "GOLD",
      "status": "IN_LOCKER",
      "weight": 14,
      "color": "Yellow Gold"
    }
  ]
}
```
- **Success Response (201 Created):**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Jewellery set and items created successfully",
  "data": {
    "set": {
      "_id": "6742d7a5b02891f7c81a3001",
      "name": "Bridal Emerald & Diamond Set",
      "coverImageUrl": "https://api.arangtik.com/uploads/emerald_set_full.jpg",
      "sourcePhotoUrl": "https://api.arangtik.com/uploads/emerald_set_full.jpg"
    },
    "items": [
      {
        "_id": "6742d810b02891f7c81a4010",
        "name": "Emerald Centerpiece Choker",
        "setId": "6742d7a5b02891f7c81a3001",
        "type": "GOLD",
        "status": "IN_LOCKER"
      },
      {
        "_id": "6742d810b02891f7c81a4011",
        "name": "Emerald Jhumka Left",
        "setId": "6742d7a5b02891f7c81a3001",
        "type": "GOLD",
        "status": "IN_LOCKER"
      },
      {
        "_id": "6742d810b02891f7c81a4012",
        "name": "Emerald Jhumka Right",
        "setId": "6742d7a5b02891f7c81a3001",
        "type": "GOLD",
        "status": "IN_LOCKER"
      }
    ]
  }
}
```

#### 21.5.3. List Jewellery Items with Filters & Search
Fetches the user's inventory with full classification population (`category`, `box`, `set`).

- **Method / Path:** `GET /api/jewellery`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Query Parameters:**
  - `jewelleryBoxId` (string, optional): Filter by storage box.
  - `jewelleryCategory` (string, optional): Category ID or uppercase code (`NECKLACE`, `EARRING`, etc.).
  - `setId` (string, optional): Set ID, or pass `"null"` / `"none"` for standalone un-set items.
  - `type` (string, optional): Material enum (`GOLD`, `SILVER`, `ARTIFICIAL`, `CUSTOM`).
  - `status` (string, optional): Location status (`IN_LOCKER`, `LEND`, `CLEANING`, `OTHER`).
  - `isFavorite` (boolean, optional): Filter starred favorites (`true` / `false`).
  - `search` (string, optional): Search keyword against item name, brand, color, or gemstone.
  - `page` (integer, default: 1): Page number.
  - `limit` (integer, default: 20): Records per page.
  - `paginate` (boolean, optional): Pass `false` or `all=true` for flat array.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery items retrieved successfully",
  "data": {
    "items": [
      {
        "_id": "6742d810b02891f7c81a4005",
        "name": "Diamond Solitaire Ring",
        "jewelleryCategory": {
          "_id": "6742d4a1b02891f7c81a1003",
          "name": "Ring",
          "code": "RING",
          "icon": "https://api.arangtik.com/uploads/ring_icon.png"
        },
        "jewelleryBoxId": {
          "_id": "6742d5e2b02891f7c81a2001",
          "name": "Mummy's Gold Vault",
          "type": "FAMILY"
        },
        "setId": null,
        "type": "GOLD",
        "status": "IN_LOCKER",
        "color": "Rose Gold",
        "gemstone": "VVS1 Diamond",
        "weight": 5.2,
        "brand": "CaratLane",
        "isFavorite": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

#### 21.5.4. Get Single Piece by ID
- **Method / Path:** `GET /api/jewellery/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):** Returns single piece with populated category, box, and set.

#### 21.5.5. Update Jewellery Piece Metadata
- **Method / Path:** `PATCH /api/jewellery/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request Body (optional):** `name`, `jewelleryBoxId`, `jewelleryCategory`, `setId`, `type`, `status`, `color`, `gemstone`, `weight`, `brand`, `isFavorite`, `sourceImage`, `generatedImage`.

#### 21.5.6. Update Status Directly (Lend, Cleaning, Locker)
Quick endpoint for changing the current physical state of the jewellery item.

- **Method / Path:** `PATCH /api/jewellery/:id/status`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Request Body:**
```json
{
  "status": "LEND"
}
```
*Valid statuses:* `"IN_LOCKER"`, `"LEND"`, `"CLEANING"`, `"OTHER"`.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery status updated to LEND",
  "data": {
    "_id": "6742d810b02891f7c81a4005",
    "name": "Diamond Solitaire Ring",
    "status": "LEND"
  }
}
```

#### 21.5.7. Move Piece to Another Box
Moves a piece from one box to another (e.g. moving from "Daily Wear Box" to "Bank Safe Locker").

- **Method / Path:** `PATCH /api/jewellery/:id/move`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Request Body:**
```json
{
  "targetJewelleryBoxId": "6742d5e2b02891f7c81a2002"
}
```
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery moved to new box successfully",
  "data": {
    "_id": "6742d810b02891f7c81a4005",
    "jewelleryBoxId": "6742d5e2b02891f7c81a2002"
  }
}
```

#### 21.5.8. Toggle Favorite
Toggles `isFavorite` flag between `true` and `false`.

- **Method / Path:** `PATCH /api/jewellery/:id/favorite`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Item added to favorites",
  "data": {
    "_id": "6742d810b02891f7c81a4005",
    "isFavorite": true,
    "message": "Item added to favorites"
  }
}
```

#### 21.5.9. Soft Delete Piece
Soft-deletes a single piece (sets `isDeleted: true`, sets `deletedAt`, excludes from all regular queries).

- **Method / Path:** `DELETE /api/jewellery/:id`
- **Authentication:** Protected (`Bearer <User JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery item deleted successfully",
  "data": {
    "message": "Jewellery item deleted successfully"
  }
}
```

---

### 21.6. Admin Jewellery Operations Dashboard & Monitoring (`/api/admin/jewellery`)

Production-grade administrative monitoring, SLA tracking for items out for cleaning or lend, cross-user search, and support interventions.

#### 21.6.1. Get Operational Statistics & SLA Alerts
Fetches high-level KPIs, status distribution, material type breakdown, and automated SLA alerts (cleaning > 14 days, lend > 30 days, missing photos).

- **Method / Path:** `GET /api/admin/jewellery/stats`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery operational statistics retrieved successfully",
  "data": {
    "overview": {
      "totalPieces": 450,
      "totalBoxes": 210,
      "totalSets": 85,
      "uniqueOwners": 180
    },
    "statusDistribution": {
      "IN_LOCKER": 380,
      "LEND": 45,
      "CLEANING": 20,
      "OTHER": 5
    },
    "typeDistribution": {
      "GOLD": 320,
      "SILVER": 90,
      "ARTIFICIAL": 35,
      "CUSTOM": 5
    },
    "operationalAlerts": {
      "overdueCleaning": 4,
      "extendedLend": 8,
      "missingPhotos": 2,
      "totalAlerts": 14
    },
    "topCategories": [
      { "_id": "6742d4a1b02891f7c81a1001", "name": "Necklace", "code": "NECKLACE", "count": 140 },
      { "_id": "6742d4a1b02891f7c81a1002", "name": "Earring", "code": "EARRING", "count": 180 }
    ]
  }
}
```

#### 21.6.2. Global Jewellery Operations Table (Search, Filters & Tab Badges)
Returns cross-user inventory with two-phase fast indexed search, SLA aging metrics (`daysInStatus`), and live tab counts (`tabCounts: { all, inLocker, lend, cleaning, overdue }`).

- **Method / Path:** `GET /api/admin/jewellery/items`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Query Parameters:**
  - `search` (string, optional): Case-insensitive match on user phone, user name, piece name, brand, color, or gemstone.
  - `status` (string, optional): Enum `["IN_LOCKER", "LEND", "CLEANING", "OTHER"]`.
  - `type` (string, optional): Enum `["GOLD", "SILVER", "ARTIFICIAL", "CUSTOM"]`.
  - `jewelleryCategory` (string, optional): Category ID or uppercase code (`NECKLACE`, `EARRING`, etc.).
  - `userId` (string, optional): Filter to a specific user ID.
  - `isAlert` (boolean, optional): Filter only items with active SLA alerts (`true`).
  - `includeDeleted` (boolean, optional): Include soft-deleted items (`true`).
  - `page` (integer, default: 1): Page number.
  - `limit` (integer, default: 20): Records per page.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery items retrieved successfully",
  "data": {
    "tabCounts": {
      "all": 450,
      "inLocker": 380,
      "lend": 45,
      "cleaning": 20,
      "overdue": 12
    },
    "items": [
      {
        "_id": "6742d810b02891f7c81a4005",
        "name": "Diamond Solitaire Ring",
        "type": "GOLD",
        "status": "CLEANING",
        "daysInStatus": 18,
        "isAlert": true,
        "alertReason": "OVERDUE_CLEANING (18 days at vendor)",
        "weight": 5.2,
        "color": "Rose Gold",
        "gemstone": "VVS1 Diamond",
        "brand": "CaratLane",
        "user": {
          "_id": "6ac0952c80239788e764c0f9",
          "name": "Priya Sharma",
          "phone": "918949056321"
        },
        "box": {
          "_id": "6742d5e2b02891f7c81a2001",
          "name": "Mummy's Gold Vault"
        },
        "category": {
          "code": "RING",
          "name": "Ring"
        },
        "sourceImage": { "url": "https://api.arangtik.com/uploads/ring.jpg" },
        "generatedImage": { "url": "https://api.arangtik.com/uploads/ring_cutout.png" },
        "updatedAt": "2026-11-06T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 450,
      "totalPages": 23
    }
  }
}
```

#### 21.6.3. User Customer Support Drill-down
Customer support endpoint to inspect a specific user's complete jewellery profile, including their boxes, sets, and status breakdown.

- **Method / Path:** `GET /api/admin/jewellery/users/:userId`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User jewellery overview retrieved successfully",
  "data": {
    "user": {
      "_id": "6ac0952c80239788e764c0f9",
      "name": "Priya Sharma",
      "phone": "918949056321",
      "role": "user"
    },
    "totalPieces": 14,
    "statusBreakdown": {
      "IN_LOCKER": 11,
      "LEND": 2,
      "CLEANING": 1,
      "OTHER": 0
    },
    "boxes": [ ... ],
    "sets": [ ... ],
    "items": [ ... ]
  }
}
```

#### 21.6.4. Single Piece Inspection
- **Method / Path:** `GET /api/admin/jewellery/items/:id`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Success Response (200 OK):** Detailed piece payload with populated user, box, category, and set info.

#### 21.6.5. Support Status Override with Mandatory Audit Reason
Allows an authorized admin/support agent to manually change an item's status on behalf of a user while recording a mandatory audit note and tracking `lastModifiedBy`.

- **Method / Path:** `PATCH /api/admin/jewellery/items/:id/status-override`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Request Body:**
```json
{
  "status": "IN_LOCKER",
  "reason": "Customer called support: verified vendor returned necklace on 24 Nov"
}
```
*Valid statuses:* `"IN_LOCKER"`, `"LEND"`, `"CLEANING"`, `"OTHER"`.
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery status overridden successfully",
  "data": {
    "_id": "6742d810b02891f7c81a4005",
    "name": "Diamond Solitaire Ring",
    "previousStatus": "CLEANING",
    "status": "IN_LOCKER",
    "reason": "Customer called support: verified vendor returned necklace on 24 Nov",
    "updatedBy": "65f1a2b3c4d5e6f7a8b9c0d1",
    "updatedAt": "2026-11-24T12:00:00.000Z"
  }
}
```

#### 21.6.6. Accidental Deletion Recovery (Restore)
Restores an accidentally soft-deleted jewellery piece back to active status (`isDeleted: false, deletedAt: null`).

- **Method / Path:** `PATCH /api/admin/jewellery/items/:id/restore`
- **Authentication:** Protected (`Bearer <Admin JWT>`)
- **Success Response (200 OK):**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Jewellery item restored successfully",
  "data": {
    "message": "Jewellery item restored successfully",
    "item": {
      "_id": "6742d810b02891f7c81a4005",
      "isDeleted": false,
      "deletedAt": null
    }
  }
}
```







