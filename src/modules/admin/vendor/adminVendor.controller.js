const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const adminVendorService = require('./adminVendor.service');

class AdminVendorController {
  /**
   * @desc    Get aggregated stats for vendors (registered & unregistered)
   * @route   GET /api/admin/vendors/stats
   * @access  Private (Admin)
   */
  getStats = asyncHandler(async (req, res) => {
    const stats = await adminVendorService.getVendorStats();
    return ApiResponse.success(res, stats, 'Vendor statistics retrieved successfully');
  });

  /**
   * @desc    Get list of registered vendors (paginated, searchable, filterable)
   * @route   GET /api/admin/vendors/registered
   * @access  Private (Admin)
   */
  getRegisteredVendors = asyncHandler(async (req, res) => {
    const { page, limit, search, status, category, isVerified, sortBy, sortOrder } = req.query;
    const result = await adminVendorService.getRegisteredVendors({
      page,
      limit,
      search,
      status,
      category,
      isVerified,
      sortBy,
      sortOrder,
    });
    return ApiResponse.success(res, result, 'Registered vendors retrieved successfully');
  });

  /**
   * @desc    Get list of unregistered customer-saved vendors
   * @route   GET /api/admin/vendors/unregistered
   * @access  Private (Admin)
   */
  getUnregisteredVendors = asyncHandler(async (req, res) => {
    const { page, limit, search, isConverted, sortBy, sortOrder } = req.query;
    const result = await adminVendorService.getUnregisteredVendors({
      page,
      limit,
      search,
      isConverted,
      sortBy,
      sortOrder,
    });
    return ApiResponse.success(res, result, 'Unregistered vendors retrieved successfully');
  });

  /**
   * @desc    Get registered vendor details by ID
   * @route   GET /api/admin/vendors/registered/:id
   * @access  Private (Admin)
   */
  getRegisteredVendorById = asyncHandler(async (req, res) => {
    const vendor = await adminVendorService.getRegisteredVendorById(req.params.id);
    return ApiResponse.success(res, vendor, 'Registered vendor details retrieved successfully');
  });

  /**
   * @desc    Get unregistered vendor details by ID
   * @route   GET /api/admin/vendors/unregistered/:id
   * @access  Private (Admin)
   */
  getUnregisteredVendorById = asyncHandler(async (req, res) => {
    const vendor = await adminVendorService.getUnregisteredVendorById(req.params.id);
    return ApiResponse.success(res, vendor, 'Unregistered vendor details retrieved successfully');
  });

  /**
   * @desc    Create new registered vendor
   * @route   POST /api/admin/vendors/registered
   * @access  Private (Admin)
   */
  createRegisteredVendor = asyncHandler(async (req, res) => {
    const vendor = await adminVendorService.createRegisteredVendor(req.body);
    return ApiResponse.created(res, vendor, 'Registered vendor created successfully');
  });

  /**
   * @desc    Update registered vendor profile (PATCH)
   * @route   PATCH /api/admin/vendors/registered/:id
   * @access  Private (Admin)
   */
  updateRegisteredVendor = asyncHandler(async (req, res) => {
    const updated = await adminVendorService.updateRegisteredVendor(req.params.id, req.body);
    return ApiResponse.success(res, updated, 'Vendor profile updated successfully');
  });

  /**
   * @desc    Update registered vendor status (PATCH)
   * @route   PATCH /api/admin/vendors/registered/:id/status
   * @access  Private (Admin)
   */
  updateRegisteredVendorStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const updated = await adminVendorService.updateRegisteredVendorStatus(req.params.id, status);
    return ApiResponse.success(res, updated, `Vendor status updated to ${status}`);
  });

  /**
   * @desc    Convert unregistered vendor into official registered vendor
   * @route   POST /api/admin/vendors/unregistered/:id/convert
   * @access  Private (Admin)
   */
  convertUnregisteredVendor = asyncHandler(async (req, res) => {
    const result = await adminVendorService.convertUnregisteredVendor(req.params.id, req.body);
    return ApiResponse.success(res, result, 'Vendor converted to registered successfully');
  });

  /**
   * @desc    Delete or deactivate registered vendor
   * @route   DELETE /api/admin/vendors/registered/:id
   * @access  Private (Admin)
   */
  deleteRegisteredVendor = asyncHandler(async (req, res) => {
    const result = await adminVendorService.deleteRegisteredVendor(req.params.id, req.query.hard);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new AdminVendorController();
