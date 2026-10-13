const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
    },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED'],
      default: 'UNSPECIFIED',
      uppercase: true,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ['INDIVIDUAL', 'COMMERCIAL'],
      default: 'INDIVIDUAL',
      uppercase: true,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'INR',
    },
    preferredLanguage: {
      type: String,
      trim: true,
      default: 'en',
    },
    profileImage: {
      type: String,
      trim: true,
      default: '',
    },
    referenceFace: {
      embedding: {
        type: [Number],
        select: false, // Hidden by default from queries for privacy and security
      },
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
  },
  { timestamps: true }
);

const { formatUploadUrl } = require('../../utils/url.util');

userSchema.pre('save', function (next) {
  if (this.profileImage) {
    this.profileImage = formatUploadUrl(this.profileImage);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
