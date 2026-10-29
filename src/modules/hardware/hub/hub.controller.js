const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const hubService = require('./hub.service');

class HubController {
  // POST /hardware/hubs
  create = asyncHandler(async (req, res) => {
    const hub = await hubService.createHub({
      ...req.body,
      userId: req.body.userId || req.user?.id || null,
    });
    return ApiResponse.created(res, hub, 'Hub registered successfully');
  });

  // GET /hardware/hubs
  getAll = asyncHandler(async (req, res) => {
    const result = await hubService.getHubs({
      ...req.query,
      userId: req.query.userId || req.user?.id,
    });
    return ApiResponse.success(res, result, 'Hubs retrieved successfully');
  });

  // GET /hardware/hubs/:id
  getById = asyncHandler(async (req, res) => {
    const hub = await hubService.getHubById(req.params.id);
    return ApiResponse.success(res, hub, 'Hub retrieved successfully');
  });

  // GET /hardware/hubs/mac/:mac_id
  getByMac = asyncHandler(async (req, res) => {
    const hub = await hubService.getHubByMac(req.params.mac_id);
    return ApiResponse.success(res, hub, 'Hub retrieved successfully');
  });

  // PATCH /hardware/hubs/:id/wifi
  configureWifi = asyncHandler(async (req, res) => {
    const hub = await hubService.configureWifi(req.params.id, req.body);
    return ApiResponse.success(res, hub, 'Wi-Fi configured successfully');
  });

  // PATCH /hardware/hubs/:id/status
  updateStatus = asyncHandler(async (req, res) => {
    const hub = await hubService.updateStatus(req.params.id, req.body.status);
    return ApiResponse.success(res, hub, `Hub status updated to ${hub.status}`);
  });

  // PATCH /hardware/hubs/:id
  update = asyncHandler(async (req, res) => {
    const hub = await hubService.updateHub(req.params.id, req.body);
    return ApiResponse.success(res, hub, 'Hub updated successfully');
  });

  // DELETE /hardware/hubs/:id
  remove = asyncHandler(async (req, res) => {
    const result = await hubService.deleteHub(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new HubController();

