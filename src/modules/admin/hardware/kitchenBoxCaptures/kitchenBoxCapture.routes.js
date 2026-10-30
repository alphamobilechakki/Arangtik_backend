const express = require('express');
const router = express.Router();
const kitchenBoxCaptureController = require('./kitchenBoxCapture.controller');
const { protectAdmin } = require('../../../../middlewares/auth.middleware');

// All hardware capture admin routes are protected by admin authentication
router.use(protectAdmin);

// ── Captures Analytics Stats ─────────────────────────────────────────────────
router.get('/stats', kitchenBoxCaptureController.getStats);

// ── Captures Logs List ───────────────────────────────────────────────────────
router.get('/', kitchenBoxCaptureController.getCaptures);

// ── Specific Scopes ──────────────────────────────────────────────────────────
router.get('/box/:kitchenBoxId/latest', kitchenBoxCaptureController.getLatestCaptureByBoxId);
router.get('/box/:kitchenBoxId', kitchenBoxCaptureController.getCapturesByBoxId);
router.get('/hub/:hubId', kitchenBoxCaptureController.getCapturesByHubId);

// ── Single Capture Detail & Admin Delete ─────────────────────────────────────
router.get('/:id', kitchenBoxCaptureController.getCaptureById);
router.delete('/:id', kitchenBoxCaptureController.deleteCapture);

module.exports = router;

