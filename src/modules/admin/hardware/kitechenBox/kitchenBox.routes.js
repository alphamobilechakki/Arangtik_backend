
const express = require('express');
const router = express.Router();

const kitchenBoxController = require('./kitchenBox.controller');
const { protectAdmin } = require('../../../../middlewares/auth.middleware');

// Admin authentication for all routes
router.use(protectAdmin);

// ── Statistics ──────────────────────────────────────────────
router.get('/stats', kitchenBoxController.getStats);

// ── QR Code ────────────────────────────────────────────────
router.get('/qr-code', kitchenBoxController.generateQrCodeByMac);
router.get('/:id/qr-code', kitchenBoxController.getKitchenBoxQrCode);

// ── Bulk Provisioning ───────────────────────────────────────
router.post('/bulk', kitchenBoxController.createMultipleKitchenBoxes);

// ── Create & List ──────────────────────────────────────────
router.post('/', kitchenBoxController.createKitchenBox);
router.get('/', kitchenBoxController.getKitchenBoxes);

// ── Get & Update ───────────────────────────────────────────
router.get('/:id', kitchenBoxController.getKitchenBoxById);
router.patch('/:id', kitchenBoxController.updateKitchenBox);

// ── Status Management ──────────────────────────────────────
router.patch('/:id/status', kitchenBoxController.updateKitchenBoxStatus);

// ── Delete ─────────────────────────────────────────────────
router.delete('/:id', kitchenBoxController.deleteKitchenBox);

module.exports = router;