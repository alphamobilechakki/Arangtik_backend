const mongoose = require('mongoose');

const kitchenBoxSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    mac_id: {
      type: String,
      required: [true, 'MAC ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/,
        'MAC ID must be a valid MAC address (e.g. 24:0A:C4:11:00:55)',
      ],
    },

    // Parent hub this box is paired to (optional until paired to a gateway)
    hub_mac_id: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
      index: true,
    },

    // Assigned owner/customer (optional until assigned)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    // What is stored inside the box
    item_name: {
      type: String,
      trim: true,
      default: null,
    },

    // Physical dimensions string e.g. "1200x800x1000" (in mm)
    dimensions: {
      type: String,
      trim: true,
      default: null,
    },

    // Time-of-Flight sensor reading (mm) — updated by hub
    tof: {
      type: Number,
      default: null,
    },

    // Reference photo of the box
    image: {
      type: String,
      trim: true,
      default: null,
    },
    qr_code: {
      type: String,
      default: null,
    },

    // provisioned → activated → maintenance → deactivated
    status: {
      type: String,
      enum: ['provisioned', 'activated', 'maintenance', 'deactivated'],
      default: 'provisioned',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'kitchen_boxes',
  }
);

module.exports =
  mongoose.models.KitchenBox || mongoose.model('KitchenBox', kitchenBoxSchema);
