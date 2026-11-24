const express = require('express');
const router = express.Router();
const adminJewelleryController = require('./adminJewellery.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const {
  validateItemId,
  validateUserId,
  validateStatusOverride,
  validateGetAllItems,
} = require('./adminJewellery.validation');

// All admin jewellery endpoints require admin authorization
router.use(protectAdmin);

// 1. High-level KPIs & SLA alerts
router.get('/stats', adminJewelleryController.getStats);

// 2. Global operations table with search, filters & tab counts
router.get('/items', validateGetAllItems, adminJewelleryController.getAllItems);

// 3. User support drill-down (placed before /items/:id to prevent route clash)
router.get('/users/:userId', validateUserId, adminJewelleryController.getUserJewellery);

// 4. Single item detailed inspection
router.get('/items/:id', validateItemId, adminJewelleryController.getItemById);

// 5. Support status override with audit logging
router.patch(
  '/items/:id/status-override',
  validateItemId,
  validateStatusOverride,
  adminJewelleryController.statusOverride
);

// 6. Accidental deletion recovery
router.patch('/items/:id/restore', validateItemId, adminJewelleryController.restore);

module.exports = router;
