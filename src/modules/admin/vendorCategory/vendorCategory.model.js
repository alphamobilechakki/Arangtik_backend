const mongoose = require('mongoose');

const vendorCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vendor category name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Vendor category name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
    },
    icon: {
      type: String,
      trim: true,
      default: '🧺',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Description cannot exceed 300 characters'],
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

// Auto-generate normalized code before validation if not specified
vendorCategorySchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  next();
});

module.exports =
  mongoose.models.VendorCategory ||
  mongoose.model('VendorCategory', vendorCategorySchema);
