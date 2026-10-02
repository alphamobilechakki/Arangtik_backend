const mongoose = require('mongoose');

const WearLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'WardrobeItem',
          required: true,
        },
        name: { type: String },
        category: { type: String },
        subCategory: { type: String },
        photoUrl: { type: String },
      },
    ],
    wornDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    occasion: {
      type: String,
      enum: [
        'CASUAL',
        'OFFICE',
        'FORMAL',
        'PARTY',
        'WEDDING',
        'FESTIVE',
        'TRAVEL',
        'DATE',
        'GYM',
        'OTHER',
      ],
      default: 'CASUAL',
      index: true,
    },
    sourcePhotoUrl: { type: String },
    location: { type: String },
    notes: { type: String },
    rating: { type: Number, min: 1, max: 5 },
  },
  {
    timestamps: true,
  }
);

WearLogSchema.index({ userId: 1, wornDate: -1 });

module.exports = mongoose.model('WearLog', WearLogSchema);
