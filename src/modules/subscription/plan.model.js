const mongoose = require('mongoose');

const PlanPricingSchema = new mongoose.Schema(
  {
    durationMonths: {
      type: Number,
      enum: [1, 3, 6, 12],
      required: true,
    },
    priceWithout: {
      type: Number,
      required: true,
      min: 0,
    },
    priceWith: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const PlanLimitsSchema = new mongoose.Schema(
  {
    wardrobes: {
      type: Number,
      default: 2,
      min: 0,
    },
    clothingItems: {
      type: Number,
      default: 30,
      min: 0,
    },
    aiOutfitSuggestions: {
      type: Number,
      default: 5,
      min: 0,
    },
    virtualTryOn: {
      type: Number,
      default: 2,
      min: 0,
    },
    laundryOrders: {
      type: Number,
      default: 2,
      min: 0,
    },
    favouriteOutfits: {
      type: Number,
      default: 10,
      min: 0,
    },
    jewelleryCollections: {
      type: Number,
      default: 1,
      min: 0,
    },
    jewelleryItems: {
      type: Number,
      default: 10,
      min: 0,
    },
  },
  { _id: false }
);

const PlanFeaturesSchema = new mongoose.Schema(
  {
    basicCategorization: {
      type: Boolean,
      default: true,
    },
    occasionSuggestions: {
      type: Boolean,
      default: false,
    },
    weatherSuggestions: {
      type: Boolean,
      default: false,
    },
    colourSuggestions: {
      type: Boolean,
      default: false,
    },
    jewelleryEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const SubscriptionPlanSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Plan code is required'],
      unique: true,
      trim: true,
      lowercase: true,
      enum: ['basic', 'plus', 'pro'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    pricing: {
      type: [PlanPricingSchema],
      default: [],
    },
    limits: {
      type: PlanLimitsSchema,
      default: () => ({}),
    },
    features: {
      type: PlanFeaturesSchema,
      default: () => ({}),
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

SubscriptionPlanSchema.index({ code: 1, isActive: 1 });

module.exports =
  mongoose.models.SubscriptionPlan ||
  mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);

