const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const ApiError = require('../../../utils/apiError');
const jewelleryService = require('./jewellery.service');

class JewelleryController {
  /**
   * POST /add-item
   * User uploads 1–20 jewellery photos. AI fills name, type, category,
   * gemstone, and color automatically. No other fields required.
   */
  addItem = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;

    // Collect all uploaded photos regardless of multer field name
    const files = Object.values(req.files || {}).flat();
    if (req.file) files.push(req.file);

    if (!files.length) {
      throw new ApiError(400, 'Please upload at least one jewellery photo');
    }

    const { processAndSaveJewelleryItem } = require('../analysis/jewelleryAnalysis.service');

    // Process all photos in parallel — each gets its own instant DB record + BullMQ job
    const results = await Promise.all(
      files.map((file) => processAndSaveJewelleryItem(userId, file, req.body))
    );

    const items      = results.filter((r) => !r.isDuplicate).map((r) => r.item);
    const duplicates = results.filter((r) =>  r.isDuplicate).map((r) => r.item);

    return ApiResponse.created(
      res,
      { totalUploaded: files.length, totalCreated: items.length, totalDuplicates: duplicates.length, items, duplicates },
      `${items.length} jewellery item(s) added. AI is analysing each photo.`
    );
  });

  createSetWithItems = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const result = await jewelleryService.createSetWithItems(userId, req.body, req.file);
    return ApiResponse.created(res, result, 'Jewellery set and items created successfully');
  });

  getAll = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const result = await jewelleryService.getUserItems(userId, req.query);
    return ApiResponse.success(res, result, 'Jewellery items retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const item = await jewelleryService.getItemById(userId, req.params.id, {
      includeDeleted: req.query.includeDeleted === 'true',
    });
    return ApiResponse.success(res, item, 'Jewellery item retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const item = await jewelleryService.updateItem(userId, req.params.id, req.body, req.files);
    return ApiResponse.success(res, item, 'Jewellery item updated successfully');
  });

  updateStatus = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const item = await jewelleryService.updateItemStatus(userId, req.params.id, req.body.status);
    return ApiResponse.success(res, item, `Jewellery status updated to ${item.status}`);
  });

  move = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const item = await jewelleryService.moveItem(
      userId,
      req.params.id,
      req.body.targetJewelleryBoxId
    );
    return ApiResponse.success(res, item, 'Jewellery moved to new box successfully');
  });

  toggleFavorite = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const result = await jewelleryService.toggleFavorite(userId, req.params.id);
    return ApiResponse.success(res, result, result.message);
  });

  delete = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const hard = req.query.hard === 'true' || req.query.hard === true;
    const result = await jewelleryService.deleteItem(userId, req.params.id, { hard });
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new JewelleryController();
