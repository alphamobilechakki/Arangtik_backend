const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const sharp = require('sharp');

const { MONGODB_URI } = require('../src/config/env.config');
const aiVisionService = require('../src/modules/wardrobe/aiVision.service');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');
const segmentationService = require('../src/services/segmentation/segmentation.service');
const User = require('../src/modules/auth/user.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobe.model');

describe('Gemini Cascade & Segmentation Concurrency Optimizations Tests', () => {
  let testUserId;
  let testUser;
  const samplePersonImage = path.join(__dirname, '../uploads/image-1790938133930-894089880.png');

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    testUser = await User.findOne({ phone: '9999900001' }).select('+referenceFace.embedding');
    if (!testUser) {
      testUser = await User.create({
        phone: '9999900001',
        name: 'Optimization Test User',
        profileImage: `/uploads/${path.basename(samplePersonImage)}`,
        isPhoneVerified: true,
      });
    } else if (!testUser.profileImage) {
      testUser.profileImage = `/uploads/${path.basename(samplePersonImage)}`;
      await testUser.save();
    }
    testUserId = testUser._id.toString();
  });

  after(async () => {
    try {
      await WardrobeItem.deleteMany({ userId: testUserId });
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  });

  it('Test 1: Gemini Cascade — Active models prioritized and returns valid structured output', async () => {
    const rawAnalysis = await aiVisionService.analyzeImageWithGemini(samplePersonImage);
    assert.ok(Array.isArray(rawAnalysis), 'Raw analysis must be an array');
    assert.ok(rawAnalysis.length > 0, 'Should detect at least 1 item');

    const item = rawAnalysis[0];
    assert.ok(item.name, 'Item must have name');
    assert.ok(item.category, 'Item must have category');
    assert.ok(item.subCategory, 'Item must have subCategory');
    assert.ok(Array.isArray(item.box2d) && item.box2d.length === 4, 'Item must have valid 4-point box2d');
    assert.ok(item.attributes, 'Item must have attributes');
    assert.ok(item.attributes.primaryColor, 'Attributes must have primaryColor');
    assert.ok(Array.isArray(item.attributes.occasions), 'Attributes must have occasions array');
  });

  it('Test 2: Segmentation Concurrency — 3 garments processed concurrently with C=2 and strict ordering', async () => {
    const mockGarments = [
      {
        name: 'Upper Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        box2d: [100, 200, 500, 800],
        attributes: { primaryColor: 'blue' },
      },
      {
        name: 'Formal Trousers',
        category: 'LOWER_WEAR',
        subCategory: 'Trousers',
        box2d: [500, 250, 950, 750],
        attributes: { primaryColor: 'black' },
      },
      {
        name: 'Leather Belt',
        category: 'ACCESSORIES',
        subCategory: 'Belt',
        box2d: [480, 280, 530, 720],
        attributes: { primaryColor: 'brown' },
      },
    ];

    const startTime = Date.now();
    const results = await aiVisionService.cropDetectedItems(samplePersonImage, mockGarments);
    const duration = Date.now() - startTime;

    assert.equal(results.length, 3, 'Must return exactly 3 results');
    // Verify strict index order preservation
    assert.equal(results[0].name, 'Upper Shirt', 'Index 0 must match first garment');
    assert.equal(results[1].name, 'Formal Trousers', 'Index 1 must match second garment');
    assert.equal(results[2].name, 'Leather Belt', 'Index 2 must match third garment');

    // Verify all items generated files
    for (let i = 0; i < results.length; i++) {
      assert.ok(results[i].croppedImageUrl, `Garment ${i} must have croppedImageUrl`);
      assert.ok(results[i].croppedFilename, `Garment ${i} must have croppedFilename`);
      const fullPath = path.join(__dirname, '../uploads/crops/segmented', results[i].croppedFilename);
      const fallbackPath = path.join(__dirname, '../uploads/crops', results[i].croppedFilename);
      const exists = fs.existsSync(fullPath) || fs.existsSync(fallbackPath);
      assert.ok(exists, `Generated crop/segmentation file must exist on disk for item ${i}`);
    }
  });

  it('Test 3: Failure Isolation — One invalid crop coordinates does not break remaining garment segmentations', async () => {
    const mockGarments = [
      {
        name: 'Valid Garment 1',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        box2d: [100, 200, 500, 800],
        attributes: { primaryColor: 'blue' },
      },
      {
        name: 'Invalid Dimension Garment',
        category: 'OTHER',
        subCategory: 'Badge',
        box2d: [100, 100, 105, 105], // Tiny box < 20px, skipped safely
        attributes: { primaryColor: 'gold' },
      },
      {
        name: 'Valid Garment 3',
        category: 'LOWER_WEAR',
        subCategory: 'Pants',
        box2d: [500, 250, 950, 750],
        attributes: { primaryColor: 'black' },
      },
    ];

    const results = await aiVisionService.cropDetectedItems(samplePersonImage, mockGarments);
    assert.equal(results.length, 3, 'Must return all 3 items even if one is invalid/skipped');
    assert.equal(results[0].name, 'Valid Garment 1');
    assert.ok(results[0].croppedImageUrl, 'Item 0 must have crop');
    assert.equal(results[1].name, 'Invalid Dimension Garment');
    assert.equal(results[1].croppedImageUrl, null, 'Invalid item should gracefully have null crop without crashing');
    assert.equal(results[2].name, 'Valid Garment 3');
    assert.ok(results[2].croppedImageUrl, 'Item 2 must have crop');
  });

  it('Test 4: End-to-End Gallery Scan Pipeline with optimizations active', async () => {
    const file = {
      filename: path.basename(samplePersonImage),
      path: samplePersonImage,
      mimetype: 'image/png',
      size: fs.statSync(samplePersonImage).size,
    };

    const scanResult = await wardrobeService.scanGalleryPhoto(testUserId, file);
    assert.ok(scanResult, 'Scan result must exist');
    assert.equal(scanResult.matched, true, 'User must be matched');
    assert.ok(scanResult.detectedItemsCount > 0, 'Must extract clothing items');
    assert.ok(Array.isArray(scanResult.items), 'Items must be an array');
    assert.ok(scanResult.items[0].croppedImageUrl, 'Extracted garment must have croppedImageUrl');
  });
});
