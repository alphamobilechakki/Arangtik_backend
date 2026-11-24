const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const jewelleryService = require('./jewellery.service');

class JewelleryController {
  create = asyncHandler(async (req, res) => {
    const userId = req.user?._id || req.user?.id;
    const item = await jewelleryService.createItem(userId, req.body, req.files);
    return ApiResponse.created(res, item, 'Jewellery item created successfully');
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
