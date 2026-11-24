const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../../utils/url.util');

const jewelleryCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Jewellery category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    icon: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
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

// Partial unique indexes: only enforce uniqueness for non-deleted records
jewelleryCategorySchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
jewelleryCategorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Auto-generate normalized code before validation if not explicitly provided
jewelleryCategorySchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  next();
});

// Format icon URL
jewelleryCategorySchema.pre('save', function (next) {
  if (this.icon) {
    this.icon = formatUploadUrl(this.icon);
  }
  if (typeof next === 'function') next();
});

// Automatic query middleware to exclude soft-deleted documents by default
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

jewelleryCategorySchema.pre('find', excludeSoftDeleted);
jewelleryCategorySchema.pre('findOne', excludeSoftDeleted);
jewelleryCategorySchema.pre('findOneAndUpdate', excludeSoftDeleted);
jewelleryCategorySchema.pre('countDocuments', excludeSoftDeleted);

// Query helper to explicitly include deleted documents
jewelleryCategorySchema.query.withDeleted = function () {
  this._withDeleted = true;
  delete this.getQuery().isDeleted;
  return this;
};

// Instance method to soft delete
jewelleryCategorySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Instance method to restore
jewelleryCategorySchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

const JewelleryCategory =
  mongoose.models.JewelleryCategory ||
  mongoose.model('JewelleryCategory', jewelleryCategorySchema);

module.exports = JewelleryCategory;
