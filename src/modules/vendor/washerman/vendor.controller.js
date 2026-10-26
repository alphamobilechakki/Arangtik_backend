const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const vendorService = require('./vendor.service');

class VendorController {
  /**
   * @desc    Lookup vendor by phone number (from contacts or manual input)
   * @route   GET /api/v1/vendor/lookup?phone=919876543210
   * @access  Private
   */
  lookupVendor = asyncHandler(async (req, res) => {
    const { phone } = req.query;
    const result = await vendorService.lookupVendor(phone, req.user?.id);
    return ApiResponse.success(
      res,
      result,
      result.isRegistered
        ? 'Registered vendor found'
        : 'Vendor details retrieved'
    );
  });

  /**
   * @desc    Get all work orders assigned to currently authenticated vendor
   * @route   GET /api/vendor/orders
   * @access  Private (Vendor)
   */
  getVendorOrders = asyncHandler(async (req, res) => {
    const result = await vendorService.getVendorOrders(req.vendor, req.query);
    return ApiResponse.success(res, result, 'Vendor work orders retrieved successfully');
  });

  /**
   * @desc    Get details of a specific work order for vendor
   * @route   GET /api/vendor/orders/:id
   * @access  Private (Vendor)
   */
  getVendorOrderDetails = asyncHandler(async (req, res) => {
    const order = await vendorService.getVendorOrderById(req.vendor, req.params.id);
    return ApiResponse.success(res, order, 'Vendor work order details retrieved');
  });

  /**
   * @desc    Update status of an assigned work order (Vendor self-service per Rule 4 using PATCH)
   * @route   PATCH /api/vendor/orders/:id/status
   * @access  Private (Vendor)
   */
  updateVendorOrderStatus = asyncHandler(async (req, res) => {
    const order = await vendorService.updateVendorOrderStatus(
      req.vendor,
      req.params.id,
      req.body
    );
    return ApiResponse.success(res, order, 'Work order status updated successfully by vendor');
  });

  /**
   * @desc    Get offered services of a vendor
   * @route   GET /api/vendor/:id/services
   * @access  Public / Private
   */
  getVendorServices = asyncHandler(async (req, res) => {
    const result = await vendorService.getVendorServices(req.params.id);
    return ApiResponse.success(res, result, 'Vendor offered services retrieved successfully');
  });

  /**
   * @desc    Find eligible vendors offering required services in a category
   * @route   POST /api/vendor/eligible
   *          GET /api/vendor/eligible
   * @access  Public / Private
   */
  getEligibleVendors = asyncHandler(async (req, res) => {
    let category = req.body?.category || req.query?.category;
    if (!category) {
      const VendorCategory = require('../../admin/vendorCategory/vendorCategory.model');
      const firstCat = await VendorCategory.findOne({ isActive: true }).sort({ sortOrder: 1, createdAt: 1 });
      category = firstCat?.name || '';
    }
    const requiredServices =
      req.body?.requiredServices || req.body?.services || req.query?.services;
    const latitude = req.body?.latitude ?? req.query?.latitude ?? req.body?.lat ?? req.query?.lat;
    const longitude = req.body?.longitude ?? req.query?.longitude ?? req.body?.lng ?? req.query?.lng;
    const radius = req.body?.radius ?? req.body?.maxDistance ?? req.query?.radius ?? req.query?.maxDistance;

    const vendors = await vendorService.getEligibleVendors({
      category,
      requiredServices,
      latitude,
      longitude,
      radius,
    });
    return ApiResponse.success(res, vendors, 'Eligible vendors retrieved successfully');
  });
}

module.exports = new VendorController();
