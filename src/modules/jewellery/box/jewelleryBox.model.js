const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../../utils/url.util');

const jewelleryBoxSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Jewellery box name is required'],
      trim: true,
      maxlength: [100, 'Box name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
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
      enum: ['PERSONAL', 'FAMILY', 'SHARED', 'OTHER'],
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

// Format cover image URL
jewelleryBoxSchema.pre('save', function (next) {
  if (this.coverImage) {
    this.coverImage = formatUploadUrl(this.coverImage);
  }
  if (typeof next === 'function') next();
});

// Auto-resolve storeTypeId for JEWELLERY_BOX if missing
jewelleryBoxSchema.pre('validate', async function (next) {
  try {
    if (!this.storeTypeId) {
      const StoreType = mongoose.models.StoreType || require('../../admin/storeType/storeType.model');
      if (StoreType) {
        let st =
          (await StoreType.findOne({ code: 'JEWELLERY_BOX' })) ||
          (await StoreType.findOne({ code: 'JEWELLERY' }));

        if (!st) {
          // Auto create JEWELLERY_BOX StoreType if not yet in database
          try {
            st = await StoreType.create({
              name: 'Jewellery Box',
              code: 'JEWELLERY_BOX',
              isActive: true,
            });
          } catch (_) {
            st = await StoreType.findOne({ isActive: true });
          }
        }

        if (st) {
          this.storeTypeId = st._id;
        }
      }
    }
  } catch (_) {
    // Continue even if lookup fails
  }
  if (typeof next === 'function') next();
});

// Automatic query middleware to exclude soft-deleted boxes by default
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

jewelleryBoxSchema.pre('find', excludeSoftDeleted);
jewelleryBoxSchema.pre('findOne', excludeSoftDeleted);
jewelleryBoxSchema.pre('findOneAndUpdate', excludeSoftDeleted);
jewelleryBoxSchema.pre('countDocuments', excludeSoftDeleted);

// Query helper to explicitly include deleted documents
jewelleryBoxSchema.query.withDeleted = function () {
  this._withDeleted = true;
  delete this.getQuery().isDeleted;
  return this;
};

// Instance method to soft delete
jewelleryBoxSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Instance method to restore
jewelleryBoxSchema.methods.restore = function () {
  this.isDeleted = false;
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Indexes for high performance user-scoped queries
jewelleryBoxSchema.index({ userId: 1, isDeleted: 1 });
jewelleryBoxSchema.index({ userId: 1, isDefault: 1 });
jewelleryBoxSchema.index({ userId: 1, createdAt: -1 });

const JewelleryBox =
  mongoose.models.JewelleryBox ||
  mongoose.model('JewelleryBox', jewelleryBoxSchema);

module.exports = JewelleryBox;
