const mongoose = require('mongoose');
const { formatUploadUrl } = require('../../utils/url.util');

const aiLookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: null,
    },
    topWearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      default: null,
    },
    bottomWearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      default: null,
    },
    jewelleryIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Jewellery',
      },
    ],
    avatarUrl: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    bullmqJobId: {
      type: String,
      default: '',
    },
    pythonJobId: {
      type: String,
      default: '',
    },
    generatedImageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    styleNotes: {
      type: String,
      default: '',
      trim: true,
    },
    errorMessage: {
      type: String,
      default: '',
      trim: true,
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
  }
);

aiLookSchema.pre('save', function (next) {
  if (this.avatarUrl) {
    this.avatarUrl = formatUploadUrl(this.avatarUrl);
  }
  if (this.generatedImageUrl) {
    this.generatedImageUrl = formatUploadUrl(this.generatedImageUrl);
  }
  next();
});

aiLookSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });

module.exports = mongoose.models.AiLook || mongoose.model('AiLook', aiLookSchema);
