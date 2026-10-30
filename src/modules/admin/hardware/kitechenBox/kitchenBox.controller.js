const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');
const kitchenBoxService = require('./kitchenBox.service');

class KitchenBoxController {
  getStats = asyncHandler(async (req, res) => {
    const stats = await kitchenBoxService.getStats();
    return ApiResponse.success(res, stats, 'KitchenBox statistics retrieved successfully');
  });

  createKitchenBox = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.createKitchenBox(req.body);
    return ApiResponse.created(res, box, 'KitchenBox created successfully');
  });

  getKitchenBoxes = asyncHandler(async (req, res) => {
    const result = await kitchenBoxService.getKitchenBoxes(req.query);
    return ApiResponse.success(res, result, 'KitchenBoxes retrieved successfully');
  });

  getKitchenBoxById = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.getKitchenBoxById(req.params.id);
    return ApiResponse.success(res, box, 'KitchenBox details retrieved successfully');
  });

  updateKitchenBox = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.updateKitchenBox(req.params.id, req.body);
    return ApiResponse.success(res, box, 'KitchenBox updated successfully');
  });

  updateKitchenBoxStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const box = await kitchenBoxService.updateKitchenBoxStatus(req.params.id, status);
    return ApiResponse.success(res, box, `KitchenBox status updated to ${status}`);
  });

  deleteKitchenBox = asyncHandler(async (req, res) => {
    const result = await kitchenBoxService.deleteKitchenBox(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new KitchenBoxController();

