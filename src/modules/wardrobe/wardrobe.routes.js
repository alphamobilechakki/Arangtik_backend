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

const uploadWardrobeMedia = upload.fields([
  { name: 'ownerFaceImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// Create Wardrobe
router.post('/create-wardrobe', uploadWardrobeMedia, wardrobeController.createWardrobe);

// Get All Wardrobes / Stores
router.get('/get-wardrobes', wardrobeController.getWardrobes);

// Get Single Wardrobe Container
router.get('/get-wardrobe/:id', wardrobeController.getWardrobeById);

// Update Wardrobe Container
router.patch('/update-wardrobe/:id', uploadWardrobeMedia, wardrobeController.updateWardrobe);

// Restore Soft-Deleted Wardrobe Container
router.patch('/restore-wardrobe/:id', wardrobeController.restoreWardrobe);

// Delete Wardrobe Container (Soft delete by default, hard via ?hard=true)
router.delete('/delete-wardrobe/:id', wardrobeController.deleteWardrobe);

// Unified media upload handler for 1 to 100 photos
const uploadClothMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'photos', maxCount: 100 },
  { name: 'images', maxCount: 100 },
  { name: 'files', maxCount: 100 },
]);

/* ==========================================================================
   2. CLOTH SCAN & EXTRACTION APIs
   ========================================================================== */

// Scan Item (AI scans photo(s), detects garments, extracts colors/taxonomy, checks duplicates)
router.post('/scan-item', uploadClothMedia, wardrobeController.analyzePhoto);

// Add / Extract Item
router.post('/add-item', uploadClothMedia, wardrobeController.addItem);

// Bulk Add Standalone Photos
router.post('/bulk-add-photos', upload.array('photos', 100), wardrobeController.bulkAddPhotos);

// Ingest Gallery Photos
router.post('/ingest-gallery', upload.array('photos', 100), wardrobeController.ingestGalleryPhotos);

/* ==========================================================================
   3. WARDROBE ITEMS MANAGEMENT (CRUD)
   ========================================================================== */

// Get Items (List all clothes with search, category, color, pagination)
router.get('/get-items', wardrobeController.getAllItems);

// Get Item Details by ID
router.get('/get-item/:id', wardrobeController.getItemDetails);

// Edit Item by ID
router.patch('/edit-item/:id', wardrobeController.updateItem);

// Delete Item by ID
router.delete('/delete-item/:id', wardrobeController.deleteItem);

// Generate 3D Garment Model
router.post('/generate-3d/:id', wardrobeController.generateItem3D);

module.exports = router;
