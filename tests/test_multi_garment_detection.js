const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const connectDB = require('../src/config/db.config');
const User = require('../src/modules/auth/user.model');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const clothAnalysisService = require('../src/modules/clothAnalysis/clothAnalysis.service');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');

const img1Path = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\1cd37dde-746c-4a5c-b652-f764abfaad6f\\.user_uploaded\\media_1791610326127.png';
const img2Path = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\1cd37dde-746c-4a5c-b652-f764abfaad6f\\.user_uploaded\\media_1791610554800.png';

async function runTest() {
  await connectDB();
  console.log('✅ Connected to DB');

  // Find or create test user
  let user = await User.findOne({ phone: '919876543210' });
  if (!user) {
    user = await User.create({
      phone: '919876543210',
      name: 'Test Fashion User',
      gender: 'MALE',
    });
  }
  const userId = user._id;

  // Find or create default wardrobe
  let wardrobe = await Wardrobe.findOne({ userId });
  if (!wardrobe) {
    wardrobe = await Wardrobe.create({
      userId,
      name: 'Main Wardrobe',
      ownerName: 'Test Fashion User',
      isDefault: true,
    });
  }

  console.log(`\n==================================================`);
  console.log(`TEST 1: MULTI-GARMENT & ACCESSORY DETECTION (IMAGE 1)`);
  console.log(`==================================================`);

  // Copy sample image into uploads for testing
  const uploadsDir = path.resolve(__dirname, '../uploads');
  const test1Filename = `test_outfit_${Date.now()}.png`;
  const test1Dest = path.join(uploadsDir, test1Filename);
  fs.copyFileSync(img1Path, test1Dest);

  const file1 = {
    filename: test1Filename,
    path: test1Dest,
    mimetype: 'image/png',
  };

  const analysis1 = await clothAnalysisService.analyzePhoto(userId, file1, {
    wardrobeId: wardrobe._id,
  });

  console.log(`Total Garments Detected: ${analysis1.detectedItemsCount}`);
  console.log(`Items Array Length: ${analysis1.items.length}`);

  if (analysis1.items.length < 2) {
    throw new Error(`Expected at least 2 detected garments/accessories, got ${analysis1.items.length}`);
  }

  analysis1.items.forEach((item, idx) => {
    console.log(`[Item ${idx + 1}]`);
    console.log(`  Name: ${item.name}`);
    console.log(`  Category: ${item.category}`);
    console.log(`  SubCategory: ${item.subCategory}`);
    console.log(`  Cropped Image: ${item.croppedImageUrl}`);
    console.log(`  Color: ${item.autoFilledFields?.color}`);
  });

  console.log(`\n==================================================`);
  console.log(`TEST 2: MULTI-ITEM USER SELECTION & ADD TO WARDROBE`);
  console.log(`==================================================`);

  // Simulate user selecting first 2 items (e.g. T-Shirt & Jeans) from analysis
  const selectedItems = analysis1.items.slice(0, 2);
  console.log(`Simulating user selecting ${selectedItems.length} items to save...`);

  const createdItems = [];
  for (const sel of selectedItems) {
    const item = await wardrobeService.addItemFromDetection(userId, sel, {
      wardrobeId: wardrobe._id,
    });
    createdItems.push(item);
  }

  console.log(`✅ Successfully added ${createdItems.length} items to wardrobe!`);
  createdItems.forEach((ci) => {
    console.log(`  Saved Item ID: ${ci._id} | Name: ${ci.name} | Category: ${ci.category}`);
  });

  // Verify in database
  const countInDb = await WardrobeItem.countDocuments({
    _id: { $in: createdItems.map((c) => c._id) },
  });
  if (countInDb !== createdItems.length) {
    throw new Error(`Database verification failed: Expected ${createdItems.length} items, found ${countInDb}`);
  }
  console.log(`✅ Database verified: All ${countInDb} selected items exist in MongoDB!`);

  console.log(`\n==================================================`);
  console.log(`TEST 3: GHOST MANNEQUIN CLEAN BODY-FREE CUTOUT (IMAGE 2)`);
  console.log(`==================================================`);

  const test2Filename = `test_white_tshirt_${Date.now()}.png`;
  const test2Dest = path.join(uploadsDir, test2Filename);
  fs.copyFileSync(img2Path, test2Dest);

  const file2 = {
    filename: test2Filename,
    path: test2Dest,
    mimetype: 'image/png',
  };

  const analysis2 = await clothAnalysisService.analyzePhoto(userId, file2, {
    wardrobeId: wardrobe._id,
  });

  console.log(`Image 2 Item: ${analysis2.autoFilledFields.name}`);
  console.log(`Image 2 Cropped Transparent URL: ${analysis2.autoFilledFields.croppedImageUrl}`);
  console.log(`Image 2 Polygon extracted: ${!!(analysis2.analysis[0]?.polygon?.length)}`);

  console.log(`\n🎉 ALL TESTS PASSED SUCCESSFULLY!`);
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
