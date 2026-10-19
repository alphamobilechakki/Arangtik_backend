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
      default: 'Dhobi',
      index: true,
    },
    primaryCategory: {
      type: String,
      trim: true,
      default: 'Dhobi',
      index: true,
    },
    categories: {
      type: [{ type: String, trim: true }],
      default: ['Dhobi'],
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

// Ensure categories array, primaryCategory, and legacy category remain strictly in sync
registeredVendorSchema.pre('save', function (next) {
  if (!Array.isArray(this.categories) || this.categories.length === 0) {
    const defaultCat = this.primaryCategory || this.category || 'Dhobi';
    this.categories = [defaultCat];
  } else {
    // Deduplicate and trim categories
    this.categories = [...new Set(this.categories.map((c) => String(c).trim()).filter(Boolean))];
    if (this.categories.length === 0) {
      this.categories = ['Dhobi'];
    }
  }

  // Ensure primaryCategory is valid and part of categories
  if (!this.primaryCategory || !this.categories.includes(this.primaryCategory)) {
    this.primaryCategory = this.categories[0];
  }

  // Keep legacy single-category field in sync with primaryCategory
  this.category = this.primaryCategory;

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
