const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const vendorService = require('../../vendor/vendor.service');
const laundryOrderService = require('./laundryOrder.service');

class LaundryController {
  /**
   * @desc    Lookup vendor by phone number (from contacts or manual input)
   * @route   GET /api/v1/laundry/vendors/lookup?phone=919876543210
   * @access  Private (Mobile App Authenticated User)
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
   * @desc    Find eligible vendors offering requested services
   * @route   POST /api/v1/laundry/vendors/eligible
   *          GET /api/v1/laundry/vendors/eligible
   * @access  Private (User)
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
    const vendors = await vendorService.getEligibleVendors({
      category,
      requiredServices,
    });
    return ApiResponse.success(res, vendors, 'Eligible vendors retrieved successfully');
  });

  /**
   * @desc    Create a new Laundry Work Order
   * @route   POST /api/v1/laundry/orders
   * @access  Private
   */
  createOrder = asyncHandler(async (req, res) => {
    const order = await laundryOrderService.createWorkOrder(req.user.id, req.body);
    return ApiResponse.created(
      res,
      order,
      'Laundry Work Order created and dispatched successfully'
    );
  });

  /**
   * @desc    List user's laundry work orders
   * @route   GET /api/v1/laundry/orders
   * @access  Private
   */
  getOrders = asyncHandler(async (req, res) => {
    const result = await laundryOrderService.getUserOrders(req.user.id, req.query);
    return ApiResponse.success(
      res,
      result,
      'Laundry Work Orders retrieved successfully'
    );
  });

  /**
   * @desc    Get detailed Work Order by ID
   * @route   GET /api/v1/laundry/orders/:id
   * @access  Private
   */
  getOrderDetails = asyncHandler(async (req, res) => {
    const order = await laundryOrderService.getOrderById(req.user.id, req.params.id);
    return ApiResponse.success(res, order, 'Work Order details retrieved');
  });

  /**
   * @desc    Update Work Order Status (User self-service)
   * @route   PATCH /api/v1/laundry/orders/:id/status
   * @access  Private
   */
  updateOrderStatus = asyncHandler(async (req, res) => {
    const order = await laundryOrderService.updateOrderStatus(
      req.user.id,
      req.params.id,
      req.body
    );
    return ApiResponse.success(res, order, 'Work Order status updated successfully');
  });

  /**
   * @desc    Re-send WhatsApp PDF to Vendor
   * @route   POST /api/v1/laundry/orders/:id/resend-whatsapp
   * @access  Private
   */
  resendWhatsApp = asyncHandler(async (req, res) => {
    const result = await laundryOrderService.resendWhatsApp(
      req.user.id,
      req.params.id
    );
    return ApiResponse.success(
      res,
      result,
      'WhatsApp Work Order re-dispatched successfully'
    );
  });
}

module.exports = new LaundryController();
