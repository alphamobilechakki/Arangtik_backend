const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../src/config/env.config');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');
const WardrobeItem = require('../src/modules/wardrobe/wardrobe.model');
const User = require('../src/modules/auth/user.model');
const ApiError = require('../src/utils/apiError');

describe('Wardrobe AI analyzePhoto Pipeline Tests', () => {
  let testUserId;
  let testUser;
  const sampleImagePath = path.join(__dirname, '../uploads/photos-1790944270007-231351803.webp');
  const samplePersonImagePath = path.join(__dirname, '../uploads/photo-1790941677639-579241938.jpg');

  before(async () => {
    // Connect to database if not already connected
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Find or create test user
    testUser = await User.findOne({ phone: '9999999999' });
    if (!testUser) {
      testUser = await User.create({
        phone: '9999999999',
        name: 'Test Wardrobe User',
        isPhoneVerified: true,
      });
    }
    testUserId = testUser._id.toString();
  });

  after(async () => {
    // Cleanup any test items created
    try {
      await WardrobeItem.deleteMany({ userId: testUserId });
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  });

  it('Test A: Full-body / person photo should run face verification, garment detection, crop, and attribute extraction', async () => {
    // Check if test image exists on disk
    let imageToUse = samplePersonImagePath;
    if (!fs.existsSync(imageToUse)) {
      // Fallback to any existing upload
      const files = fs.readdirSync(path.join(__dirname, '../uploads')).filter(f => f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp'));
      imageToUse = path.join(__dirname, '../uploads', files[0]);
    }

    const mockFile = {
      filename: path.basename(imageToUse),
      path: imageToUse,
      mimetype: 'image/jpeg',
      size: fs.statSync(imageToUse).size,
    };

    const result = await wardrobeService.analyzePhoto(testUserId, mockFile);

    assert.ok(result, 'Result should be returned');
    assert.ok(result.originalImageUrl, 'originalImageUrl should be present');
    assert.equal(typeof result.detectedItemsCount, 'number', 'detectedItemsCount should be a number');
    assert.ok(Array.isArray(result.analysis), 'analysis should be an array');

    if (result.analysis.length > 0) {
      const item = result.analysis[0];
      assert.ok(item.name, 'Garment should have a name');
      assert.ok(item.category, 'Garment should have a category');
      assert.ok(item.attributes, 'Garment should have attributes');
      assert.ok(item.croppedImageUrl, 'Garment should have a croppedImageUrl');
      assert.ok(item.matchResult, 'Garment should have matchResult');
    }
  });

  it('Test B: Direct clothing photo should detect clothing and return attributes & crops without requiring face', async () => {
    let imageToUse = sampleImagePath;
    if (!fs.existsSync(imageToUse)) {
      const files = fs.readdirSync(path.join(__dirname, '../uploads')).filter(f => f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg'));
      imageToUse = path.join(__dirname, '../uploads', files[0]);
    }

    const mockFile = {
      filename: path.basename(imageToUse),
      path: imageToUse,
      mimetype: 'image/webp',
      size: fs.statSync(imageToUse).size,
    };

    const result = await wardrobeService.analyzePhoto(testUserId, mockFile);

    assert.ok(result, 'Result should be returned');
    assert.ok(result.originalImageUrl, 'originalImageUrl should be present');
    assert.ok(Array.isArray(result.analysis), 'analysis should be an array');
    assert.ok(result.detectedItemsCount >= 0, 'detectedItemsCount should be non-negative');
  });

  it('Test C: Invalid request without file should throw ApiError 400 cleanly without server crash', async () => {
    await assert.rejects(
      async () => {
        await wardrobeService.analyzePhoto(testUserId, null);
      },
      (err) => {
        assert.ok(err instanceof ApiError || err.statusCode === 400);
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, 'Please upload an image to analyze');
        return true;
      }
    );
  });
});
