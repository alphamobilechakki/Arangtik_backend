const express = require('express');
const router = express.Router();
const hubController = require('./hub.controller');
const { protectAdmin } = require('../../../../middlewares/auth.middleware');

// All hardware gateway admin routes require admin authentication
router.use(protectAdmin);

// ── Statistics ───────────────────────────────────────────────────────────────
// GET /api/admin/hardware/hubs/stats - Overall gateway KPIs & status counts
router.get('/stats', hubController.getStats);

// ── QR Code Generation ───────────────────────────────────────────────────────
// GET /api/admin/hardware/hubs/qr-code?mac_id=... - Generate QR code referencing MAC
router.get('/qr-code', hubController.generateQrCodeByMac);

// ── Bulk Provisioning ────────────────────────────────────────────────────────
// POST /api/admin/hardware/hubs/bulk - Batch create hubs with MAC IDs
router.post('/bulk', hubController.createMultipleHubs);

// ── CRUD Operations ──────────────────────────────────────────────────────────
// POST /api/admin/hardware/hubs - Register/create a new gateway hub
router.post('/', hubController.createHub);

// GET /api/admin/hardware/hubs - List hubs with pagination, search & status filters
router.get('/', hubController.getHubs);

// GET /api/admin/hardware/hubs/:id - Get single hub details & paired containers
router.get('/:id', hubController.getHubById);

// GET /api/admin/hardware/hubs/:id/qr-code - Get/auto-generate QR code for gateway
router.get('/:id/qr-code', hubController.getHubQrCode);

// PATCH /api/admin/hardware/hubs/:id - Update hub details & WiFi configuration
router.patch('/:id', hubController.updateHub);

// PATCH /api/admin/hardware/hubs/:id/status - Update hub lifecycle status
router.patch('/:id/status', hubController.updateHubStatus);

// DELETE /api/admin/hardware/hubs/:id - Delete a gateway hub
router.delete('/:id', hubController.deleteHub);

module.exports = router;

