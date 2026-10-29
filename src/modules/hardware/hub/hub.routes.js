const express = require('express');
const router = express.Router();

const hubController = require('./hub.controller');
const { protect } = require('../../../middlewares/auth.middleware');

// ── Register / List ─────────────────────────────────────────────────────────
router
  .route('/')
  .post(protect, hubController.create)   // Register a new hub
  .get(protect, hubController.getAll);   // List hubs (filtered by user)

// ── Lookup by MAC ────────────────────────────────────────────────────────────
router.get('/mac/:mac_id', protect, hubController.getByMac);

// ── Single Hub CRUD ──────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(protect, hubController.getById)
  .patch(protect, hubController.update)
  .delete(protect, hubController.remove);

// ── Configure Wi-Fi ──────────────────────────────────────────────────────────
router.patch('/:id/wifi', protect, hubController.configureWifi);

// ── Update Status ────────────────────────────────────────────────────────────
router.patch('/:id/status', protect, hubController.updateStatus);

module.exports = router;

