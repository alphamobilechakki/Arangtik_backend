const adminFCClusterService = require('../services/adminFCCluster.service');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');

/**
 * GET /api/admin/fc/clusters – List clusters with pagination & filters
 */
const getClusters = asyncHandler(async (req, res) => {
  const result = await adminFCClusterService.getClusters(req.query);
  return ApiResponse.success(res, result, 'Admin clusters retrieved successfully');
});

/**
 * GET /api/admin/fc/clusters/:id – Cluster detail with members
 */
const getClusterDetails = asyncHandler(async (req, res) => {
  const result = await adminFCClusterService.getClusterDetails(req.params.id);
  return ApiResponse.success(res, result, 'Cluster details retrieved successfully');
});

/**
 * GET /api/admin/fc/members – Cross-cluster member lookup
 */
const getMembers = asyncHandler(async (req, res) => {
  const result = await adminFCClusterService.getMembers(req.query);
  return ApiResponse.success(res, result, 'Cluster members retrieved successfully');
});

module.exports = {
  getClusters,
  getClusterDetails,
  getMembers,
};
