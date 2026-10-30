const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const ApiError = require('../../../utils/apiError');
const kitchenBoxService = require('./kitchenBox.service');

/**
 * Controller: Get list of all kitchen boxes
 * GET /api/integration/boxes
 */
const getAllKitchenBoxes = asyncHandler(async (req, res) => {
  const { page, limit, search, status, hub_mac_id, userId, sortBy, order } = req.query;

  const result = await kitchenBoxService.getAllKitchenBoxes({
    page,
    limit,
    search,
    status,
    hub_mac_id,
    userId,
    sortBy,
    order,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'KitchenBoxes retrieved successfully'));
});

/**
 * Controller: Get single kitchen box details by ID or MAC address
 * GET /api/integration/boxes/:id
 */
const getKitchenBoxById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, 'KitchenBox ID or MAC address is required');
  }

  const box = await kitchenBoxService.getKitchenBoxById(id);

  return res
    .status(200)
    .json(new ApiResponse(200, { box }, 'KitchenBox details retrieved successfully'));
});

/**
 * Controller: Get all kitchen boxes paired to a hub (by Hub ID or MAC)
 * GET /api/integration/boxes/hub/:hubId
 */
const getKitchenBoxesByHubId = asyncHandler(async (req, res) => {
  const { hubId } = req.params;

  if (!hubId) {
    throw new ApiError(400, 'Hub ID or Hub MAC address is required');
  }

  const result = await kitchenBoxService.getKitchenBoxesByHubId(hubId, req.query);

  return res
    .status(200)
    .json(new ApiResponse(200, result, `KitchenBoxes for hub ${hubId} retrieved successfully`));
});

module.exports = {
  getAllKitchenBoxes,
  getKitchenBoxById,
  getKitchenBoxesByHubId,
};

