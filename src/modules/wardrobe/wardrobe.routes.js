const express = require('express');
const router = express.Router();
const wardrobeController = require('./wardrobe.controller');
const { protect } = require('../../middlewares/auth.middleware');

const upload = require('../../middlewares/upload.middleware');

// All wardrobe routes are protected
router.use(protect);

// POST /api/wardrobe/analyze-photo (Image upload & AI clothing analysis)
router.post('/analyze-photo', upload.single('photo'), wardrobeController.analyzePhoto);

// POST /api/wardrobe/scan-gallery-photo (Single gallery photo user match + clothing extraction)
router.post(
  '/scan-gallery-photo',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  wardrobeController.scanGalleryPhoto
);

// POST /api/wardrobe/bulk-add-photos (Direct Bulk Clothes Digitization 1-100 Photos)
router.post('/bulk-add-photos', upload.array('photos', 100), wardrobeController.bulkAddPhotos);

// POST /api/wardrobe/ingest-gallery (Face Match -> AI Garment Extract -> Wardrobe Store)
router.post('/ingest-gallery', upload.array('photos', 100), wardrobeController.ingestGalleryPhotos);

// POST /api/wardrobe/add-item
router.post('/add-item', wardrobeController.addItem);

// GET /api/wardrobe/get-all-items
router.get('/get-all-items', wardrobeController.getAllItems);

// GET /api/wardrobe/get-item-details/:id
router.get('/get-item-details/:id', wardrobeController.getItemDetails);

// PATCH /api/wardrobe/update-item/:id
router.patch('/update-item/:id', wardrobeController.updateItem);

// PATCH /api/wardrobe/update-item-status/:id
router.patch('/update-item-status/:id', wardrobeController.updateItemStatus);

// DELETE /api/wardrobe/delete-item/:id
router.delete('/delete-item/:id', wardrobeController.deleteItem);

// POST /api/wardrobe/log-worn-dress
router.post('/log-worn-dress', wardrobeController.logWornDress);

// GET /api/wardrobe/get-wear-history
router.get('/get-wear-history', wardrobeController.getWearHistory);

// POST /api/wardrobe/suggest-outfit
router.post('/suggest-outfit', wardrobeController.suggestOutfit);

// POST /api/wardrobe/lend-item
router.post('/lend-item', wardrobeController.lendItem);

// PATCH /api/wardrobe/return-lent-item/:id
router.patch('/return-lent-item/:id', wardrobeController.returnLentItem);

// GET /api/wardrobe/get-lent-items
router.get('/get-lent-items', wardrobeController.getLentItems);

// POST /api/wardrobe/feedback (User AI corrections and match feedback)
router.post('/feedback', wardrobeController.submitFeedback);

module.exports = router;



