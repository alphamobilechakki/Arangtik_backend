const mongoose = require('mongoose');

const hubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Hub name is required'],
      trim: true,
      maxlength: [100, 'Hub name cannot exceed 100 characters'],
    },

    mac_id: {
      type: String,
      required: [true, 'MAC ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [
        /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/,
        'MAC ID must be a valid MAC address (e.g. AA:BB:CC:DD:EE:FF)',
      ],
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    wifi: {
      ssid: {
        type: String,
        trim: true,
        default: null,
      },
      password: {
        type: String,
        trim: true,
        default: null,
        select: false, // Never returned in API responses
      },
    },

    // not configured → configured → active → deactivated
    status: {
      type: String,
      enum: ['not configured', 'configured', 'active', 'deactivated'],
      default: 'not configured',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'hubs',
  }
);

module.exports = mongoose.models.Hub || mongoose.model('Hub', hubSchema);
