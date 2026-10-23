const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference ID is required'],
      index: true,
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      trim: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
      index: true,
    },
    vendorPhone: {
      type: String,
      required: [true, 'Vendor phone is required'],
      trim: true,
      index: true,
    },
    vendorName: {
      type: String,
      trim: true,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    userName: {
      type: String,
      trim: true,
      default: '',
    },
    userPhone: {
      type: String,
      trim: true,
      default: '',
    },
    orderCategory: {
      type: String,
      trim: true,
      default: 'General',
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveredAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveredItemsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderStatus: {
      type: String,
      default: 'PENDING_PICKUP',
      index: true,
    },
    status: {
      type: String,
      enum: ['UNPAID', 'PAID'],
      default: 'UNPAID',
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: String,
      enum: ['USER', 'VENDOR', 'ADMIN', 'SYSTEM'],
      default: 'SYSTEM',
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'transactions',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate transactionNumber before saving if not present
transactionSchema.pre('validate', function (next) {
  if (!this.transactionNumber) {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = `${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
    this.transactionNumber = `TXN-${yyyymmdd}-${randomSuffix}`;
  }
  if (this.status === 'PAID' && !this.paidAt) {
    this.paidAt = new Date();
  } else if (this.status === 'UNPAID') {
    this.paidAt = null;
  }
  next();
});

// Indexes for fast vendor and customer lookups
transactionSchema.index({ vendorPhone: 1, createdAt: -1 });
transactionSchema.index({ vendorPhone: 1, status: 1, createdAt: -1 });
transactionSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, status: 1, createdAt: -1 });
transactionSchema.index({ orderId: 1, createdAt: -1 });

const Transaction =
  mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema, 'transactions');

module.exports = Transaction;
