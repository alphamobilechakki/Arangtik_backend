const express = require('express');
const router = express.Router();
const clothAnalysisController = require('./clothAnalysis.controller');
const { protect } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

// All cloth analysis routes are protected
router.use(protect);

// __________________________________________________________________________
// 1. SINGLE PHOTO ANALYSIS (AI Garment Detection & Auto-Crop)
// __________________________________________________________________________
router.post('/analyze-photo', upload.single('photo'), clothAnalysisController.analyzePhoto);
router.post('/analyze', upload.single('photo'), clothAnalysisController.analyzePhoto);

// __________________________________________________________________________
// 2. USER GALLERY PHOTO SCAN (Face Check + Clothes Extract)
// __________________________________________________________________________
router.post(
  '/scan-gallery-photo',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  clothAnalysisController.scanGalleryPhoto
);
router.post(
  '/scan',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  clothAnalysisController.scanGalleryPhoto
);

// __________________________________________________________________________
// 3. BULK DRESS UPLOAD (Bulk 1 to 100 Photos Auto-Digitize & Store)
// __________________________________________________________________________
router.post('/bulk-add-photos', upload.array('photos', 100), clothAnalysisController.bulkAddPhotos);
router.post('/bulk-add', upload.array('photos', 100), clothAnalysisController.bulkAddPhotos);

// __________________________________________________________________________
// 4. GALLERY BATCH INGESTION (Batch Ingestion Pipeline)
// __________________________________________________________________________
router.post('/ingest-gallery', upload.array('photos', 100), clothAnalysisController.ingestGalleryPhotos);
router.post('/ingest', upload.array('photos', 100), clothAnalysisController.ingestGalleryPhotos);

module.exports = router;
