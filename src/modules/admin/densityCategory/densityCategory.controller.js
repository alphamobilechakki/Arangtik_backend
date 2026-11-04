const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const densityCategoryService = require('./densityCategory.service');

class DensityCategoryController {
  create = asyncHandler(async (req, res) => {
    const category = await densityCategoryService.createDensityCategory(req.body, req.file);
    return ApiResponse.created(res, category, 'Density category created successfully');
  });

  getAll = asyncHandler(async (req, res) => {
    const categories = await densityCategoryService.getAllDensityCategories(req.query);
    return ApiResponse.success(res, categories, 'Density categories retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const category = await densityCategoryService.getDensityCategoryById(req.params.id);
    return ApiResponse.success(res, category, 'Density category retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const category = await densityCategoryService.updateDensityCategory(req.params.id, req.body, req.file);
    return ApiResponse.success(res, category, 'Density category updated successfully');
  });

  delete = asyncHandler(async (req, res) => {
    const hard = req.query.hard === 'true' || req.query.hard === true;
    const result = await densityCategoryService.deleteDensityCategory(req.params.id, { hard });
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new DensityCategoryController();

