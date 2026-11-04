const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    aliases: {
      type: [String],
      default: [],
    },

    densityCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DensityCategory',
      required: true,
    },

    densityOverride: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for efficient searching
productSchema.index({ name: 1 });
productSchema.index({ aliases: 1 });

// Virtual field for effective density
productSchema.virtual('effectiveDensity').get(function () {
  if (this.densityOverride !== null && this.densityOverride !== undefined) {
    return this.densityOverride;
  }
  if (
    this.densityCategoryId &&
    typeof this.densityCategoryId === 'object' &&
    this.densityCategoryId.defaultDensity !== undefined
  ) {
    return this.densityCategoryId.defaultDensity;
  }
  return null;
});

module.exports = mongoose.model('Product', productSchema);
