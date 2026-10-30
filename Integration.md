# Arangtik Integration & Partner API Documentation

This document covers all **Service Integration & Partner Sync APIs** in Arangtik. These endpoints allow authorized administrative systems, external service platforms, and IoT microservices to synchronize and query core platform assets (**Users**, **IoT Hub Gateways**, and **Kitchen Containers**).

---

## 1. Authentication & Security

All requests to the Integration API require authentication via the **`x-api-key`** header:

```http
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

> **Base URL:**
> - Development: `http://localhost:8083/api`
> - Production: `https://api.arangtik.com/api`

---

## 2. Standard Response Format

All responses follow the consistent Arangtik envelope format:

### Success Response (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Human-readable success message",
  "data": { ... }
}
```

### Error Response (`400 / 401 / 403 / 404 / 500`)
```json
{
  "statusCode": 401,
  "success": false,
  "message": "Unauthorized: Missing API Key. Provide it in x-api-key header.",
  "errors": []
}
```

---

## 3. User Integration APIs

Endpoints for synchronizing user directory and platform-wide user analytics.

---

### 3.1 Get Platform User Overview & Stats
Retrieves aggregated statistics and demographics of platform users, including total counts, active user counts, gender breakdown, and account types.

- **Endpoint:** `GET /api/integration/stats`
- **Method:** `GET`
- **Authentication:** `x-api-key` header required
- **Query Parameters:** None

#### Request Example
```http
GET /api/integration/stats HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Platform statistics retrieved successfully",
  "data": {
    "stats": {
      "totalUsers": 201,
      "activeUsers": 200,
      "genderBreakdown": {
        "FEMALE": 100,
        "MALE": 100,
        "UNSPECIFIED": 1
      },
      "accountTypeBreakdown": {
        "INDIVIDUAL": 187,
        "COMMERCIAL": 14
      }
    }
  }
}
```

---

### 3.2 Get All Users (Paginated & Filterable)
Retrieves a paginated list of registered users. Supports keyword search (name, phone), filtering by account status, gender, and account type, along with customizable sorting. Excludes sensitive data (such as raw biometric face vectors).

- **Endpoint:** `GET /api/integration/users`
- **Method:** `GET`
- **Authentication:** `x-api-key` header required

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | Integer | `1` | Page number for pagination |
| `limit` | Integer | `20` | Items per page (max: 100) |
| `search` | String | `""` | Search keyword matching user name or phone number |
| `status` | String | - | Filter by status (`active`, `inactive`, `blocked`) |
| `gender` | String | - | Filter by gender (`MALE`, `FEMALE`, `OTHER`, `UNSPECIFIED`) |
| `accountType` | String | - | Filter by type (`INDIVIDUAL`, `COMMERCIAL`) |
| `sortBy` | String | `createdAt` | Field to sort by (`createdAt`, `name`, `phone`) |
| `order` | String | `desc` | Sort direction (`asc` or `desc`) |

#### Request Example
```http
GET /api/integration/users?page=1&limit=2&status=active HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Users data retrieved successfully",
  "data": {
    "users": [
      {
        "_id": "6ae31cca0c00fa1dfe7e3c99",
        "name": "Monika",
        "phone": "918949056321",
        "role": "user",
        "status": "active",
        "gender": "UNSPECIFIED",
        "accountType": "INDIVIDUAL",
        "country": "India",
        "currency": "INR",
        "preferredLanguage": "en",
        "profileImage": "",
        "createdAt": "2026-10-29T10:15:38.304Z",
        "updatedAt": "2026-10-29T10:15:38.304Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "perPage": 2,
      "totalRecords": 201,
      "totalPages": 101,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 3.3 Get User Details by ID or Phone
Retrieves full safe profile details of a single user by providing their MongoDB `_id` or 10-12 digit phone number. Also returns the count of wardrobe assets associated with the user.

- **Endpoint:** `GET /api/integration/users/:identifier`
- **Method:** `GET`
- **Authentication:** `x-api-key` header required
- **URL Parameters:**
  - `identifier`: MongoDB User `_id` (e.g. `6ae31cca0c00fa1dfe7e3c99`) OR Phone number (e.g. `918949056321`)

#### Request Example
```http
GET /api/integration/users/918949056321 HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "_id": "6ae31cca0c00fa1dfe7e3c99",
      "name": "Monika",
      "phone": "918949056321",
      "role": "user",
      "status": "active",
      "gender": "UNSPECIFIED",
      "accountType": "INDIVIDUAL",
      "country": "India",
      "currency": "INR",
      "preferredLanguage": "en",
      "profileImage": "",
      "createdAt": "2026-10-29T10:15:38.304Z",
      "updatedAt": "2026-10-29T10:15:38.304Z",
      "wardrobeItemCount": 0
    }
  }
}
```

#### Error Response (`404 Not Found`)
```json
{
  "statusCode": 404,
  "success": false,
  "message": "User not found with the given ID or Phone",
  "errors": []
}
```

---

## 4. Hub Integration APIs

Endpoints for querying physical IoT Hub Gateways installed at godowns, mills, and customer premises.

---

### 4.1 Get All Hubs (Paginated & Filterable)
Returns all registered Hub Gateways across the platform with owner details (`name`, `phone`) and dynamically calculated `pairedBoxesCount` (number of containers paired with the hub).

- **Endpoint:** `GET /api/integration/hubs`
- **Method:** `GET`
- **Authentication:** `x-api-key` header required

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | Integer | `1` | Page number |
| `limit` | Integer | `20` | Results per page (max: 100) |
| `search` | String | `""` | Search keyword matching hub name, MAC address, or Wi-Fi SSID |
| `status` | String | - | Filter by status (`not configured`, `configured`, `active`, `deactivated`, or `ALL`) |
| `userId` | String | - | Filter hubs belonging to a specific MongoDB User `_id` |
| `sortBy` | String | `createdAt` | Sort field |
| `order` | String | `desc` | Sort direction (`asc` or `desc`) |

#### Request Example
```http
GET /api/integration/hubs?page=1&limit=10&status=active HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hubs data retrieved successfully",
  "data": {
    "hubs": [
      {
        "_id": "6ae32a10cad5521f756a33e2",
        "name": "Sharma Chakki - Main Hub",
        "mac_id": "3C:71:BF:4A:92:11",
        "userId": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Monika",
          "phone": "918949056321",
          "role": "user",
          "accountType": "INDIVIDUAL"
        },
        "wifi": {
          "ssid": "JioFiber_Chakki_5G"
        },
        "status": "active",
        "pairedBoxesCount": 2,
        "createdAt": "2026-10-29T11:12:16.773Z",
        "updatedAt": "2026-10-29T11:12:16.909Z",
        "__v": 0
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 4.2 Get Hub Details by ID or MAC Address
Fetches single Hub details along with the full array of all currently paired **KitchenBoxes** (`pairedBoxes`) and owner profile. Accepts either the Hub's MongoDB `_id` or physical hardware `mac_id`.

- **Endpoint:** `GET /api/integration/hubs/:id`
- **Method:** `GET`
- **Authentication:** `x-api-key` header required
- **URL Parameters:**
  - `id`: MongoDB Hub `_id` (e.g. `6ae32a10cad5521f756a33e2`) OR Hub Hardware MAC address (e.g. `3C:71:BF:4A:92:11`)

#### Request Example
```http
GET /api/integration/hubs/3C:71:BF:4A:92:11 HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hub details retrieved successfully",
  "data": {
    "hub": {
      "_id": "6ae32a10cad5521f756a33e2",
      "name": "Sharma Chakki - Main Hub",
      "mac_id": "3C:71:BF:4A:92:11",
      "userId": {
        "_id": "6ae31cca0c00fa1dfe7e3c99",
        "name": "Monika",
        "phone": "918949056321",
        "role": "user",
        "accountType": "INDIVIDUAL",
        "country": "India"
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
          "hub_mac_id": "3C:71:BF:4A:92:11",
          "item_name": "Premium Wheat (Gehun)",
          "dimensions": "1200x800x1000",
          "tof": 280,
          "status": "activated"
        },
        {
          "_id": "6ae32a22cad5521f756a33fd",
          "name": "Makka Bin A",
          "mac_id": "24:0A:C4:22:BB:01",
          "hub_mac_id": "3C:71:BF:4A:92:11",
          "item_name": "Maize (Makka)",
          "dimensions": "900x700x800",
          "tof": 620,
          "status": "activated"
        }
      ],
      "pairedBoxesCount": 2,
      "createdAt": "2026-10-29T11:12:16.773Z",
      "updatedAt": "2026-10-29T11:12:16.909Z",
      "__v": 0
    }
  }
}
```

#### Error Response (`404 Not Found`)
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Hub not found with given ID or MAC address",
  "errors": []
}
```

---

## 5. KitchenBox Integration APIs

Endpoints for querying smart containers equipped with Time-of-Flight (ToF) grain depth sensors.

---

### 5.1 Get All KitchenBoxes (Paginated & Filterable)
Returns all registered KitchenBoxes across the system. Each item includes populated owner info and resolved parent Hub information (`name`, `mac_id`, `status`).

- **Endpoint:** `GET /api/integration/boxes` *(Alias: `GET /api/integration/kitchen-boxes`)*
- **Method:** `GET`
- **Authentication:** `x-api-key` header required

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | Integer | `1` | Page number |
| `limit` | Integer | `20` | Results per page (max: 100) |
| `search` | String | `""` | Search keyword matching box name, box MAC, hub MAC, or item name |
| `status` | String | - | Filter by status (`provisioned`, `activated`, `maintenance`, `deactivated`, or `ALL`) |
| `hub_mac_id` | String | - | Filter boxes paired to a specific parent Hub MAC |
| `userId` | String | - | Filter boxes owned by a specific MongoDB User `_id` |
| `sortBy` | String | `createdAt` | Sort field |
| `order` | String | `desc` | Sort direction (`asc` or `desc`) |

#### Request Example
```http
GET /api/integration/boxes?page=1&limit=10&status=activated HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
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
        "userId": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Monika",
          "phone": "918949056321",
          "role": "user",
          "accountType": "INDIVIDUAL"
        },
        "item_name": "Premium Wheat (Gehun)",
        "dimensions": "1200x800x1000",
        "tof": 280,
        "image": null,
        "status": "activated",
        "hub": {
          "_id": "6ae32a10cad5521f756a33e2",
          "name": "Sharma Chakki - Main Hub",
          "mac_id": "3C:71:BF:4A:92:11",
          "wifi": {
            "ssid": "JioFiber_Chakki_5G"
          },
          "status": "active"
        },
        "createdAt": "2026-10-29T11:12:34.140Z",
        "updatedAt": "2026-10-29T11:12:34.270Z",
        "__v": 0
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### 5.2 Get KitchenBox Details by ID or MAC Address
Fetches single KitchenBox details including physical dimensions, current live ToF reading (mm), owner details, and parent gateway hub status. Accepts either the Box MongoDB `_id` or hardware `mac_id`.

- **Endpoint:** `GET /api/integration/boxes/:id`
- **Method:** `GET`
- **Authentication:** `x-api-key` header required
- **URL Parameters:**
  - `id`: MongoDB KitchenBox `_id` (e.g. `6ae32a22cad5521f756a33f5`) OR Box Hardware MAC address (e.g. `24:0A:C4:11:00:55`)

#### Request Example
```http
GET /api/integration/boxes/24:0A:C4:11:00:55 HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBox details retrieved successfully",
  "data": {
    "box": {
      "_id": "6ae32a22cad5521f756a33f5",
      "name": "Gehun Container 1",
      "mac_id": "24:0A:C4:11:00:55",
      "hub_mac_id": "3C:71:BF:4A:92:11",
      "userId": {
        "_id": "6ae31cca0c00fa1dfe7e3c99",
        "name": "Monika",
        "phone": "918949056321",
        "role": "user",
        "accountType": "INDIVIDUAL",
        "country": "India"
      },
      "item_name": "Premium Wheat (Gehun)",
      "dimensions": "1200x800x1000",
      "tof": 280,
      "image": null,
      "status": "activated",
      "hub": {
        "_id": "6ae32a10cad5521f756a33e2",
        "name": "Sharma Chakki - Main Hub",
        "mac_id": "3C:71:BF:4A:92:11",
        "wifi": {
          "ssid": "JioFiber_Chakki_5G"
        },
        "status": "active"
      },
      "createdAt": "2026-10-29T11:12:34.140Z",
      "updatedAt": "2026-10-29T11:12:34.270Z",
      "__v": 0
    }
  }
}
```

#### Error Response (`404 Not Found`)
```json
{
  "statusCode": 404,
  "success": false,
  "message": "KitchenBox not found with given ID or MAC address",
  "errors": []
}
```

---

### 5.3 Get KitchenBoxes by Hub Identifier
Retrieves all kitchen containers paired with a specific Hub Gateway. The Hub identifier can be either the Hub's MongoDB `_id` or the Hub's physical `mac_id`.

- **Endpoint:** `GET /api/integration/boxes/hub/:hubId`
- **Method:** `GET`
- **Authentication:** `x-api-key` header required
- **URL Parameters:**
  - `hubId`: MongoDB Hub `_id` (e.g. `6ae32a10cad5521f756a33e2`) OR Hub Hardware MAC address (e.g. `3C:71:BF:4A:92:11`)
- **Query Parameters:**
  - `status`: Filter boxes by status (`provisioned`, `activated`, `maintenance`, `deactivated`)
  - `sortBy`: Field to sort (`createdAt`, `name`)
  - `order`: `asc` or `desc`

#### Request Example
```http
GET /api/integration/boxes/hub/3C:71:BF:4A:92:11 HTTP/1.1
Host: localhost:8083
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

#### Response Example (`200 OK`)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBoxes for hub 3C:71:BF:4A:92:11 retrieved successfully",
  "data": {
    "hub": {
      "_id": "6ae32a10cad5521f756a33e2",
      "name": "Sharma Chakki - Main Hub",
      "mac_id": "3C:71:BF:4A:92:11",
      "wifi": {
        "ssid": "JioFiber_Chakki_5G"
      },
      "status": "active"
    },
    "boxes": [
      {
        "_id": "6ae32a22cad5521f756a33f5",
        "name": "Gehun Container 1",
        "mac_id": "24:0A:C4:11:00:55",
        "hub_mac_id": "3C:71:BF:4A:92:11",
        "userId": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Monika",
          "phone": "918949056321",
          "role": "user",
          "accountType": "INDIVIDUAL"
        },
        "item_name": "Premium Wheat (Gehun)",
        "dimensions": "1200x800x1000",
        "tof": 280,
        "image": null,
        "status": "activated",
        "createdAt": "2026-10-29T11:12:34.140Z",
        "updatedAt": "2026-10-29T11:12:34.270Z",
        "__v": 0
      },
      {
        "_id": "6ae32a22cad5521f756a33fd",
        "name": "Makka Bin A",
        "mac_id": "24:0A:C4:22:BB:01",
        "hub_mac_id": "3C:71:BF:4A:92:11",
        "userId": {
          "_id": "6ae31cca0c00fa1dfe7e3c99",
          "name": "Monika",
          "phone": "918949056321",
          "role": "user",
          "accountType": "INDIVIDUAL"
        },
        "item_name": "Maize (Makka)",
        "dimensions": "900x700x800",
        "tof": 620,
        "image": null,
        "status": "activated",
        "createdAt": "2026-10-29T11:12:34.365Z",
        "updatedAt": "2026-10-29T11:12:34.489Z",
        "__v": 0
      }
    ],
    "total": 2
  }
}
```

---

## 6. KitchenBox Captures Integration API

Endpoint for synchronizing IoT sensor measurement snapshots (depth reading via ToF distance sensor, container camera image, and dimensions).

---

### 6.1 Record a New Sensor Snapshot
**`POST /api/integration/captures`**

Records a new measurement snapshot for a kitchen box and gateway hub. When recorded, it automatically updates and synchronizes the parent `KitchenBox` record's latest `tof` reading, `image`, and `dimensions`.

**Headers:**
```http
x-api-key: <YOUR_INTEGRATION_API_KEY>
Content-Type: application/json
```

**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `kitchenBoxId` | string | **Yes** | KitchenBox MongoDB `_id` or MAC address (e.g. `6ae46078ba40a72fb41abf88` or `10:20:30:40:50:99`) |
| `hubId` | string | No | Gateway Hub MongoDB `_id` or MAC address. If omitted, automatically resolves from the box's parent Hub |
| `image` | string | No | URL of the container / commodity photo |
| `tof` | number | No | ToF depth distance reading in millimeters (e.g. `310`) |
| `dimensions` | string | No | Container dimensions (e.g. `300x200x400`). Defaults to box's dimensions if omitted |

**Example Request:**
```json
{
  "kitchenBoxId": "6ae46078ba40a72fb41abf88",
  "hubId": "6ae46078ba40a72fb41abf80",
  "image": "https://cdn.arangtik.com/captures/grain_depth_01.jpg",
  "tof": 310,
  "dimensions": "300x200x400"
}
```

**Response `201 Created`:**
```json
{
  "statusCode": 201,
  "data": {
    "_id": "6ae47f0842fe046aabb46dca",
    "kitchenBoxId": {
      "_id": "6ae46078ba40a72fb41abf88",
      "name": "Chana Dal Container 2",
      "mac_id": "10:20:30:40:50:99",
      "item_name": "Roasted Chana Dal",
      "dimensions": "300x200x400",
      "status": "activated"
    },
    "hubId": {
      "_id": "6ae46078ba40a72fb41abf80",
      "name": "Jaipur North Godown Hub",
      "mac_id": "3C:71:BF:4A:92:11",
      "status": "active"
    },
    "image": "https://cdn.arangtik.com/captures/grain_depth_01.jpg",
    "tof": 310,
    "dimensions": "300x200x400",
    "createdAt": "2026-10-30T11:27:04.583Z",
    "updatedAt": "2026-10-30T11:27:04.583Z"
  },
  "message": "KitchenBox sensor capture snapshot recorded successfully",
  "success": true
}
```

---

## 7. Summary of Integration Endpoints

| Resource | Method | Endpoint | Description |
|---|---|---|---|
| **User** | `GET` | `/api/integration/stats` | Platform-wide user analytics & breakdowns |
| **User** | `GET` | `/api/integration/users` | List all users (paginated, filterable, searchable) |
| **User** | `GET` | `/api/integration/users/:identifier` | Single user details by MongoDB `_id` or Phone |
| **Hub** | `GET` | `/api/integration/hubs` | List all IoT Hub gateways with paired box counts |
| **Hub** | `GET` | `/api/integration/hubs/:id` | Single Hub details by MongoDB `_id` or MAC address |
| **KitchenBox** | `GET` | `/api/integration/boxes` | List all kitchen containers with ToF readings & parent hub |
| **KitchenBox** | `GET` | `/api/integration/boxes/:id` | Single KitchenBox details by MongoDB `_id` or MAC |
| **KitchenBox** | `GET` | `/api/integration/boxes/hub/:hubId` | All KitchenBoxes paired to a specific Hub (`_id` or MAC) |
| **Capture** | `POST` | `/api/integration/captures` | Record new sensor snapshot (`tof`, `image`, `dimensions`) & auto-sync box |

