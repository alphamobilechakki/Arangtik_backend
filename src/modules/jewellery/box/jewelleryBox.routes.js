const express = require('express');
const router = express.Router();
const jewelleryBoxController = require('./jewelleryBox.controller');
const { protect } = require('../../../middlewares/auth.middleware');
const { uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateCreateBox,
  validateUpdateBox,
  validateBoxId,
} = require('./jewelleryBox.validation');

const uploadCover = uploadSingleImage('coverImage', { required: false });

// All box routes are protected for authenticated users
router.use(protect);

router.get('/', jewelleryBoxController.getAll);
router.get('/:id', validateBoxId, jewelleryBoxController.getById);

router.post(
  '/',
  uploadCover,
  validateCreateBox,
  jewelleryBoxController.create
);

router.patch(
  '/:id',
  uploadCover,
  validateBoxId,
  validateUpdateBox,
  jewelleryBoxController.update
);

router.delete(
  '/:id',
  validateBoxId,
  jewelleryBoxController.delete
);

module.exports = router;
