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


}

module.exports = new HubController();

