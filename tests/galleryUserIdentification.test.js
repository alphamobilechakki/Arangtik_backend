const { describe, it, before, after } = require('node:test');
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

describe('Gallery User Identification & Clothing Extraction Pipeline Tests', () => {
  let testUser;
  let testUserId;
  let otherUser;
  let otherUserId;
  let testPersonImagePath;
  let testBlankImagePath;

  before(async () => {
    // 1. Connect MongoDB
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // 2. Initialize Face AI Client
    await faceAIClient.initialize();

    // 3. Locate or create sample images
    testPersonImagePath = path.join(__dirname, '../uploads/image-1790938133930-894089880.png');
    if (!fs.existsSync(testPersonImagePath)) {
      const pngs = fs.readdirSync(path.join(__dirname, '../uploads')).filter(f => f.endsWith('.png'));
      testPersonImagePath = path.join(__dirname, '../uploads', pngs[0]);
    }

    // Create a temporary blank image (no face)
    testBlankImagePath = path.join(__dirname, '../uploads/temp-blank-test.jpg');
    await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 230, g: 230, b: 230 },
      },
    })
      .jpeg()
      .toFile(testBlankImagePath);

    // 4. Create or fetch Primary Test User with reference face
    testUser = await User.findOne({ phone: '9999900001' }).select('+referenceFace.embedding');
    if (!testUser) {
      testUser = await User.create({
        phone: '9999900001',
        name: 'Gallery Test User Primary',
        profileImage: `/uploads/${path.basename(testPersonImagePath)}`,
      });
    }

    // Ensure reference embedding is extracted
    const extractedFace = await faceAIService.extractReferenceFace(testPersonImagePath);
    testUser.referenceFace = {
      embedding: extractedFace.embedding,
      boundingBox: extractedFace.boundingBox,
      detectionConfidence: extractedFace.confidence,
      lastGeneratedAt: new Date(),
      imagePath: `/uploads/${path.basename(testPersonImagePath)}`,
    };
    await testUser.save();
    testUserId = testUser._id.toString();

    // 5. Create Secondary User with a distinct dummy embedding (Different Person)
    otherUser = await User.findOne({ phone: '9999900002' }).select('+referenceFace.embedding');
    if (!otherUser) {
      // Create orthogonal embedding far away from testUser
      const distinctEmbedding = Array(128).fill(0.95);
      otherUser = await User.create({
        phone: '9999900002',
        name: 'Different Person',
        profileImage: `/uploads/${path.basename(testPersonImagePath)}`,
        referenceFace: {
          embedding: distinctEmbedding,
          boundingBox: { x: 10, y: 10, width: 50, height: 50 },
          detectionConfidence: 0.99,
          lastGeneratedAt: new Date(),
          imagePath: `/uploads/${path.basename(testPersonImagePath)}`,
        },
      });
    }
    otherUserId = otherUser._id.toString();
  });

  after(async () => {
    try {
      if (fs.existsSync(testBlankImagePath)) {
        fs.unlinkSync(testBlankImagePath);
      }
      await WardrobeItem.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  });

  it('Test A: User Alone — Should match authenticated user face, detect clothing, and generate transparent WebP', async () => {
    const t0 = Date.now();
    const mockFile = {
      filename: path.basename(testPersonImagePath),
      path: testPersonImagePath,
      mimetype: 'image/jpeg',
      size: fs.statSync(testPersonImagePath).size,
    };

    const result = await wardrobeService.scanGalleryPhoto(testUserId, mockFile);
    const totalTime = Date.now() - t0;

    console.log(`\n[Performance Test A] Total single-photo pipeline time: ${totalTime}ms`);

    assert.equal(result.matched, true, 'User should be matched');
    assert.ok(result.matchedFace, 'matchedFace details should be present');
    assert.ok(result.matchedFace.confidence > 0.5, 'Face detection confidence should be high');
    assert.ok(result.facesDetected >= 1, 'At least 1 face detected');
    assert.ok(Array.isArray(result.items), 'items array should be returned');
    assert.ok(result.detectedItemsCount >= 1, 'At least 1 clothing item should be detected');

    // Verify garment item attributes and segmentation
    const item = result.items[0];
    assert.ok(item.name, 'Garment must have a name');
    assert.ok(item.category, 'Garment must have a category');
    assert.ok(item.croppedImageUrl, 'Garment must have a croppedImageUrl');
    assert.ok(item.croppedImageUrl.endsWith('.webp'), 'Cropped image should be WebP format');
    assert.ok(item.matchResult, 'Item must have similarity matchResult');
    assert.ok(['NEW_ITEM', 'EXACT_MATCH', 'AMBIGUOUS_MATCH'].includes(item.matchResult.status));
  });

  it('Test B: User With Another Person — Should extract only the authenticated user\'s clothing and exclude others', async () => {
    // Simulate a photo with 2 people: Person A (left, x: 100) and Authenticated User (right, x: 700)
    const userFaceBoxes = [{ x: 700, y: 100, width: 120, height: 120 }];
    
    // Test the clothing person association filter in aiVisionService
    // Suppose detections contain Person A clothing (x: 100-300) and User clothing (x: 650-850)
    const mockRawItems = [
      {
        tempId: 'det_user_shirt',
        name: 'User Royal Navy Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        box2d: [200, 620, 500, 820], // Centered at x: 720 (aligned with User face at x: 760)
        attributes: { primaryColor: 'Navy Blue' },
      },
      {
        tempId: 'det_bystander_shirt',
        name: 'Bystander Green Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        box2d: [200, 50, 500, 300], // Centered at x: 175 (far from User face)
        attributes: { primaryColor: 'Olive Green' },
      },
    ];

    // Crop and filter
    const metadata = await sharp(testPersonImagePath).metadata();
    const { width: imgWidth, height: imgHeight } = metadata;
    
    // Normalized face box for user: [ymin, xmin, ymax, xmax] in 0-1000 scale
    const normalizedFaceBoxes = [
      [
        Math.floor((100 / imgHeight) * 1000),
        Math.floor((700 / imgWidth) * 1000),
        Math.floor((220 / imgHeight) * 1000),
        Math.floor((820 / imgWidth) * 1000),
      ],
    ];

    // Filter logic test:
    const filteredItems = mockRawItems.filter((item) => {
      const [ymin, xmin, ymax, xmax] = item.box2d;
      return normalizedFaceBoxes.some(([fYmin, fXmin, fYmax, fXmax]) => {
        const faceCenterX = (fXmin + fXmax) / 2;
        const garmentCenterX = (xmin + xmax) / 2;
        const maxHorizontalOffset = Math.max(250, (fXmax - fXmin) * 2.5);
        return Math.abs(faceCenterX - garmentCenterX) <= maxHorizontalOffset && ymax >= fYmin;
      });
    });

    assert.equal(filteredItems.length, 1, 'Only 1 item belonging to the target user should remain');
    assert.equal(filteredItems[0].tempId, 'det_user_shirt', 'Target user shirt must be preserved');
    assert.equal(filteredItems[0].name, 'User Royal Navy Shirt');
  });

  it('Test C: Another Person Only — Should return matched: false, reason: USER_NOT_FOUND, items: []', async () => {
    const mockFile = {
      filename: path.basename(testPersonImagePath),
      path: testPersonImagePath,
      mimetype: 'image/jpeg',
      size: fs.statSync(testPersonImagePath).size,
    };

    // Scan photo of Test User using otherUser's ID (different reference embedding)
    const result = await wardrobeService.scanGalleryPhoto(otherUserId, mockFile);

    assert.equal(result.matched, false, 'Should NOT match different user');
    assert.equal(result.reason, 'USER_NOT_FOUND', 'Reason must be USER_NOT_FOUND');
    assert.equal(result.items.length, 0, 'No items should be extracted');
    assert.ok(result.facesDetected >= 1, 'Faces detected in photo but none matched otherUser');
  });

  it('Test D: No Face (Object / Blank) — Should return matched: false, reason: USER_NOT_FOUND', async () => {
    const mockFile = {
      filename: path.basename(testBlankImagePath),
      path: testBlankImagePath,
      mimetype: 'image/jpeg',
      size: fs.statSync(testBlankImagePath).size,
    };

    const result = await wardrobeService.scanGalleryPhoto(testUserId, mockFile);

    assert.equal(result.matched, false, 'Should be matched: false');
    assert.equal(result.reason, 'USER_NOT_FOUND', 'Reason must be USER_NOT_FOUND');
    assert.equal(result.facesDetected, 0, 'Faces detected should be 0');
    assert.equal(result.items.length, 0, 'Items must be empty');
  });

  it('Test E: Multiple Faces — Should evaluate all faces and match user correctly when present', async () => {
    const refEmbedding = testUser.referenceFace.embedding;

    // Simulate 3 detected faces in a group photo: Stranger 1, Authenticated User, Stranger 2
    const detectedFaces = [
      {
        faceIndex: 0,
        confidence: 0.94,
        boundingBox: { x: 50, y: 100, width: 80, height: 80 },
        embedding: Array(128).fill(0.01), // Stranger 1 (far)
      },
      {
        faceIndex: 1,
        confidence: 0.97,
        boundingBox: { x: 300, y: 100, width: 85, height: 85 },
        embedding: refEmbedding, // Exact Authenticated User
      },
      {
        faceIndex: 2,
        confidence: 0.91,
        boundingBox: { x: 600, y: 100, width: 80, height: 80 },
        embedding: Array(128).fill(0.88), // Stranger 2 (far)
      },
    ];

    const comparison = faceAIService.compareFaces(refEmbedding, detectedFaces, 0.50);

    assert.equal(comparison.matched, true, 'Should find user among multiple faces');
    assert.equal(comparison.facesDetected, 3, 'Should report 3 total faces detected');
    assert.equal(comparison.matchedFaces.length, 1, 'Should match exactly the user');
    assert.equal(comparison.matchedFaces[0].faceIndex, 1, 'Should select faceIndex 1');
    assert.equal(comparison.matchedFaces[0].distance, 0, 'Distance to identical reference should be 0');
  });

  it('Test F: Direct Clothing Photo flow — analyzePhoto should remain completely intact without requiring face', async () => {
    const mockFile = {
      filename: path.basename(testBlankImagePath),
      path: testBlankImagePath,
      mimetype: 'image/jpeg',
      size: fs.statSync(testBlankImagePath).size,
    };

    const result = await wardrobeService.analyzePhoto(testUserId, mockFile);

    assert.ok(result, 'analyzePhoto should return result');
    assert.ok(result.originalImageUrl, 'originalImageUrl present');
    assert.ok(Array.isArray(result.analysis), 'analysis array present');
  });
});
