const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const vendorCategoryService = require('./vendorCategory.service');

class VendorCategoryController {
  /**
   * @desc    Create a new vendor service category
   * @route   POST /api/admin/vendor-categories
   * @access  Private (Admin)
   */
  createCategory = asyncHandler(async (req, res) => {
    const category = await vendorCategoryService.createCategory(req.body);
    return ApiResponse.created(res, category, 'Vendor category created successfully');
  });

  /**
   * @desc    Get all vendor categories (public or admin)
   * @route   GET /api/admin/vendor-categories
   * @access  Public / Admin
   */
  getAllCategories = asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true';
    const categories = await vendorCategoryService.getAllCategories({ includeInactive });
    return ApiResponse.success(res, categories, 'Vendor categories retrieved successfully');
  });

  /**
   * @desc    Get a single category by ID
   * @route   GET /api/admin/vendor-categories/:id
   * @access  Public / Admin
   */
  getCategoryById = asyncHandler(async (req, res) => {
    const category = await vendorCategoryService.getCategoryById(req.params.id);
    return ApiResponse.success(res, category, 'Vendor category details retrieved successfully');
  });

  /**
   * @desc    Update category (PATCH)
   * @route   PATCH /api/admin/vendor-categories/:id
   * @access  Private (Admin)
   */
  updateCategory = asyncHandler(async (req, res) => {
    const updated = await vendorCategoryService.updateCategory(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Vendor category updated successfully');
  });

  /**
   * @desc    Delete or deactivate category
   * @route   DELETE /api/admin/vendor-categories/:id
   * @access  Private (Admin)
   */
  deleteCategory = asyncHandler(async (req, res) => {
    const result = await vendorCategoryService.deleteCategory(req.params.id, req.query.hard);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new VendorCategoryController();
