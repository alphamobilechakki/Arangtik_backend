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
*Sends a 4-digit verification code to the vendor's WhatsApp mobile number to initiate registration or sign in.*

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
| `POST` | `/api/vendor/send-otp` | Public | Send 4-digit verification OTP to vendor WhatsApp |
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

## Hardware Module — Hub & KitchenBox APIs

> **Base path:** `http://localhost:8083/api`
> All endpoints require `Authorization: Bearer <token>` header.
> Tested live on: 2026-10-29 against MongoDB Atlas (arangtik cluster).

---

### Hub APIs — `/api/hardware/hubs`

The **Hub** is the physical Wi-Fi gateway device. It bridges KitchenBox sensor devices to the cloud backend.

---

#### 1. Register Hub
**`POST /api/hardware/hubs`** — _Protected_

Registers a new hub device in the system.

**Request Body:**
```json
{
  "name": "Main Godown Hub",
  "mac_id": "AA:BB:CC:DD:EE:FF",
  "userId": "6ae31cca0c00fa1dfe7e3c99"
}
```

**Response `201 Created`:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Hub registered successfully",
  "data": {
    "_id": "6ae32896cad5521f756a33ac",
    "name": "Main Godown Hub",
    "mac_id": "AA:BB:CC:DD:EE:FF",
    "userId": "6ae31cca0c00fa1dfe7e3c99",
    "wifi": { "ssid": null },
    "status": "not configured",
    "createdAt": "2026-10-29T11:05:58.975Z",
    "updatedAt": "2026-10-29T11:05:58.975Z"
  }
}
```

> **Note:** `wifi.password` is never returned in any response — stored with `select: false`.

**Validation errors `400`:** `name`, `mac_id` required. `mac_id` must be valid MAC format (`AA:BB:CC:DD:EE:FF`).
**Conflict `409`:** MAC ID already registered.

---

#### 2. List Hubs
**`GET /api/hardware/hubs`** — _Protected_

Returns all hubs for the authenticated user. Supports pagination and status filter.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status: `not configured`, `configured`, `active`, `deactivated` |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20, max: 100) |

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hubs retrieved successfully",
  "data": {
    "hubs": [
      {
        "_id": "6ae32896cad5521f756a33ac",
        "name": "Main Godown Hub",
        "mac_id": "AA:BB:CC:DD:EE:FF",
        "userId": "6ae31cca0c00fa1dfe7e3c99",
        "wifi": { "ssid": "JioFiber_Godown_5G" },
        "status": "active",
        "createdAt": "2026-10-29T11:05:58.975Z",
        "updatedAt": "2026-10-29T11:06:29.975Z"
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

#### 3. Get Hub by ID
**`GET /api/hardware/hubs/:id`** — _Protected_

**Response `200 OK`:** Single hub object (same shape as list item above).
**Error `404`:** Hub not found.

---

#### 4. Get Hub by MAC ID
**`GET /api/hardware/hubs/mac/:mac_id`** — _Protected_

Lookup hub using its hardware MAC address.

**Example:** `GET /api/hardware/hubs/mac/AA:BB:CC:DD:EE:FF`

**Response `200 OK`:** Single hub object.
**Error `404`:** Hub not found.

---

#### 5. Configure Wi-Fi
**`PATCH /api/hardware/hubs/:id/wifi`** — _Protected_

Sets Wi-Fi credentials on the hub. Automatically advances status from `not configured` → `configured`.

**Request Body:**
```json
{
  "ssid": "JioFiber_Godown_5G",
  "password": "SecurePass2026!"
}
```

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Wi-Fi configured successfully",
  "data": {
    "_id": "6ae32896cad5521f756a33ac",
    "name": "Main Godown Hub",
    "mac_id": "AA:BB:CC:DD:EE:FF",
    "wifi": { "ssid": "JioFiber_Godown_5G" },
    "status": "configured",
    "updatedAt": "2026-10-29T11:06:29.975Z"
  }
}
```

> **Security:** `password` is stored encrypted and **never returned** in any response.

**Validation `400`:** Both `ssid` and `password` are required.

---

#### 6. Update Hub Status
**`PATCH /api/hardware/hubs/:id/status`** — _Protected_

**Request Body:**
```json
{ "status": "active" }
```

Allowed values: `not configured`, `configured`, `active`, `deactivated`

**Response `200 OK`:** Updated hub object.
**Error `400`:** Invalid status value.

---

#### 7. Update Hub Info
**`PATCH /api/hardware/hubs/:id`** — _Protected_

Update hub `name` or `userId`.

**Request Body (all optional):**
```json
{
  "name": "Main Godown Hub Updated",
  "userId": "6ae31cca0c00fa1dfe7e3c99"
}
```

**Response `200 OK`:** Updated hub object.

---

#### 8. Delete Hub
**`DELETE /api/hardware/hubs/:id`** — _Protected_

Permanently deletes a hub record.

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hub deleted successfully",
  "data": { "message": "Hub deleted successfully" }
}
```

**Error `404`:** Hub not found.

---

### KitchenBox APIs — `/api/hardware/boxes`

The **KitchenBox** (Chakki Box) is a smart sensor container paired to a hub. A Time-of-Flight (ToF) sensor inside measures grain levels.

---

#### 9. Register KitchenBox
**`POST /api/hardware/boxes`** — _Protected_

Registers a new KitchenBox device. Validates that the parent hub (`hub_mac_id`) exists.

**Request Body:**
```json
{
  "name": "Chakki Container 1",
  "mac_id": "24:0A:C4:11:00:55",
  "hub_mac_id": "AA:BB:CC:DD:EE:FF",
  "userId": "6ae31cca0c00fa1dfe7e3c99",
  "item_name": "Premium Wheat",
  "dimensions": "1200x800x1000"
}
```

**Response `201 Created`:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "KitchenBox registered successfully",
  "data": {
    "_id": "6ae328c3cad5521f756a33c6",
    "name": "Chakki Container 1",
    "mac_id": "24:0A:C4:11:00:55",
    "hub_mac_id": "AA:BB:CC:DD:EE:FF",
    "userId": "6ae31cca0c00fa1dfe7e3c99",
    "item_name": "Premium Wheat",
    "dimensions": "1200x800x1000",
    "tof": null,
    "image": null,
    "status": "provisioned",
    "createdAt": "2026-10-29T11:06:43.447Z",
    "updatedAt": "2026-10-29T11:06:43.447Z"
  }
}
```

**Validation `400`:** `name`, `mac_id`, `hub_mac_id`, `userId` are required. `mac_id` must be valid MAC format.
**Error `404`:** Parent hub with given `hub_mac_id` not found.
**Conflict `409`:** MAC ID already registered.

---

#### 10. List KitchenBoxes
**`GET /api/hardware/boxes`** — _Protected_

Returns all KitchenBoxes. Supports filtering by hub, status, and pagination.

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `hub_mac_id` | string | Filter by parent hub MAC |
| `status` | string | Filter by status |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 20, max: 100) |

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBoxes retrieved successfully",
  "data": {
    "boxes": [ { ...kitchenBoxObject } ],
    "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
  }
}
```

---

#### 11. Get KitchenBox by ID
**`GET /api/hardware/boxes/:id`** — _Protected_

**Response `200 OK`:** Single KitchenBox object.
**Error `404`:** KitchenBox not found.

---

#### 12. Get KitchenBox by MAC ID
**`GET /api/hardware/boxes/mac/:mac_id`** — _Protected_

Lookup box by its hardware MAC address.

**Example:** `GET /api/hardware/boxes/mac/24:0A:C4:11:00:55`

**Response `200 OK`:** Single KitchenBox object.
**Error `404`:** KitchenBox not found.

---

#### 13. Update KitchenBox Info
**`PATCH /api/hardware/boxes/:id`** — _Protected_

Update general info fields.

**Request Body (all optional):**
```json
{
  "name": "Chakki Container 1",
  "item_name": "Premium Basmati Rice",
  "dimensions": "1500x900x1200",
  "image": "https://cdn.arangtik.com/boxes/img.jpg"
}
```

**Response `200 OK`:** Updated KitchenBox object.

---

#### 14. Push ToF Reading
**`PATCH /api/hardware/boxes/:id/tof`** — _Protected_

Called by the hub device to push live Time-of-Flight sensor reading.

**Request Body:**
```json
{ "tof": 350 }
```

> `tof` is the raw distance in **millimetres** from the sensor to the grain surface.

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "ToF reading updated successfully",
  "data": {
    "_id": "6ae328c3cad5521f756a33c6",
    "tof": 350,
    "updatedAt": "2026-10-29T11:07:02.341Z"
  }
}
```

**Validation `400`:** `tof` must be a valid number.

---

#### 15. Update KitchenBox Status
**`PATCH /api/hardware/boxes/:id/status`** — _Protected_

**Request Body:**
```json
{ "status": "activated" }
```

Allowed values: `provisioned`, `activated`, `maintenance`, `deactivated`

**Response `200 OK`:** Updated KitchenBox object.
**Error `400`:** Invalid status value.

---

#### 16. Delete KitchenBox
**`DELETE /api/hardware/boxes/:id`** — _Protected_

Permanently deletes a KitchenBox record.

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBox deleted successfully",
  "data": { "message": "KitchenBox deleted successfully" }
}
```

**Error `404`:** KitchenBox not found.

---

### Hardware API — Quick Reference

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | `POST` | `/api/hardware/hubs` | Register new hub |
| 2 | `GET` | `/api/hardware/hubs` | List hubs (paginated) |
| 3 | `GET` | `/api/hardware/hubs/:id` | Get hub by ID |
| 4 | `GET` | `/api/hardware/hubs/mac/:mac_id` | Get hub by MAC address |
| 5 | `PATCH` | `/api/hardware/hubs/:id/wifi` | Set Wi-Fi SSID + password |
| 6 | `PATCH` | `/api/hardware/hubs/:id/status` | Update hub status |
| 7 | `PATCH` | `/api/hardware/hubs/:id` | Update hub name / userId |
| 8 | `DELETE` | `/api/hardware/hubs/:id` | Delete hub |
| 9 | `POST` | `/api/hardware/boxes` | Register new KitchenBox |
| 10 | `GET` | `/api/hardware/boxes` | List KitchenBoxes (paginated) |
| 11 | `GET` | `/api/hardware/boxes/:id` | Get KitchenBox by ID |
| 12 | `GET` | `/api/hardware/boxes/mac/:mac_id` | Get KitchenBox by MAC address |
| 13 | `PATCH` | `/api/hardware/boxes/:id` | Update name / item / dimensions / image |
| 14 | `PATCH` | `/api/hardware/boxes/:id/tof` | Push live ToF sensor reading (mm) |
| 15 | `PATCH` | `/api/hardware/boxes/:id/status` | Update KitchenBox status |
| 16 | `DELETE` | `/api/hardware/boxes/:id` | Delete KitchenBox |

**Hub status values:** `not configured` → `configured` → `active` → `deactivated`
**Box status values:** `provisioned` → `activated` → `maintenance` → `deactivated`


---

## Admin Hardware Module APIs — `/api/admin/hardware`

> **Base path:** `http://localhost:8083/api/admin/hardware`
> **Authentication:** Requires Admin Authorization:
> - Either `Authorization: Bearer <admin_jwt_token>`
> - Or `x-api-key: <YOUR_ADMIN_API_KEY>`

These APIs power the Admin Panel dashboard to monitor, search, inspect, update, and manage both **Hubs** and **KitchenBoxes** across all users.

---

### 1. Hardware Overview & KPI Statistics
**`GET /api/admin/hardware/stats`** — _Admin_

Returns aggregated statistics for all hubs and kitchen boxes in the system.

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hardware statistics retrieved successfully",
  "data": {
    "hubs": {
      "total": 3,
      "active": 1,
      "configured": 1,
      "notConfigured": 1,
      "deactivated": 0
    },
    "boxes": {
      "total": 3,
      "activated": 2,
      "provisioned": 1,
      "maintenance": 0,
      "deactivated": 0,
      "withLiveTof": 2
    }
  }
}
```

---

### 2. Admin: List All Hubs
**`GET /api/admin/hardware/hubs`** — _Admin_

List all registered hubs across all customers with populated owner info and paired box counts. Supports pagination, keyword search (name, MAC, SSID, user phone/name), and status filtering.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |
| `search` | string | Keyword search matching hub name, MAC address, Wi-Fi SSID, user name, or phone |
| `status` | string | Filter by status: `not configured`, `configured`, `active`, `deactivated` (or `ALL`) |
| `sortBy` | string | Sort field (default: `createdAt`) |
| `sortOrder` | string | `asc` or `desc` (default: `desc`) |

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hubs retrieved successfully",
  "data": {
    "hubs": [
      {
        "_id": "6ae32a10cad5521f756a33e2",
        "name": "Sharma Chakki - Main Hub",
        "mac_id": "3C:71:BF:4A:92:11",
        "userId": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Arangtik User",
          "phone": "918949056321",
          "role": "user",
          "accountType": "INDIVIDUAL"
        },
        "wifi": {
          "ssid": "JioFiber_Chakki_5G"
        },
        "status": "active",
        "pairedBoxesCount": 2,
        "createdAt": "2026-10-29T11:12:16.892Z",
        "updatedAt": "2026-10-29T11:12:16.980Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

---

### 3. Admin: Get Hub Details by ID
**`GET /api/admin/hardware/hubs/:id`** — _Admin_

Returns single hub details, populated user profile, and an array of all paired `pairedBoxes`.

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hub details retrieved successfully",
  "data": {
    "_id": "6ae32a10cad5521f756a33e2",
    "name": "Sharma Chakki - Main Hub",
    "mac_id": "3C:71:BF:4A:92:11",
    "userId": {
      "_id": "6ae31cca0c00fa1dfe7e3c99",
      "name": "Arangtik User",
      "phone": "918949056321"
    },
    "wifi": {
      "ssid": "JioFiber_Chakki_5G"
    },
    "status": "active",
    "pairedBoxes": [
      {
        "_id": "6ae32a22cad5521f756a33f5",
        "name": "Gehun Container 1",
        "mac_id": "24:0A:C4:11:00:55",
        "item_name": "Premium Wheat (Gehun)",
        "tof": 280,
        "status": "activated"
      }
    ],
    "pairedBoxesCount": 1
  }
}
```

---

### 4. Admin: Update Hub Details
**`PATCH /api/admin/hardware/hubs/:id`** — _Admin_

**Request Body (optional fields):**
```json
{
  "name": "Sharma Chakki - Main Hub Updated",
  "status": "active",
  "wifi": {
    "ssid": "NewSSID_5G"
  }
}
```

---

### 5. Admin: Update Hub Status
**`PATCH /api/admin/hardware/hubs/:id/status`** — _Admin_

**Request Body:**
```json
{
  "status": "maintenance"
}
```
Allowed values: `not configured`, `configured`, `active`, `deactivated`

---

### 6. Admin: Delete Hub
**`DELETE /api/admin/hardware/hubs/:id`** — _Admin_

Permanently removes the hub document from the database.

---

### 7. Admin: List All KitchenBoxes
**`GET /api/admin/hardware/boxes`** — _Admin_

List all KitchenBoxes across all customers with populated owner info and resolved parent Hub information. Supports search by box name, MAC address, item name, hub MAC, or user phone.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10, max: 100) |
| `search` | string | Keyword search matching box name, MAC, hub MAC, item name, or user phone |
| `status` | string | Filter by status: `provisioned`, `activated`, `maintenance`, `deactivated` (or `ALL`) |
| `hub_mac_id` | string | Filter by parent Hub MAC address |
| `sortBy` | string | Sort field (default: `createdAt`) |
| `sortOrder` | string | `asc` or `desc` (default: `desc`) |

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBoxes retrieved successfully",
  "data": {
    "boxes": [
      {
        "_id": "6ae32a22cad5521f756a33f5",
        "name": "Gehun Container 1",
        "mac_id": "24:0A:C4:11:00:55",
        "hub_mac_id": "3C:71:BF:4A:92:11",
        "item_name": "Premium Wheat (Gehun)",
        "dimensions": "1200x800x1000",
        "tof": 280,
        "status": "activated",
        "userId": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Arangtik User",
          "phone": "918949056321"
        },
        "hub": {
          "name": "Sharma Chakki - Main Hub",
          "mac_id": "3C:71:BF:4A:92:11",
          "status": "active"
        },
        "createdAt": "2026-10-29T11:12:34.200Z",
        "updatedAt": "2026-10-29T11:12:34.400Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

---

### 8. Admin: Get KitchenBox Details by ID
**`GET /api/admin/hardware/boxes/:id`** — _Admin_

Returns single box details, populated user profile, and parent hub connection info.

---

### 9. Admin: Update KitchenBox Details
**`PATCH /api/admin/hardware/boxes/:id`** — _Admin_

**Request Body (optional fields):**
```json
{
  "name": "Gehun Container 1",
  "item_name": "Premium Wheat (Sharbati)",
  "dimensions": "1200x800x1000",
  "tof": 250,
  "status": "activated"
}
```

---

### 10. Admin: Update KitchenBox Status
**`PATCH /api/admin/hardware/boxes/:id/status`** — _Admin_

**Request Body:**
```json
{
  "status": "maintenance"
}
```
Allowed values: `provisioned`, `activated`, `maintenance`, `deactivated`

---

### 11. Admin: Delete KitchenBox
**`DELETE /api/admin/hardware/boxes/:id`** — _Admin_

Permanently deletes the KitchenBox record from the database.
