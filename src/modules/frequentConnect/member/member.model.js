const mongoose = require('mongoose');

const clusterMemberSchema = new mongoose.Schema(
  {
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCCluster',
      required: [true, 'Cluster ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null until non-user accepts invitation
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
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
      index: true,
    },
    joinedAt: {
      type: Date,
      default: null,
    },
    invitedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes
clusterMemberSchema.index({ clusterId: 1, userId: 1 });
clusterMemberSchema.index({ clusterId: 1, phone: 1 }, { unique: true });
clusterMemberSchema.index({ userId: 1, status: 1 }); // find all clusters a user belongs to

module.exports = mongoose.model('FCClusterMember', clusterMemberSchema);
