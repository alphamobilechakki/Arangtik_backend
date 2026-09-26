# Arangtik Backend API Documentation

**Base URL:** `http://localhost:5000/api`

---

## 1. Health Check

### Endpoint: `/api/health`
- **Method:** `GET`
- **Description:** Server status aur health check karne ke liye.
- **Access:** Public

#### Request:
- **Headers:** None
- **Body:** None

#### Response:
**200 OK:**
```json
{
  "status": "ok",
  "message": "Arangtik Backend API is healthy"
}
```

---

## 2. Auth Module

### 2.1 Send OTP
- **Method:** `POST`
- **Endpoint:** `/api/auth/send-otp`
- **Description:** WhatsApp par 4-digit OTP bhejta hai aur check karta hai ki user registered hai ya new.
- **Access:** Public

#### Request:
- **Headers:**
  - `Content-Type: application/json`
- **Body:**
```json
{
  "phone": "9876543210"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | Yes | 10-digit mobile number |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "phone": "919876543210",
    "isExistingUser": false,
    "expiresInMinutes": 5,
    "devOtp": "4821"
  },
  "message": "OTP sent successfully to your WhatsApp number",
  "success": true
}
```

**400 Bad Request (Validation Error):**
```json
{
  "statusCode": 400,
  "message": "Please provide a valid 10-digit mobile number",
  "success": false
}
```

---

### 2.2 Verify OTP
- **Method:** `POST`
- **Endpoint:** `/api/auth/verify-otp`
- **Description:** OTP verify karta hai, new user ko register karta hai (agar user exist nahi karta), aur JWT auth token return karta hai.
- **Access:** Public

#### Request:
- **Headers:**
  - `Content-Type: application/json`
- **Body:**
```json
{
  "phone": "9876543210",
  "otp": "4821",
  "name": "Rahul Sharma"
}
```
| Field | Type | Required | Description |
|---|---|---|---|
| `phone` | `string` | Yes | 10-digit mobile number |
| `otp` | `string` | Yes | 4-digit OTP |
| `name` | `string` | Optional | User ka name (new user ke case me save hota hai) |

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Rahul Sharma",
      "phone": "919876543210",
      "role": "user",
      "status": "active"
    },
    "isNewUser": true
  },
  "message": "Authentication successful",
  "success": true
}
```

**400 Bad Request (Invalid or Expired OTP):**
```json
{
  "statusCode": 400,
  "message": "Invalid or expired OTP",
  "success": false
}
```

**403 Forbidden (Blocked User):**
```json
{
  "statusCode": 403,
  "message": "Your account has been deactivated or blocked. Please contact support.",
  "success": false
}
```

---

### 2.3 Get Current User Profile
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Description:** Logged-in user ki profile details fetch karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Body:** None

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": {
    "_id": "65f1a2b3c4d5e6f7a8b9c0d1",
    "phone": "919876543210",
    "name": "Rahul Sharma",
    "role": "user",
    "status": "active",
    "createdAt": "2026-09-26T10:00:00.000Z",
    "updatedAt": "2026-09-26T10:00:00.000Z"
  },
  "message": "User profile fetched successfully",
  "success": true
}
```

**401 Unauthorized (Token Missing / Invalid):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access, token missing",
  "success": false
}
```

**404 Not Found (User Not Found):**
```json
{
  "statusCode": 404,
  "message": "User not found",
  "success": false
}
```

---

### 2.4 Logout
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Description:** User session logout karta hai.
- **Access:** Private (Requires JWT Token)

#### Request:
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>`
- **Body:** None

#### Response:
**200 OK (Success):**
```json
{
  "statusCode": 200,
  "data": null,
  "message": "Logged out successfully",
  "success": true
}
```

**401 Unauthorized (Token Missing / Invalid):**
```json
{
  "statusCode": 401,
  "message": "Unauthorized access, token missing",
  "success": false
}
```
