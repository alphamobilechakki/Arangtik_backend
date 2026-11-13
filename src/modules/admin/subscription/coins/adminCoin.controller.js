const adminCoinService = require('./adminCoin.service');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');

class AdminCoinController {
  /**
   * @desc    1. Get all coin transaction logs (Light table view with 3-4 required fields)
   * @route   GET /api/admin/subscription/coins/transactions
   * @access  Private (Admin)
   */
  getCoinTransactions = asyncHandler(async (req, res) => {
    const result = await adminCoinService.getCoinTransactions(req.query);
    return ApiResponse.success(res, result, 'Coin transactions retrieved successfully');
  });

  /**
   * @desc    2. Get coin transaction full details by ID (Show More view)
   * @route   GET /api/admin/subscription/coins/transactions/:id
   * @access  Private (Admin)
   */
  getCoinTransactionById = asyncHandler(async (req, res) => {
    const result = await adminCoinService.getCoinTransactionById(req.params.id);
    return ApiResponse.success(res, result, 'Coin transaction details retrieved successfully');
  });

  /**
   * @desc    3. Get all coin purchases (Light table view with 3-4 required fields)
   * @route   GET /api/admin/subscription/coins/purchases
   * @access  Private (Admin)
   */
  getCoinPurchases = asyncHandler(async (req, res) => {
    const result = await adminCoinService.getCoinPurchases(req.query);
    return ApiResponse.success(res, result, 'Coin purchases retrieved successfully');
  });

  /**
   * @desc    4. Get coin purchase full details by ID (Show More view)
   * @route   GET /api/admin/subscription/coins/purchases/:id
   * @access  Private (Admin)
   */
  getCoinPurchaseById = asyncHandler(async (req, res) => {
    const result = await adminCoinService.getCoinPurchaseById(req.params.id);
    return ApiResponse.success(res, result, 'Coin purchase details retrieved successfully');
  });
}

module.exports = new AdminCoinController();
