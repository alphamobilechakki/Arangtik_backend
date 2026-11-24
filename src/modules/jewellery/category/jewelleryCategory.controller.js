const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const jewelleryCategoryService = require('./jewelleryCategory.service');

class JewelleryCategoryController {
  create = asyncHandler(async (req, res) => {
    const category = await jewelleryCategoryService.createCategory(req.body, req.file);
    return ApiResponse.created(res, category, 'Jewellery category created successfully');
  });

  getAll = asyncHandler(async (req, res) => {
    const result = await jewelleryCategoryService.getAllCategories(req.query);
    return ApiResponse.success(res, result, 'Jewellery categories retrieved successfully');
  });

  getById = asyncHandler(async (req, res) => {
    const category = await jewelleryCategoryService.getCategoryById(req.params.id, {
      includeDeleted: req.query.includeDeleted === 'true',
    });
    return ApiResponse.success(res, category, 'Jewellery category retrieved successfully');
  });

  update = asyncHandler(async (req, res) => {
    const category = await jewelleryCategoryService.updateCategory(
      req.params.id,
      req.body,
      req.file
    );
    return ApiResponse.success(res, category, 'Jewellery category updated successfully');
  });

  delete = asyncHandler(async (req, res) => {
    const hard = req.query.hard === 'true' || req.query.hard === true;
    const result = await jewelleryCategoryService.deleteCategory(req.params.id, { hard });
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new JewelleryCategoryController();
