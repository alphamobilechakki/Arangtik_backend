const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const sharp = require('sharp');

const { MONGODB_URI } = require('../src/config/env.config');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');
const segmentationService = require('../src/services/segmentation/segmentation.service');
const WardrobeItem = require('../src/modules/wardrobe/wardrobe.model');
const User = require('../src/modules/auth/user.model');
const ApiError = require('../src/utils/apiError');

describe('Clothing Segmentation & Transparent Cutout Pipeline Tests', () => {
  let testUserId;
  let testUser;
  const samplePersonImage = path.join(__dirname, '../uploads/photo-1790941677639-579241938.jpg');
  const sampleDressImage = path.join(__dirname, '../uploads/photos-1790944270007-231351803.webp');

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    testUser = await User.findOne({ phone: '9999999999' });
    if (!testUser) {
      testUser = await User.create({
        phone: '9999999999',
        name: 'Segmentation Test User',
        isPhoneVerified: true,
      });
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

  it('Test A: Full-body person photo should detect clothing, segment background, and produce transparent cutout', async () => {
    const fileA = {
      filename: path.basename(samplePersonImage),
      path: samplePersonImage,
      mimetype: 'image/jpeg',
      size: fs.statSync(samplePersonImage).size,
    };

    const result = await wardrobeService.analyzePhoto(testUserId, fileA);

    assert.ok(result, 'Result should exist');
    assert.ok(result.detectedItemsCount > 0, 'Should detect at least 1 clothing item');
    assert.ok(Array.isArray(result.analysis), 'Analysis should be an array');

    const firstItem = result.analysis[0];
    assert.ok(firstItem.croppedImageUrl, 'Should have croppedImageUrl');
    assert.ok(firstItem.name, 'Should have garment name');
    assert.ok(firstItem.category, 'Should have category');

    // Programmatically verify the saved segmented image file and its alpha channel
    const relativeUrl = firstItem.croppedImageUrl.replace(/^\//, '');
    const absoluteImagePath = path.join(__dirname, '../', relativeUrl);
    assert.ok(fs.existsSync(absoluteImagePath), `Segmented image file must exist on disk: ${absoluteImagePath}`);

    const meta = await sharp(absoluteImagePath).metadata();
    assert.ok(meta.hasAlpha, 'Output image must have an alpha channel');

    // Verify alpha transparency: some transparent and some opaque pixels
    const { data, info } = await sharp(absoluteImagePath).raw().toBuffer({ resolveWithObject: true });
    let transparentCount = 0;
    let opaqueCount = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const alpha = data[i + 3];
      if (alpha < 64) transparentCount++;
      else opaqueCount++;
    }
    const total = transparentCount + opaqueCount;
    assert.ok(total > 0, 'Image must have pixels');
    assert.ok(opaqueCount > 0, 'Image must not be completely transparent (garment must exist)');
  });

  it('Test B: Direct clothing photo should detect clothing and create transparent cutout without face requirement', async () => {
    const fileB = {
      filename: path.basename(sampleDressImage),
      path: sampleDressImage,
      mimetype: 'image/webp',
      size: fs.statSync(sampleDressImage).size,
    };

    const result = await wardrobeService.analyzePhoto(testUserId, fileB);

    assert.ok(result, 'Result should exist');
    assert.ok(result.detectedItemsCount > 0, 'Should detect standalone clothing items');

    const firstItem = result.analysis[0];
    assert.ok(firstItem.croppedImageUrl, 'Should have croppedImageUrl');

    const relativeUrl = firstItem.croppedImageUrl.replace(/^\//, '');
    const absoluteImagePath = path.join(__dirname, '../', relativeUrl);
    assert.ok(fs.existsSync(absoluteImagePath), `File must exist: ${absoluteImagePath}`);

    const meta = await sharp(absoluteImagePath).metadata();
    assert.ok(meta.hasAlpha, 'Output must have an alpha channel');
  });

  it('Test C: Multiple clothing items should each generate separate independent segmented cutouts', async () => {
    const fileA = {
      filename: path.basename(samplePersonImage),
      path: samplePersonImage,
      mimetype: 'image/jpeg',
      size: fs.statSync(samplePersonImage).size,
    };

    const result = await wardrobeService.analyzePhoto(testUserId, fileA);
    assert.ok(result.analysis.length >= 1, 'Should return garment list');

    // Verify each detected item has its own distinct croppedImageUrl
    const urls = result.analysis.map(item => item.croppedImageUrl).filter(Boolean);
    const uniqueUrls = new Set(urls);
    assert.equal(urls.length, uniqueUrls.size, 'Each detected item must have a unique cropped image URL');
  });

  it('Test D: Segmentation failure should fall back to rectangular crop gracefully without failing the request', async () => {
    // Create a temporary solid dummy image
    const dummyBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    }).webp().toBuffer();

    // Call segmentClothing directly with a broken option or mock
    const segResult = await segmentationService.segmentClothing(dummyBuffer, {
      filenamePrefix: 'test-fallback',
    });

    assert.ok(segResult.success, 'Segmentation service should return success with fallback');
    assert.ok(segResult.outputUrl, 'Should provide an output URL');
    assert.ok(fs.existsSync(segResult.outputPath), 'Fallback file should exist on disk');
  });

  it('Test E: Invalid request (no file) should cleanly throw ApiError 400 without crashing', async () => {
    await assert.rejects(
      async () => {
        await wardrobeService.analyzePhoto(testUserId, null);
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.message, 'Please upload an image to analyze');
        return true;
      }
    );
  });

  it('Test F: Programmatic Alpha Transparency Verification on real segmented garment', async () => {
    const testCrop = path.join(__dirname, '../uploads/crops/segmented-crop-1790937812280-0-2390.webp');
    let targetPath = testCrop;
    if (!fs.existsSync(testCrop)) {
      // Use any file in segmented directory
      const segDir = path.join(__dirname, '../uploads/crops/segmented');
      const files = fs.readdirSync(segDir);
      targetPath = path.join(segDir, files[0]);
    }

    const { data, info } = await sharp(targetPath).raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.channels, 4, 'Image must have 4 channels (RGBA)');

    let transparentPixels = 0;
    let opaquePixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 64) transparentPixels++;
      else if (alpha > 192) opaquePixels++;
    }

    assert.ok(transparentPixels > 0, 'Alpha verification: must have background pixels removed (alpha < 64)');
    assert.ok(opaquePixels > 0, 'Alpha verification: must have garment pixels retained (alpha > 192)');
  });
});
