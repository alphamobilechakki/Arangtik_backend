const mongoose = require('mongoose');

const WardrobeFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    wardrobeItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      required: false,
      index: true,
    },
    feedbackType: {
      type: String,
      enum: [
        'INCORRECT_MATCH',
        'CONFIRMED_MATCH',
        'INCORRECT_CATEGORY',
        'INCORRECT_COLOR',
        'WRONG_CROP',
        'MISSED_GARMENT',
        'OTHER',
      ],
      required: true,
      index: true,
    },
    originalPrediction: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    userCorrection: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

WardrobeFeedbackSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('WardrobeFeedback', WardrobeFeedbackSchema);
