const mongoose = require('mongoose');

const unregisteredVendorSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Vendor phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Vendor name cannot exceed 100 characters'],
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
    totalOrders: {
      type: Number,
      default: 0,
    },
    isConvertedToRegistered: {
      type: Boolean,
      default: false,
      index: true,
    },
    convertedVendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
    },
    convertedAt: {
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

module.exports =
  mongoose.models.UnregisteredVendor ||
  mongoose.model('UnregisteredVendor', unregisteredVendorSchema);
