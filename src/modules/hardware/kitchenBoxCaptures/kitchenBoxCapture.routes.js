const express = require('express');
const router = express.Router();
const kitchenBoxCaptureController = require('./kitchenBoxCapture.controller');
const { protect } = require('../../../middlewares/auth.middleware');

router.use(protect);

// ── Captures Collection ──────────────────────────────────────────────────────
router
  .route('/')
  .post(kitchenBoxCaptureController.create)   // Record a new sensor snapshot
  .get(kitchenBoxCaptureController.getAll);   // List all captures (supports filter & pagination)

// ── Specific Scopes ──────────────────────────────────────────────────────────
router.get('/box/:kitchenBoxId/latest', kitchenBoxCaptureController.getLatestByBoxId);
router.get('/box/:kitchenBoxId', kitchenBoxCaptureController.getByBoxId);
router.get('/hub/:hubId', kitchenBoxCaptureController.getByHubId);

// ── Single Capture Item ──────────────────────────────────────────────────────
router
  .route('/:id')
  .get(kitchenBoxCaptureController.getById)
  .delete(kitchenBoxCaptureController.remove);

module.exports = router;

