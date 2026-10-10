const express = require('express');
const router = express.Router();
const wardrobeController = require('./wardrobe.controller');
const { protect } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

// All wardrobe routes are protected
router.use(protect);

/* ==========================================================================
   1. WARDROBE / CLOSET APIs (E.g., "My Wardrobe", "Mummy Wardrobe")
   ========================================================================== */

// Create Wardrobe (supports optional coverImage / owner face photo upload)
router.post(
  '/create-wardrobe',
  upload.fields([
    { name: 'ownerFaceImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  wardrobeController.createWardrobe
);

// Get All Wardrobes
router.get('/create-wardrobe', wardrobeController.getWardrobes);
router.get('/get-wardrobes', wardrobeController.getWardrobes);

// Unified media upload handler for item photo / camera capture
const uploadItemMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'photos', maxCount: 10 },
  { name: 'images', maxCount: 10 },
  { name: 'files', maxCount: 10 },
]);

// __________________________________________________________________________
// 2. WARDROBE ITEMS APIs (Kapde & Accessories - Add, Get, Update, Delete)
// __________________________________________________________________________

// Add Item (Kapda add karein - supports JSON or direct Photo Upload with AI auto-fill)
router.post('/add-item', uploadItemMedia, wardrobeController.addItem);
router.post('/items', uploadItemMedia, wardrobeController.addItem);

// Get All Items (Sabhi kapde dekhein - with search, filter, pagination)
router.get('/get-items', wardrobeController.getAllItems);
router.get('/get-all-items', wardrobeController.getAllItems);
router.get('/items', wardrobeController.getAllItems);

// Get Single Item Details (Kisi ek item ki details)
router.get('/get-item/:id', wardrobeController.getItemDetails);
router.get('/get-item-details/:id', wardrobeController.getItemDetails);
router.get('/items/:id', wardrobeController.getItemDetails);

// Update Item
router.patch('/update-item/:id', wardrobeController.updateItem);
router.patch('/items/:id', wardrobeController.updateItem);

// Delete Item
router.delete('/delete-item/:id', wardrobeController.deleteItem);
router.delete('/items/:id', wardrobeController.deleteItem);

// __________________________________________________________________________
// 3. AI SCAN & UPLOAD APIs (Photo se automatic kapde add karna)
// __________________________________________________________________________

// Analyze Single Photo (AI se photo scan karein aur fields prefill karein)
router.post('/analyze-photo', uploadItemMedia, wardrobeController.analyzePhoto);
router.post('/analyze', uploadItemMedia, wardrobeController.analyzePhoto);

// Scan Single Gallery Photo (Face verify + clothing extract)
router.post(
  '/scan-gallery-photo',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  wardrobeController.scanGalleryPhoto
);
router.post(
  '/scan',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  wardrobeController.scanGalleryPhoto
);

// Bulk Upload (1 se 100 kapdo ki photos ek sath add karein)
router.post('/bulk-add-photos', upload.array('photos', 100), wardrobeController.bulkAddPhotos);

// Gallery Batch Ingestion (Puri gallery scan karein)
router.post('/ingest-gallery', upload.array('photos', 100), wardrobeController.ingestGalleryPhotos);

// __________________________________________________________________________
// 4. AI HUMAN-TO-GARMENT & GHOST MANNEQUIN PIPELINE APIs
// __________________________________________________________________________

// Pose Validation API (Check body coordinates & avoid occlusions before processing)
router.post(
  '/pose-validation',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  wardrobeController.validatePose
);

// Trigger Pipeline (Initiate extraction & ghost mannequin creation)
router.post('/items/:id/garment-processing', wardrobeController.triggerGarmentProcessing);
router.post('/garment-processing/:id', wardrobeController.triggerGarmentProcessing);

// Poll Pipeline Status & Results
router.get('/items/:id/garment-processing/status', wardrobeController.getGarmentProcessingStatus);
router.get('/garment-processing/:id/status', wardrobeController.getGarmentProcessingStatus);

// Retry Failed Pipeline Job
router.post('/items/:id/garment-processing/retry', wardrobeController.retryGarmentProcessing);
router.post('/garment-processing/:id/retry', wardrobeController.retryGarmentProcessing);

module.exports = router;
