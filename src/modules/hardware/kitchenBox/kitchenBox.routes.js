const express = require('express');
const router = express.Router();

const kitchenBoxController = require('./kitchenBox.controller');
const { protect } = require('../../../middlewares/auth.middleware');

// ── Register / List ──────────────────────────────────────────────────────────
router
  .route('/')
  .post(protect, kitchenBoxController.create)   // Register a new box
  .get(protect, kitchenBoxController.getAll);   // List boxes (by user / hub)

// ── Lookup by MAC ─────────────────────────────────────────────────────────────
router.get('/mac/:mac_id', protect, kitchenBoxController.getByMac);

// ── Single Box CRUD ───────────────────────────────────────────────────────────
router
  .route('/:id')
  .get(protect, kitchenBoxController.getById)
  .patch(protect, kitchenBoxController.update)
  .delete(protect, kitchenBoxController.remove);

// ── Update ToF reading (hub pushes sensor data) ───────────────────────────────
router.patch('/:id/tof', protect, kitchenBoxController.updateTof);

// ── Update Status ─────────────────────────────────────────────────────────────
router.patch('/:id/status', protect, kitchenBoxController.updateStatus);

module.exports = router;

