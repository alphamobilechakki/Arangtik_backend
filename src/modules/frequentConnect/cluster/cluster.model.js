const mongoose = require('mongoose');

const clusterMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null until non-registered user joins
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MEMBER'],
      default: 'MEMBER',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INVITED', 'LEFT', 'REMOVED'],
      default: 'ACTIVE',
      uppercase: true,
    },
    inviteCode: {
      type: String,
      default: null,
      trim: true,
    },
    inviteExpiresAt: {
      type: Date,
      default: null,
    },
    invitedAt: {
      type: Date,
      default: null,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const clusterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Cluster name is required'],
      trim: true,
      maxlength: [50, 'Cluster name cannot exceed 50 characters'],
    },
    icon: {
      type: String,
      trim: true,
      default: '👥',
    },
    color: {
      type: String,
      trim: true,
      default: '#6C63FF',
      match: [/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Invalid hex color'],
    },
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['FAMILY', 'FRIENDS', 'OFFICE', 'CUSTOM'],
      default: 'CUSTOM',
      uppercase: true,
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
    },
    memberCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCConversation',
      default: null,
    },
    // Dynamic feature modules enabled for this cluster (e.g. Wardrobe, Laundry, Walkie-Talkie)
    features: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClusterFeature',
      },
    ],
    // Embedded members & pending invites (Consolidates members & invites collections)
    members: [clusterMemberSchema],
  },
  { timestamps: true }
);

// Compound indexes for fast, single-query lookups
clusterSchema.index({ creatorId: 1, priority: 1 });
clusterSchema.index({ features: 1 });
clusterSchema.index({ 'members.userId': 1, 'members.status': 1 });
clusterSchema.index({ 'members.phone': 1, 'members.status': 1 });
clusterSchema.index({ 'members.inviteCode': 1 });

module.exports = mongoose.model('FCCluster', clusterSchema);
