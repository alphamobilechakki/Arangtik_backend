const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const wardrobeService = require('./wardrobe.service');

/**
 * @desc    Analyze uploaded photo to extract clothes and check wardrobe duplicates
 * @route   POST /api/wardrobe/analyze-photo
 * @access  Private
 */
const analyzePhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const file =
    req.file ||
    req.files?.photo?.[0] ||
    req.files?.image?.[0] ||
    req.files?.file?.[0] ||
    req.files?.photos?.[0] ||
    req.files?.images?.[0] ||
    (Array.isArray(req.files) ? req.files[0] : null);

  const result = await wardrobeService.analyzePhoto(userId, file, {
    wardrobeId: req.body?.wardrobeId || req.query?.wardrobeId || null,
    verifyFace: req.body?.verifyFace === 'true' || req.body?.verifyFace === true,
    faceBoxes: req.body?.faceBoxes || null,
  });

  return ApiResponse.success(res, result, 'Photo analyzed successfully with clothing recognition');
});

/**
 * @desc    Add a new item to wardrobe store (supports JSON or Photo upload with AI auto-fill)
 * @route   POST /api/wardrobe/add-item
 * @access  Private
 */
const addItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const file =
    req.file ||
    req.files?.photo?.[0] ||
    req.files?.image?.[0] ||
    req.files?.file?.[0] ||
    req.files?.photos?.[0] ||
    req.files?.images?.[0] ||
    (Array.isArray(req.files) ? req.files[0] : null);

  const item = await wardrobeService.addItem(userId, req.body, file);

  return ApiResponse.created(res, item, 'Item added successfully to wardrobe store');
});

/**
 * @desc    Get all items from wardrobe store with filters & pagination
 * @route   GET /api/wardrobe/get-all-items
 * @access  Private
 */
const getAllItems = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.getAllItems(userId, req.query);

  return ApiResponse.success(res, result, 'Wardrobe items fetched successfully');
});

/**
 * @desc    Get single item details by ID
 * @route   GET /api/wardrobe/get-item-details/:id
 * @access  Private
 */
const getItemDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const item = await wardrobeService.getItemById(userId, req.params.id);

  return ApiResponse.success(res, item, 'Wardrobe item details fetched successfully');
});

/**
 * @desc    Update an existing wardrobe item
 * @route   PATCH /api/wardrobe/update-item/:id
 * @access  Private
 */
const updateItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updatedItem = await wardrobeService.updateItem(userId, req.params.id, req.body);

  return ApiResponse.success(res, updatedItem, 'Wardrobe item updated successfully');
});

/**
 * @desc    Delete / Archive item from wardrobe store
 * @route   DELETE /api/wardrobe/delete-item/:id
 * @access  Private
 */
const deleteItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { permanent } = req.query;
  const result = await wardrobeService.deleteItem(userId, req.params.id, permanent);

  return ApiResponse.success(res, result, 'Wardrobe item deleted/archived successfully');
});

/**
 * @desc    Ingest clothes from gallery photos (Face Match -> AI Garment Extract -> Digital Wardrobe Ingest)
 * @route   POST /api/wardrobe/ingest-gallery
 * @access  Private
 */
const ingestGalleryPhotos = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = req.files || (req.file ? [req.file] : []);
  const options = {
    wardrobeId: req.body.wardrobeId || null,
    collectionId: req.body.collectionId || null,
    autoCreateNewItems: req.body.autoCreateNewItems !== 'false' && req.body.autoCreateNewItems !== false,
    threshold: req.body.threshold ? parseFloat(req.body.threshold) : null,
  };

  const result = await wardrobeService.ingestGalleryPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    `Gallery scanned: ${result.matchedUserImagesCount} photos matched your face, ${result.newWardrobeItemsCreated.length} new items added to wardrobe`
  );
});

/**
 * @desc    Bulk add standalone dress photos (1 to 100 photos)
 * @route   POST /api/wardrobe/bulk-add-photos
 * @access  Private
 */
const bulkAddPhotos = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const files = req.files || (req.file ? [req.file] : []);
  const options = {
    wardrobeId: req.body.wardrobeId || null,
    collectionId: req.body.collectionId || null,
    storagePlace: req.body.storagePlace || 'Main Closet',
  };

  const result = await wardrobeService.bulkAddDressPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    `Bulk processing complete: ${result.newItemsCreated.length} items added to wardrobe, ${result.existingMatches.length} existing items matched`
  );
});

/**
 * @desc    Scan a single user gallery photo for authenticated user & extract clothing
 * @route   POST /api/wardrobe/scan-gallery-photo
 * @access  Private
 */
const scanGalleryPhoto = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const file = req.file || (req.files?.photo?.[0] || req.files?.image?.[0]);
  const options = {
    wardrobeId: req.body.wardrobeId || null,
    collectionId: req.body.collectionId || null,
    threshold: req.body.threshold ? parseFloat(req.body.threshold) : null,
  };

  const result = await wardrobeService.scanGalleryPhoto(userId, file, options);

  const message = result.matched
    ? `User matched successfully! Extracted ${result.detectedItemsCount} clothing items.`
    : 'User face not detected in this photo. Skipped clothing extraction.';

  return ApiResponse.success(res, result, message);
});

/**
 * @desc    Create a new Wardrobe (Closet container)
 * @route   POST /api/wardrobe/create-wardrobe OR /api/wardrobe/closets
 * @access  Private
 */
const createWardrobe = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const ownerFaceFile = req.files?.ownerFaceImage?.[0] || null;
  const coverFile =
    req.files?.coverImage?.[0] ||
    req.files?.photo?.[0] ||
    req.files?.image?.[0] ||
    req.file ||
    null;

  const filesObj = {
    ownerFaceImage: ownerFaceFile,
    coverImage: coverFile,
  };
  const result = await wardrobeService.createWardrobe(userId, req.body, filesObj);

  return ApiResponse.created(res, result, 'Wardrobe closet created successfully');
});

/**
 * @desc    Get all active Wardrobes for user
 * @route   GET /api/wardrobe/get-wardrobes OR /api/wardrobe/closets
 * @access  Private
 */
const getWardrobes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.getWardrobes(userId, req.query);

  return ApiResponse.success(res, result, 'Wardrobe closets fetched successfully');
});

module.exports = {
  createWardrobe,
  getWardrobes,
  addItem,
  getAllItems,
  getItemDetails,
  updateItem,
  deleteItem,
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddPhotos,
  ingestGalleryPhotos,
};
