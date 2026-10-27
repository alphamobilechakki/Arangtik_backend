const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../utils/url.util');

const WardrobeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Wardrobe name is required'],
      trim: true,
      maxlength: [100, 'Wardrobe name cannot exceed 100 characters'],
    },
    storeTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreType',
      default: null,
      index: true,
    },
    type: {
      type: String,
      trim: true,
      default: 'PERSONAL',
      enum: ['PERSONAL', 'FAMILY', 'CAPSULE', 'SHARED', 'SEASONAL', 'OTHER'],
    },
    ownerName: {
      type: String,
      trim: true,
      default: '',
      maxlength: [100, 'Owner name cannot exceed 100 characters'],
    },
    coverImage: {
      type: String,
      trim: true,
      default: '',
    },
    ownerFaceImage: {
      type: String,
      trim: true,
      default: '',
    },
    referenceFace: {
      embedding: [{ type: Number, select: false }],
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      },
      detectionConfidence: Number,
      lastGeneratedAt: Date,
      imagePath: String,
    },
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
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

// Format cover and owner face images to full URLs
WardrobeSchema.pre('save', function (next) {
  if (this.coverImage) {
    this.coverImage = formatUploadUrl(this.coverImage);
  }
  if (this.ownerFaceImage) {
    this.ownerFaceImage = formatUploadUrl(this.ownerFaceImage);
  }
  if (this.referenceFace && this.referenceFace.imagePath) {
    this.referenceFace.imagePath = formatUploadUrl(this.referenceFace.imagePath);
  }
  next();
});

// Virtual storeType for backwards compatibility with mobile apps and clients
WardrobeSchema.virtual('storeType').get(function () {
  if (this.storeTypeId && typeof this.storeTypeId === 'object' && this.storeTypeId.code) {
    return this.storeTypeId.code;
  }
  return undefined;
});

// Auto-resolve storeTypeId if missing
WardrobeSchema.pre('validate', async function (next) {
  try {
    if (!this.storeTypeId) {
      const StoreType = mongoose.models.StoreType || require('../admin/storeType/storeType.model');
      if (StoreType) {
        const defaultST =
          (await StoreType.findOne({ code: 'WARDROBE' })) ||
          (await StoreType.findOne({ isActive: true }));
        if (defaultST) {
          this.storeTypeId = defaultST._id;
        }
      }
    }
  } catch (_) {
    // Ignore resolution errors in pre-validate
  }
  next();
});

// Automatic query middleware to exclude soft-deleted wardrobes by default
function excludeSoftDeleted(next) {
  if (this._withDeleted) {
    if (typeof next === 'function') next();
    return;
  }
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: { $ne: true } });
  }
  if (typeof next === 'function') next();
}

WardrobeSchema.pre('find', excludeSoftDeleted);
WardrobeSchema.pre('findOne', excludeSoftDeleted);
WardrobeSchema.pre('findOneAndUpdate', excludeSoftDeleted);
WardrobeSchema.pre('countDocuments', excludeSoftDeleted);

// Query helper to explicitly include deleted documents
WardrobeSchema.query.withDeleted = function () {
  this._withDeleted = true;
  delete this.getQuery().isDeleted;
  return this;
};

// Instance method to soft delete
WardrobeSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Instance method to restore
WardrobeSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Indexes for high-performance user-scoped queries
WardrobeSchema.index({ userId: 1, storeTypeId: 1, isDefault: 1 });
WardrobeSchema.index({ userId: 1, storeTypeId: 1, isActive: 1 });
WardrobeSchema.index({ userId: 1, isDeleted: 1 });
WardrobeSchema.index({ userId: 1, isDefault: 1 });
WardrobeSchema.index({ userId: 1, isActive: 1 });
WardrobeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Wardrobe || mongoose.model('Wardrobe', WardrobeSchema);
