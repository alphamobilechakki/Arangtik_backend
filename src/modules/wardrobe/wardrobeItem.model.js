const mongoose = require('mongoose');

const WardrobeItemSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [120, 'Item name cannot exceed 120 characters'],
    },
    // Standardized Images Array Structure
    images: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ['ORIGINAL', 'SEGMENTED', 'THUMBNAIL', 'CROPPED', 'OTHER'],
          default: 'ORIGINAL',
        },
        isPrimary: { type: Boolean, default: false },
        imageHash: { type: String, trim: true },
        width: { type: Number },
        height: { type: Number },
        thumbnailUrl: { type: String },
        filename: { type: String },
        embedding: [{ type: Number }],
        createdAt: { type: Date, default: Date.now },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Source Identification
    sourceType: {
      type: String,
      enum: ['MANUAL_UPLOAD', 'GALLERY_SCAN', 'CAMERA_CAPTURE', 'BULK_SCAN', 'OTHER'],
      default: 'MANUAL_UPLOAD',
      index: true,
    },
    sourcePhotoUrl: {
      type: String,
      trim: true,
    },
    sourceImageHash: {
      type: String,
      trim: true,
      index: true,
    },
    sourceImageIndex: {
      type: Number,
      default: 0,
    },
    // Standardized Classification & Taxonomy
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      trim: true,
    },
    // Standardized Physical & Aesthetic Attributes
    color: {
      type: String,
      trim: true,
    },
    pattern: {
      type: String,
      trim: true,
    },
    fabric: {
      type: String,
      trim: true,
    },
    texture: {
      type: String,
      trim: true,
    },
    silhouette: {
      type: String,
      trim: true,
    },
    fit: {
      type: String,
      trim: true,
    },
    neckline: {
      type: String,
      trim: true,
    },
    sleeveStyle: {
      type: String,
      trim: true,
    },
    sleeveLength: {
      type: String,
      trim: true,
    },
    length: {
      type: String,
      trim: true,
    },
    occasion: [{ type: String, trim: true }],
    season: [{ type: String, trim: true }],
    style: [{ type: String, trim: true }],
    gender: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    // Usage & Favorite State
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    wearCount: {
      type: Number,
      default: 0,
    },
    lastWornAt: {
      type: Date,
    },
    // AI Analysis Payload Separation
    aiAnalysis: {
      model: { type: String, trim: true },
      confidence: { type: Number },
      raw: { type: mongoose.Schema.Types.Mixed },
      analyzedAt: { type: Date },
      version: { type: String, trim: true },
    },
    // Dynamic Extensible Attributes Bag (Preserved for compatibility)
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for user-scoped and wardrobe-scoped queries
WardrobeItemSchema.index({ userId: 1, wardrobeId: 1 });
WardrobeItemSchema.index({ userId: 1, category: 1 });
WardrobeItemSchema.index({ userId: 1, sourceImageHash: 1 });
WardrobeItemSchema.index({ userId: 1, isFavorite: 1 });
WardrobeItemSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.WardrobeItem || mongoose.model('WardrobeItem', WardrobeItemSchema);
