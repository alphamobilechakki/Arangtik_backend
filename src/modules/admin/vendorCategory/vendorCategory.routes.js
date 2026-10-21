const express = require('express');
const router = express.Router();
const vendorCategoryController = require('./vendorCategory.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require('./vendorCategory.validation');

// ==========================================
// 1. Vendor Category Read Routes (Public & Admin)
// ==========================================
router.get('/', vendorCategoryController.getAllCategories);
router.get('/:id', vendorCategoryController.getCategoryById);

// ==========================================
// 2. Vendor Category Write Routes (Admin Only)
// ==========================================
router.post(
  '/',
  protectAdmin,
  uploadSingleImage('image', { required: false }),
  validateCreateCategory,
  vendorCategoryController.createCategory
);
router.patch(
  '/:id',
  protectAdmin,
  uploadSingleImage('image', { required: false }),
  validateUpdateCategory,
  vendorCategoryController.updateCategory
);
router.delete(
  '/:id',
  protectAdmin,
  vendorCategoryController.deleteCategory
);

// ==========================================
// 3. Category Services Nested Routes
// ==========================================
const categoryServiceController = require('./categoryService.controller');
const { validateCreateService } = require('./categoryService.validation');

router.get('/:categoryId/services', categoryServiceController.getServicesByCategory);
router.post(
  '/:categoryId/services',
  protectAdmin,
  validateCreateService,
  categoryServiceController.createService
);

module.exports = router;
