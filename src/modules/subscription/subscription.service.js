const crypto = require('crypto');
const SubscriptionPlan = require('./plan.model');
const UserSubscription = require('./userSubscription.model');
const ApiError = require('../../utils/apiError');
const { getRazorpayInstance } = require('../../config/razorpay.config');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../../config/env.config');

class SubscriptionService {
  /**
   * Get active subscription plans for user/public display
   */
  async getPublicPlans() {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1 });
    return plans;
  }

  /**
   * Create Razorpay order for purchasing a plan
   */
  async createSubscriptionOrder(userId, { planCode, durationMonths, includesJewellery = false }) {
    if (!planCode || !durationMonths) {
      throw new ApiError(400, 'Plan code and duration (in months) are required');
    }

    const duration = parseInt(durationMonths, 10);
    if (![1, 3, 6, 12].includes(duration)) {
      throw new ApiError(400, 'Duration must be 1, 3, 6, or 12 months');
    }

    const plan = await SubscriptionPlan.findOne({
      code: planCode.toLowerCase().trim(),
      isActive: true,
    });
    if (!plan) {
      throw new ApiError(404, `Active plan with code '${planCode}' not found`);
    }

    // Find price matching duration
    const tier = plan.pricing.find((p) => p.durationMonths === duration);
    if (!tier) {
      throw new ApiError(400, `Pricing tier for ${duration} months not configured for ${plan.name} plan`);
    }

    const priceInRupees = includesJewellery ? tier.priceWith : tier.priceWithout;
    if (priceInRupees <= 0) {
      throw new ApiError(400, 'Invalid price configured for selected tier');
    }

    // Amount in paise for Razorpay (1 INR = 100 paise)
    const amountInPaise = Math.round(priceInRupees * 100);

    const razorpay = getRazorpayInstance();
    const shortReceipt = `sub_${String(userId).slice(-6)}_${Date.now().toString().slice(-6)}`;

    let order;
    try {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: shortReceipt,
        notes: {
          userId: String(userId),
          planCode: plan.code,
          durationMonths: String(duration),
          includesJewellery: String(includesJewellery),
        },
      });
    } catch (rzpErr) {
      console.error('[Razorpay Order Creation Failed]:', rzpErr);
      throw new ApiError(500, `Payment gateway error: ${rzpErr.message || 'Unable to create order'}`);
    }

    // Create or update pending subscription record
    await UserSubscription.findOneAndUpdate(
      { userId, status: 'pending' },
      {
        userId,
        planId: plan._id,
        planCode: plan.code,
        planName: plan.name,
        durationMonths: duration,
        includesJewellery: Boolean(includesJewellery),
        status: 'pending',
        razorpayOrderId: order.id,
        amountPaid: priceInRupees,
        currency: 'INR',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      plan: {
        code: plan.code,
        name: plan.name,
        durationMonths: duration,
        includesJewellery,
        priceInRupees,
      },
    };
  }

  /**
   * Verify Razorpay Payment Signature and activate user subscription
   */
  async verifyAndActivateSubscription(userId, { razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new ApiError(400, 'Order ID, Payment ID, and Signature are required');
    }

    // Verify HMAC-SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new ApiError(400, 'Invalid payment signature. Verification failed');
    }

    // Locate the pending subscription record
    const userSub = await UserSubscription.findOne({
      userId,
      razorpayOrderId,
    });

    if (!userSub) {
      throw new ApiError(404, 'No pending subscription found for this order');
    }

    const plan = await SubscriptionPlan.findById(userSub.planId);
    if (!plan) {
      throw new ApiError(404, 'Associated plan could not be found');
    }

    const now = new Date();
    // Expiration = now + (durationMonths * 30 days) or calendar months
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + userSub.durationMonths);

    // End cycle for monthly rolling quotas
    const cycleEndAt = new Date(now);
    cycleEndAt.setDate(cycleEndAt.getDate() + 30);

    // Update subscription to ACTIVE with snapshots
    userSub.status = 'active';
    userSub.razorpayPaymentId = razorpayPaymentId;
    userSub.razorpaySignature = razorpaySignature;
    userSub.startedAt = now;
    userSub.expiresAt = expiresAt;

    // Snapshot plan limits & features so future admin changes don't alter purchased rights
    userSub.limitsSnapshot = plan.limits?.toObject ? plan.limits.toObject() : plan.limits;
    userSub.featuresSnapshot = plan.features?.toObject ? plan.features.toObject() : plan.features;

    userSub.monthlyUsage = {
      aiOutfitSuggestions: 0,
      virtualTryOn: 0,
      laundryOrders: 0,
      cycleStartAt: now,
      cycleEndAt,
    };

    await userSub.save();

    return {
      success: true,
      subscription: userSub,
    };
  }

  /**
   * Retrieve current active user subscription with real-time usage stats
   */
  async getMySubscription(userId) {
    const sub = await UserSubscription.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    }).populate('planId');

    if (!sub) {
      return {
        hasActiveSubscription: false,
        subscription: null,
      };
    }

    // Check if 30-day monthly rolling quota cycle needs reset
    const now = new Date();
    if (sub.monthlyUsage?.cycleEndAt && now > sub.monthlyUsage.cycleEndAt) {
      const nextCycleEnd = new Date(now);
      nextCycleEnd.setDate(nextCycleEnd.getDate() + 30);
      sub.monthlyUsage = {
        aiOutfitSuggestions: 0,
        virtualTryOn: 0,
        laundryOrders: 0,
        cycleStartAt: now,
        cycleEndAt: nextCycleEnd,
      };
      await sub.save();
    }

    return {
      hasActiveSubscription: true,
      subscription: sub,
    };
  }

  /**
   * Process Razorpay Server Webhooks (e.g. payment.captured)
   */
  async processRazorpayWebhook(webhookBody, signature) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookBody))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new ApiError(400, 'Invalid webhook signature');
      }
    }

    const event = webhookBody.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = webhookBody.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        const sub = await UserSubscription.findOne({ razorpayOrderId: orderId });
        if (sub && sub.status === 'pending') {
          const plan = await SubscriptionPlan.findById(sub.planId);
          if (plan) {
            const now = new Date();
            const expiresAt = new Date(now);
            expiresAt.setMonth(expiresAt.getMonth() + sub.durationMonths);

            sub.status = 'active';
            sub.razorpayPaymentId = paymentId;
            sub.startedAt = now;
            sub.expiresAt = expiresAt;
            sub.limitsSnapshot = plan.limits?.toObject ? plan.limits.toObject() : plan.limits;
            sub.featuresSnapshot = plan.features?.toObject ? plan.features.toObject() : plan.features;
            await sub.save();
          }
        }
      }
    }

    return { status: 'processed' };
  }
}

module.exports = new SubscriptionService();

