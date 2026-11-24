const express = require('express');
const router = express.Router();
const jewellerySetController = require('./jewellerySet.controller');
const { protect } = require('../../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateCreateSet,
  validateUpdateSet,
  validateSetId,
} = require('./jewellerySet.validation');

const uploadCover = uploadSingleImage('coverImageUrl', { required: false });

router.use(protect);

router.get('/', jewellerySetController.getAll);
router.get('/:id', validateSetId, jewellerySetController.getById);

router.post(
  '/',
  uploadCover,
  validateCreateSet,
  jewellerySetController.create
);

router.patch(
  '/:id',
  uploadCover,
  validateSetId,
  validateUpdateSet,
  jewellerySetController.update
);

router.delete(
  '/:id',
  validateSetId,
  jewellerySetController.delete
);

module.exports = router;
