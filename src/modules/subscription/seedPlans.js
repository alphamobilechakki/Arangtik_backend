const mongoose = require('mongoose');
const { MONGODB_URI } = require('../../config/env.config');
const SubscriptionPlan = require('./plan.model');

const defaultPlans = [
  {
    code: 'basic',
    name: 'Basic',
    description: 'Essential personal wardrobe organization and styling basics',
    displayOrder: 1,
    isPopular: false,
    pricing: [
      { durationMonths: 1, priceWithout: 99, priceWith: 199 },
      { durationMonths: 6, priceWithout: 499, priceWith: 999 },
      { durationMonths: 12, priceWithout: 399, priceWith: 599 },
    ],
    limits: {
      wardrobes: 2,
      clothingItems: 30,
      aiOutfitSuggestions: 5,
      virtualTryOn: 2,
      laundryOrders: 2,
      favouriteOutfits: 10,
      jewelleryCollections: 1,
      jewelleryItems: 10,
    },
    features: {
      basicCategorization: true,
      occasionSuggestions: false,
      weatherSuggestions: false,
      colourSuggestions: false,
      jewelleryEnabled: false,
    },
    isActive: true,
  },
  {
    code: 'plus',
    name: 'Plus',
    description: 'Smart styling with occasion, weather and color-coordinated insights',
    displayOrder: 2,
    isPopular: true,
    pricing: [
      { durationMonths: 1, priceWithout: 199, priceWith: 299 },
      { durationMonths: 6, priceWithout: 999, priceWith: 1499 },
      { durationMonths: 12, priceWithout: 1999, priceWith: 2999 },
    ],
    limits: {
      wardrobes: 5,
      clothingItems: 70,
      aiOutfitSuggestions: 15,
      virtualTryOn: 5,
      laundryOrders: 5,
      favouriteOutfits: 30,
      jewelleryCollections: 3,
      jewelleryItems: 45,
    },
    features: {
      basicCategorization: true,
      occasionSuggestions: true,
      weatherSuggestions: true,
      colourSuggestions: true,
      jewelleryEnabled: false,
    },
    isActive: true,
  },
  {
    code: 'pro',
    name: 'Pro',
    description: 'Unlimited style mastery with maximum wardrobes, AI try-ons, and limits',
    displayOrder: 3,
    isPopular: false,
    pricing: [
      { durationMonths: 1, priceWithout: 399, priceWith: 599 },
      { durationMonths: 6, priceWithout: 1799, priceWith: 2699 },
      { durationMonths: 12, priceWithout: 3599, priceWith: 5399 },
    ],
    limits: {
      wardrobes: 10,
      clothingItems: 150,
      aiOutfitSuggestions: 30,
      virtualTryOn: 10,
      laundryOrders: 10,
      favouriteOutfits: 80,
      jewelleryCollections: 5,
      jewelleryItems: 125,
    },
    features: {
      basicCategorization: true,
      occasionSuggestions: true,
      weatherSuggestions: true,
      colourSuggestions: true,
      jewelleryEnabled: false,
    },
    isActive: true,
  },
];

async function seedSubscriptionPlans() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB');
    }

    console.log('Seeding Subscription Plans...');

    for (const planData of defaultPlans) {
      const existing = await SubscriptionPlan.findOne({ code: planData.code });
      if (!existing) {
        await SubscriptionPlan.create(planData);
        console.log(` Created plan: ${planData.name} (${planData.code})`);
      } else {
        // Keep limits, pricing, and features up to date if they don't exist yet
        await SubscriptionPlan.updateOne(
          { code: planData.code },
          {
            $setOnInsert: planData,
          },
          { upsert: true }
        );
        console.log(` Plan already exists: ${planData.name} (${planData.code})`);
      }
    }

    console.log('Subscription Plans seed completed successfully.');
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
  } finally {
    if (require.main === module) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

if (require.main === module) {
  seedSubscriptionPlans();
}

module.exports = {
  seedSubscriptionPlans,
  defaultPlans,
};
