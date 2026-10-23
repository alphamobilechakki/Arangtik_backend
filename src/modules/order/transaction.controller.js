const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const transactionService = require('./transaction.service');

class TransactionController {
  /**
   * @desc    Get all transactions for the authenticated vendor
   * @route   GET /api/vendor/transactions
   * @access  Private (Vendor)
   */
  getVendorTransactions = asyncHandler(async (req, res) => {
    const result = await transactionService.getVendorTransactions(req.vendor, req.query);
    return ApiResponse.success(res, result, 'Vendor transactions retrieved successfully');
  });

  /**
   * @desc    Get all transactions for the authenticated customer
   * @route   GET /api/orders/transactions
   * @access  Private (User)
   */
  getUserTransactions = asyncHandler(async (req, res) => {
    const result = await transactionService.getUserTransactions(req.user.id, req.query);
    return ApiResponse.success(res, result, 'Order transactions retrieved successfully');
  });

  /**
   * @desc    Vendor update order payment status (Paid / Unpaid)
   * @route   PATCH /api/vendor/orders/:id/payment
   * @access  Private (Vendor)
   */
  updateVendorOrderPayment = asyncHandler(async (req, res) => {
    const result = await transactionService.updateOrderPaymentStatus({
      orderId: req.params.id,
      status: req.body.status,
      actorType: 'VENDOR',
      actorId: req.vendor,
      note: req.body.note,
    });
    return ApiResponse.success(res, result, `Order payment marked as ${req.body.status} successfully`);
  });

  /**
   * @desc    Customer update order payment status (Paid / Unpaid)
   * @route   PATCH /api/orders/:id/payment
   * @access  Private (User)
   */
  updateUserOrderPayment = asyncHandler(async (req, res) => {
    const result = await transactionService.updateOrderPaymentStatus({
      orderId: req.params.id,
      status: req.body.status,
      actorType: 'USER',
      actorId: req.user.id,
      note: req.body.note,
    });
    return ApiResponse.success(res, result, `Order payment marked as ${req.body.status} successfully`);
  });
}

module.exports = new TransactionController();
