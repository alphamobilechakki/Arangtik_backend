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

module.exports = mongoose.model('User', userSchema);
