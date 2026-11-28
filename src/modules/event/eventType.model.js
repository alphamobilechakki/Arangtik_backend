const mongoose = require('mongoose');

const eventTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Event type name is required'],
      trim: true,
      maxlength: 60,
    },
    code: {
      type: String,
      required: [true, 'Event type code is required'],
      uppercase: true,
      trim: true,
      unique: true,
    },
    icon: {
      type: String,
      default: '', // Icon identifier or name (e.g. 'party-popper', 'ring', 'briefcase')
    },
    imageUrl: {
      type: String,
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

eventTypeSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.models.EventType || mongoose.model('EventType', eventTypeSchema);
