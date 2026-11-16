const adminFCOverviewService = require('../services/adminFCOverview.service');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');

/**
 * GET /api/admin/fc/overview – High-level metrics for Admin FC Dashboard
 */
const getOverview = asyncHandler(async (req, res) => {
  const result = await adminFCOverviewService.getOverviewMetrics();
  return ApiResponse.success(res, result, 'Frequent Connect overview metrics retrieved successfully');
});

module.exports = {
  getOverview,
};
