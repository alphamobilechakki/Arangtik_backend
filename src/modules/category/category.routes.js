const router = require('express').Router();
const ctrl = require('./category.controller');
const serviceCtrl = require('../categoryService/categoryService.controller');
const { protectAdmin } = require('../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../middlewares/upload.middleware');
const {
  validateCreateCategory,
  validateUpdateCategory,
} = require('./category.validation');
const { validateCreateService } = require('../categoryService/categoryService.validation');

const uploadImg = uploadSingleImage('image', { required: false });

router.route('/')
  .get(ctrl.getAllCategories)
  .post(protectAdmin, uploadImg, validateCreateCategory, ctrl.createCategory);

router.get('/store-type/:storeType', ctrl.getCategoriesByStoreType);
router.get('/by-wardrobe/:wardrobeId', ctrl.getCategoriesByWardrobe);

router.route('/:id')
  .get(ctrl.getCategoryById)
  .patch(protectAdmin, uploadImg, validateUpdateCategory, ctrl.updateCategory)
  .delete(protectAdmin, ctrl.deleteCategory);

// Nested: /categories/:categoryId/services
router.route('/:categoryId/services')
  .get(serviceCtrl.getServicesByCategory)
  .post(protectAdmin, uploadImg, validateCreateService, serviceCtrl.createService);

module.exports = router;
