const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');
const ApiError = require('../../../../utils/apiError');
const kitchenBoxService = require('./kitchenBox.service');

class KitchenBoxController {
  getStats = asyncHandler(async (req, res) => {
    const stats = await kitchenBoxService.getStats();
    return ApiResponse.success(res, stats, 'KitchenBox statistics retrieved successfully');
  });

  generateQrCodeByMac = asyncHandler(async (req, res) => {
    const { mac_id } = req.query;
    if (!mac_id) {
      throw new ApiError(400, 'mac_id query parameter is required (e.g. ?mac_id=AA:BB:CC:DD:EE:FF)');
    }
    const data = await kitchenBoxService.generateQrCodeForMac(mac_id, req);
    return ApiResponse.success(res, data, 'KitchenBox QR Code generated successfully');
  });

  getKitchenBoxQrCode = asyncHandler(async (req, res) => {
    const data = await kitchenBoxService.getKitchenBoxQrCode(req.params.id, req);
    return ApiResponse.success(res, data, 'KitchenBox QR Code retrieved successfully');
  });

  createKitchenBox = asyncHandler(async (req, res) => {
    const box = await kitchenBoxService.createKitchenBox(req.body, req);
    return ApiResponse.created(res, box, 'KitchenBox created successfully');
  });

  createMultipleKitchenBoxes = asyncHandler(async (req, res) => {
    const result = await kitchenBoxService.createMultipleKitchenBoxes(req.body, req);
    return ApiResponse.created(
      res,
      result,
      `Batch kitchen box creation completed: ${result.totalCreated} created, ${result.totalSkipped} skipped, ${result.totalFailed} failed`
    );
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
    const box = await kitchenBoxService.updateKitchenBox(req.params.id, req.body, req);
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
