const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../utils/url.util');

const orderItemSchema = new mongoose.Schema(
  {
    // 1. Universal Item Identification
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    price: {
      type: Number,
      default: 0,
    },

    // 2. Service & Special Instructions
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    serviceName: {
      type: String,
      trim: true,
      default: '',
    },
    serviceType: {
      type: String,
      trim: true,
      default: 'WASH_AND_IRON',
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: '',
    },

    // 3. Garment / Wardrobe Specifics (For Dhobi / Tailor / Ironing)
    wardrobeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      default: null,
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
    status: {
      type: String,
      enum: ['PENDING', 'DELIVERED', 'RETURNED'],
      default: 'PENDING',
      index: true,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    orderCategory: {
      type: String,
      required: [true, 'Order category is required'],
      trim: true,
      default: 'General',
    },
    orderType: {
      type: String,
      enum: ['SERVICE', 'PRODUCT', 'LAUNDRY_WORK_ORDER', 'OTHER'],
      default: 'SERVICE',
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
      index: true,
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
      default: null,
    },
    expectedDeliveryDate: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    specialInstructions: {
      type: String,
      trim: true,
      default: '',
    },
    items: {
      type: [orderItemSchema],
      validate: [
        (val) => Array.isArray(val) && val.length > 0,
        'At least one item must be included in the order',
      ],
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    requestedServices: {
      type: [{ type: String, trim: true }],
      default: [],
      index: true,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    payment: {
      status: {
        type: String,
        enum: ['UNPAID', 'PAID'],
        default: 'UNPAID',
        index: true,
      },
      transactionId: {
        type: String,
        default: null,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      updatedBy: {
        type: String,
        enum: ['USER', 'VENDOR', 'ADMIN', 'SYSTEM'],
        default: 'SYSTEM',
      },
    },
    status: {
      type: String,
      enum: [
        'PENDING_PICKUP',
        'PICKED_UP',
        'IN_PROCESS',
        'READY_FOR_DELIVERY',
        'DELIVERED',
        'PARTIALLY_DELIVERED',
        'PARTIALLY_DONE',
        'CANCELLED',
        'REJECTED',
      ],
      default: 'PENDING_PICKUP',
    },
    deliveredItemsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveredAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    partialDeliveryNotes: {
      type: String,
      trim: true,
      default: '',
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: {
          type: String,
          enum: ['USER', 'VENDOR', 'SYSTEM', 'ADMIN'],
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
    collection: 'orders',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate orderNumber before saving if not present
orderSchema.pre('validate', function (next) {
  if (!this.orderNumber) {
    const today = new Date();
    const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = this.orderType === 'PRODUCT' ? 'ORD' : 'WO';
    this.orderNumber = `${prefix}-${yyyymmdd}-${randomSuffix}`;
  }
  if (Array.isArray(this.items)) {
    this.totalItems = this.items.length;
    this.requestedServices = [
      ...new Set(
        this.items
          .map((item) => item.serviceName || item.serviceType)
          .filter(Boolean)
          .map((s) => String(s).trim())
      ),
    ];
    if (!this.subtotal && !this.totalAmount) {
      const sum = this.items.reduce((acc, it) => acc + (it.price || 0) * (it.quantity || 1), 0);
      if (sum > 0) {
        this.subtotal = sum;
        this.totalAmount = sum + (this.deliveryFee || 0);
      }
    }
  }
  next();
});

// Format URLs before save
orderSchema.pre('save', function (next) {
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

// Universal Payment Status Virtual
orderSchema.virtual('paymentStatus').get(function () {
  return this.payment?.status || 'UNPAID';
});

// High-Performance Universal Query Indexes
orderSchema.index({ orderCategory: 1 });
orderSchema.index({ orderCategory: 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, orderCategory: 1, createdAt: -1 });
orderSchema.index({ vendorPhone: 1, createdAt: -1 });
orderSchema.index({ vendorPhone: 1, orderCategory: 1, createdAt: -1 });
orderSchema.index({ vendorId: 1, orderCategory: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ vendorPhone: 1, 'payment.status': 1 });
orderSchema.index({ userId: 1, 'payment.status': 1 });

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema, 'orders');

// Ensure LaundryOrder is registered on the same universal 'orders' collection
if (!mongoose.models.LaundryOrder) {
  mongoose.model('LaundryOrder', orderSchema, 'orders');
}

module.exports = Order;
