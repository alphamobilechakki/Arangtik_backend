const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const coinService = require('./coin.service');

class CoinController {
  /**
   * Public: List all active coin packages
   * GET /api/coins/packages
   */
  getPackages = asyncHandler(async (req, res) => {
    const packages = await coinService.getActivePackages();
    return ApiResponse.success(res, packages, 'Active coin packages retrieved successfully');
  });

  /**
   * User Protected: Create Razorpay order for coin package
   * POST /api/coins/create-order
   */
  createOrder = asyncHandler(async (req, res) => {
    const result = await coinService.createCoinOrder(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Razorpay order created successfully');
  });

  /**
   * User Protected: Verify Razorpay payment and credit coins
   * POST /api/coins/verify
   */
  verifyPayment = asyncHandler(async (req, res) => {
    const result = await coinService.verifyAndCreditCoinPurchase(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Payment verified and coins credited successfully');
  });

  /**
   * Public / Webhook: Handle Razorpay server webhook
   * POST /api/coins/webhook
   */
  handleWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const result = await coinService.processRazorpayWebhook(req.body, signature);
    return ApiResponse.success(res, result, 'Webhook handled successfully');
  });

  /**
   * User Protected: Get wallet balance and recent activity
   * GET /api/coins/wallet
   */
  getWallet = asyncHandler(async (req, res) => {
    const data = await coinService.getWallet(req.user.id);
    return ApiResponse.success(res, data, 'Wallet details retrieved successfully');
  });

  /**
   * User Protected: Get paginated transaction history
   * GET /api/coins/transactions
   */
  getTransactions = asyncHandler(async (req, res) => {
    const data = await coinService.getTransactions(req.user.id, req.query);
    return ApiResponse.success(res, data, 'Transactions retrieved successfully');
  });

  /**
   * User Protected: Debit coins from wallet
   * POST /api/coins/debit
   */
  debitCoins = asyncHandler(async (req, res) => {
    const result = await coinService.debitCoins(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Coins debited successfully');
  });
}

module.exports = new CoinController();

