const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../utils/url.util');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    icon: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    sortOrder: { type: Number, default: 0, index: true },
    storeTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StoreType',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual reference to Level 2 CategoryServices
categorySchema.virtual('services', {
  ref: 'CategoryService',
  localField: '_id',
  foreignField: 'categoryId',
});

// Unique name only for non-deleted records
categorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Exclude soft-deleted records by default
function excludeDeleted(next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
}

categorySchema.pre('find', excludeDeleted);
categorySchema.pre('findOne', excludeDeleted);
categorySchema.pre('findOneAndUpdate', excludeDeleted);
categorySchema.pre('countDocuments', excludeDeleted);

// Format imageUrl
categorySchema.pre('save', function (next) {
  if (this.imageUrl) {
    this.imageUrl = formatUploadUrl(this.imageUrl);
  }
  next();
});

// Soft delete instance method
categorySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

const Category =
  mongoose.models.Category ||
  mongoose.model('Category', categorySchema, 'categories');

if (!mongoose.models.VendorCategory) {
  mongoose.model('VendorCategory', categorySchema, 'categories');
}

module.exports = Category;
