const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const connectDB = require('../config/db.config');
const { JWT_SECRET } = require('../config/env.config');
const User = require('../modules/auth/user.model');
const WardrobeItem = require('../modules/wardrobe/wardrobeItem.model');

async function seedData() {
  try {
    await connectDB();
    console.log('🌱 Connected to MongoDB for Seeding...');

    const testPhone = '9876543210';
    let user = await User.findOne({ phone: testPhone });

    if (!user) {
      user = await User.create({
        phone: testPhone,
        name: 'Alex Mercer',
        role: 'user',
        status: 'active',
        profileImage: '/uploads/sample_profile.jpg',
      });
      console.log('✅ Created Demo User: Alex Mercer (Phone: 9876543210)');
    } else {
      user.name = 'Alex Mercer';
      user.status = 'active';
      await user.save();
      console.log('✅ Found Existing Demo User: Alex Mercer');
    }

    // Generate JWT Token for instant UI login
    const token = jwt.sign(
      { id: user._id, phone: user.phone, role: user.role },
      JWT_SECRET || 'arangtik_super_secret_jwt_key_2026',
      { expiresIn: '30d' }
    );

    // Clear old wardrobe test items for this user to avoid excessive duplicates
    await WardrobeItem.deleteMany({ userId: user._id });

    // Seed Sample Clothes
    const sampleClothes = [
      {
        userId: user._id,
        name: 'Navy Blue Slim Fit Linen Shirt',
        storeType: 'WARDROBE',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        sourceType: 'GALLERY_SCAN',
        sourcePhotoUrl: '/uploads/sample_gallery_1.jpg',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80',
            isPrimary: true,
          },
        ],
        attributes: {
          primaryColor: 'Navy Blue',
          secondaryColors: ['Dark Blue'],
          pattern: 'SOLID',
          fabric: 'LINEN',
          gender: 'MEN',
          fit: 'SLIM_FIT',
          sleeveLength: 'FULL_SLEEVE',
          occasions: ['OFFICE', 'FORMAL', 'PARTY'],
          seasons: ['SUMMER', 'ALL_SEASON'],
        },
        currentStatus: 'AVAILABLE',
        currentLocation: { storagePlace: 'Main Closet - Row 1' },
        usageStats: { wearCount: 4, lastWornDate: new Date('2026-09-28') },
        tags: ['Formal', 'Linen', 'Navy Blue', 'Office Wear'],
      },
      {
        userId: user._id,
        name: 'Light Blue Relaxed Denim Jeans',
        storeType: 'WARDROBE',
        category: 'LOWER_WEAR',
        subCategory: 'Jeans',
        sourceType: 'MANUAL_UPLOAD',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500&auto=format&fit=crop&q=80',
            isPrimary: true,
          },
        ],
        attributes: {
          primaryColor: 'Light Blue',
          pattern: 'SOLID',
          fabric: 'DENIM',
          gender: 'MEN',
          fit: 'REGULAR_FIT',
          occasions: ['CASUAL', 'DAILY', 'TRAVEL'],
          seasons: ['ALL_SEASON'],
        },
        currentStatus: 'AVAILABLE',
        currentLocation: { storagePlace: 'Main Closet - Bottom Drawer' },
        usageStats: { wearCount: 7, lastWornDate: new Date('2026-09-30') },
        tags: ['Denim', 'Casual', 'Everyday'],
      },
      {
        userId: user._id,
        name: 'Charcoal Grey Tailored Chinos',
        storeType: 'WARDROBE',
        category: 'LOWER_WEAR',
        subCategory: 'Trousers',
        sourceType: 'MANUAL_UPLOAD',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80',
            isPrimary: true,
          },
        ],
        attributes: {
          primaryColor: 'Charcoal Grey',
          pattern: 'SOLID',
          fabric: 'COTTON',
          gender: 'MEN',
          fit: 'SLIM_FIT',
          occasions: ['OFFICE', 'FORMAL', 'DATE'],
          seasons: ['ALL_SEASON'],
        },
        currentStatus: 'AVAILABLE',
        currentLocation: { storagePlace: 'Main Closet' },
        usageStats: { wearCount: 3, lastWornDate: new Date('2026-09-25') },
        tags: ['Office', 'Formal', 'Smart Casual'],
      },
      {
        userId: user._id,
        name: 'Royal Maroon Embroidered Silk Kurta',
        storeType: 'WARDROBE',
        category: 'TRADITIONAL',
        subCategory: 'Kurta',
        sourceType: 'GALLERY_SCAN',
        sourcePhotoUrl: '/uploads/diwali_party.jpg',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=500&auto=format&fit=crop&q=80',
            isPrimary: true,
          },
        ],
        attributes: {
          primaryColor: 'Maroon',
          secondaryColors: ['Gold'],
          pattern: 'EMBROIDERED',
          fabric: 'SILK',
          gender: 'MEN',
          fit: 'REGULAR_FIT',
          occasions: ['WEDDING', 'FESTIVE', 'PARTY'],
          seasons: ['ALL_SEASON'],
        },
        currentStatus: 'AVAILABLE',
        currentLocation: { storagePlace: 'Ethnic Wardrobe' },
        usageStats: { wearCount: 2, lastWornDate: new Date('2026-08-15') },
        tags: ['Ethnic', 'Festive', 'Diwali', 'Silk'],
      },
      {
        userId: user._id,
        name: 'Midnight Blue Formal Blazer',
        storeType: 'WARDROBE',
        category: 'OUTERWEAR',
        subCategory: 'Blazer',
        sourceType: 'MANUAL_UPLOAD',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=80',
            isPrimary: true,
          },
        ],
        attributes: {
          primaryColor: 'Midnight Blue',
          pattern: 'SOLID',
          fabric: 'WOOL',
          gender: 'MEN',
          fit: 'TAILORED',
          occasions: ['FORMAL', 'PARTY', 'OFFICE'],
        },
        currentStatus: 'LENT_OUT',
        currentLocation: {
          storagePlace: 'Main Closet',
          holderPerson: {
            name: 'Amit Kumar',
            phone: '9876543210',
            relation: 'Friend',
          },
        },
        activeAssignment: {
          assignedTo: 'Amit Kumar',
          assignedPhone: '9876543210',
          purpose: 'LENT_FOR_WEARING',
          givenDate: new Date('2026-09-28'),
          expectedReturnDate: new Date('2026-10-08'),
        },
        usageStats: { wearCount: 5 },
        tags: ['Blazer', 'Lent Out'],
      },
      {
        userId: user._id,
        name: 'White Minimalist Leather Sneakers',
        storeType: 'WARDROBE',
        category: 'FOOTWEAR',
        subCategory: 'Sneakers',
        sourceType: 'MANUAL_UPLOAD',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80',
            isPrimary: true,
          },
        ],
        attributes: {
          primaryColor: 'White',
          fabric: 'LEATHER',
          gender: 'MEN',
          occasions: ['CASUAL', 'TRAVEL', 'DAILY'],
        },
        currentStatus: 'AVAILABLE',
        currentLocation: { storagePlace: 'Shoe Rack' },
        usageStats: { wearCount: 12 },
        tags: ['Sneakers', 'White', 'Casual'],
      },
      {
        userId: user._id,
        name: 'Olive Green Oversized Graphic Tee',
        storeType: 'WARDROBE',
        category: 'UPPER_WEAR',
        subCategory: 'T-Shirt',
        sourceType: 'MANUAL_UPLOAD',
        images: [
          {
            url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
            isPrimary: true,
          },
        ],
        attributes: {
          primaryColor: 'Olive Green',
          pattern: 'PRINTED',
          fabric: 'COTTON',
          fit: 'OVERSIZED',
          occasions: ['CASUAL', 'DAILY'],
        },
        currentStatus: 'DIRTY',
        currentLocation: { storagePlace: 'Laundry Basket' },
        usageStats: { wearCount: 6 },
        tags: ['T-Shirt', 'Streetwear', 'Dirty'],
      },
    ];

    const insertedClothes = await WardrobeItem.insertMany(sampleClothes);
    console.log(`✅ Seeded ${insertedClothes.length} Sample Wardrobe Items (Shirts, Jeans, Kurta, Blazer, Shoes, Tee)`);

    // Seed Sample Wear History Logs
    const sampleWearLogs = [
      {
        userId: user._id,
        items: [
          {
            itemId: insertedClothes[0]._id,
            name: insertedClothes[0].name,
            category: insertedClothes[0].category,
            photoUrl: insertedClothes[0].images[0].url,
          },
          {
            itemId: insertedClothes[2]._id,
            name: insertedClothes[2].name,
            category: insertedClothes[2].category,
            photoUrl: insertedClothes[2].images[0].url,
          },
        ],
        occasion: 'OFFICE',
        sourcePhotoUrl: insertedClothes[0].images[0].url,
        wornDate: new Date('2026-09-28T09:30:00.000Z'),
        notes: 'Client presentation meeting at HQ',
        rating: 5,
      },
      {
        userId: user._id,
        items: [
          {
            itemId: insertedClothes[6]._id,
            name: insertedClothes[6].name,
            category: insertedClothes[6].category,
            photoUrl: insertedClothes[6].images[0].url,
          },
          {
            itemId: insertedClothes[1]._id,
            name: insertedClothes[1].name,
            category: insertedClothes[1].category,
            photoUrl: insertedClothes[1].images[0].url,
          },
        ],
        occasion: 'CASUAL',
        wornDate: new Date('2026-09-30T16:00:00.000Z'),
        notes: 'Coffee with friends at Third Wave Cafe',
        rating: 4,
      },
    ];

    await WearLog.insertMany(sampleWearLogs);
    console.log('✅ Seeded 2 Wear History Logs');

    console.log('\n==================================================');
    console.log('🎉 TEST DATA SEEDING COMPLETE!');
    console.log(`👤 User Phone: ${testPhone}`);
    console.log(`🔑 Direct JWT Token:`);
    console.log(token);
    console.log('==================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Error:', err);
    process.exit(1);
  }
}

seedData();
