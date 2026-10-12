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

// Unified media upload handler for 1 to 100 photos (camera click, single dress, or bulk gallery)
const uploadClothMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
  { name: 'photos', maxCount: 100 },
  { name: 'images', maxCount: 100 },
  { name: 'files', maxCount: 100 },
]);

/* ==========================================================================
   2. CLOTH SCAN & EXTRACTION APIs (1 Photo or up to 100 Photos)
   ========================================================================== */

/**
 * 1. SCAN ITEM (AI scans photo(s), detects garments, extracts colors/taxonomy, checks duplicates)
 * @route   POST /api/wardrobe/scan-item (Supports 1 photo or up to 100 photos)
 * @aliases POST /api/wardrobe/scan, /analyze-photo, /analyze, /scan-gallery-photo
 */
router.post(
  ['/scan-item', '/scan', '/analyze-photo', '/analyze', '/scan-gallery-photo'],
  uploadClothMedia,
  wardrobeController.analyzePhoto
);

/**
 * 2. EXTRACT ITEM (Extracts & adds garment(s) directly to wardrobe - 1 photo, 1-100 bulk, or JSON array)
 * @route   POST /api/wardrobe/extract-item (Supports 1 photo, 1 to 100 photos, or selected items array)
 * @aliases POST /api/wardrobe/add-item, /items, /extract-dress, /bulk-add-photos, /ingest-gallery
 */
router.post(
  ['/extract-item', '/add-item', '/items', '/extract-dress'],
  uploadClothMedia,
  wardrobeController.addItem
);

// Legacy bulk upload array handlers (kept for 100% backward compatibility)
router.post('/bulk-add-photos', upload.array('photos', 100), wardrobeController.bulkAddPhotos);
router.post('/ingest-gallery', upload.array('photos', 100), wardrobeController.ingestGalleryPhotos);

/* ==========================================================================
   3. WARDROBE ITEMS MANAGEMENT (CRUD)
   ========================================================================== */

/**
 * 3. GET ITEMS (List all wardrobe clothes with search, category, occasion, color, pagination)
 * @route   GET /api/wardrobe/get-items
 * @aliases GET /api/wardrobe/get-all-items, /items
 */
router.get(
  ['/get-items', '/get-all-items', '/items'],
  wardrobeController.getAllItems
);

/**
 * 4. GET ITEM (Get single clothing item details by ID)
 * @route   GET /api/wardrobe/get-item/:id
 * @aliases GET /api/wardrobe/get-item-details/:id, /items/:id
 */
router.get(
  ['/get-item/:id', '/get-item-details/:id', '/items/:id'],
  wardrobeController.getItemDetails
);

/**
 * 5. EDIT ITEM (Update clothing item attributes by ID)
 * @route   PATCH /api/wardrobe/edit-item/:id
 * @aliases PATCH /api/wardrobe/update-item/:id, /items/:id
 */
router.patch(
  ['/edit-item/:id', '/update-item/:id', '/items/:id'],
  wardrobeController.updateItem
);

/**
 * 6. DELETE ITEM (Delete clothing item from closet)
 * @route   DELETE /api/wardrobe/delete-item/:id
 * @aliases DELETE /api/wardrobe/items/:id
 */
router.delete(
  ['/delete-item/:id', '/items/:id'],
  wardrobeController.deleteItem
);

/**
 * 7. 3D GARMENT MODEL GENERATION (Hugging Face TripoSR)
 * @route   POST /api/wardrobe/generate-3d/:id
 * @aliases POST /api/wardrobe/items/:id/generate-3d
 */
router.post(
  ['/generate-3d/:id', '/items/:id/generate-3d'],
  wardrobeController.generateItem3D
);

module.exports = router;
