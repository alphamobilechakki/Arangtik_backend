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
    { name: 'coverImage', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  wardrobeController.createWardrobe
);

// Get All Wardrobes
router.get('/create-wardrobe', wardrobeController.getWardrobes);
router.get('/get-wardrobes', wardrobeController.getWardrobes);

/* ==========================================================================
   2. COLLECTION APIs ("Festive", "Daily Wear", "Office")
   ========================================================================== */
// Create Collection
router.post('/create-collection', wardrobeController.createCollection);
router.post('/collections', wardrobeController.createCollection);

// Get All Collections (supports ?wardrobeId=...)
router.get('/get-collections', wardrobeController.getCollections);
router.get('/collections', wardrobeController.getCollections);

/* ==========================================================================
   3. WARDROBE ITEMS APIs (Kapde & Accessories - Add, Get, Update, Delete)
   ========================================================================== */
// Add Item (Kapda add karein)
router.post('/add-item', wardrobeController.addItem);
router.post('/items', wardrobeController.addItem);

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

/* ==========================================================================
   4. AI SCAN & UPLOAD APIs (Photo se automatic kapde add karna)
   ========================================================================== */
// Analyze Single Photo (AI se photo scan karein)
router.post('/analyze-photo', upload.single('photo'), wardrobeController.analyzePhoto);
router.post('/analyze', upload.single('photo'), wardrobeController.analyzePhoto);

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

module.exports = router;
