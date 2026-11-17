const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const clusterFeatureService = require('./clusterFeature.service');

class ClusterFeatureController {
  createFeature = asyncHandler(async (req, res) => {
    const feature = await clusterFeatureService.createFeature(req.body);
    return ApiResponse.created(res, feature, 'Feature created successfully');
  });

  getAllFeatures = asyncHandler(async (req, res) => {
    const features = await clusterFeatureService.getAllFeatures(req.query);
    return ApiResponse.success(res, features, 'Features retrieved successfully');
  });

  getFeatureById = asyncHandler(async (req, res) => {
    const includeDeleted = req.query.includeDeleted === 'true';
    const feature = await clusterFeatureService.getFeatureById(req.params.id, includeDeleted);
    return ApiResponse.success(res, feature, 'Feature retrieved successfully');
  });

  updateFeature = asyncHandler(async (req, res) => {
    const feature = await clusterFeatureService.updateFeature(req.params.id, req.body);
    return ApiResponse.success(res, feature, 'Feature updated successfully');
  });

  deleteFeature = asyncHandler(async (req, res) => {
    const hard = req.query.hard === 'true';
    const result = await clusterFeatureService.deleteFeature(req.params.id, hard);
    return ApiResponse.success(
      res,
      result,
      hard ? 'Feature permanently deleted' : 'Feature soft-deleted successfully'
    );
  });

  restoreFeature = asyncHandler(async (req, res) => {
    const feature = await clusterFeatureService.restoreFeature(req.params.id);
    return ApiResponse.success(res, feature, 'Feature restored successfully');
  });

  seedDefaultFeatures = asyncHandler(async (req, res) => {
    const result = await clusterFeatureService.seedDefaultFeatures();
    return ApiResponse.success(res, result, 'Default features seeded successfully');
  });
}

module.exports = new ClusterFeatureController();
