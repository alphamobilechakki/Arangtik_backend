const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const storeTypeService = require('./storeType.service');

class StoreTypeController {
  /**
   * @desc    Create a new store type
   * @route   POST /api/admin/store-types
   * @access  Private (Admin)
   */
  createStoreType = asyncHandler(async (req, res) => {
    const storeType = await storeTypeService.createStoreType(req.body, req.file);
    return ApiResponse.created(res, storeType, 'Store type created successfully');
  });

  /**
   * @desc    Get all store types (Admin or Public)
   * @route   GET /api/admin/store-types, GET /api/store-types
   * @access  Public / Private (Admin)
   */
  getAllStoreTypes = asyncHandler(async (req, res) => {
    const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === true;
    const { search } = req.query;
    const storeTypes = await storeTypeService.getAllStoreTypes({
      includeInactive,
      search,
    });
    return ApiResponse.success(res, storeTypes, 'Store types retrieved successfully');
  });

  /**
   * @desc    Get a single store type by ID
   * @route   GET /api/admin/store-types/:id
   * @access  Private (Admin)
   */
  getStoreTypeById = asyncHandler(async (req, res) => {
    const storeType = await storeTypeService.getStoreTypeById(req.params.id);
    return ApiResponse.success(res, storeType, 'Store type retrieved successfully');
  });

  /**
   * @desc    Update store type (PATCH strictly per Arangtik Rule 4)
   * @route   PATCH /api/admin/store-types/:id
   * @access  Private (Admin)
   */
  updateStoreType = asyncHandler(async (req, res) => {
    const storeType = await storeTypeService.updateStoreType(req.params.id, req.body, req.file);
    return ApiResponse.success(res, storeType, 'Store type updated successfully');
  });

  /**
   * @desc    Toggle store type active status
   * @route   PATCH /api/admin/store-types/:id/status
   * @access  Private (Admin)
   */
  toggleStoreTypeStatus = asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    const storeType = await storeTypeService.toggleStoreTypeStatus(req.params.id, isActive);
    return ApiResponse.success(
      res,
      storeType,
      `Store type ${storeType.isActive ? 'activated' : 'deactivated'} successfully`
    );
  });

  /**
   * @desc    Delete store type
   * @route   DELETE /api/admin/store-types/:id
   * @access  Private (Admin)
   */
  deleteStoreType = asyncHandler(async (req, res) => {
    const hard = req.query.hard === 'true' || req.query.hard === true;
    const result = await storeTypeService.deleteStoreType(req.params.id, { hard });
    return ApiResponse.success(res, result, result.message);
  });
}

const storeTypeController = new StoreTypeController();
module.exports = storeTypeController;
