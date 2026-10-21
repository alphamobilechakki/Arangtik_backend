const mongoose = require('mongoose');

const categoryServiceSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorCategory',
      required: [true, 'Category ID is required'],
      index: true,
    },
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    icon: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    price: {
      type: Number,
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate code from name before validation if not provided
categoryServiceSchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  next();
});

// Ensure service name is unique per category
categoryServiceSchema.index({ categoryId: 1, name: 1 }, { unique: true });
categoryServiceSchema.index({ categoryName: 1, isActive: 1 });
categoryServiceSchema.index({ categoryId: 1, isActive: 1, sortOrder: 1 });

const CategoryService =
  mongoose.models.CategoryService ||
  mongoose.model('CategoryService', categoryServiceSchema, 'categoryservices');

module.exports = CategoryService;
