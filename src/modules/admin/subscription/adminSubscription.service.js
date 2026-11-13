const mongoose = require('mongoose');
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
   * 1. Get all user subscriptions (light table view with essential fields, filtering & pagination)
   */
  async getUserSubscriptions(query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const match = {};
    if (query.userId && mongoose.Types.ObjectId.isValid(query.userId)) {
      match.userId = new mongoose.Types.ObjectId(query.userId);
    }
    if (query.status && query.status !== 'all') {
      match.status = query.status;
    }
    if (query.planCode && query.planCode !== 'all') {
      match.planCode = query.planCode.toLowerCase();
    }
    if (query.startDate || query.endDate) {
      match.createdAt = {};
      if (query.startDate) match.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) match.createdAt.$lte = new Date(query.endDate);
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { _id: 1, name: 1, phone: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    ];

    if (query.search && query.search.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': regex },
            { 'user.phone': regex },
            { planName: regex },
            { planCode: regex },
            { razorpayOrderId: regex },
            { razorpayPaymentId: regex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          // Project only the required lightweight table fields
          {
            $project: {
              _id: 1,
              user: {
                _id: '$user._id',
                name: '$user.name',
                phone: '$user.phone',
              },
              planName: 1,
              planCode: 1,
              durationMonths: 1,
              includesJewellery: 1,
              amountPaid: 1,
              status: 1,
              expiresAt: 1,
              createdAt: 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await UserSubscription.aggregate(pipeline);
    const total = result?.totalCount?.[0]?.count || 0;

    return {
      subscriptions: result?.data || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 2. Get single user subscription full details by ID (for "Show More")
   */
  async getUserSubscriptionById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, 'Invalid user subscription ID format');
    }

    const subscription = await UserSubscription.findById(id).populate(
      'userId',
      'name phone wallet profileImage status gender accountType country currency preferredLanguage createdAt'
    );

    if (!subscription) {
      throw new ApiError(404, 'User subscription record not found');
    }

    return subscription;
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

