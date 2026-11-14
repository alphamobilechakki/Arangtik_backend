const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteSchema = new mongoose.Schema(
  {
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter is required'],
      index: true,
    },
    inviteePhone: {
      type: String,
      required: [true, 'Invitee phone number is required'],
      trim: true,
      index: true,
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCCluster',
      required: [true, 'Cluster is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'EXPIRED'],
      default: 'PENDING',
      uppercase: true,
      index: true,
    },
    inviteCode: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(6).toString('hex'), // 12-char code
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  { timestamps: true }
);

// Compound index for lookups
inviteSchema.index({ inviteePhone: 1, status: 1 });

module.exports = mongoose.model('FCInvite', inviteSchema);
