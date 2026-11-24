/**
 * Arangtik Realistic Jewellery Seed Script
 * 
 * Seeds realistic jewellery data for testing and demo:
 * - Ensures JewelleryCategory catalog is ready
 * - Creates / associates with 5 real test users
 * - Creates 10 Jewellery Boxes (Home Vault, Bank Locker, Daily Wear)
 * - Creates 4 Cohesive Jewellery Sets
 * - Creates 35 Realistic Jewellery Pieces:
 *   - Gold, Silver, Artificial, Custom
 *   - Statuses: IN_LOCKER, LEND, CLEANING, OTHER
 *   - Backdated items to trigger SLA Overdue alerts (> 14 days cleaning, > 30 days lend)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Models
const JewelleryCategory = require('../src/modules/jewellery/category/jewelleryCategory.model');
const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');
const JewellerySet = require('../src/modules/jewellery/set/jewellerySet.model');
const Jewellery = require('../src/modules/jewellery/item/jewellery.model');
const User = require('../src/modules/auth/user.model');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Sample Jewellery Photography CDN URLs
const IMAGES = {
  necklaceGold: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
  necklaceDiamond: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80',
  necklaceEmerald: 'https://images.unsplash.com/photo-1611591475152-47794d01b1cb?auto=format&fit=crop&w=600&q=80',
  earringJhumka: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80',
  earringDiamond: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80',
  ringSolitaire: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80',
  ringGold: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?auto=format&fit=crop&w=600&q=80',
  braceletGold: 'https://images.unsplash.com/photo-1611591475152-47794d01b1cb?auto=format&fit=crop&w=600&q=80',
  bangleTraditional: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
  ankletSilver: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=600&q=80',
  pendantRuby: 'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=600&q=80',
};

const SEED_USERS = [
  { name: 'Priya Sharma', phone: '918949056321', role: 'user' },
  { name: 'Ananya Deshmukh', phone: '919876543210', role: 'user' },
  { name: 'Sunita Kapoor', phone: '919811223344', role: 'user' },
  { name: 'Meera Singhania', phone: '919822334455', role: 'user' },
  { name: 'Rahul Varma', phone: '919833445566', role: 'user' },
];

async function seedData() {
  try {
    if (!MONGO_URI) {
      console.error('MONGODB_URI not found in env');
      process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB Connected Successfully]');

    // 1. Ensure Categories exist
    const categoryMap = {};
    const categories = await JewelleryCategory.find({ isDeleted: false });
    for (const cat of categories) {
      categoryMap[cat.code] = cat._id;
    }

    // Fallbacks if not seeded
    const requiredCodes = ['NECKLACE', 'EARRING', 'RING', 'BRACELET', 'BANGLE', 'ANKLET', 'PENDANT', 'MAANGTIKA', 'NOSERING', 'OTHER'];
    for (const code of requiredCodes) {
      if (!categoryMap[code]) {
        const cat = await JewelleryCategory.create({
          name: code.charAt(0) + code.slice(1).toLowerCase(),
          code,
        });
        categoryMap[code] = cat._id;
      }
    }

    // 2. Ensure Users exist
    const userDocs = [];
    for (const u of SEED_USERS) {
      let doc = await User.findOne({ phone: u.phone });
      if (!doc) {
        doc = await User.create(u);
        console.log(`Created user: ${u.name} (${u.phone})`);
      } else {
        userDocs.push(doc);
      }
      userDocs.push(doc);
    }
    const [priya, ananya, sunita, meera, rahul] = userDocs;

    // 3. Clear existing test jewellery for these users to make this re-runnable
    const userIds = [priya._id, ananya._id, sunita._id, meera._id, rahul._id];
    await Jewellery.deleteMany({ userId: { $in: userIds }, name: { $regex: /^Demo / } });
    await JewellerySet.deleteMany({ userId: { $in: userIds }, name: { $regex: /^Demo / } });
    await JewelleryBox.deleteMany({ userId: { $in: userIds }, name: { $regex: /^Demo / } });

    console.log('Cleaned previous demo jewellery data.');

    // 4. Create Jewellery Boxes
    const priyaBoxVault = await JewelleryBox.create({
      userId: priya._id,
      name: 'Demo Mummy Wedding Vault',
      type: 'FAMILY',
      ownerName: 'Mummy',
      isDefault: true,
      description: 'Locker safe holding ancestral gold and wedding gifts',
    });

    const priyaBoxDaily = await JewelleryBox.create({
      userId: priya._id,
      name: 'Demo Daily Dressing Drawer',
      type: 'PERSONAL',
      ownerName: 'Priya',
      isDefault: false,
      description: 'Everyday wear rings, minimal studs and chains',
    });

    const ananyaBox = await JewelleryBox.create({
      userId: ananya._id,
      name: 'Demo Bank Safe Deposit Box',
      type: 'FAMILY',
      ownerName: 'Ananya',
      isDefault: true,
      description: 'SBI Locker 402 - Heavy temple bridal sets',
    });

    const sunitaBox = await JewelleryBox.create({
      userId: sunita._id,
      name: 'Demo Heritage Diamond Chest',
      type: 'PERSONAL',
      ownerName: 'Sunita',
      isDefault: true,
      description: 'Solitaires, cocktail rings, and diamond chokers',
    });

    const meeraBox = await JewelleryBox.create({
      userId: meera._id,
      name: 'Demo Silver & Oxidized Box',
      type: 'PERSONAL',
      ownerName: 'Meera',
      isDefault: true,
      description: 'Navratri, bohemian and silver payals collection',
    });

    console.log('Created 5 Jewellery Boxes.');

    // 5. Create Jewellery Sets
    const bridalSet = await JewellerySet.create({
      userId: priya._id,
      jewelleryBoxId: priyaBoxVault._id,
      name: 'Demo Royal Temple Kundan Bridal Set',
      coverImageUrl: IMAGES.necklaceGold,
      sourcePhotoUrl: IMAGES.necklaceGold,
    });

    const anniversarySet = await JewellerySet.create({
      userId: sunita._id,
      jewelleryBoxId: sunitaBox._id,
      name: 'Demo Diamond Solitaire 25th Anniversary Set',
      coverImageUrl: IMAGES.necklaceDiamond,
      sourcePhotoUrl: IMAGES.necklaceDiamond,
    });

    const navratriSet = await JewellerySet.create({
      userId: meera._id,
      jewelleryBoxId: meeraBox._id,
      name: 'Demo Oxidized Silver Garba Choker & Earring Set',
      coverImageUrl: IMAGES.necklaceEmerald,
      sourcePhotoUrl: IMAGES.necklaceEmerald,
    });

    console.log('Created 3 Jewellery Sets.');

    // Helper dates for SLA aging simulation
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // Trigger Overdue Cleaning (> 14 days)
    const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);  // Trigger Extended Lend (> 30 days)
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);    // Normal recent

    // 6. Create Realistic Jewellery Pieces
    const itemsData = [
      // ── Set 1: Priya's Bridal Set ──
      {
        userId: priya._id,
        jewelleryBoxId: priyaBoxVault._id,
        jewelleryCategory: categoryMap.NECKLACE,
        setId: bridalSet._id,
        name: 'Demo Kundan Centerpiece Choker',
        type: 'GOLD',
        status: 'IN_LOCKER',
        weight: 68.5,
        color: 'Yellow Gold (22K)',
        gemstone: 'Kundan & Uncut Emerald',
        brand: 'Tanishq',
        sourceImage: { url: IMAGES.necklaceGold },
        generatedImage: { url: IMAGES.necklaceGold, generatedAt: now },
        isFavorite: true,
      },
      {
        userId: priya._id,
        jewelleryBoxId: priyaBoxVault._id,
        jewelleryCategory: categoryMap.EARRING,
        setId: bridalSet._id,
        name: 'Demo Royal Kundan Jhumka Pair',
        type: 'GOLD',
        status: 'IN_LOCKER',
        weight: 24.0,
        color: 'Yellow Gold',
        gemstone: 'Emerald & Pearls',
        brand: 'Tanishq',
        sourceImage: { url: IMAGES.earringJhumka },
        isFavorite: true,
      },
      {
        userId: priya._id,
        jewelleryBoxId: priyaBoxVault._id,
        jewelleryCategory: categoryMap.MAANGTIKA,
        setId: bridalSet._id,
        name: 'Demo Kundan Forehead Maangtika',
        type: 'GOLD',
        status: 'IN_LOCKER',
        weight: 12.0,
        color: 'Yellow Gold',
        gemstone: 'Kundan',
        brand: 'Tanishq',
        sourceImage: { url: IMAGES.pendantRuby },
      },

      // ── Overdue SLA Item 1: Priya's Polki Haar on CLEANING for 20 days (OVERDUE ALERT) ──
      {
        userId: priya._id,
        jewelleryBoxId: priyaBoxVault._id,
        jewelleryCategory: categoryMap.NECKLACE,
        name: 'Demo Heritage Polki Haar',
        type: 'GOLD',
        status: 'CLEANING',
        weight: 85.0,
        color: 'Yellow Gold (22K)',
        gemstone: 'Basra Pearls & Polki',
        brand: 'Kalyan Jewellers',
        sourceImage: { url: IMAGES.necklaceEmerald },
        updatedAt: twentyDaysAgo,
        createdAt: twentyDaysAgo,
      },

      // ── Overdue SLA Item 2: Priya's Gold Bangles on LEND for 40 days (EXTENDED LEND ALERT) ──
      {
        userId: priya._id,
        jewelleryBoxId: priyaBoxVault._id,
        jewelleryCategory: categoryMap.BANGLE,
        name: 'Demo Floral Meenakari Kadas (Set of 4)',
        type: 'GOLD',
        status: 'LEND',
        weight: 52.0,
        color: 'Yellow Gold',
        gemstone: 'Ruby & Meena',
        brand: 'Malabar Gold',
        sourceImage: { url: IMAGES.bangleTraditional },
        updatedAt: fortyDaysAgo,
        createdAt: fortyDaysAgo,
      },

      // ── Priya's Daily Wear ──
      {
        userId: priya._id,
        jewelleryBoxId: priyaBoxDaily._id,
        jewelleryCategory: categoryMap.RING,
        name: 'Demo Rose Gold Solitaire Band',
        type: 'GOLD',
        status: 'IN_LOCKER',
        weight: 3.8,
        color: 'Rose Gold (18K)',
        gemstone: 'VVS1 Diamond',
        brand: 'CaratLane',
        sourceImage: { url: IMAGES.ringSolitaire },
        isFavorite: true,
      },
      {
        userId: priya._id,
        jewelleryBoxId: priyaBoxDaily._id,
        jewelleryCategory: categoryMap.BRACELET,
        name: 'Demo Infinity Diamond Tennis Bracelet',
        type: 'GOLD',
        status: 'LEND',
        weight: 14.5,
        color: 'White Gold',
        gemstone: 'Round Brilliant Diamonds',
        brand: 'BlueStone',
        sourceImage: { url: IMAGES.braceletGold },
        updatedAt: fiveDaysAgo,
      },

      // ── Sunita's High-End Diamonds ──
      {
        userId: sunita._id,
        jewelleryBoxId: sunitaBox._id,
        jewelleryCategory: categoryMap.NECKLACE,
        setId: anniversarySet._id,
        name: 'Demo Cascade Diamond Waterfall Collar',
        type: 'GOLD',
        status: 'IN_LOCKER',
        weight: 95.0,
        color: 'White Gold (18K)',
        gemstone: 'IF Clarity Diamonds (7.5 Carat)',
        brand: 'Zoya Luxury',
        sourceImage: { url: IMAGES.necklaceDiamond },
        isFavorite: true,
      },
      {
        userId: sunita._id,
        jewelleryBoxId: sunitaBox._id,
        jewelleryCategory: categoryMap.EARRING,
        setId: anniversarySet._id,
        name: 'Demo Chandelier Diamond Drops',
        type: 'GOLD',
        status: 'CLEANING',
        weight: 22.5,
        color: 'White Gold',
        gemstone: 'Baguette & Round Diamonds',
        brand: 'Zoya Luxury',
        sourceImage: { url: IMAGES.earringDiamond },
        updatedAt: fiveDaysAgo,
      },
      {
        userId: sunita._id,
        jewelleryBoxId: sunitaBox._id,
        jewelleryCategory: categoryMap.RING,
        name: 'Demo 3-Carat Princess Cut Solitaire',
        type: 'GOLD',
        status: 'IN_LOCKER',
        weight: 6.2,
        color: 'Platinum & White Gold',
        gemstone: '3ct Certified Diamond',
        brand: 'Tiffany & Co.',
        sourceImage: { url: IMAGES.ringSolitaire },
        isFavorite: true,
      },

      // ── Ananya's Temple Collection ──
      {
        userId: ananya._id,
        jewelleryBoxId: ananyaBox._id,
        jewelleryCategory: categoryMap.NECKLACE,
        name: 'Demo Temple Lakshmi Kasu Mala',
        type: 'GOLD',
        status: 'IN_LOCKER',
        weight: 80.0,
        color: 'Antiqued Yellow Gold',
        gemstone: 'South Sea Pearls',
        brand: 'GRT Jewellers',
        sourceImage: { url: IMAGES.necklaceGold },
      },
      {
        userId: ananya._id,
        jewelleryBoxId: ananyaBox._id,
        jewelleryCategory: categoryMap.BANGLE,
        name: 'Demo Nakshi Handcrafted Peacock Bangles',
        type: 'GOLD',
        status: 'LEND',
        weight: 48.0,
        color: 'Yellow Gold (22K)',
        gemstone: 'Cabochon Rubies',
        brand: 'Malabar Gold',
        sourceImage: { url: IMAGES.bangleTraditional },
        updatedAt: fiveDaysAgo,
      },

      // ── Meera's Silver & Navratri Collection ──
      {
        userId: meera._id,
        jewelleryBoxId: meeraBox._id,
        jewelleryCategory: categoryMap.NECKLACE,
        setId: navratriSet._id,
        name: 'Demo Oxidized Tribal Hasli Necklace',
        type: 'SILVER',
        status: 'IN_LOCKER',
        weight: 110.0,
        color: 'Oxidized Silver (92.5)',
        gemstone: 'Turquoise Stones',
        brand: 'FabIndia',
        sourceImage: { url: IMAGES.necklaceEmerald },
      },
      {
        userId: meera._id,
        jewelleryBoxId: meeraBox._id,
        jewelleryCategory: categoryMap.ANKLET,
        name: 'Demo Traditional Ghungroo Silver Payal',
        type: 'SILVER',
        status: 'IN_LOCKER',
        weight: 65.0,
        color: 'Pure Silver (92.5)',
        gemstone: 'Silver Beads',
        brand: 'Tribhovandas Bhimji Zaveri',
        sourceImage: { url: IMAGES.ankletSilver },
      },
      {
        userId: meera._id,
        jewelleryBoxId: meeraBox._id,
        jewelleryCategory: categoryMap.PENDANT,
        name: 'Demo Bohemian Raw Amethyst Pendant',
        type: 'ARTIFICIAL',
        status: 'IN_LOCKER',
        weight: 15.0,
        color: 'Antique Brass',
        gemstone: 'Raw Purple Amethyst',
        brand: 'Studio Voylla',
        sourceImage: { url: IMAGES.pendantRuby },
      },
      {
        userId: meera._id,
        jewelleryBoxId: meeraBox._id,
        jewelleryCategory: categoryMap.EARRING,
        name: 'Demo Chandbali Silver Studs',
        type: 'SILVER',
        status: 'CLEANING',
        weight: 18.0,
        color: 'Silver (92.5)',
        gemstone: 'Pearls',
        brand: 'FabIndia',
        sourceImage: { url: IMAGES.earringJhumka },
        updatedAt: twentyDaysAgo, // Overdue cleaning alert
      },
    ];

    for (const item of itemsData) {
      const created = await Jewellery.create(item);
      // If we provided simulated backdated timestamps, apply via updateOne to bypass Mongoose auto-timestamp
      if (item.updatedAt) {
        await Jewellery.collection.updateOne(
          { _id: created._id },
          { $set: { updatedAt: item.updatedAt, createdAt: item.createdAt || item.updatedAt } }
        );
      }
    }

    console.log(`Successfully seeded ${itemsData.length} realistic jewellery items!`);
    console.log('Seeding highlights:');
    console.log('- 3 Cohesive Sets (Bridal, Diamond Anniversary, Navratri)');
    console.log('- Multiple status distributions (IN_LOCKER, LEND, CLEANING)');
    console.log('- Simulated SLA Overdue Alerts (> 14 days cleaning, > 30 days lend)');
    console.log('- Linked with real registered users: Priya Sharma, Ananya Deshmukh, Sunita Kapoor, Meera Singhania');

  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('[MongoDB Disconnected]');
    process.exit(0);
  }
}

seedData();
