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
router.post('/bulk-add-photos', uploadClothMedia, clothAnalysisController.bulkAddPhotos);
router.post('/analyze', uploadClothMedia, clothAnalysisController.analyzePhoto);
router.post('/bulk-add', uploadClothMedia, clothAnalysisController.bulkAddPhotos);

// __________________________________________________________________________
// 2. GALLERY SCANNING & INGESTION (With User Face Verification - Single or 1 to 100 Photos)
//    (Photo me pehle user ka face check hoga, fir sirf user ke kapde extract honge)
// __________________________________________________________________________
router.post('/extract-from-gallery', uploadClothMedia, clothAnalysisController.extractFromGallery);
router.post('/ingest-gallery', uploadClothMedia, clothAnalysisController.ingestGalleryPhotos);
router.post('/scan-gallery-photo', uploadClothMedia, clothAnalysisController.scanGalleryPhoto);
router.post('/ingest', uploadClothMedia, clothAnalysisController.ingestGalleryPhotos);
router.post('/scan', uploadClothMedia, clothAnalysisController.scanGalleryPhoto);

module.exports = router;
