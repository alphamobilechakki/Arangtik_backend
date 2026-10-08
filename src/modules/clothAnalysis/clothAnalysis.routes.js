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
// 1. DIRECT DRESS DIGITIZATION (No Face Scan - Single or 1 to 100 Photos)
//    (Hanger, flat lay, single dress, showroom mannequins)
// __________________________________________________________________________
router.post('/extract-dress', uploadClothMedia, clothAnalysisController.extractDirectDress);
router.post('/analyze-photo', uploadClothMedia, clothAnalysisController.analyzePhoto);

// __________________________________________________________________________
// 2. GALLERY SCANNING & INGESTION (With Target Face Matching - 1 to 100 Photos)
//    (Target user ya wardrobe owner ka face match karke kapde extract & ingest karta hai)
// __________________________________________________________________________
router.post('/extract-from-gallery', uploadClothMedia, clothAnalysisController.extractFromGallery);
router.post('/scan-gallery-photo', uploadClothMedia, clothAnalysisController.scanGalleryPhoto);

// Legacy backward-compatibility aliases
router.post('/ingest-gallery', uploadClothMedia, clothAnalysisController.extractFromGallery);
router.post('/bulk-add-photos', uploadClothMedia, clothAnalysisController.extractDirectDress);

module.exports = router;

