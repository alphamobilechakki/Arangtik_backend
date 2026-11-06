const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const subscriptionService = require('./subscription.service');

class SubscriptionController {
  getPlans = asyncHandler(async (req, res) => {
    const plans = await subscriptionService.getPublicPlans();
    return ApiResponse.success(res, plans, 'Active plans retrieved successfully');
  });

  createOrder = asyncHandler(async (req, res) => {
    const result = await subscriptionService.createSubscriptionOrder(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Razorpay order created successfully');
  });

  verifyPayment = asyncHandler(async (req, res) => {
    const result = await subscriptionService.verifyAndActivateSubscription(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Subscription activated successfully');
  });

  getMySubscription = asyncHandler(async (req, res) => {
    const data = await subscriptionService.getMySubscription(req.user.id);
    return ApiResponse.success(res, data, 'Current subscription retrieved successfully');
  });

  handleWebhook = asyncHandler(async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const result = await subscriptionService.processRazorpayWebhook(req.body, signature);
    return ApiResponse.success(res, result, 'Webhook handled successfully');
  });
}

module.exports = new SubscriptionController();

