const express = require('express');
const router = express.Router();
const coinPackageController = require('./coinPackage.controller');
const { protectAdmin } = require('../../../../middlewares/auth.middleware');
const {
  validateCreateCoinPackage,
  validateUpdateCoinPackage,
  validateCoinPackageId,
  validateStatusUpdate,
} = require('./coinPackage.validation');

// All routes require admin authentication
router.use(protectAdmin);

// Create a new coin package
router.post(
  '/',
  validateCreateCoinPackage,
  coinPackageController.create
);

// Get all coin packages (with pagination, search, filter)
router.get('/', coinPackageController.getAll);

// Get a single coin package by ID
router.get('/:id', validateCoinPackageId, coinPackageController.getById);

// Update a coin package (partial update)
router.patch(
  '/:id',
  validateCoinPackageId,
  validateUpdateCoinPackage,
  coinPackageController.update
);

// Activate / Deactivate a coin package
router.patch(
  '/:id/status',
  validateCoinPackageId,
  validateStatusUpdate,
  coinPackageController.updateStatus
);

module.exports = router;

