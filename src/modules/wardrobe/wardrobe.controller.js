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
  const result = await wardrobeService.analyzePhoto(userId, req.file);

  return ApiResponse.success(res, result, 'Photo analyzed successfully with clothing recognition');
});

/**
 * @desc    Add a new item to wardrobe store
 * @route   POST /api/wardrobe/add-item
 * @access  Private
 */
const addItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const item = await wardrobeService.addItem(userId, req.body);

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
 * @desc    Quick update item operational status
 * @route   PATCH /api/wardrobe/update-item-status/:id
 * @access  Private
 */
const updateItemStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { status } = req.body;
  const updatedItem = await wardrobeService.updateItemStatus(userId, req.params.id, status);

  return ApiResponse.success(res, updatedItem, `Item status updated to ${status} successfully`);
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
 * @desc    Log a worn dress / outfit into wear history
 * @route   POST /api/wardrobe/log-worn-dress
 * @access  Private
 */
const logWornDress = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.logWornDress(userId, req.body);

  return ApiResponse.created(res, result, 'Worn outfit logged successfully and wear count updated');
});

/**
 * @desc    Get user wear history logs
 * @route   GET /api/wardrobe/get-wear-history
 * @access  Private
 */
const getWearHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.getWearHistory(userId, req.query);

  return ApiResponse.success(res, result, 'Wear history fetched successfully');
});

/**
 * @desc    Get AI smart stylist outfit suggestions for an occasion
 * @route   POST /api/wardrobe/suggest-outfit
 * @access  Private
 */
const suggestOutfit = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.suggestOutfit(userId, req.body);

  return ApiResponse.success(res, result, 'Outfit suggestions generated successfully');
});

/**
 * @desc    Lend an item to a friend/relative
 * @route   POST /api/wardrobe/lend-item
 * @access  Private
 */
const lendItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.lendItem(userId, req.body);

  return ApiResponse.success(res, result, `Item lent out to ${req.body.assignedTo} successfully`);
});

/**
 * @desc    Return a lent item back to wardrobe
 * @route   PATCH /api/wardrobe/return-lent-item/:id
 * @access  Private
 */
const returnLentItem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.returnLentItem(userId, req.params.id);

  return ApiResponse.success(res, result, 'Lent item returned and status set to AVAILABLE');
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
    autoCreateNewItems: req.body.autoCreateNewItems !== 'false' && req.body.autoCreateNewItems !== false,
    autoLogWear: req.body.autoLogWear !== 'false' && req.body.autoLogWear !== false,
    threshold: req.body.threshold ? parseFloat(req.body.threshold) : null,
    occasion: req.body.occasion || 'CASUAL',
  };

  const result = await wardrobeService.ingestGalleryPhotos(userId, files, options);

  return ApiResponse.success(
    res,
    result,
    `Gallery scanned: ${result.matchedUserImagesCount} photos matched your face, ${result.newWardrobeItemsCreated.length} new items added to wardrobe`
  );
});

/**
 * @desc    Get all items currently lent out
 * @route   GET /api/wardrobe/get-lent-items
 * @access  Private
 */
const getLentItems = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await wardrobeService.getLentItems(userId);

  return ApiResponse.success(res, result, 'Lent items fetched successfully');
});

module.exports = {
  analyzePhoto,
  addItem,
  getAllItems,
  getItemDetails,
  updateItem,
  updateItemStatus,
  deleteItem,
  logWornDress,
  getWearHistory,
  suggestOutfit,
  lendItem,
  returnLentItem,
  getLentItems,
  ingestGalleryPhotos,
};
