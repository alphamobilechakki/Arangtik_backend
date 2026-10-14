const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../utils/url.util');

const laundryItemSchema = new mongoose.Schema(
  {
    wardrobeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    subCategory: {
      type: String,
      trim: true,
      default: '',
    },
    color: {
      type: String,
      trim: true,
      default: '',
    },
    fabric: {
      type: String,
      trim: true,
      default: '',
    },
    brand: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    serviceType: {
      type: String,
      enum: ['WASH', 'IRON', 'DRY_CLEAN', 'WASH_AND_IRON', 'OTHER'],
      default: 'WASH_AND_IRON',
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const laundryOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    userName: {
      type: String,
      trim: true,
      default: 'Customer',
    },
    userPhone: {
      type: String,
      trim: true,
      required: [true, 'User phone number is required'],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null,
      index: true,
    },
    vendorPhone: {
      type: String,
      required: [true, 'Vendor phone number is required'],
      trim: true,
      index: true,
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true,
    },
    isRegisteredVendor: {
      type: Boolean,
      default: false,
      index: true,
    },
    pickupDate: {
      type: Date,
      required: [true, 'Pickup date is required'],
    },
    expectedDeliveryDate: {
      type: Date,
      required: [true, 'Expected delivery date is required'],
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [laundryItemSchema],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'At least one dress must be selected for laundry',
      ],
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'PENDING_PICKUP', // Work Order created, awaiting pickup
        'PICKED_UP', // Clothes picked up by vendor
        'IN_PROCESS', // Washing / Dry cleaning / Ironing underway
        'READY_FOR_DELIVERY', // Cleaned and packed, ready to return
        'DELIVERED', // Handed over to user / completed
        'CANCELLED', // Cancelled by user
      ],
      default: 'PENDING_PICKUP',
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: {
          type: String,
          enum: ['USER', 'VENDOR', 'SYSTEM'],
          default: 'USER',
        },
        changedAt: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: '' },
      },
    ],
    pdfUrl: {
      type: String,
      trim: true,
      default: '',
    },
    pdfPath: {
      type: String,
      trim: true,
      default: '',
    },
    whatsappNotification: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null },
      messageId: { type: String, default: null },
      templateUsed: { type: String, default: null },
      status: { type: String, default: 'PENDING' },
      error: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate orderNumber before saving if not present
laundryOrderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `WO-${yyyymmdd}-${randomSuffix}`;
  }
  if (Array.isArray(this.items)) {
    this.totalItems = this.items.length;
  }
  next();
});

// Format URLs before save
laundryOrderSchema.pre('save', function (next) {
  if (this.pdfUrl) {
    this.pdfUrl = formatUploadUrl(this.pdfUrl);
  }
  if (Array.isArray(this.items)) {
    this.items.forEach((item) => {
      if (item.imageUrl) {
        item.imageUrl = formatUploadUrl(item.imageUrl);
      }
    });
  }
  next();
});

laundryOrderSchema.index({ userId: 1, createdAt: -1 });
laundryOrderSchema.index({ vendorPhone: 1, createdAt: -1 });

module.exports =
  mongoose.models.LaundryOrder || mongoose.model('LaundryOrder', laundryOrderSchema);
