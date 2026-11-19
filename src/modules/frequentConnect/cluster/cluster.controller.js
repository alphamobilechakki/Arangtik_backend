const clusterService = require('./cluster.service');
const clusterAccessService = require('./clusterAccess.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const {
  validateCreateCluster,
  validateUpdateCluster,
  validateReorder,
} = require('./cluster.validation');

/**
 * POST /api/fc/clusters – Create a new cluster
 */
const createCluster = asyncHandler(async (req, res) => {
  validateCreateCluster(req.body);
  const cluster = await clusterService.createCluster(req.user.id, req.body);
  return ApiResponse.created(res, cluster, 'Cluster created successfully');
});

/**
 * GET /api/fc/clusters – Get all clusters for auth user
 */
const getClusters = asyncHandler(async (req, res) => {
  const clusters = await clusterService.getUserClusters(req.user.id);
  return ApiResponse.success(res, clusters, 'Clusters retrieved successfully');
});

/**
 * GET /api/fc/clusters/:id – Get single cluster details
 */
const getClusterById = asyncHandler(async (req, res) => {
  const cluster = await clusterService.getClusterById(req.params.id, req.user.id);
  return ApiResponse.success(res, cluster, 'Cluster retrieved successfully');
});

/**
 * PUT /api/fc/clusters/:id – Update cluster
 */
const updateCluster = asyncHandler(async (req, res) => {
  validateUpdateCluster(req.body);
  const cluster = await clusterService.updateCluster(
    req.params.id,
    req.user.id,
    req.body
  );
  return ApiResponse.success(res, cluster, 'Cluster updated successfully');
});

/**
 * DELETE /api/fc/clusters/:id – Delete cluster
 */
const deleteCluster = asyncHandler(async (req, res) => {
  const result = await clusterService.deleteCluster(req.params.id, req.user.id);
  return ApiResponse.success(res, result, 'Cluster deleted successfully');
});

/**
 * PATCH /api/fc/clusters/reorder – Reorder cluster priorities
 */
const reorderClusters = asyncHandler(async (req, res) => {
  validateReorder(req.body);
  const result = await clusterService.reorderClusters(req.user.id, req.body.order);
  return ApiResponse.success(res, result, 'Clusters reordered successfully');
});

/**
 * PATCH /api/fc/clusters/:id/features – Add, remove, or toggle features in cluster
 */
const updateClusterFeatures = asyncHandler(async (req, res) => {
  const cluster = await clusterService.updateClusterFeatures(
    req.params.id,
    req.user.id,
    req.body
  );
  return ApiResponse.success(res, cluster, 'Cluster features updated successfully');
});

/**
 * GET /api/fc/clusters/:id/wardrobes – Get overview of all member wardrobes in cluster
 */
const getClusterWardrobes = asyncHandler(async (req, res) => {
  const data = await clusterAccessService.getClusterWardrobesOverview(
    req.params.id,
    req.user.id
  );
  return ApiResponse.success(res, data, 'Cluster wardrobes retrieved successfully');
});

/**
 * GET /api/fc/clusters/features – Get active cluster features for group creation UI
 */
const getAvailableFeatures = asyncHandler(async (req, res) => {
  const ClusterFeature = require('../../admin/clusterFeature/clusterFeature.model');
  const features = await ClusterFeature.find({
    isActive: true,
    isDeleted: false,
  }).sort({ displayOrder: 1, createdAt: 1 });

  return ApiResponse.success(
    res,
    features,
    'Available cluster features retrieved successfully'
  );
});

module.exports = {
  createCluster,
  getClusters,
  getClusterById,
  updateCluster,
  updateClusterFeatures,
  getClusterWardrobes,
  deleteCluster,
  reorderClusters,
  getAvailableFeatures,
};
