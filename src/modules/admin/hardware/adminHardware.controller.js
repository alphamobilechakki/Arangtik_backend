const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const adminHardwareService = require('./adminHardware.service');

class AdminHardwareController {
  // ─── Aggregated Stats ───────────────────────────────────────────────────────
  getStats = asyncHandler(async (req, res) => {
    const stats = await adminHardwareService.getHardwareStats();
    return ApiResponse.success(res, stats, 'Hardware statistics retrieved successfully');
  });

  // ─── Hub Operations ────────────────────────────────────────────────────────
  getHubs = asyncHandler(async (req, res) => {
    const result = await adminHardwareService.getHubs(req.query);
    return ApiResponse.success(res, result, 'Hubs retrieved successfully');
  });

  getHubById = asyncHandler(async (req, res) => {
    const hub = await adminHardwareService.getHubById(req.params.id);
    return ApiResponse.success(res, hub, 'Hub details retrieved successfully');
  });

  updateHub = asyncHandler(async (req, res) => {
    const hub = await adminHardwareService.updateHub(req.params.id, req.body);
    return ApiResponse.success(res, hub, 'Hub updated successfully');
  });

  updateHubStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const hub = await adminHardwareService.updateHubStatus(req.params.id, status);
    return ApiResponse.success(res, hub, `Hub status updated to ${status}`);
  });

  deleteHub = asyncHandler(async (req, res) => {
    const result = await adminHardwareService.deleteHub(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });

  // ─── KitchenBox Operations ─────────────────────────────────────────────────
  getKitchenBoxes = asyncHandler(async (req, res) => {
    const result = await adminHardwareService.getKitchenBoxes(req.query);
    return ApiResponse.success(res, result, 'KitchenBoxes retrieved successfully');
  });

  getKitchenBoxById = asyncHandler(async (req, res) => {
    const box = await adminHardwareService.getKitchenBoxById(req.params.id);
    return ApiResponse.success(res, box, 'KitchenBox details retrieved successfully');
  });

  updateKitchenBox = asyncHandler(async (req, res) => {
    const box = await adminHardwareService.updateKitchenBox(req.params.id, req.body);
    return ApiResponse.success(res, box, 'KitchenBox updated successfully');
  });

  updateKitchenBoxStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const box = await adminHardwareService.updateKitchenBoxStatus(req.params.id, status);
    return ApiResponse.success(res, box, `KitchenBox status updated to ${status}`);
  });

  deleteKitchenBox = asyncHandler(async (req, res) => {
    const result = await adminHardwareService.deleteKitchenBox(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new AdminHardwareController();

