const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate human-friendly vendorId before validation if not present
vendorSchema.pre('validate', function (next) {
  if (!this.vendorId) {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.vendorId = `VND-${randomSuffix}`;
  }
  next();
});

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
