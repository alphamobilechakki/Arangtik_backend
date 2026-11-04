const express = require('express');
const router = express.Router();
const densityCategoryController = require('./densityCategory.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateCreateDensityCategory,
  validateUpdateDensityCategory,
  validateDensityCategoryId,
} = require('./densityCategory.validation');

const uploadCategoryImg = uploadSingleImage('image', { required: false });

// Read routes
router.get('/', densityCategoryController.getAll);
router.get('/:id', validateDensityCategoryId, densityCategoryController.getById);

// Write routes (Admin only)
router.post(
  '/',
  protectAdmin,
  uploadCategoryImg,
  validateCreateDensityCategory,
  densityCategoryController.create
);
router.patch(
  '/:id',
  protectAdmin,
  uploadCategoryImg,
  validateDensityCategoryId,
  validateUpdateDensityCategory,
  densityCategoryController.update
);
router.delete('/:id', protectAdmin, validateDensityCategoryId, densityCategoryController.delete);

module.exports = router;

