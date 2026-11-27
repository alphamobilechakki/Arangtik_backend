const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../../utils/url.util');

const jewellerySchema = new mongoose.Schema(
  {
    // Ownership & Location
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    jewelleryBoxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelleryBox',
      required: [true, 'Jewellery box ID is required'],
      index: true,
    },

    // Classification
    jewelleryCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewelleryCategory',
      default: null,
      index: true,
    },
    setId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JewellerySet',
      default: null,
      index: true,
    },

    // Identity
    name: {
      type: String,
      // required: [true, 'Jewellery name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },

    // Standardized Images: source and generated
    sourceImage: {
      url: { type: String, trim: true, default: '' },
      imageHash: { type: String, trim: true },
      filename: { type: String, trim: true },
    },
    generatedImage: {
      url: { type: String, trim: true, default: '' },
      filename: { type: String, trim: true },
      generatedAt: { type: Date, default: null },
    },

    // Material Type: GOLD | SILVER | ARTIFICIAL | CUSTOM
    type: {
      type: String,
      enum: ['GOLD', 'SILVER', 'ARTIFICIAL', 'CUSTOM'],
      default: 'GOLD',
      trim: true,
      index: true,
    },

    // Status: IN_LOCKER | LEND | CLEANING | OTHER
    status: {
      type: String,
      enum: ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'],
      default: 'IN_LOCKER',
      trim: true,
      index: true,
    },

    // Core Physical Attributes
    color: {
      type: String,
      trim: true,
      default: '',
    },
    gemstone: {
      type: String,
      trim: true,
      default: '',
    },
    weight: {
      type: Number,
      min: 0,
      default: null,
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },

    // Background AI Processing Status
    processingStatus: {
      type: String,
      enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED',
      index: true,
    },
    aiAnalysis: {
      model: { type: String, trim: true },
      confidence: { type: Number },
      analyzedAt: { type: Date },
    },

    // Flags & Soft Deletion
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

    // AI pipeline tracking
    sourceImageHash:         { type: String, trim: true, index: true },
    sourcePhotoUrl:          { type: String, trim: true, default: '' },
    processingFailureReason: { type: String, trim: true, default: '' },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Format upload URLs on save
jewellerySchema.pre('save', function (next) {
  if (this.sourceImage && this.sourceImage.url) {
    this.sourceImage.url = formatUploadUrl(this.sourceImage.url);
  }
  if (this.generatedImage && this.generatedImage.url) {
    this.generatedImage.url = formatUploadUrl(this.generatedImage.url);
  }
  if (typeof next === 'function') next();
});

// Automatic query middleware to exclude soft-deleted items by default
function excludeSoftDeleted(next) {
  if (this._withDeleted) {
    if (typeof next === 'function') next();
    return;
  }
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  if (typeof next === 'function') next();
}

jewellerySchema.pre('find', excludeSoftDeleted);
jewellerySchema.pre('findOne', excludeSoftDeleted);
jewellerySchema.pre('findOneAndUpdate', excludeSoftDeleted);
jewellerySchema.pre('countDocuments', excludeSoftDeleted);

// Query helper to explicitly include deleted documents
jewellerySchema.query.withDeleted = function () {
  this._withDeleted = true;
  delete this.getQuery().isDeleted;
  return this;
};

// Instance method to soft delete
jewellerySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Instance method to restore
jewellerySchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Compound indexes for user-scoped queries
jewellerySchema.index({ userId: 1, jewelleryBoxId: 1 });
jewellerySchema.index({ userId: 1, jewelleryCategory: 1 });
jewellerySchema.index({ userId: 1, status: 1 });
jewellerySchema.index({ userId: 1, type: 1 });
jewellerySchema.index({ userId: 1, setId: 1 });
jewellerySchema.index({ userId: 1, isFavorite: 1 });
jewellerySchema.index({ userId: 1, isDeleted: 1 });
jewellerySchema.index({ userId: 1, createdAt: -1 });
jewellerySchema.index({ userId: 1, sourceImageHash: 1 });

const Jewellery =
  mongoose.models.Jewellery || mongoose.model('Jewellery', jewellerySchema);

module.exports = Jewellery;
