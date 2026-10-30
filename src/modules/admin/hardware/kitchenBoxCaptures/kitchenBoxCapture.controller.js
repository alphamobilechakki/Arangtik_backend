const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');
const kitchenBoxCaptureService = require('./kitchenBoxCapture.service');

class KitchenBoxCaptureController {
  // GET /api/admin/hardware/captures/stats
  getStats = asyncHandler(async (req, res) => {
    const stats = await kitchenBoxCaptureService.getStats();
    return ApiResponse.success(res, stats, 'KitchenBox captures statistics retrieved successfully');
  });

  // GET /api/admin/hardware/captures
  getCaptures = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.getCaptures(req.query);
    return ApiResponse.success(res, result, 'KitchenBox captures logs retrieved successfully');
  });

  // GET /api/admin/hardware/captures/:id
  getCaptureById = asyncHandler(async (req, res) => {
    const capture = await kitchenBoxCaptureService.getCaptureById(req.params.id);
    return ApiResponse.success(res, capture, 'KitchenBox capture details retrieved successfully');
  });

  // GET /api/admin/hardware/captures/box/:kitchenBoxId
  getCapturesByBoxId = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.getCapturesByBoxId(
      req.params.kitchenBoxId,
      req.query
    );
    return ApiResponse.success(res, result, 'KitchenBox captures logs retrieved successfully');
  });

  // GET /api/admin/hardware/captures/box/:kitchenBoxId/latest
  getLatestCaptureByBoxId = asyncHandler(async (req, res) => {
    const capture = await kitchenBoxCaptureService.getLatestCaptureByBoxId(
      req.params.kitchenBoxId
    );
    return ApiResponse.success(res, capture, 'Latest KitchenBox capture snapshot retrieved successfully');
  });

  // GET /api/admin/hardware/captures/hub/:hubId
  getCapturesByHubId = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.getCapturesByHubId(
      req.params.hubId,
      req.query
    );
    return ApiResponse.success(res, result, 'Hub captures logs retrieved successfully');
  });

  // DELETE /api/admin/hardware/captures/:id
  deleteCapture = asyncHandler(async (req, res) => {
    const result = await kitchenBoxCaptureService.deleteCapture(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new KitchenBoxCaptureController();

