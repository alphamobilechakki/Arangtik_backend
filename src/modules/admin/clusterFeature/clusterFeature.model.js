const mongoose = require('mongoose');

const clusterFeatureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Feature name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Feature code is required'],
      trim: true,
      uppercase: true,
    },
    icon: {
      type: String,
      trim: true,
      default: '✨',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Enforce unique name and code only among non-deleted records
clusterFeatureSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
clusterFeatureSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

module.exports = mongoose.model('ClusterFeature', clusterFeatureSchema);
