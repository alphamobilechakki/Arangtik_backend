const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const hubService = require('./hub.service');

class HubController {
  // PATCH /hardware/hubs/activate
  activate = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.body.userId;
    const hub = await hubService.activateHub(req.body, userId);
    return ApiResponse.success(res, hub, 'Hub activated successfully');
  });

  // PATCH /hardware/hubs/deactivate
  deactivate = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.body.userId;
    const hub = await hubService.deactivateHub(req.body, userId);
    return ApiResponse.success(res, hub, 'Hub deactivated successfully');
  });

  // GET /hardware/hubs
  getMyHubs = asyncHandler(async (req, res) => {
    const hubs = await hubService.getMyHubs(req.user?.id || req.query.userId);
    return ApiResponse.success(res, hubs, 'Hubs retrieved successfully');
  });
}

module.exports = new HubController();


