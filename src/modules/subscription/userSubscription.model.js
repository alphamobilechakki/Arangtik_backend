const mongoose = require('mongoose');

const MonthlyUsageSchema = new mongoose.Schema(
  {
    aiOutfitSuggestions: {
      type: Number,
      default: 0,
      min: 0,
    },
    virtualTryOn: {
      type: Number,
      default: 0,
      min: 0,
    },
    laundryOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    cycleStartAt: {
      type: Date,
      default: Date.now,
    },
    cycleEndAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const UserSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: [true, 'Plan ID is required'],
    },
    planCode: {
      type: String,
      required: true,
      enum: ['basic', 'plus', 'pro'],
    },
    planName: {
      type: String,
      required: true,
    },
    durationMonths: {
      type: Number,
      required: true,
      enum: [1, 3, 6, 12],
    },
    includesJewellery: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'expired', 'cancelled'],
      default: 'pending',
      index: true,
    },
    // Razorpay Details
    razorpayOrderId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    // Active subscription validity duration
    startedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    // Monthly usage credits (resets each 30 days or month cycle)
    monthlyUsage: {
      type: MonthlyUsageSchema,
      default: () => ({}),
    },
    // Immutable snapshot of limits & features assigned at subscription activation
    limitsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    featuresSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSubscriptionSchema.index({ userId: 1, status: 1 });
UserSubscriptionSchema.index({ userId: 1, createdAt: -1 });

module.exports =
  mongoose.models.UserSubscription ||
  mongoose.model('UserSubscription', UserSubscriptionSchema);

