const express = require('express');
const router = express.Router();
const clothAnalysisController = require('./clothAnalysis.controller');
const { protect } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

// All cloth analysis routes are protected
router.use(protect);

// Unified upload handler for single or multiple files (accepts photo, photos, image, images)
const uploadClothMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'photos', maxCount: 100 },
  { name: 'images', maxCount: 100 },
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: 100 },
]);

// __________________________________________________________________________
// 1. SCAN ITEM (AI scans photo(s), detects garments, colors, attributes - 1 to 100 photos)
// __________________________________________________________________________
router.post(
  ['/scan-item', '/scan', '/analyze-photo', '/scan-gallery-photo'],
  uploadClothMedia,
  clothAnalysisController.analyzePhoto
);

// __________________________________________________________________________
// 2. EXTRACT ITEM (Extracts & saves dress/clothing items to wardrobe - 1 to 100 photos)
// __________________________________________________________________________
router.post(
  ['/extract-item', '/extract-dress', '/extract-from-gallery', '/bulk-add-photos', '/ingest-gallery'],
  uploadClothMedia,
  clothAnalysisController.extractDirectDress
);

module.exports = router;

