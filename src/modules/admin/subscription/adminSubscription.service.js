const SubscriptionPlan = require('../../subscription/plan.model');
const UserSubscription = require('../../subscription/userSubscription.model');
const ApiError = require('../../../utils/apiError');

class AdminSubscriptionService {
  /**
   * Get all subscription plans (admin view)
   */
  async getAllPlans(query = {}) {
    const filter = {};
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true' || query.isActive === true;
    }
    const plans = await SubscriptionPlan.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    return plans;
  }

  /**
   * Get single plan by ID
   */
  async getPlanById(id) {
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      throw new ApiError(404, 'Subscription plan not found');
    }
    return plan;
  }

  /**
   * Create a new subscription plan
   */
  async createPlan(data) {
    const existing = await SubscriptionPlan.findOne({ code: data.code?.toLowerCase().trim() });
    if (existing) {
      throw new ApiError(409, `Subscription plan with code '${data.code}' already exists`);
    }

    const plan = await SubscriptionPlan.create({
      code: data.code?.toLowerCase().trim(),
      name: data.name?.trim(),
      description: data.description?.trim() || '',
      displayOrder: Number(data.displayOrder) || 0,
      isPopular: Boolean(data.isPopular),
      pricing: Array.isArray(data.pricing) ? data.pricing : [],
      limits: data.limits || {},
      features: data.features || {},
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    });

    return plan;
  }

  /**
   * Update subscription plan (prices, limits, features, details)
   */
  async updatePlan(id, data) {
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      throw new ApiError(404, 'Subscription plan not found');
    }

    if (data.name !== undefined) plan.name = data.name.trim();
    if (data.description !== undefined) plan.description = data.description.trim();
    if (data.displayOrder !== undefined) plan.displayOrder = Number(data.displayOrder);
    if (data.isPopular !== undefined) plan.isPopular = Boolean(data.isPopular);
    if (data.isActive !== undefined) plan.isActive = Boolean(data.isActive);

    if (Array.isArray(data.pricing)) {
      plan.pricing = data.pricing;
    }

    if (data.limits && typeof data.limits === 'object') {
      plan.limits = {
        ...plan.limits.toObject(),
        ...data.limits,
      };
    }

    if (data.features && typeof data.features === 'object') {
      plan.features = {
        ...plan.features.toObject(),
        ...data.features,
      };
    }

    await plan.save();
    return plan;
  }

  /**
   * Toggle plan active/inactive status
   */
  async togglePlanStatus(id) {
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      throw new ApiError(404, 'Subscription plan not found');
    }

    plan.isActive = !plan.isActive;
    await plan.save();
    return plan;
  }

  /**
   * Get all user subscriptions (with user info and filter)
   */
  async getUserSubscriptions(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.planCode) {
      filter.planCode = query.planCode;
    }

    const [subscriptions, total] = await Promise.all([
      UserSubscription.find(filter)
        .populate('userId', 'name phone profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      UserSubscription.countDocuments(filter),
    ]);

    return {
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Subscription dashboard analytics
   */
  async getSubscriptionStats() {
    const [totalUsers, activeSubCount, totalRevenueAgg, plansDistribution] = await Promise.all([
      UserSubscription.distinct('userId'),
      UserSubscription.countDocuments({ status: 'active', expiresAt: { $gt: new Date() } }),
      UserSubscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amountPaid' } } },
      ]),
      UserSubscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$planCode', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalSubscribers: totalUsers.length,
      activeSubscriptions: activeSubCount,
      totalRevenue: totalRevenueAgg[0]?.totalRevenue || 0,
      distribution: plansDistribution,
    };
  }
}

module.exports = new AdminSubscriptionService();

