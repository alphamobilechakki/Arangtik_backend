
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
