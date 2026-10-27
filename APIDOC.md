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
*Initiates passwordless login or registration by sending a 4-digit verification OTP.*

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
  "message": "OTP sent successfully to your WhatsApp number",
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
*Updates profile metadata (name, gender, country, currency, language, account type). Supports either JSON format or Multipart/Form-Data if attaching a profile photo (`image` or `profileImage`).*

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
| `image` / `profileImage` | `file` or `string` | No | Image file upload (multipart) or existing image URL string. |

##### JSON Request Example
```json
{
  "name": "Verified Test User",
  "gender": "MALE",
  "accountType": "INDIVIDUAL",
  "country": "India",
  "currency": "INR",
  "preferredLanguage": "en"
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
| `POST` | `/api/auth/send-otp` | Public | Send 4-digit verification OTP to user via WhatsApp |
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

## 4. Wardrobe Quick Reference Table

| Method | Endpoint | Access | Short Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/wardrobe/create-wardrobe` | Protected | Create new closet container linked to storeTypeId |
| `GET` | `/api/wardrobe/get-wardrobes` | Protected | List all active closets with live items count |
| `GET` | `/api/wardrobe/get-wardrobe/:id` | Protected | Retrieve single closet container by ID |
| `PATCH` | `/api/wardrobe/update-wardrobe/:id` | Protected | Update closet attributes, storeType, or media |
| `DELETE` | `/api/wardrobe/delete-wardrobe/:id` | Protected | Soft-delete closet (or permanent via `?hard=true`) |
| `PATCH` | `/api/wardrobe/restore-wardrobe/:id` | Protected | Restore soft-deleted closet container back to active |

