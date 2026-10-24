const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const adminOrderService = require('./adminOrder.service');

class AdminOrderController {
  /**
   * @desc    Get aggregated order KPIs & statistics
   * @route   GET /api/admin/orders/stats
   * @access  Private (Admin)
   */
  getStats = asyncHandler(async (req, res) => {
    const stats = await adminOrderService.getOrderStats();
    return ApiResponse.success(res, stats, 'Order statistics retrieved successfully');
  });

  /**
   * @desc    Get paginated, filterable & searchable orders
   * @route   GET /api/admin/orders
   * @access  Private (Admin)
   */
  getAllOrders = asyncHandler(async (req, res) => {
    const {
      page,
      limit,
      search,
      status,
      category,
      orderCategory,
      serviceType,
      isRegisteredVendor,
      paymentStatus,
      payment,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await adminOrderService.getAllOrders({
      page,
      limit,
      search,
      status,
      category: category || orderCategory,
      serviceType,
      isRegisteredVendor,
      paymentStatus: paymentStatus || payment,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    return ApiResponse.success(res, result, 'Orders retrieved successfully');
  });

  /**
   * @desc    Get order details by ID or orderNumber
   * @route   GET /api/admin/orders/:id
   * @access  Private (Admin)
   */
  getOrderById = asyncHandler(async (req, res) => {
    const order = await adminOrderService.getOrderById(req.params.id);
    return ApiResponse.success(res, order, 'Order details retrieved successfully');
  });

  /**
   * @desc    Admin update / override order status (Strictly PATCH)
   * @route   PATCH /api/admin/orders/:id/status
   * @access  Private (Admin)
   */
  updateOrderStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body;
    const updated = await adminOrderService.updateOrderStatus(req.params.id, {
      status,
      note,
    });
    return ApiResponse.success(res, updated, `Order status updated to ${status}`);
  });

  /**
   * @desc    Resend WhatsApp PDF work order slip
   * @route   POST /api/admin/orders/:id/resend-whatsapp
   * @access  Private (Admin)
   */
  resendWhatsapp = asyncHandler(async (req, res) => {
    const result = await adminOrderService.resendWhatsapp(req.params.id);
    return ApiResponse.success(res, result, result.message);
  });
}

module.exports = new AdminOrderController();
