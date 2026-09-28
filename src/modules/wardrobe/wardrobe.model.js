const mongoose = require('mongoose');

const WardrobeItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [120, 'Item name cannot exceed 120 characters'],
    },
    storeType: {
      type: String,
      enum: ['WARDROBE', 'KITCHEN', 'ELECTRONICS', 'HOUSEHOLD', 'OTHER'],
      default: 'WARDROBE',
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    subCategory: {
      type: String,
      trim: true,
      index: true,
    },
    images: [
      {
        url: { type: String, required: true },
        thumbnailUrl: { type: String },
        isPrimary: { type: Boolean, default: false },
        embedding: [{ type: Number }], // AI feature vector (e.g. 512 dimensions)
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    // Dynamic Extensible Attributes Bag (Wardrobe, Kitchen, Electronics, etc.)
    attributes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Universal Operational Status
    currentStatus: {
      type: String,
      enum: [
        'AVAILABLE',
        'IN_USE',
        'DIRTY',
        'IN_LAUNDRY',
        'LENT_OUT',
        'IN_REPAIR',
        'ARCHIVED',
      ],
      default: 'AVAILABLE',
      index: true,
    },
    // Physical Storage Location
    currentLocation: {
      storagePlace: { type: String, default: 'Main Closet' },
      holderPerson: {
        name: { type: String },
        phone: { type: String },
        relation: { type: String },
      },
    },
    // Usage and Lifecycle Metrics
    usageStats: {
      wearCount: { type: Number, default: 0 },
      useCount: { type: Number, default: 0 },
      lastWornDate: { type: Date },
      lastUsedDate: { type: Date },
      washCount: { type: Number, default: 0 },
      lastWashedDate: { type: Date },
      isFavorite: { type: Boolean, default: false },
    },
    // Active Assignment (When item is outside with someone / Dhobi / Tailor)
    activeAssignment: {
      assignedTo: { type: String },
      assignedPhone: { type: String },
      purpose: {
        type: String,
        enum: [
          'LENT_FOR_WEARING',
          'WASH_AND_IRON',
          'DRY_CLEAN',
          'REPAIR',
          'OTHER',
        ],
      },
      givenDate: { type: Date },
      expectedReturnDate: { type: Date },
    },
    // Care & Laundry Instructions
    laundryCare: {
      washTypePreferred: {
        type: String,
        enum: ['MACHINE_WASH', 'HAND_WASH', 'DRY_CLEAN_ONLY', 'EASY_WASH'],
        default: 'MACHINE_WASH',
      },
      ironPreferred: { type: Boolean, default: true },
      careInstructions: { type: String },
    },
    tags: [{ type: String, trim: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for lightning-fast queries
WardrobeItemSchema.index({ userId: 1, storeType: 1, currentStatus: 1 });
WardrobeItemSchema.index({ userId: 1, category: 1 });
WardrobeItemSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WardrobeItem', WardrobeItemSchema);
