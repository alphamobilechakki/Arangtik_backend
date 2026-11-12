const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const CoinPackage = require('../src/modules/subscription/coins/coinPackage.model');

// ============================================================
// DYNAMIC COIN PACKAGES SEED DATA
// ============================================================
const COIN_PACKAGES = [
  {
    name: 'Starter Pack',
    coins: 5000,
    bonusCoins: 0,
    price: 10,
    currency: 'INR',
    description: 'Perfect for quick top-ups and trying out AI features',
    isActive: true,
  },
  {
    name: 'Value Pack',
    coins: 10000,
    bonusCoins: 500,
    price: 20,
    currency: 'INR',
    description: 'Popular choice! 10,000 coins + 500 bonus coins (5% extra)',
    isActive: true,
  },
  {
    name: 'Style Pack',
    coins: 15000,
    bonusCoins: 1200,
    price: 30,
    currency: 'INR',
    description: 'Great for weekly AI outfit suggestions and virtual try-ons (8% extra)',
    isActive: true,
  },
  {
    name: 'Pro Pack',
    coins: 30000,
    bonusCoins: 3000,
    price: 50,
    currency: 'INR',
    description: 'Best seller! 30,000 coins + 3,000 bonus coins (10% extra)',
    isActive: true,
  },
  {
    name: 'Super Saver Pack',
    coins: 50000,
    bonusCoins: 6000,
    price: 80,
    currency: 'INR',
    description: 'Generous styling bundle! 50,000 coins + 6,000 bonus coins (12% extra)',
    isActive: true,
  },
  {
    name: 'Mega Pack',
    coins: 100000,
    bonusCoins: 15000,
    price: 150,
    currency: 'INR',
    description: 'Ultimate value! 100,000 coins + 15,000 bonus coins (15% extra)',
    isActive: true,
  },
  {
    name: 'VIP Wardrobe Master',
    coins: 250000,
    bonusCoins: 50000,
    price: 350,
    currency: 'INR',
    description: 'Maximum power bundle! 250,000 coins + 50,000 bonus coins (20% extra)',
    isActive: true,
  },
];

async function seed() {
  try {
    await connectDB();
    console.log('\n============================================================');
    console.log('SEEDING COIN PACKAGES...');
    console.log('============================================================\n');

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const pkg of COIN_PACKAGES) {
      const existing = await CoinPackage.findOne({
        name: { $regex: new RegExp(`^${pkg.name}$`, 'i') },
      });

      if (existing) {
        existing.coins = pkg.coins;
        existing.bonusCoins = pkg.bonusCoins;
        existing.price = pkg.price;
        existing.currency = pkg.currency;
        existing.description = pkg.description;
        existing.isActive = pkg.isActive;
        await existing.save();
        totalUpdated++;
        console.log(`  [UPDATED] ${pkg.name.padEnd(22)}: ${(pkg.coins + pkg.bonusCoins).toLocaleString().padStart(8)} coins for ₹${pkg.price}`);
      } else {
        await CoinPackage.create(pkg);
        totalCreated++;
        console.log(`  [CREATED] ${pkg.name.padEnd(22)}: ${(pkg.coins + pkg.bonusCoins).toLocaleString().padStart(8)} coins for ₹${pkg.price}`);
      }
    }

    console.log('\n============================================================');
    console.log('COIN PACKAGES SEEDING COMPLETE!');
    console.log(`New Packages Created: ${totalCreated}`);
    console.log(`Packages Updated:     ${totalUpdated}`);
    console.log(`Total Active Bundles: ${COIN_PACKAGES.length}`);
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding coin packages:', error);
    process.exit(1);
  }
}

seed();

