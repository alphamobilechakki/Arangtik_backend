const mongoose = require('mongoose');

const coinPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },

    coins: {
      type: Number,
      required: [true, 'Coins amount is required'],
      min: [1, 'Coins must be a positive integer'],
    },

    bonusCoins: {
      type: Number,
      default: 0,
      min: [0, 'Bonus coins cannot be negative'],
    },

    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be greater than zero'],
    },

    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
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

// Unique index on name (case-insensitive)
coinPackageSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('CoinPackage', coinPackageSchema);

