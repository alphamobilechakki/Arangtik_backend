const UserSubscription = require('../modules/subscription/userSubscription.model');
const SubscriptionPlan = require('../modules/subscription/plan.model');
const Wardrobe = require('../modules/wardrobe/wardrobe.model');
const WardrobeItem = require('../modules/wardrobe/wardrobeItem.model');
const Outfit = require('../modules/outfit/outfit.model');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Free fallback limits for users who have not yet purchased a plan
 */
const FREE_TIER_LIMITS = {
  wardrobes: 1,
  clothingItems: 10,
  aiOutfitSuggestions: 2,
  virtualTryOn: 1,
  laundryOrders: 1,
  favouriteOutfits: 3,
};

/**
 * Factory middleware to enforce subscription plan limits and feature flags
 * @param {'wardrobes'|'clothingItems'|'aiOutfitSuggestions'|'virtualTryOn'|'laundryOrders'|'favouriteOutfits'} quotaKey
 * @param {Object} [options]
 * @param {boolean} [options.isMonthlyCredit=false] True if the quota is a monthly rolling credit that increments on success
 * @param {string} [options.featureFlag] Optional boolean feature flag required for this action
 */
const checkQuota = (quotaKey, options = {}) => {
  return asyncHandler(async (req, res, next) => {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      throw new ApiError(401, 'Unauthorized: User identification missing');
    }

    const now = new Date();

    // 1. Fetch active subscription
    let subscription = await UserSubscription.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: now },
    });

    // Determine current effective limits and features
    let effectiveLimits = subscription?.limitsSnapshot || FREE_TIER_LIMITS;
    let effectiveFeatures = subscription?.featuresSnapshot || {
      basicCategorization: true,
      occasionSuggestions: false,
      weatherSuggestions: false,
      colourSuggestions: false,
      jewelleryEnabled: false,
    };

    // If subscription exists, check if monthly cycle needs reset
    if (subscription && subscription.monthlyUsage?.cycleEndAt && now > subscription.monthlyUsage.cycleEndAt) {
      const nextCycleEnd = new Date(now);
      nextCycleEnd.setDate(nextCycleEnd.getDate() + 30);
      subscription.monthlyUsage = {
        aiOutfitSuggestions: 0,
        virtualTryOn: 0,
        laundryOrders: 0,
        cycleStartAt: now,
        cycleEndAt: nextCycleEnd,
      };
      await subscription.save();
    }

    // 2. Check feature flag if required
    if (options.featureFlag) {
      const isAllowed = Boolean(effectiveFeatures[options.featureFlag]);
      if (!isAllowed) {
        throw new ApiError(
          403,
          `This feature (${options.featureFlag}) is not included in your current plan. Please upgrade your subscription.`
        );
      }
    }

    // 3. Check limit for the specified quotaKey
    const limit = effectiveLimits[quotaKey] !== undefined ? effectiveLimits[quotaKey] : 0;

    // 3A. Monthly credit usage checks (AI suggestions, virtual try-on, laundry orders)
    const isMonthly =
      options.isMonthlyCredit ||
      ['aiOutfitSuggestions', 'virtualTryOn', 'laundryOrders'].includes(quotaKey);

    if (isMonthly) {
      const currentUsed = subscription?.monthlyUsage?.[quotaKey] || 0;
      if (currentUsed >= limit) {
        throw new ApiError(
          403,
          `You have reached your monthly limit of ${limit} for ${quotaKey}. Please upgrade your subscription to get more credits.`
        );
      }

      // Auto-increment after response finishes successfully (HTTP 200 or 201)
      res.on('finish', async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            if (subscription) {
              await UserSubscription.updateOne(
                { _id: subscription._id },
                { $inc: { [`monthlyUsage.${quotaKey}`]: 1 } }
              );
            }
          } catch (incErr) {
            console.error(`[QuotaMiddleware] Failed to increment ${quotaKey}:`, incErr.message);
          }
        }
      });

      return next();
    }

    // 3B. Total active collection count checks (Wardrobes, Clothing items, Favourite outfits)
    let currentCount = 0;

    if (quotaKey === 'wardrobes') {
      currentCount = await Wardrobe.countDocuments({ userId, isDeleted: { $ne: true } });
    } else if (quotaKey === 'clothingItems') {
      currentCount = await WardrobeItem.countDocuments({ userId, status: 'ACTIVE' });
    } else if (quotaKey === 'favouriteOutfits') {
      currentCount = await Outfit.countDocuments({ userId, isFavorite: true });
    }

    if (currentCount >= limit) {
      throw new ApiError(
        403,
        `You have reached your limit of ${limit} ${quotaKey} (currently using ${currentCount}). Please upgrade your plan to add more.`
      );
    }

    next();
  });
};

module.exports = {
  checkQuota,
  FREE_TIER_LIMITS,
};

