const express = require('express');
const router = express.Router();
const productController = require('./product.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
} = require('./product.validation');

// Write routes (Admin only)
router.post(
  '/bulk',
  protectAdmin,
  productController.createBulk
);

router.post(
  '/',
  protectAdmin,
  validateCreateProduct,
  productController.create
);

// Read routes
router.get('/', productController.getAll);
router.get('/:id', validateProductId, productController.getById);

router.patch(
  '/:id',
  protectAdmin,
  validateProductId,
  validateUpdateProduct,
  productController.update
);

router.delete('/:id', protectAdmin, validateProductId, productController.delete);

module.exports = router;
