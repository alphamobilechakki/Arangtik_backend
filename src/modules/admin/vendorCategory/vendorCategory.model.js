const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../../utils/url.util');

const serviceSubSchema = new mongoose.Schema(
  {
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
    sortOrder: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

serviceSubSchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  next();
});

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
      default: '',
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
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
    services: {
      type: [serviceSubSchema],
      default: [],
    },
    storeTypes: {
      type: [String],
      enum: ['WARDROBE', 'KITCHEN', 'ELECTRONICS', 'HOUSEHOLD', 'VALUABLES', 'OTHER'],
      default: ['WARDROBE'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const ALLOWED_STORE_TYPES = [
  'WARDROBE',
  'KITCHEN',
  'ELECTRONICS',
  'HOUSEHOLD',
  'VALUABLES',
  'OTHER',
];

// Auto-generate normalized code before validation if not specified & normalize storeTypes
vendorCategorySchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  // Normalize storeTypes to valid uppercase enum array
  if (Array.isArray(this.storeTypes)) {
    const cleaned = this.storeTypes
      .map((s) => String(s).trim().toUpperCase())
      .filter((s) => ALLOWED_STORE_TYPES.includes(s));
    this.storeTypes = cleaned.length > 0 ? [...new Set(cleaned)] : ['WARDROBE'];
  } else if (typeof this.storeTypes === 'string') {
    const list = this.storeTypes
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => ALLOWED_STORE_TYPES.includes(s));
    this.storeTypes = list.length > 0 ? [...new Set(list)] : ['WARDROBE'];
  } else {
    this.storeTypes = ['WARDROBE'];
  }

  next();
});

// Format image URLs to absolute URLs and sync image <-> imageUrl
vendorCategorySchema.pre('save', function (next) {
  if (this.imageUrl) {
    this.imageUrl = formatUploadUrl(this.imageUrl);
  }
  if (this.image) {
    this.image = formatUploadUrl(this.image);
  }
  if (this.imageUrl && !this.image) {
    this.image = this.imageUrl;
  } else if (this.image && !this.imageUrl) {
    this.imageUrl = this.image;
  }
  next();
});

const VendorCategory =
  mongoose.models.VendorCategory ||
  mongoose.model('VendorCategory', vendorCategorySchema);

VendorCategory.ALLOWED_STORE_TYPES = ALLOWED_STORE_TYPES;

module.exports = VendorCategory;
