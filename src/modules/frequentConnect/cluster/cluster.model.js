const mongoose = require('mongoose');

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
  },
  { timestamps: true }
);

// Compound index for fast sorted cluster listing per user
clusterSchema.index({ creatorId: 1, priority: 1 });

module.exports = mongoose.model('FCCluster', clusterSchema);
