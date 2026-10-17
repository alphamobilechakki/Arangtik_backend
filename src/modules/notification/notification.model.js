const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    body: {
      type: String,
      required: [true, 'Notification body is required'],
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    type: {
      type: String,
      enum: [
        'LAUNDRY_ORDER_NEW',
        'LAUNDRY_ORDER_STATUS',
        'GARMENT_3D_COMPLETED',
        'GARMENT_3D_FAILED',
        'WARDROBE_DIGITIZED',
        'VENDOR_ACTIVATED',
        'SYSTEM',
        'OTHER',
      ],
      default: 'OTHER',
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['DELIVERED', 'FAILED', 'PENDING'],
      default: 'DELIVERED',
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
