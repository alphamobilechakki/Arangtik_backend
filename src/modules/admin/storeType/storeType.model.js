const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../../utils/url.util');

const storeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store type name is required'],
      trim: true,
      maxlength: [100, 'Store type name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    image: {
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

// Partial unique indexes: only enforce uniqueness for active, non-deleted records
storeTypeSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
storeTypeSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Auto-generate normalized code before validation if not specified
storeTypeSchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  next();
});

// Format image URL to absolute URL
storeTypeSchema.pre('save', function (next) {
  if (this.image) {
    this.image = formatUploadUrl(this.image);
  }
  next();
});

// Automatic query middleware to exclude soft-deleted documents by default
function excludeSoftDeleted(next) {
  // If the query doesn't explicitly filter by isDeleted, only return non-deleted records
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  if (typeof next === 'function') next();
}

storeTypeSchema.pre('find', excludeSoftDeleted);
storeTypeSchema.pre('findOne', excludeSoftDeleted);
storeTypeSchema.pre('findOneAndUpdate', excludeSoftDeleted);
storeTypeSchema.pre('countDocuments', excludeSoftDeleted);

// Query helper to explicitly include deleted documents
storeTypeSchema.query.withDeleted = function () {
  delete this.getQuery().isDeleted;
  return this;
};

// Instance method to soft delete
storeTypeSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Instance method to restore
storeTypeSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

const StoreType = mongoose.model('StoreType', storeTypeSchema);
module.exports = StoreType;
