const mongoose = require('mongoose');

const kitchenBoxCaptureSchema = new mongoose.Schema(
  {
    kitchenBoxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KitchenBox',
      required: true,
    },

    hubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hub',
      required: true,
    },

    image: {
      type: String,
      default: null,
    },

    tof: {
      type: Number,
      default: null,
    },

    dimensions: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'kitchen_box_captures',
  }
);

kitchenBoxCaptureSchema.index({ kitchenBoxId: 1, createdAt: -1 });
kitchenBoxCaptureSchema.index({ hubId: 1, createdAt: -1 });

module.exports =
  mongoose.models.KitchenBoxCapture ||
  mongoose.model('KitchenBoxCapture', kitchenBoxCaptureSchema);

