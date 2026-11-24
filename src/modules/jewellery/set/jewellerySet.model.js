const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../../utils/url.util');

const jewellerySetSchema = new mongoose.Schema(
  {
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
    name: {
      type: String,
      required: [true, 'Jewellery set name is required'],
      trim: true,
      maxlength: [120, 'Set name cannot exceed 120 characters'],
    },
    coverImageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    sourcePhotoUrl: {
      type: String,
      trim: true,
      default: '',
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Format image URLs
jewellerySetSchema.pre('save', function (next) {
  if (this.coverImageUrl) {
    this.coverImageUrl = formatUploadUrl(this.coverImageUrl);
  }
  if (this.sourcePhotoUrl) {
    this.sourcePhotoUrl = formatUploadUrl(this.sourcePhotoUrl);
  }
  if (typeof next === 'function') next();
});

// Automatic query middleware to exclude soft-deleted sets by default
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

jewellerySetSchema.pre('find', excludeSoftDeleted);
jewellerySetSchema.pre('findOne', excludeSoftDeleted);
jewellerySetSchema.pre('findOneAndUpdate', excludeSoftDeleted);
jewellerySetSchema.pre('countDocuments', excludeSoftDeleted);

// Query helper to explicitly include deleted documents
jewellerySetSchema.query.withDeleted = function () {
  this._withDeleted = true;
  delete this.getQuery().isDeleted;
  return this;
};

// Instance method to soft delete
jewellerySetSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Instance method to restore
jewellerySetSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Indexes
jewellerySetSchema.index({ userId: 1, jewelleryBoxId: 1 });
jewellerySetSchema.index({ userId: 1, isDeleted: 1 });
jewellerySetSchema.index({ userId: 1, createdAt: -1 });

const JewellerySet =
  mongoose.models.JewellerySet ||
  mongoose.model('JewellerySet', jewellerySetSchema);

module.exports = JewellerySet;
