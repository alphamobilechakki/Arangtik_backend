const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      unique: true,
      trim: true,
      immutable: true,
    },

    // Vendor identity
    name: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
      maxlength: [100, 'Vendor name cannot exceed 100 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Vendor phone number is required'],
      trim: true,
    },

    // Business profile
    businessName: {
      type: String,
      trim: true,
      maxlength: [150, 'Business name cannot exceed 150 characters'],
      default: '',
    },

    // Contact and business address
    address: {
      street: {
        type: String,
        trim: true,
        default: '',
      },
      city: {
        type: String,
        trim: true,
        default: '',
      },
      state: {
        type: String,
        trim: true,
        default: '',
      },
      pincode: {
        type: String,
        trim: true,
        default: '',
      },
    },

    // GeoJSON Point: [longitude, latitude]
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },

    // Account lifecycle
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },

    // Business metrics
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    totalOrdersHandled: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'vendor',
    versionKey: false,
  }
);

// Indexes
vendorSchema.index({ phone: 1 }, { unique: true });
vendorSchema.index({ status: 1, isVerified: 1 });
vendorSchema.index({ location: '2dsphere' });

const Vendor =
  mongoose.models.Vendor ||
  mongoose.model('Vendor', vendorSchema);

module.exports = Vendor;
