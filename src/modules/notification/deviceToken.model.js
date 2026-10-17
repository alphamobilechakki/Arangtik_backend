const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'FCM device token is required'],
      unique: true,
      trim: true,
      index: true,
    },
    platform: {
      type: String,
      enum: ['ANDROID', 'IOS', 'WEB', 'OTHER'],
      default: 'ANDROID',
      uppercase: true,
      trim: true,
    },
    deviceId: {
      type: String,
      trim: true,
      default: '',
    },
    deviceModel: {
      type: String,
      trim: true,
      default: '',
    },
    appVersion: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

deviceTokenSchema.index({ userId: 1, isActive: 1 });
deviceTokenSchema.index({ deviceId: 1, userId: 1 });

module.exports =
  mongoose.models.DeviceToken || mongoose.model('DeviceToken', deviceTokenSchema);
