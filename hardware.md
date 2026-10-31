
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

### KitchenBox Captures APIs — `/api/hardware/captures`

The **KitchenBox Capture** represents a physical IoT measurement snapshot (depth reading via ToF distance sensor, high-resolution container image, and dimensions) taken by or associated with a KitchenBox container and its parent Gateway Hub.

> **Base path:** `/api/hardware/captures`  
> **Auth:** `Authorization: Bearer <token>`

---

#### 17. Record KitchenBox Capture Snapshot
**`POST /api/hardware/captures`** — _Protected_

Records a new sensor capture snapshot into the database. When recorded, it automatically synchronizes and updates the parent `KitchenBox` record with the latest `tof` reading, `image`, and `dimensions`.

**Request Body:**
| Field | Type | Required | Description |
|---|---|---|---|
| `kitchenBoxId` | string (ObjectId or MAC) | **Yes** | Container ID or MAC address (e.g. `6ae46078ba40a72fb41abf88` or `10:20:30:40:50:99`) |
| `hubId` | string (ObjectId or MAC) | No | Gateway Hub ID or MAC address. If omitted, automatically resolves from the box's parent Hub. |
| `image` | string | No | URL of the captured container/grain image |
| `tof` | number | No | Time-of-Flight distance measurement in millimeters (e.g. `385`) |
| `dimensions` | string | No | Container dimensions (e.g. `300x200x400`). Defaults to box's dimensions if omitted. |

**Example Request:**
```json
{
  "kitchenBoxId": "6ae46078ba40a72fb41abf88",
  "hubId": "6ae46078ba40a72fb41abf80",
  "image": "https://cdn.arangtik.com/captures/cam01_sample_depth.jpg",
  "tof": 385,
  "dimensions": "300x200x400"
}
```

**Response `201 Created`:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "KitchenBox capture saved successfully",
  "data": {
    "_id": "6ae47aa385d305a394464885",
    "kitchenBoxId": {
      "_id": "6ae46078ba40a72fb41abf88",
      "name": "Chana Dal Container 2",
      "mac_id": "10:20:30:40:50:99",
      "item_name": "Chana Dal",
      "dimensions": "300x200x400",
      "status": "activated"
    },
    "hubId": {
      "_id": "6ae46078ba40a72fb41abf80",
      "name": "Jaipur North Godown Hub",
      "mac_id": "3C:71:BF:4A:92:11",
      "status": "active"
    },
    "image": "https://cdn.arangtik.com/captures/cam01_sample_depth.jpg",
    "tof": 385,
    "dimensions": "300x200x400",
    "createdAt": "2026-10-30T11:07:47.000Z",
    "updatedAt": "2026-10-30T11:07:47.000Z"
  }
}
```

---

#### 18. List All KitchenBox Captures
**`GET /api/hardware/captures`** — _Protected_

Retrieves a paginated list of all capture snapshots with optional filtering by container, gateway hub, or date range.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `kitchenBoxId` | string | Filter by specific KitchenBox ObjectId or MAC address |
| `hubId` | string | Filter by specific Gateway Hub ObjectId or MAC address |
| `startDate` | ISO Date string | Filter captures created on or after this timestamp |
| `endDate` | ISO Date string | Filter captures created on or before this timestamp |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sortBy` | string | Field to sort by (default: `createdAt`) |
| `sortOrder` | string | `asc` or `desc` (default: `desc` — newest first) |

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBox captures retrieved successfully",
  "data": {
    "captures": [
      {
        "_id": "6ae47aa385d305a394464885",
        "kitchenBoxId": {
          "_id": "6ae46078ba40a72fb41abf88",
          "name": "Chana Dal Container 2",
          "mac_id": "10:20:30:40:50:99",
          "item_name": "Chana Dal",
          "dimensions": "300x200x400",
          "status": "activated"
        },
        "hubId": {
          "_id": "6ae46078ba40a72fb41abf80",
          "name": "Jaipur North Godown Hub",
          "mac_id": "3C:71:BF:4A:92:11",
          "status": "active"
        },
        "image": "https://cdn.arangtik.com/captures/cam01_sample_depth.jpg",
        "tof": 385,
        "dimensions": "300x200x400",
        "createdAt": "2026-10-30T11:07:47.000Z",
        "updatedAt": "2026-10-30T11:07:47.000Z"
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

#### 19. Get Capture Details by ID
**`GET /api/hardware/captures/:id`** — _Protected_

Returns full details for a single capture record with populated box and hub references.

---

#### 20. Get Captures for a Specific KitchenBox (Time Series)
**`GET /api/hardware/captures/box/:kitchenBoxId`** — _Protected_

Returns the historical sensor timeline for a specific Kitchen container. Accepts either MongoDB ObjectId or Box MAC address.

---

#### 21. Get Latest Capture for a Specific KitchenBox
**`GET /api/hardware/captures/box/:kitchenBoxId/latest`** — _Protected_

Convenience endpoint to retrieve only the most recent capture reading for a box. Accepts either MongoDB ObjectId or Box MAC address.

---

#### 22. Get Captures for a Specific Gateway Hub
**`GET /api/hardware/captures/hub/:hubId`** — _Protected_

Retrieves all captures recorded under all boxes connected to a specific gateway Hub. Accepts either Hub ObjectId or Hub MAC address.

---

#### 23. Delete KitchenBox Capture
**`DELETE /api/hardware/captures/:id`** — _Protected_

Permanently deletes a capture record from the database.

---

### Admin Hub QR Code APIs — `/api/admin/hardware/hubs`

#### 24. Generate QR Code by MAC Address
**`GET /api/admin/hardware/hubs/qr-code?mac_id=AA:BB:CC:DD:EE:FF`** — _Protected (Admin)_

Generates a high-contrast QR code image referencing the Hub's MAC ID. Automatically saves static PNG to `/uploads/qr_<MAC>.png` and returns both base64 Data URI and accessible file URL.

**Query Parameters:**
- `mac_id` (string, required): Hardware MAC address (e.g. `94:A9:90:D3:0A:08`).

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "QR Code generated successfully",
  "data": {
    "mac_id": "94:A9:90:D3:0A:08",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "qrCodeUrl": "http://localhost:8083/uploads/qr_94A990D30A08.png"
  }
}
```

---

#### 25. Get QR Code for a Hub by ID
**`GET /api/admin/hardware/hubs/:id/qr-code`** — _Protected (Admin)_

Retrieves or auto-generates the QR code image for a specific registered Hub device.

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Hub QR Code retrieved successfully",
  "data": {
    "hubId": "6ae32a10cad5521f756a33e2",
    "name": "Jaipur North Godown Hub",
    "mac_id": "94:A9:90:D3:0A:08",
    "status": "active",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "qrCodeUrl": "http://localhost:8083/uploads/qr_94A990D30A08.png"
  }
}
```

---

#### 26. Bulk Create Hubs with MAC IDs
**`POST /api/admin/hardware/hubs/bulk`** (or `/multiple`) — _Protected (Admin)_

Allows administrators to batch create multiple Hub devices using just a list of MAC IDs (or multiline raw string). Validates format, skips duplicates, auto-generates QR codes, and returns a detailed batch summary.

**Request Body (Format A - Array of MACs):**
```json
{
  "mac_ids": [
    "AA:BB:CC:DD:EE:01",
    "AA:BB:CC:DD:EE:02",
    "AA:BB:CC:DD:EE:03"
  ],
  "namePrefix": "Godown Hub"
}
```

**Request Body (Format B - Multiline String from Barcode Scanners / Sheets):**
```json
{
  "mac_ids": "AA:BB:CC:DD:EE:01\nAA:BB:CC:DD:EE:02\nAA:BB:CC:DD:EE:03"
}
```

**Response `201 Created`:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Batch hub creation completed: 2 created, 1 skipped, 0 failed",
  "data": {
    "totalRequested": 3,
    "totalCreated": 2,
    "totalSkipped": 1,
    "totalFailed": 0,
    "created": [
      {
        "_id": "6ae5b6c7e80dbe25d75262bd",
        "name": "Godown Hub AA:BB:CC:DD:EE:01",
        "mac_id": "AA:BB:CC:DD:EE:01",
        "status": "not configured",
        "qr_code": "http://localhost:8083/uploads/qr_AABBCCDDEE01.png",
        "createdAt": "2026-10-31T09:37:11.058Z"
      }
    ],
    "skipped": [
      {
        "mac_id": "AA:BB:CC:DD:EE:03",
        "reason": "Hub with this MAC ID already registered in database"
      }
    ],
    "failed": []
  }
}
```


---

#### 27. Generate KitchenBox QR Code by MAC Address
**`GET /api/admin/hardware/boxes/qr-code?mac_id=AA:BB:CC:DD:EE:FF`** (or `/api/admin/hardware/kitchenBox/qr-code`) — _Protected (Admin)_

Generates a high-contrast QR code image referencing a KitchenBox's MAC ID. Automatically saves static PNG to `/uploads/qr_box_<MAC>.png` and returns both base64 Data URI and accessible file URL.

**Query Parameters:**
- `mac_id` (string, required): Hardware MAC address (e.g. `24:0A:C4:11:00:55`).

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBox QR Code generated successfully",
  "data": {
    "mac_id": "24:0A:C4:11:00:55",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "qrCodeUrl": "http://localhost:8083/uploads/qr_box_240AC4110055.png"
  }
}
```

---

#### 28. Get QR Code for a KitchenBox by ID
**`GET /api/admin/hardware/boxes/:id/qr-code`** (or `/api/admin/hardware/kitchenBox/:id/qr-code`) — _Protected (Admin)_

Retrieves or auto-generates the QR code image for a specific registered KitchenBox device.

**Response `200 OK`:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "KitchenBox QR Code retrieved successfully",
  "data": {
    "boxId": "6ae32a10cad5521f756a33e2",
    "name": "Box 24:0A:C4:11:00:55",
    "mac_id": "24:0A:C4:11:00:55",
    "status": "provisioned",
    "qrCode": "data:image/png;base64,iVBORw0KGgo...",
    "qrCodeUrl": "http://localhost:8083/uploads/qr_box_240AC4110055.png"
  }
}
```

---

#### 29. Bulk Create KitchenBoxes with MAC IDs (Only MAC ID)
**`POST /api/admin/hardware/boxes/bulk`** (or `/multiple`, or `/api/admin/hardware/kitchenBox/bulk`) — _Protected (Admin)_

Allows administrators to batch provision multiple KitchenBox devices using just their MAC addresses. Validates MAC format, skips duplicates, auto-names each container (`Box <MAC_ID>`), sets status to `'provisioned'`, auto-generates QR codes, and returns comprehensive batch statistics.

**Request Body (Format A - Array of MACs):**
```json
{
  "mac_ids": [
    "EE:11:22:33:44:01",
    "EE:11:22:33:44:02",
    "EE:11:22:33:44:03"
  ]
}
```

**Request Body (Format B - Multiline String from Textarea):**
```json
{
  "mac_ids": "EE:11:22:33:44:01\nEE:11:22:33:44:02\nEE:11:22:33:44:03"
}
```

**Response `201 Created`:**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Batch kitchen box creation completed: 3 created, 0 skipped, 0 failed",
  "data": {
    "totalProcessed": 3,
    "totalCreated": 3,
    "totalSkipped": 0,
    "totalFailed": 0,
    "created": [
      {
        "_id": "6ae5b6c7e80dbe25d75262bd",
        "name": "Box EE:11:22:33:44:01",
        "mac_id": "EE:11:22:33:44:01",
        "status": "provisioned",
        "qr_code": "http://localhost:8083/uploads/qr_box_EE1122334401.png",
        "createdAt": "2026-10-31T11:20:00.000Z"
      }
    ],
    "skipped": [],
    "failed": []
  }
}
```
