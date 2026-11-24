const express = require('express');
const router = express.Router();
const jewelleryCategoryController = require('./jewelleryCategory.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryId,
} = require('./jewelleryCategory.validation');

const uploadIcon = uploadSingleImage('icon', { required: false });

// Public / Authenticated read routes (app users & admin can list active categories)
router.get('/', jewelleryCategoryController.getAll);
router.get('/:id', validateCategoryId, jewelleryCategoryController.getById);

// Admin-only write routes
router.post(
  '/',
  protectAdmin,
  uploadIcon,
  validateCreateCategory,
  jewelleryCategoryController.create
);

router.patch(
  '/:id',
  protectAdmin,
  uploadIcon,
  validateCategoryId,
  validateUpdateCategory,
  jewelleryCategoryController.update
);

router.delete(
  '/:id',
  protectAdmin,
  validateCategoryId,
  jewelleryCategoryController.delete
);

module.exports = router;
