const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('../src/config/db.config');
const SubscriptionPlan = require('../src/modules/subscription/plan.model');

// ============================================================
// SUBSCRIPTION PLANS SEED DATA
// ============================================================
const SUBSCRIPTION_PLANS = [
  {
    code: 'basic',
    name: 'Basic',
    description: 'Basic plan',
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

async function seed() {
  try {
    await connectDB();
    console.log('\n============================================================');
    console.log('SEEDING SUBSCRIPTION PLANS...');
    console.log('============================================================\n');

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const planData of SUBSCRIPTION_PLANS) {
      const existing = await SubscriptionPlan.findOne({ code: planData.code });

      if (existing) {
        existing.name = planData.name;
        existing.description = planData.description;
        existing.displayOrder = planData.displayOrder;
        existing.isPopular = planData.isPopular;
        existing.pricing = planData.pricing;
        existing.limits = planData.limits;
        existing.features = planData.features;
        existing.isActive = planData.isActive;
        await existing.save();
        totalUpdated++;
        console.log(`  [UPDATED] ${planData.name.padEnd(10)} (${planData.code})`);
      } else {
        await SubscriptionPlan.create(planData);
        totalCreated++;
        console.log(`  [CREATED] ${planData.name.padEnd(10)} (${planData.code})`);
      }
    }

    console.log('\n============================================================');
    console.log('SUBSCRIPTION PLANS SEEDING COMPLETE!');
    console.log(`New Plans Created: ${totalCreated}`);
    console.log(`Plans Updated:     ${totalUpdated}`);
    console.log(`Total Plans:       ${SUBSCRIPTION_PLANS.length}`);
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding subscription plans:', error);
    process.exit(1);
  }
}

seed();
