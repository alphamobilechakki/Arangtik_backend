const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../../utils/url.util');

const storeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store type name is required'],
      unique: true,
      trim: true,
      maxlength: [100, 'Store type name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
    },
    image: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate normalized code before validation if not specified
storeTypeSchema.pre('validate', function (next) {
  if (!this.code && this.name) {
    this.code = this.name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
  next();
});

// Format image URLs to absolute URLs and sync image <-> imageUrl
storeTypeSchema.pre('save', function (next) {
  if (this.imageUrl) {
    this.imageUrl = formatUploadUrl(this.imageUrl);
  }
  if (this.image) {
    this.image = formatUploadUrl(this.image);
  }
  if (this.imageUrl && !this.image) {
    this.image = this.imageUrl;
  } else if (this.image && !this.imageUrl) {
    this.imageUrl = this.image;
  }
  next();
});

const StoreType = mongoose.model('StoreType', storeTypeSchema);
module.exports = StoreType;
