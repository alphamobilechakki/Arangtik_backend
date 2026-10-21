const mongoose = require('mongoose');

const registeredVendorSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
      maxlength: [100, 'Vendor name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Vendor phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Vendor category is required'],
      trim: true,
      index: true,
    },
    primaryCategory: {
      type: String,
      trim: true,
      index: true,
    },
    categories: {
      type: [{ type: String, trim: true }],
      default: [],
      index: true,
    },
    services: [
      {
        serviceId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'CategoryService',
          default: null,
        },
        name: { type: String, required: true, trim: true },
        code: { type: String, trim: true },
        isOffered: { type: Boolean, default: true },
        price: { type: Number, default: 0 },
      },
    ],
    offeredServices: {
      type: [{ type: String, trim: true }],
      default: [],
      index: true,
    },
    password: {
      type: String,
      select: false,
    },
    isRegistered: {
      type: Boolean,
      default: true,
      index: true,
    },
    addedByUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        nameGiven: {
          type: String,
          trim: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    businessName: {
      type: String,
      trim: true,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      pincode: { type: String, trim: true, default: '' },
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
    },
    totalOrdersHandled: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'registeredvendors',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

registeredVendorSchema.index({ category: 1, status: 1 });
registeredVendorSchema.index({ primaryCategory: 1, status: 1 });
registeredVendorSchema.index({ categories: 1, status: 1 });
registeredVendorSchema.index({ isRegistered: 1, status: 1 });
registeredVendorSchema.index({ offeredServices: 1, status: 1 });
registeredVendorSchema.index({ category: 1, offeredServices: 1, status: 1 });

// Ensure categories array, primaryCategory, legacy category, and offeredServices remain strictly in sync dynamically
registeredVendorSchema.pre('save', function (next) {
  if (Array.isArray(this.categories) && this.categories.length > 0) {
    this.categories = [...new Set(this.categories.map((c) => String(c).trim()).filter(Boolean))];
  } else if (this.primaryCategory || this.category) {
    const singleCat = String(this.primaryCategory || this.category).trim();
    this.categories = singleCat ? [singleCat] : [];
  } else {
    this.categories = [];
  }

  // Ensure primaryCategory is valid and part of categories
  if (!this.primaryCategory || !this.categories.includes(this.primaryCategory)) {
    this.primaryCategory = this.categories[0] || this.category || '';
  }

  // Keep legacy single-category field in sync with primaryCategory
  this.category = this.primaryCategory || this.category || '';

  // Keep offeredServices array in sync with active offered services
  if (Array.isArray(this.services)) {
    this.offeredServices = [
      ...new Set(
        this.services
          .filter((s) => s && s.isOffered !== false && s.name)
          .map((s) => String(s.name).trim())
      ),
    ];
  } else {
    this.offeredServices = [];
  }

  next();
});

const bcrypt = require('bcryptjs');

// Hash password before save if modified
registeredVendorSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare password
registeredVendorSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Auto-generate human-friendly vendorId before validation if not present
registeredVendorSchema.pre('validate', function (next) {
  if (!this.vendorId) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.vendorId = `VND-${randomSuffix}`;
  }
  next();
});

const RegisteredVendor =
  mongoose.models.RegisteredVendor ||
  mongoose.model('RegisteredVendor', registeredVendorSchema, 'registeredvendors');

// Also alias as Vendor so ref: 'Vendor' in orders populates correctly
if (!mongoose.models.Vendor) {
  mongoose.model('Vendor', registeredVendorSchema, 'registeredvendors');
}

module.exports = RegisteredVendor;
