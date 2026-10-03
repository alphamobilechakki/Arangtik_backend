const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    wardrobeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wardrobe',
      required: [true, 'Wardrobe ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Collection name is required'],
      trim: true,
      maxlength: [120, 'Collection name cannot exceed 120 characters'],
    },
    type: {
      type: String,
      trim: true,
      default: 'CUSTOM',
    },
    colorTheme: {
      primary: { type: String, trim: true, default: '' },
      secondary: { type: String, trim: true, default: '' },
      accent: { type: String, trim: true, default: '' },
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    season: [{ type: String, trim: true }],
    occasion: [{ type: String, trim: true }],
    style: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for user-scoped and wardrobe-scoped querying
CollectionSchema.index({ userId: 1, wardrobeId: 1 });
CollectionSchema.index({ userId: 1, isActive: 1 });
CollectionSchema.index({ wardrobeId: 1, isActive: 1 });
CollectionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema);
