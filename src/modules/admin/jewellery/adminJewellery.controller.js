const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const adminJewelleryService = require('./adminJewellery.service');

class AdminJewelleryController {
  /**
   * GET /api/admin/jewellery/stats
   */
  getStats = asyncHandler(async (req, res) => {
    const stats = await adminJewelleryService.getOperationalStats();
    return ApiResponse.success(res, stats, 'Jewellery operational statistics retrieved successfully');
  });

  /**
   * GET /api/admin/jewellery/items
   */
  getAllItems = asyncHandler(async (req, res) => {
    const result = await adminJewelleryService.getAllItems(req.query);
    return ApiResponse.success(res, result, 'Jewellery items retrieved successfully');
  });

  /**
   * GET /api/admin/jewellery/items/:id
   */
  getItemById = asyncHandler(async (req, res) => {
    const item = await adminJewelleryService.getItemById(req.params.id);
    return ApiResponse.success(res, item, 'Jewellery item retrieved successfully');
  });

  /**
   * PATCH /api/admin/jewellery/items/:id/status-override
   */
  statusOverride = asyncHandler(async (req, res) => {
    const adminId = req.user?._id || req.user?.id;
    const result = await adminJewelleryService.statusOverride(adminId, req.params.id, req.body);
    return ApiResponse.success(res, result, 'Jewellery status overridden successfully');
  });

  /**
   * PATCH /api/admin/jewellery/items/:id/restore
   */
  restore = asyncHandler(async (req, res) => {
    const adminId = req.user?._id || req.user?.id;
    const result = await adminJewelleryService.restoreItem(adminId, req.params.id);
    return ApiResponse.success(res, result, result.message || 'Jewellery item restored successfully');
  });

  /**
   * GET /api/admin/jewellery/users/:userId
   */
  getUserJewellery = asyncHandler(async (req, res) => {
    const result = await adminJewelleryService.getUserJewelleryOverview(req.params.userId);
    return ApiResponse.success(res, result, 'User jewellery overview retrieved successfully');
  });
}

module.exports = new AdminJewelleryController();
