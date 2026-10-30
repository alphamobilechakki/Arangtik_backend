const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const ApiError = require('../../../utils/apiError');
const hubService = require('./hub.service');

/**
 * Controller: Get list of all hubs
 * GET /api/integration/hubs
 */
const getAllHubs = asyncHandler(async (req, res) => {
  const { page, limit, search, status, userId, sortBy, order } = req.query;

  const result = await hubService.getAllHubs({
    page,
    limit,
    search,
    status,
    userId,
    sortBy,
    order,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Hubs data retrieved successfully'));
});

/**
 * Controller: Get single hub details by ID or MAC address
 * GET /api/integration/hubs/:id
 */
const getHubById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, 'Hub ID or MAC address is required');
  }

  const hub = await hubService.getHubById(id);

  return res
    .status(200)
    .json(new ApiResponse(200, { hub }, 'Hub details retrieved successfully'));
});

module.exports = {
  getAllHubs,
  getHubById,
};

