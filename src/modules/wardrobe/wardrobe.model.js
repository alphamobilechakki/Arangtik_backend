const mongoose = require('mongoose');

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
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for high-performance user-scoped queries
WardrobeSchema.index({ userId: 1, isDefault: 1 });
WardrobeSchema.index({ userId: 1, isActive: 1 });
WardrobeSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.Wardrobe || mongoose.model('Wardrobe', WardrobeSchema);
