const router = require('express').Router();
const ctrl = require('./categoryService.controller');
const { protectAdmin } = require('../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../middlewares/upload.middleware');
const {
  validateCreateService,
  validateUpdateService,
  validateServiceStatus,
} = require('./categoryService.validation');

const uploadImg = uploadSingleImage('image', { required: false });

router.route('/')
  .get(ctrl.getAllServices)
  .post(protectAdmin, uploadImg, validateCreateService, ctrl.createService);

router.route('/:id')
  .get(ctrl.getServiceById)
  .patch(protectAdmin, uploadImg, validateUpdateService, ctrl.updateService)
  .delete(protectAdmin, ctrl.deleteService);

router.patch('/:id/status', protectAdmin, validateServiceStatus, ctrl.toggleServiceStatus);

module.exports = router;
