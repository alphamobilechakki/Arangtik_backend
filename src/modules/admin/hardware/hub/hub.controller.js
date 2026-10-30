const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');
const hubService = require('./hub.service');

class HubController {
  getStats = asyncHandler(async (req, res) => {
    const stats = await hubService.getStats();
    return ApiResponse.success(res, stats, 'Hub statistics retrieved successfully');
  });

  createHub = asyncHandler(async (req, res) => {
    const hub = await hubService.createHub(req.body);
    return ApiResponse.created(res, hub, 'Hub created successfully');
  });

  getHubs = asyncHandler(async (req, res) => {
    const result = await hubService.getHubs(req.query);
    return ApiResponse.success(res, result, 'Hubs retrieved successfully');
  });

  getHubById = asyncHandler(async (req, res) => {
    const hub = await hubService.getHubById(req.params.id);
    return ApiResponse.success(res, hub, 'Hub details retrieved successfully');
  });

  updateHub = asyncHandler(async (req, res) => {
    const hub = await hubService.updateHub(req.params.id, req.body);
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

