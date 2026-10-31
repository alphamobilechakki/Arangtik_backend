const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');
const ApiError = require('../../../../utils/apiError');
const hubService = require('./hub.service');

class HubController {
  getStats = asyncHandler(async (req, res) => {
    const stats = await hubService.getStats();
    return ApiResponse.success(res, stats, 'Hub statistics retrieved successfully');
  });

  generateQrCodeByMac = asyncHandler(async (req, res) => {
    const { mac_id } = req.query;
    if (!mac_id) {
      throw new ApiError(400, 'mac_id query parameter is required (e.g. ?mac_id=AA:BB:CC:DD:EE:FF)');
    }
    const data = await hubService.generateQrCodeForMac(mac_id, req);
    return ApiResponse.success(res, data, 'QR Code generated successfully');
  });

  createHub = asyncHandler(async (req, res) => {
    const hub = await hubService.createHub(req.body, req);
    return ApiResponse.created(res, hub, 'Hub created successfully');
  });

  createMultipleHubs = asyncHandler(async (req, res) => {
    const result = await hubService.createMultipleHubs(req.body, req);
    return ApiResponse.created(
      res,
      result,
      `Batch hub creation completed: ${result.totalCreated} created, ${result.totalSkipped} skipped, ${result.totalFailed} failed`
    );
  });

  getHubs = asyncHandler(async (req, res) => {
    const result = await hubService.getHubs(req.query, req);
    return ApiResponse.success(res, result, 'Hubs retrieved successfully');
  });

  getHubById = asyncHandler(async (req, res) => {
    const hub = await hubService.getHubById(req.params.id, req);
    return ApiResponse.success(res, hub, 'Hub details retrieved successfully');
  });

  getHubQrCode = asyncHandler(async (req, res) => {
    const data = await hubService.getHubQrCode(req.params.id, req);
    return ApiResponse.success(res, data, 'Hub QR Code retrieved successfully');
  });

  updateHub = asyncHandler(async (req, res) => {
    const hub = await hubService.updateHub(req.params.id, req.body, req);
    return ApiResponse.success(res, hub, 'Hub updated successfully');
  });

  updateHubStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const hub = await hubService.updateHubStatus(req.params.id, status);
    return ApiResponse.success(res, hub, `Hub status updated to ${status}`);
  });

  deleteHub = asyncHandler(async (req, res) => {
    const result = await hubService.deleteHub(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new HubController();

