const mongoose = require('mongoose');

const OutfitItemSlotSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      required: true,
    },
    slot: {
      type: String,
      enum: ['UPPER_WEAR', 'LOWER_WEAR', 'ONE_PIECE', 'OUTERWEAR', 'FOOTWEAR', 'ACCESSORIES'],
      required: true,
    },
    name: { type: String, trim: true },
    category: { type: String, trim: true },
    subCategory: { type: String, trim: true },
    color: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ownerName: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const OutfitSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    clusterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FCCluster',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['PERSONAL', 'SUGGESTED', 'ACCEPTED', 'DECLINED', 'WORN'],
      default: 'PERSONAL',
      index: true,
    },
    wardrobeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wardrobe',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Outfit title is required'],
      trim: true,
      maxlength: 140,
    },
    occasion: {
      type: String,
      required: [true, 'Occasion is required'],
      trim: true,
      uppercase: true,
      index: true,
    },
    season: {
      type: String,
      trim: true,
      default: 'ALL_SEASON',
    },
    items: {
      type: [OutfitItemSlotSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'Outfit must contain at least one clothing item',
      },
    },
    stylingNotes: {
      type: String,
      trim: true,
      default: '',
    },
    colorHarmony: {
      palette: [{ type: String }],
      harmonyType: { type: String, default: 'HARMONIOUS' },
      contrast: { type: String, default: 'BALANCED' },
      score: { type: Number, default: 90, min: 0, max: 100 },
    },
    matchScore: {
      type: Number,
      default: 90,
      min: 0,
      max: 100,
    },
    missingSlots: [{ type: String }],
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    wearCount: {
      type: Number,
      default: 0,
    },
    lastWornAt: {
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

OutfitSchema.pre('validate', function (next) {
  // Sync dual identities for 100% backward compatibility
  if (!this.targetUserId && this.userId) {
    this.targetUserId = this.userId;
  }
  if (!this.createdBy && this.userId) {
    this.createdBy = this.userId;
  }
  if (!this.userId && this.targetUserId) {
    this.userId = this.targetUserId;
  }
  if (this.createdBy && this.targetUserId && String(this.createdBy) !== String(this.targetUserId)) {
    if (this.status === 'PERSONAL') {
      this.status = 'SUGGESTED';
    }
  }
  next();
});

OutfitSchema.index({ userId: 1, occasion: 1 });
OutfitSchema.index({ userId: 1, isFavorite: 1 });
OutfitSchema.index({ userId: 1, createdAt: -1 });
OutfitSchema.index({ targetUserId: 1, createdBy: 1 });
OutfitSchema.index({ clusterId: 1, createdAt: -1 });

module.exports = mongoose.models.Outfit || mongoose.model('Outfit', OutfitSchema);
