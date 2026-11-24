const express = require('express');
const router = express.Router();
const jewelleryController = require('./jewellery.controller');
const { protect } = require('../../../middlewares/auth.middleware');
const { uploadFields, uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateCreateItem,
  validateUpdateItem,
  validateStatusUpdate,
  validateMoveItem,
  validateItemId,
} = require('./jewellery.validation');

const uploadItemImages = uploadFields([
  { name: 'sourceImage', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'generatedImage', maxCount: 1 },
]);

const uploadSetPhoto = uploadSingleImage('sourcePhoto', { required: false });

router.use(protect);

// List & get single
router.get('/', jewelleryController.getAll);
router.get('/:id', validateItemId, jewelleryController.getById);

// Create single piece
router.post(
  '/',
  uploadItemImages,
  validateCreateItem,
  jewelleryController.create
);

// Create set with pieces from single photo
router.post(
  '/set-with-items',
  uploadSetPhoto,
  jewelleryController.createSetWithItems
);

// Update piece metadata
router.patch(
  '/:id',
  uploadItemImages,
  validateItemId,
  validateUpdateItem,
  jewelleryController.update
);

// Specific action endpoints
router.patch(
  '/:id/status',
  validateItemId,
  validateStatusUpdate,
  jewelleryController.updateStatus
);

router.patch(
  '/:id/move',
  validateItemId,
  validateMoveItem,
  jewelleryController.move
);

router.patch(
  '/:id/favorite',
  validateItemId,
  jewelleryController.toggleFavorite
);

// Delete piece
router.delete(
  '/:id',
  validateItemId,
  jewelleryController.delete
);

module.exports = router;
