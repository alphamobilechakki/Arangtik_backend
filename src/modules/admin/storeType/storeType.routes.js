const express = require('express');
const router = express.Router();
const storeTypeController = require('./storeType.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateCreateStoreType,
  validateUpdateStoreType,
} = require('./storeType.validation');

// ==========================================
// 1. Store Type Read Routes (Public & Admin)
// ==========================================
router.get('/', storeTypeController.getAllStoreTypes);
router.get('/:id', storeTypeController.getStoreTypeById);

// ==========================================
// 2. Store Type Write Routes (Admin Only)
// ==========================================
router.post(
  '/',
  protectAdmin,
  uploadSingleImage('image', { required: false }),
  validateCreateStoreType,
  storeTypeController.createStoreType
);

router.patch(
  '/:id',
  protectAdmin,
  uploadSingleImage('image', { required: false }),
  validateUpdateStoreType,
  storeTypeController.updateStoreType
);

router.patch(
  '/:id/status',
  protectAdmin,
  storeTypeController.toggleStoreTypeStatus
);

router.delete(
  '/:id',
  protectAdmin,
  storeTypeController.deleteStoreType
);

module.exports = router;
