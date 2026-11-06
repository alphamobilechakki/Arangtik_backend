const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const adminSubscriptionService = require('./adminSubscription.service');

class AdminSubscriptionController {
  getAllPlans = asyncHandler(async (req, res) => {
    const plans = await adminSubscriptionService.getAllPlans(req.query);
    return ApiResponse.success(res, plans, 'Subscription plans retrieved successfully');
  });

  getPlanById = asyncHandler(async (req, res) => {
    const plan = await adminSubscriptionService.getPlanById(req.params.id);
    return ApiResponse.success(res, plan, 'Subscription plan details retrieved successfully');
  });

  createPlan = asyncHandler(async (req, res) => {
    const plan = await adminSubscriptionService.createPlan(req.body);
    return ApiResponse.created(res, plan, 'Subscription plan created successfully');
  });

  updatePlan = asyncHandler(async (req, res) => {
    const plan = await adminSubscriptionService.updatePlan(req.params.id, req.body);
    return ApiResponse.success(res, plan, 'Subscription plan updated successfully');
  });

  togglePlanStatus = asyncHandler(async (req, res) => {
    const plan = await adminSubscriptionService.togglePlanStatus(req.params.id);
    return ApiResponse.success(
      res,
      plan,
      `Subscription plan is now ${plan.isActive ? 'active' : 'inactive'}`
    );
  });

  getUserSubscriptions = asyncHandler(async (req, res) => {
    const data = await adminSubscriptionService.getUserSubscriptions(req.query);
    return ApiResponse.success(res, data, 'User subscriptions retrieved successfully');
  });

  getSubscriptionStats = asyncHandler(async (req, res) => {
    const stats = await adminSubscriptionService.getSubscriptionStats();
    return ApiResponse.success(res, stats, 'Subscription stats retrieved successfully');
  });
}

module.exports = new AdminSubscriptionController();

