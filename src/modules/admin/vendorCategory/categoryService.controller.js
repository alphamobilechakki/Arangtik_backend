const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const categoryServiceService = require('./categoryService.service');

class CategoryServiceController {
  /**
   * @desc    Create a new service under a category
   * @route   POST /api/admin/vendor-categories/:categoryId/services
   *          POST /api/admin/services
   * @access  Private (Admin)
   */
  createService = asyncHandler(async (req, res) => {
    const categoryId = req.params.categoryId || req.body.categoryId || req.body.category;
    const service = await categoryServiceService.createService(categoryId, req.body);
    return ApiResponse.created(res, service, 'Category service created successfully');
  });

  /**
   * @desc    Get all active services for a category
   * @route   GET /api/admin/vendor-categories/:categoryId/services
   *          GET /api/vendor-categories/:categoryId/services
   *          GET /api/categories/:categoryId/services
   * @access  Public / Private
   */
  getServicesByCategory = asyncHandler(async (req, res) => {
    const categoryId = req.params.categoryId || req.query.category || req.query.categoryId;
    const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === true;
    const services = await categoryServiceService.getServicesByCategory(categoryId, {
      includeInactive,
    });
    return ApiResponse.success(res, services, 'Category services retrieved successfully');
  });

  /**
   * @desc    Get all services across all categories with optional filters
   * @route   GET /api/admin/services
   * @access  Private (Admin)
   */
  getAllServices = asyncHandler(async (req, res) => {
    const { category, includeInactive } = req.query;
    const services = await categoryServiceService.getAllServices({
      category,
      includeInactive: includeInactive === 'true' || includeInactive === true,
    });
    return ApiResponse.success(res, services, 'All services retrieved successfully');
  });

  /**
   * @desc    Get a single service by ID
   * @route   GET /api/admin/services/:id
   * @access  Private (Admin)
   */
  getServiceById = asyncHandler(async (req, res) => {
    const service = await categoryServiceService.getServiceById(req.params.id);
    return ApiResponse.success(res, service, 'Service retrieved successfully');
  });

  /**
   * @desc    Update a service (PATCH)
   * @route   PATCH /api/admin/services/:id
   * @access  Private (Admin)
   */
  updateService = asyncHandler(async (req, res) => {
    const service = await categoryServiceService.updateService(req.params.id, req.body);
    return ApiResponse.success(res, service, 'Service updated successfully');
  });

  /**
   * @desc    Activate or Deactivate a service
   * @route   PATCH /api/admin/services/:id/status
   * @access  Private (Admin)
   */
  toggleServiceStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const service = await categoryServiceService.toggleServiceStatus(req.params.id, isActive);
    return ApiResponse.success(
      res,
      service,
      `Service ${service.isActive ? 'activated' : 'deactivated'} successfully`
    );
  });

  /**
   * @desc    Delete a service (Soft or Hard)
   * @route   DELETE /api/admin/services/:id
   * @access  Private (Admin)
   */
  deleteService = asyncHandler(async (req, res) => {
    const hard = req.query.hard === 'true' || req.query.hard === true;
    const result = await categoryServiceService.deleteService(req.params.id, { hard });
    return ApiResponse.success(res, result, result.message);
  });
}

const categoryServiceController = new CategoryServiceController();
module.exports = categoryServiceController;
