const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const orderService = require('./order.service');

class OrderController {
  /**
   * @desc    Get all orders for authenticated customer (across Dhobi, Kitchen, Tailor)
   * @route   GET /api/orders
   * @access  Private (User)
   */
  getUserOrders = asyncHandler(async (req, res) => {
    const result = await orderService.getUserOrders(req.user.id, req.query);
    return ApiResponse.success(res, result, 'Orders retrieved successfully');
  });

  /**
   * @desc    Get order details by ID
   * @route   GET /api/orders/:id
   * @access  Private (User)
   */
  getOrderDetails = asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(req.user.id, req.params.id);
    return ApiResponse.success(res, order, 'Order details retrieved successfully');
  });

  /**
   * @desc    Cancel order by customer (PATCH per Arangtik Rule 4)
   * @route   PATCH /api/orders/:id/cancel
   * @access  Private (User)
   */
  cancelOrder = asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(req.user.id, req.params.id, req.body);
    return ApiResponse.success(res, order, 'Order cancelled successfully');
  });
}

module.exports = new OrderController();
