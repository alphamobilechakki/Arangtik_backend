const mongoose = require('mongoose');

const coinTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    type: {
      type: String,
      enum: {
        values: ['credit', 'debit'],
        message: 'Transaction type must be credit or debit',
      },
      required: [true, 'Transaction type is required'],
      index: true,
    },

    amount: {
      type: Number,
      required: [true, 'Transaction coin amount is required'],
      min: [1, 'Amount must be at least 1 coin'],
    },

    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
    },

    referenceId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'success',
      index: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user transaction history queries
coinTransactionSchema.index({ userId: 1, createdAt: -1 });
coinTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

module.exports =
  mongoose.models.CoinTransaction ||
  mongoose.model('CoinTransaction', coinTransactionSchema);

