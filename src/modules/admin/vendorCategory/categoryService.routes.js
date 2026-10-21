const express = require('express');
const router = express.Router({ mergeParams: true });
const categoryServiceController = require('./categoryService.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const {
  validateCreateService,
  validateUpdateService,
  validateServiceStatus,
} = require('./categoryService.validation');

// ==========================================
// 1. Service Read Routes (Public / Customer / Vendor)
// ==========================================
router.get('/', categoryServiceController.getAllServices);
router.get('/:id', categoryServiceController.getServiceById);

// ==========================================
// 2. Service Write Routes (Admin Only)
// ==========================================
router.post('/', protectAdmin, validateCreateService, categoryServiceController.createService);
router.patch('/:id', protectAdmin, validateUpdateService, categoryServiceController.updateService);
router.patch('/:id/status', protectAdmin, validateServiceStatus, categoryServiceController.toggleServiceStatus);
router.delete('/:id', protectAdmin, categoryServiceController.deleteService);

module.exports = router;
