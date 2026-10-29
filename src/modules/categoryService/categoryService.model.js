const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../utils/url.util');

const categoryServiceSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    icon: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 500 },
    basePrice: { type: Number, default: 0, min: 0 },
    unit: { type: String, trim: true, uppercase: true },
    sortOrder: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for categoryName when categoryId is populated
categoryServiceSchema.virtual('categoryName').get(function () {
  if (this.categoryId && typeof this.categoryId === 'object') {
    return this.categoryId.name || '';
  }
  return '';
});

// Unique service name per category among non-deleted services
categoryServiceSchema.index(
  { categoryId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

// Exclude soft-deleted services by default
function excludeDeleted(next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
}

categoryServiceSchema.pre('find', excludeDeleted);
categoryServiceSchema.pre('findOne', excludeDeleted);
categoryServiceSchema.pre('findOneAndUpdate', excludeDeleted);
categoryServiceSchema.pre('countDocuments', excludeDeleted);

categoryServiceSchema.pre('save', function (next) {
  if (this.imageUrl) {
    this.imageUrl = formatUploadUrl(this.imageUrl);
  }
  next();
});

categoryServiceSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

const CategoryService =
  mongoose.models.CategoryService ||
  mongoose.model('CategoryService', categoryServiceSchema);

module.exports = CategoryService;
