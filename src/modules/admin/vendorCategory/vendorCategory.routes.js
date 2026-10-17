const express = require('express');
const router = express.Router();
const vendorCategoryController = require('./vendorCategory.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
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
  validateCreateCategory,
  vendorCategoryController.createCategory
);
router.patch(
  '/:id',
  protectAdmin,
  validateUpdateCategory,
  vendorCategoryController.updateCategory
);
router.delete(
  '/:id',
  protectAdmin,
  vendorCategoryController.deleteCategory
);

module.exports = router;
