const crypto = require('crypto');
const CoinPackage = require('./coinPackage.model');
const CoinPurchase = require('./coinPurchase.model');
const CoinTransaction = require('./coinTransaction.model');
const User = require('../../auth/user.model');
const ApiError = require('../../../utils/apiError');
const { getRazorpayInstance } = require('../../../config/razorpay.config');
const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = require('../../../config/env.config');

class CoinService {
  /**
   * Get active coin packages for user display
   */
  async getActivePackages() {
    const packages = await CoinPackage.find({ isActive: true }).sort({ price: 1, coins: 1 });
    return packages;
  }

  /**
   * Create Razorpay payment order for a coin package purchase
   */
  async createCoinOrder(userId, { packageId }) {
    if (!packageId) {
      throw new ApiError(400, 'Package ID is required');
    }

    const pkg = await CoinPackage.findOne({ _id: packageId, isActive: true });
    if (!pkg) {
      throw new ApiError(404, 'Active coin package not found');
    }

    if (pkg.price <= 0) {
      throw new ApiError(400, 'Invalid price for selected coin package');
    }

    // Razorpay amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(pkg.price * 100);
    const shortReceipt = `coin_${String(userId).slice(-6)}_${Date.now().toString().slice(-6)}`;

    const razorpay = getRazorpayInstance();
    let order;

    try {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: pkg.currency || 'INR',
        receipt: shortReceipt,
        notes: {
          userId: String(userId),
          packageId: String(pkg._id),
          packageName: pkg.name,
          coins: String(pkg.coins),
          bonusCoins: String(pkg.bonusCoins || 0),
          type: 'coin_package_purchase',
        },
      });
    } catch (rzpErr) {
      console.error('[Razorpay Coin Order Creation Failed]:', JSON.stringify(rzpErr, null, 2));
      const rzpDescription =
        rzpErr?.error?.description ||
        rzpErr?.error?.reason ||
        rzpErr?.error?.message ||
        rzpErr?.message ||
        'Unable to create order';
      throw new ApiError(500, `Payment gateway error: ${rzpDescription}`);
    }

    const totalCoins = pkg.coins + (pkg.bonusCoins || 0);

    // Create pending purchase record
    const purchase = await CoinPurchase.create({
      userId,
      packageId: pkg._id,
      packageSnapshot: {
        name: pkg.name,
        coins: pkg.coins,
        bonusCoins: pkg.bonusCoins || 0,
        price: pkg.price,
        currency: pkg.currency || 'INR',
        description: pkg.description || '',
      },
      amount: pkg.price,
      currency: pkg.currency || 'INR',
      purchasedCoins: pkg.coins,
      bonusCoins: pkg.bonusCoins || 0,
      totalCoins,
      paymentOrderId: order.id,
      paymentStatus: 'pending',
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      package: {
        id: pkg._id,
        name: pkg.name,
        coins: pkg.coins,
        bonusCoins: pkg.bonusCoins || 0,
        totalCoins,
        price: pkg.price,
        currency: pkg.currency || 'INR',
      },
      purchaseId: purchase._id,
    };
  }

  /**
   * Verify Razorpay Payment Signature and credit coins to user's wallet
   * Idempotent: safe against duplicate calls
   */
  async verifyAndCreditCoinPurchase(
    userId,
    { razorpayOrderId, razorpayPaymentId, razorpaySignature, paymentOrderId, paymentId, signature }
  ) {
    const orderId = razorpayOrderId || paymentOrderId;
    const pmtId = razorpayPaymentId || paymentId;
    const sig = razorpaySignature || signature;

    if (!orderId || !pmtId || !sig) {
      throw new ApiError(400, 'Order ID, Payment ID, and Signature are required');
    }

    // Verify HMAC-SHA256 signature
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${pmtId}`)
      .digest('hex');

    if (generatedSignature !== sig) {
      throw new ApiError(400, 'Invalid payment signature. Verification failed');
    }

    // Atomic update: only update if not already completed (prevents race conditions)
    const updatedPurchase = await CoinPurchase.findOneAndUpdate(
      {
        paymentOrderId: orderId,
        paymentStatus: { $ne: 'completed' },
      },
      {
        $set: {
          paymentStatus: 'completed',
          paymentId: pmtId,
          paymentSignature: sig,
          completedAt: new Date(),
        },
      },
      { new: true }
    );

    // If purchase was already completed (e.g. by duplicate verify call or webhook)
    if (!updatedPurchase) {
      const existing = await CoinPurchase.findOne({ paymentOrderId: orderId });
      if (existing && existing.paymentStatus === 'completed') {
        const user = await User.findById(existing.userId).select('wallet');
        return {
          success: true,
          alreadyProcessed: true,
          message: 'Payment was already processed and coins are in your wallet',
          walletBalance: user ? user.wallet : 0,
          purchase: existing,
        };
      }
      throw new ApiError(404, 'No pending purchase found for this order');
    }

    // Credit coins to user wallet directly
    const coinsToCredit = updatedPurchase.totalCoins;
    const updatedUser = await User.findByIdAndUpdate(
      updatedPurchase.userId,
      { $inc: { wallet: coinsToCredit } },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(404, 'User associated with purchase not found');
    }

    // Record credit transaction
    const transaction = await CoinTransaction.create({
      userId: updatedPurchase.userId,
      type: 'credit',
      amount: coinsToCredit,
      reason: `Purchased ${updatedPurchase.packageSnapshot?.name || 'Coin Package'}`,
      referenceId: String(updatedPurchase._id),
      status: 'success',
      metadata: {
        paymentOrderId: orderId,
        paymentId: pmtId,
        purchasedCoins: updatedPurchase.purchasedCoins,
        bonusCoins: updatedPurchase.bonusCoins,
        amountPaid: updatedPurchase.amount,
        balanceAfter: updatedUser.wallet,
      },
    });

    return {
      success: true,
      message: 'Payment verified and coins credited successfully',
      creditedCoins: coinsToCredit,
      walletBalance: updatedUser.wallet,
      purchase: updatedPurchase,
      transaction,
    };
  }

  /**
   * Process Razorpay Server Webhooks (e.g. payment.captured, order.paid)
   * Prevents duplicate credits if verify was already called
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

    const event = webhookBody?.event;
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = webhookBody.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (orderId && paymentId) {
        // Atomic update if not completed yet
        const updatedPurchase = await CoinPurchase.findOneAndUpdate(
          {
            paymentOrderId: orderId,
            paymentStatus: { $ne: 'completed' },
          },
          {
            $set: {
              paymentStatus: 'completed',
              paymentId,
              completedAt: new Date(),
            },
          },
          { new: true }
        );

        if (updatedPurchase) {
          const coinsToCredit = updatedPurchase.totalCoins;
          const updatedUser = await User.findByIdAndUpdate(
            updatedPurchase.userId,
            { $inc: { wallet: coinsToCredit } },
            { new: true }
          );

          if (updatedUser) {
            await CoinTransaction.create({
              userId: updatedPurchase.userId,
              type: 'credit',
              amount: coinsToCredit,
              reason: `Purchased ${updatedPurchase.packageSnapshot?.name || 'Coin Package'} (Webhook)`,
              referenceId: String(updatedPurchase._id),
              status: 'success',
              metadata: {
                paymentOrderId: orderId,
                paymentId,
                viaWebhook: true,
                balanceAfter: updatedUser.wallet,
              },
            });
          }
          return { processed: true, orderId, coinsCredited: coinsToCredit };
        }
      }
    }

    return { processed: false, reason: 'Event not applicable or already processed' };
  }

  /**
   * Reusable function to debit coins from user's wallet
   * Validates sufficient balance, updates wallet atomically, and records transaction
   */
  async debitCoins(userId, { amount, reason, referenceId = null, metadata = {} }) {
    const debitAmount = parseInt(amount, 10);
    if (isNaN(debitAmount) || debitAmount <= 0) {
      throw new ApiError(400, 'Debit amount must be a positive integer');
    }

    if (!reason || !String(reason).trim()) {
      throw new ApiError(400, 'Reason for coin debit is required');
    }

    // Atomic update with sufficient balance check ($gte)
    const user = await User.findOneAndUpdate(
      {
        _id: userId,
        wallet: { $gte: debitAmount },
      },
      {
        $inc: { wallet: -debitAmount },
      },
      { new: true }
    );

    if (!user) {
      // Find current balance to provide helpful error
      const currentUser = await User.findById(userId).select('wallet');
      if (!currentUser) {
        throw new ApiError(404, 'User not found');
      }
      const currentBalance = currentUser.wallet || 0;
      throw new ApiError(
        400,
        `Insufficient coin balance. Required: ${debitAmount}, Available: ${currentBalance}`
      );
    }

    // Record the debit transaction
    const transaction = await CoinTransaction.create({
      userId,
      type: 'debit',
      amount: debitAmount,
      reason: String(reason).trim(),
      referenceId: referenceId ? String(referenceId) : null,
      status: 'success',
      metadata: {
        ...metadata,
        balanceAfter: user.wallet,
      },
    });

    return {
      success: true,
      debitedAmount: debitAmount,
      remainingBalance: user.wallet,
      transaction,
    };
  }

  /**
   * Reusable function to credit coins to user's wallet (e.g. bonuses, refunds, rewards)
   */
  async creditCoins(userId, { amount, reason, referenceId = null, metadata = {} }) {
    const creditAmount = parseInt(amount, 10);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      throw new ApiError(400, 'Credit amount must be a positive integer');
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { wallet: creditAmount } },
      { new: true }
    );

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const transaction = await CoinTransaction.create({
      userId,
      type: 'credit',
      amount: creditAmount,
      reason: (reason || 'Coins credited').trim(),
      referenceId: referenceId ? String(referenceId) : null,
      status: 'success',
      metadata: {
        ...metadata,
        balanceAfter: user.wallet,
      },
    });

    return {
      success: true,
      creditedAmount: creditAmount,
      currentBalance: user.wallet,
      transaction,
    };
  }

  /**
   * Get user wallet balance and summary
   */
  async getWallet(userId) {
    const user = await User.findById(userId).select('wallet name phone');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const recentTransactions = await CoinTransaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      balance: user.wallet || 0,
      recentTransactions,
    };
  }

  /**
   * Get paginated transaction history
   */
  async getTransactions(userId, { page = 1, limit = 20, type = null }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };
    if (type && ['credit', 'debit'].includes(type.toLowerCase())) {
      filter.type = type.toLowerCase();
    }

    const [transactions, total] = await Promise.all([
      CoinTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      CoinTransaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

module.exports = new CoinService();

