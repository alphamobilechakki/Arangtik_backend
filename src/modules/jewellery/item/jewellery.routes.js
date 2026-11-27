const express = require('express');
const router = express.Router();
const jewelleryController = require('./jewellery.controller');
const { protect } = require('../../../middlewares/auth.middleware');
const { uploadFields, uploadSingleImage } = require('../../../middlewares/upload.middleware');
const {
  validateUpdateItem,
  validateStatusUpdate,
  validateMoveItem,
  validateItemId,
} = require('./jewellery.validation');

// Supports single or bulk photo upload (up to 20 images, any field name)
const uploadJewelleryPhotos = uploadFields([
  { name: 'photo',  maxCount: 1  },
  { name: 'image',  maxCount: 1  },
  { name: 'photos', maxCount: 20 },
  { name: 'images', maxCount: 20 },
]);

const uploadItemImages = uploadFields([
  { name: 'sourceImage',    maxCount: 20 },
  { name: 'image',          maxCount: 20 },
  { name: 'images',         maxCount: 20 },
  { name: 'generatedImage', maxCount: 20 },
]);

const uploadSetPhoto = uploadSingleImage('sourcePhoto', { required: false });

router.use(protect);

// ── Add item (AI-powered: photo only, everything filled automatically) ──────
router.post('/add-item', uploadJewelleryPhotos, jewelleryController.addItem);

// ── List & get single ───────────────────────────────────────────────────────
router.get('/', jewelleryController.getAll);
router.get('/:id', validateItemId, jewelleryController.getById);

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
