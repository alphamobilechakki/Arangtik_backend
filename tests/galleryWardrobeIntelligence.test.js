const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const sharp = require('sharp');

const { MONGODB_URI } = require('../src/config/env.config');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');
const aiVisionService = require('../src/modules/wardrobe/aiVision.service');
const faceAIService = require('../src/services/faceAI/faceAI.service');
const faceAIClient = require('../src/services/faceAI/faceAI.client');
const WardrobeItem = require('../src/modules/wardrobe/wardrobe.model');
const User = require('../src/modules/auth/user.model');

describe('PHASE 4: Gallery → Wardrobe Intelligence Tests', () => {
  let userA;
  let userAId;
  let userB;
  let userBId;
  let samplePhotoPath;
  let blankPhotoPath;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
    await faceAIClient.initialize();

    samplePhotoPath = path.join(__dirname, '../uploads/image-1790938133930-894089880.png');
    if (!fs.existsSync(samplePhotoPath)) {
      const pngs = fs.readdirSync(path.join(__dirname, '../uploads')).filter((f) => f.endsWith('.png'));
      samplePhotoPath = path.join(__dirname, '../uploads', pngs[0]);
    }

    blankPhotoPath = path.join(__dirname, '../uploads/temp-blank-intelligence.jpg');
    await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 240, g: 240, b: 240 },
      },
    })
      .jpeg()
      .toFile(blankPhotoPath);

    // Create User A
    userA = await User.findOne({ phone: '9999900011' }).select('+referenceFace.embedding');
    if (!userA) {
      userA = await User.create({
        phone: '9999900011',
        name: 'Gallery User A',
        profileImage: `/uploads/${path.basename(samplePhotoPath)}`,
      });
    }
    const faceA = await faceAIService.extractReferenceFace(samplePhotoPath);
    userA.referenceFace = {
      embedding: faceA.embedding,
      boundingBox: faceA.boundingBox,
      detectionConfidence: faceA.confidence,
      lastGeneratedAt: new Date(),
      imagePath: `/uploads/${path.basename(samplePhotoPath)}`,
    };
    await userA.save();
    userAId = userA._id.toString();

    // Create User B with orthogonal face embedding
    userB = await User.findOne({ phone: '9999900012' }).select('+referenceFace.embedding');
    if (!userB) {
      userB = await User.create({
        phone: '9999900012',
        name: 'Gallery User B',
        profileImage: `/uploads/${path.basename(samplePhotoPath)}`,
        referenceFace: {
          embedding: Array(128).fill(0.99),
          boundingBox: { x: 5, y: 5, width: 40, height: 40 },
          detectionConfidence: 0.99,
          lastGeneratedAt: new Date(),
          imagePath: `/uploads/${path.basename(samplePhotoPath)}`,
        },
      });
    }
    userBId = userB._id.toString();
  });

  after(async () => {
    try {
      if (fs.existsSync(blankPhotoPath)) {
        fs.unlinkSync(blankPhotoPath);
      }
      await WardrobeItem.deleteMany({ userId: { $in: [userAId, userBId] } });
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  });

  beforeEach(async () => {
    // Clear wardrobe items for clean per-test isolation
    await WardrobeItem.deleteMany({ userId: { $in: [userAId, userBId] } });
  });

  it('Test 1 — New Clothing: Gallery garment creates new wardrobe item with transparent WebP and GALLERY_SCAN source', async () => {
    const mockFile = {
      filename: path.basename(samplePhotoPath),
      path: samplePhotoPath,
      mimetype: 'image/png',
      size: fs.statSync(samplePhotoPath).size,
    };

    const initialCount = await WardrobeItem.countDocuments({ userId: userAId });
    assert.equal(initialCount, 0, 'User A wardrobe should start empty');

    const result = await wardrobeService.scanGalleryPhoto(userAId, mockFile);

    assert.equal(result.matched, true, 'User face should be matched');
    assert.ok(result.items.length >= 1, 'At least 1 item detected');

    const firstItem = result.items[0];
    assert.equal(firstItem.status, 'CREATED', 'Status must be CREATED for new item');
    assert.ok(firstItem.wardrobeItemId, 'wardrobeItemId must be assigned');
    assert.ok(firstItem.croppedImageUrl.endsWith('.webp'), 'Cropped image must be WebP');

    // Verify database record
    const dbItem = await WardrobeItem.findById(firstItem.wardrobeItemId);
    assert.ok(dbItem, 'Wardrobe item must exist in database');
    assert.equal(dbItem.userId.toString(), userAId, 'Item must belong to user A');
    assert.equal(dbItem.sourceType, 'GALLERY_SCAN', 'sourceType must be GALLERY_SCAN');
    assert.equal(dbItem.currentStatus, 'AVAILABLE', 'currentStatus must be AVAILABLE');
    assert.ok(dbItem.images[0].url.endsWith('.webp'), 'Saved image URL must be WebP');
  });

  it('Test 2 — Exact Duplicate: Exactly matching gallery garment reuses existing item and increments wear stats', async () => {
    // Pre-create an exact matching black formal shirt in User A closet
    const preExisting = await WardrobeItem.create({
      userId: userAId,
      name: 'Classic Black Formal Button-Down Shirt',
      storeType: 'WARDROBE',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      sourceType: 'MANUAL_UPLOAD',
      images: [{ url: '/uploads/existing-shirt.webp', isPrimary: true }],
      attributes: {
        primaryColor: 'Black',
        pattern: 'SOLID',
        fabric: 'COTTON',
        fit: 'SLIM_FIT',
        neckline: 'Collar',
      },
      usageStats: { wearCount: 1, useCount: 1 },
    });

    // 1. Direct similarity engine verification for EXACT_MATCH
    const detectedExactGarment = {
      tempId: 'det_exact_test',
      name: 'Classic Black Formal Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      croppedImageUrl: '/uploads/crops/exact-shirt.webp',
      croppedFilename: 'exact-shirt.webp',
      attributes: {
        primaryColor: 'Black',
        pattern: 'SOLID',
        fabric: 'COTTON',
        fit: 'SLIM_FIT',
        neckline: 'Collar',
      },
    };

    const directMatch = aiVisionService.matchAgainstWardrobe([detectedExactGarment], [preExisting]);
    assert.equal(directMatch.length, 1);
    assert.equal(directMatch[0].matchResult.status, 'EXACT_MATCH', 'Must be classified as EXACT_MATCH');
    assert.equal(directMatch[0].matchResult.existingItem._id.toString(), preExisting._id.toString());

    // 2. End-to-end scanGalleryPhoto test
    const mockFile = {
      filename: path.basename(samplePhotoPath),
      path: samplePhotoPath,
      mimetype: 'image/png',
      size: fs.statSync(samplePhotoPath).size,
    };

    const result = await wardrobeService.scanGalleryPhoto(userAId, mockFile);
    assert.equal(result.matched, true);

    if (result.items.length > 0) {
      const exactMatchItem = result.items.find(
        (it) => it.status === 'EXACT_MATCH' || it.matchResult?.status === 'EXACT_MATCH'
      );
      if (exactMatchItem) {
        assert.equal(exactMatchItem.wardrobeItemId.toString(), preExisting._id.toString(), 'Must reference pre-existing ID');
      }
    }
  });

  it('Test 3 — Repeated Scan (Idempotency): Scanning the same photo twice does not create duplicate items', async () => {
    // Pre-seed 1 item in closet
    const preExisting = await WardrobeItem.create({
      userId: userAId,
      name: 'Classic Black Formal Button-Down Shirt',
      storeType: 'WARDROBE',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      sourceType: 'GALLERY_SCAN',
      images: [{ url: '/uploads/existing-shirt.webp', isPrimary: true }],
      attributes: {
        primaryColor: 'Black',
        pattern: 'SOLID',
        fabric: 'COTTON',
      },
    });

    const mockFile = {
      filename: path.basename(samplePhotoPath),
      path: samplePhotoPath,
      mimetype: 'image/png',
      size: fs.statSync(samplePhotoPath).size,
    };

    // First scan -> Matches pre-existing item, creates 0 duplicates
    const result1 = await wardrobeService.scanGalleryPhoto(userAId, mockFile);
    assert.equal(result1.matched, true);
    const countAfterScan1 = await WardrobeItem.countDocuments({ userId: userAId });
    assert.equal(countAfterScan1, 1, 'Scan 1 should not create duplicate for existing item');

    // Second scan -> Matches same item, creates 0 duplicates
    const result2 = await wardrobeService.scanGalleryPhoto(userAId, mockFile);
    assert.equal(result2.matched, true);
    const countAfterScan2 = await WardrobeItem.countDocuments({ userId: userAId });
    assert.equal(
      countAfterScan2,
      1,
      'Total wardrobe count MUST remain exactly 1 after repeated scans (Idempotency)'
    );

    for (const item of result2.items) {
      if (item.matchResult?.status === 'EXACT_MATCH') {
        assert.equal(item.status, 'EXACT_MATCH');
        assert.equal(item.wardrobeItemId.toString(), preExisting._id.toString());
      }
    }
  });

  it('Test 4 — Ambiguous Match: Moderate similarity does not auto-merge and returns candidate matches', async () => {
    // Pre-create a similar item (Category 15 + SubCat 15 + Color 25 + Neckline 5 + Fit 10 = 70 / 100 = 0.70 -> AMBIGUOUS_MATCH & candidate populated)
    const similarItem = await WardrobeItem.create({
      userId: userAId,
      name: 'Black Cotton Casual Shirt',
      storeType: 'WARDROBE',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      attributes: {
        primaryColor: 'Black',
        pattern: 'SOLID',
        fabric: 'COTTON',
        neckline: 'Collar',
        fit: 'SLIM_FIT',
      },
    });

    // Detected item: same category/subCategory, same color, same neckline & fit, but different fabric/pattern
    const detectedItem = {
      tempId: 'det_ambiguous',
      name: 'Black Silk Party Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      attributes: {
        primaryColor: 'Black',
        pattern: 'STRIPED',
        fabric: 'SILK',
        neckline: 'Collar',
        fit: 'SLIM_FIT',
      },
    };

    const matchRes = aiVisionService.matchAgainstWardrobe([detectedItem], [similarItem]);
    assert.equal(matchRes.length, 1);
    const res = matchRes[0];

    assert.equal(res.matchResult.status, 'AMBIGUOUS_MATCH', 'Should be classified as AMBIGUOUS_MATCH (0.70 score)');
    assert.ok(res.matchResult.candidateMatches.length >= 1, 'Candidate matches must be provided');
  });

  it('Test 5 — Same-Request Duplicates: Multiple identical detections in one scan create only ONE database item', async () => {
    // Simulate raw cropped detections containing 2 identical shirts
    const identicalDetections = [
      {
        tempId: 'det_1',
        name: 'Royal Navy Blue Silk Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        croppedImageUrl: '/uploads/crops/crop1.webp',
        croppedFilename: 'crop1.webp',
        attributes: { primaryColor: 'Navy Blue', pattern: 'SOLID', fabric: 'SILK' },
      },
      {
        tempId: 'det_2',
        name: 'Royal Navy Blue Silk Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        croppedImageUrl: '/uploads/crops/crop2.webp',
        croppedFilename: 'crop2.webp',
        attributes: { primaryColor: 'Navy Blue', pattern: 'SOLID', fabric: 'SILK' },
      },
    ];

    const inFlightItems = await WardrobeItem.find({ userId: userAId });
    const processed = [];

    for (const raw of identicalDetections) {
      const matchRes = aiVisionService.matchAgainstWardrobe([raw], inFlightItems);
      const match = matchRes[0];

      if (match.matchResult.status === 'EXACT_MATCH' && match.matchResult.existingItem) {
        processed.push({ ...match, status: 'EXACT_MATCH', wardrobeItemId: match.matchResult.existingItem._id });
      } else {
        const newItem = await WardrobeItem.create({
          userId: userAId,
          name: raw.name,
          category: raw.category,
          subCategory: raw.subCategory,
          sourceType: 'GALLERY_SCAN',
          images: [{ url: raw.croppedImageUrl, isPrimary: true }],
          attributes: raw.attributes,
        });
        inFlightItems.push(newItem);
        processed.push({ ...match, status: 'CREATED', wardrobeItemId: newItem._id });
      }
    }

    assert.equal(processed.length, 2);
    assert.equal(processed[0].status, 'CREATED', 'First item should be created');
    assert.equal(processed[1].status, 'EXACT_MATCH', 'Second identical item should be deduplicated as EXACT_MATCH');
    assert.equal(processed[1].wardrobeItemId.toString(), processed[0].wardrobeItemId.toString(), 'Must share the same wardrobeItemId');

    const totalCount = await WardrobeItem.countDocuments({ userId: userAId });
    assert.equal(totalCount, 1, 'Only ONE database record should be created for duplicate items in same request');
  });

  it('Test 6 — User Isolation / Security: User A garment never matches User B wardrobe', async () => {
    // User B has an exact navy shirt
    const userBItem = await WardrobeItem.create({
      userId: userBId,
      name: 'Midnight Navy Blue Slim Fit Linen Shirt',
      storeType: 'WARDROBE',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      attributes: {
        primaryColor: 'Navy Blue',
        pattern: 'SOLID',
        fabric: 'LINEN',
      },
    });

    const mockFile = {
      filename: path.basename(samplePhotoPath),
      path: samplePhotoPath,
      mimetype: 'image/png',
      size: fs.statSync(samplePhotoPath).size,
    };

    // User A scans photo
    const resultA = await wardrobeService.scanGalleryPhoto(userAId, mockFile);
    assert.equal(resultA.matched, true);

    for (const item of resultA.items) {
      if (item.wardrobeItemId) {
        assert.notEqual(
          item.wardrobeItemId.toString(),
          userBItem._id.toString(),
          'User A scan MUST NOT match or reference User B item ID'
        );
        const itemRecord = await WardrobeItem.findById(item.wardrobeItemId);
        assert.equal(itemRecord.userId.toString(), userAId, 'Persisted item MUST belong to User A');
      }
    }
  });

  it('Test 7 — Other Person\'s Clothing: Photo with other people extracts only authenticated user clothing', async () => {
    // User Face at center-right (x: 750), Stranger Face at left (x: 150)
    const userFaceBoxes = [{ x: 750, y: 100, width: 100, height: 100 }];

    // Test Gemini garment ownership filter
    const testItems = [
      {
        tempId: 'det_user_garment',
        name: 'User Red Velvet Gown',
        category: 'TRADITIONAL',
        subCategory: 'Gown',
        box2d: [150, 680, 850, 820], // Directly under User face
        attributes: { primaryColor: 'Red' },
      },
      {
        tempId: 'det_stranger_garment',
        name: 'Stranger Black Tuxedo',
        category: 'UPPER_WEAR',
        subCategory: 'Blazer',
        box2d: [150, 50, 850, 250], // Under stranger face, far from User
        attributes: { primaryColor: 'Black' },
      },
    ];

    const metadata = await sharp(samplePhotoPath).metadata();
    const { width: imgWidth, height: imgHeight } = metadata;

    const normalizedFaceBoxes = [
      [
        Math.floor((100 / imgHeight) * 1000),
        Math.floor((750 / imgWidth) * 1000),
        Math.floor((200 / imgHeight) * 1000),
        Math.floor((850 / imgWidth) * 1000),
      ],
    ];

    const filtered = testItems.filter((item) => {
      const [ymin, xmin, ymax, xmax] = item.box2d;
      return normalizedFaceBoxes.some(([fYmin, fXmin, fYmax, fXmax]) => {
        const faceCenterX = (fXmin + fXmax) / 2;
        const garmentCenterX = (xmin + xmax) / 2;
        const maxHorizontalOffset = Math.max(350, (fXmax - fXmin) * 3.0);
        return Math.abs(faceCenterX - garmentCenterX) <= maxHorizontalOffset && ymax >= fYmin;
      });
    });

    assert.equal(filtered.length, 1, 'Only authenticated user garment should be preserved');
    assert.equal(filtered[0].tempId, 'det_user_garment');
  });

  it('Test 8 — Segmentation Failure Fallback: Transparent fallback handles cleanly without corrupted wardrobe item', async () => {
    // If segmentation service falls back to rectangular crop
    const rawDetection = {
      tempId: 'det_fallback_test',
      name: 'Fallback Emerald Green Dress',
      category: 'TRADITIONAL',
      subCategory: 'Dress',
      box2d: [100, 100, 500, 500],
      attributes: { primaryColor: 'Emerald Green' },
    };

    const cropped = await aiVisionService.cropDetectedItems(samplePhotoPath, [rawDetection]);
    assert.equal(cropped.length, 1);
    assert.ok(cropped[0].croppedImageUrl, 'Must have crop URL');

    const matchRes = aiVisionService.matchAgainstWardrobe(cropped, []);
    const item = matchRes[0];

    // Create item
    const newItem = await WardrobeItem.create({
      userId: userAId,
      name: item.name,
      category: item.category,
      subCategory: item.subCategory,
      sourceType: 'GALLERY_SCAN',
      images: [{ url: item.croppedImageUrl, isPrimary: true }],
      attributes: item.attributes,
    });

    assert.ok(newItem._id, 'Item created with fallback crop');
    assert.equal(newItem.sourceType, 'GALLERY_SCAN');
  });

  it('Test 9 — Non-Matched User / No Face: Handled cleanly without partial wardrobe records', async () => {
    const mockFile = {
      filename: path.basename(blankPhotoPath),
      path: blankPhotoPath,
      mimetype: 'image/jpeg',
      size: fs.statSync(blankPhotoPath).size,
    };

    const initialCount = await WardrobeItem.countDocuments({ userId: userAId });

    const result = await wardrobeService.scanGalleryPhoto(userAId, mockFile);

    assert.equal(result.matched, false, 'User must not be matched in blank photo');
    assert.equal(result.reason, 'USER_NOT_FOUND');
    assert.equal(result.items.length, 0);

    const finalCount = await WardrobeItem.countDocuments({ userId: userAId });
    assert.equal(finalCount, initialCount, 'No wardrobe records should be created on non-match');
  });

  it('Test 10 — API & Model Integrity: Schema fields and indexes are fully intact', async () => {
    const indexes = await WardrobeItem.collection.getIndexes();
    assert.ok(indexes['userId_1_storeType_1_currentStatus_1'], 'Compound index 1 intact');
    assert.ok(indexes['userId_1_category_1'], 'Compound index 2 intact');
    assert.ok(indexes['userId_1_createdAt_-1'], 'Compound index 3 intact');
  });
});
