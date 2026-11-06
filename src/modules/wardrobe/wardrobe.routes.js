const express = require('express');
const router = express.Router();
const wardrobeController = require('./wardrobe.controller');
const { protect } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');
const { checkQuota } = require('../../middlewares/quota.middleware');

// All wardrobe routes are protected
router.use(protect);

/* ==========================================================================
   1. WARDROBE / CLOSET CONTAINER APIs (E.g., "My Wardrobe", "Mummy Wardrobe")
   ========================================================================== */

const uploadWardrobeMedia = upload.fields([
  { name: 'ownerFaceImage', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// Create Wardrobe
router.post('/create-wardrobe', checkQuota('wardrobes'), uploadWardrobeMedia, wardrobeController.createWardrobe);

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

/* ==========================================================================
   2. SINGLE & MULTI-PHOTO CLOTH ITEM ADDITION API
   ========================================================================== */

// Media upload handler: supports 1 photo or multi-photo uploads (e.g. 1 to 50 gallery photos)
const uploadClothMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'photos', maxCount: 50 },
  { name: 'images', maxCount: 50 },
  { name: 'files', maxCount: 50 },
]);

// Single Unified Add Item Endpoint (Handles 1 to 50 photos, with/without person mode, Python AI split & background Gemini analysis)
router.post('/add-item', checkQuota('clothingItems'), uploadClothMedia, wardrobeController.addItem);

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

module.exports = router;
