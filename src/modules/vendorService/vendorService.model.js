const mongoose = require('mongoose');

const vendorServiceSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: [true, 'Vendor ID is required'],
    },

    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CategoryService',
      required: [true, 'Service ID is required'],
    },

    // Vendor's actual selling price
    price: {
      type: Number,
      required: [true, 'Service price is required'],
      min: [0, 'Price cannot be negative'],
    },

    // Vendor-specific overrides
    durationMinutes: {
      type: Number,
      min: [1, 'Duration must be at least 1 minute'],
      default: null,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
    collection: 'vendorservices',
  }
);

// Prevent duplicate service assignments for the same vendor.
vendorServiceSchema.index(
  { vendorId: 1, serviceId: 1 },
  { unique: true }
);

// Fetch a vendor's services.
vendorServiceSchema.index({ vendorId: 1, status: 1 });

// Find vendors offering an available service.
vendorServiceSchema.index({
  serviceId: 1,
  status: 1,
  isAvailable: 1,
});

const VendorService =
  mongoose.models.VendorService ||
  mongoose.model('VendorService', vendorServiceSchema);

module.exports = VendorService;
