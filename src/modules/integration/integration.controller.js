const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const ApiError = require('../../utils/apiError');
const integrationService = require('./integration.service');

/**
 * Controller: Get list of all users
 * GET /api/v1/integration/users
 */
const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, status, gender, accountType, sortBy, order } = req.query;

  const result = await integrationService.getAllUsers({
    page,
    limit,
    search,
    status,
    gender,
    accountType,
    sortBy,
    order,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, 'Users data retrieved successfully'));
});

/**
 * Controller: Get user details by ID or Phone
 * GET /api/v1/integration/users/:identifier
 */
const getUserDetail = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  if (!identifier) {
    throw new ApiError(400, 'User ID or Phone number is required');
  }

  const user = await integrationService.getUserByIdOrPhone(identifier);

  if (!user) {
    throw new ApiError(404, 'User not found with the given ID or Phone');
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, 'User details retrieved successfully'));
});

/**
 * Controller: Get user overview stats
 * GET /api/v1/integration/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await integrationService.getUsersStats();

  return res
    .status(200)
    .json(new ApiResponse(200, { stats }, 'Platform statistics retrieved successfully'));
});

module.exports = {
  getUsers,
  getUserDetail,
  getStats,
};
