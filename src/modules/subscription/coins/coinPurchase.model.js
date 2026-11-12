const mongoose = require('mongoose');

const packageSnapshotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    coins: {
      type: Number,
      required: true,
    },
    bonusCoins: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const coinPurchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoinPackage',
      required: [true, 'Package ID is required'],
      index: true,
    },

    packageSnapshot: {
      type: packageSnapshotSchema,
      required: true,
    },

    amount: {
      type: Number,
      required: [true, 'Purchase amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },

    purchasedCoins: {
      type: Number,
      required: [true, 'Purchased coins amount is required'],
      min: [1, 'Purchased coins must be at least 1'],
    },

    bonusCoins: {
      type: Number,
      default: 0,
      min: [0, 'Bonus coins cannot be negative'],
    },

    totalCoins: {
      type: Number,
      required: [true, 'Total coins is required'],
      min: [1, 'Total coins must be at least 1'],
    },

    paymentOrderId: {
      type: String,
      required: [true, 'Payment Order ID is required'],
      trim: true,
      unique: true,
      index: true,
    },

    paymentId: {
      type: String,
      trim: true,
      default: null,
      index: true,
      sparse: true,
    },

    paymentSignature: {
      type: String,
      trim: true,
      default: null,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual aliases for compatibility with Razorpay naming conventions
coinPurchaseSchema.virtual('razorpayOrderId').get(function () {
  return this.paymentOrderId;
});

coinPurchaseSchema.virtual('razorpayPaymentId').get(function () {
  return this.paymentId;
});

// Indexes for fast lookup and user history queries
coinPurchaseSchema.index({ userId: 1, createdAt: -1 });
coinPurchaseSchema.index({ paymentOrderId: 1, paymentStatus: 1 });

module.exports =
  mongoose.models.CoinPurchase ||
  mongoose.model('CoinPurchase', coinPurchaseSchema);

