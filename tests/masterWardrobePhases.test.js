const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../src/config/env.config');
const attributeNormalizer = require('../src/utils/attributeNormalizer');
const telemetry = require('../src/utils/telemetry');
const WardrobeItem = require('../src/modules/wardrobe/wardrobe.model');
const WardrobeFeedback = require('../src/modules/wardrobe/wardrobeFeedback.model');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');

describe('Master Wardrobe AI: Phases 6–17 Unit & Regression Suite', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
  });

  after(async () => {
    // Keep connection active for parallel/subsequent test runs
  });

  beforeEach(async () => {
    await WardrobeItem.deleteMany({ name: { $regex: /Test/i } });
    await WardrobeFeedback.deleteMany({});
  });

  describe('Phase 12: Structured Telemetry & Observability', () => {
    it('should calculate accurate stage durations and format metrics without leaking sensitive data', () => {
      const logger = telemetry.createTraceLogger('scanGalleryPhoto', {
        userId: 'user_123',
        requestId: 'req_abc',
      });

      logger.start('geminiVision');
      logger.end('geminiVision', { model: 'gemini-3.6-flash' });

      logger.start('segmentation');
      logger.end('segmentation', { count: 2 });

      const summary = logger.summary({ success: true, itemsDetected: 2 });

      assert.strictEqual(summary.action, 'scanGalleryPhoto');
      assert.strictEqual(summary.userId, 'user_123');
      assert.strictEqual(summary.requestId, 'req_abc');
      assert.ok(summary.stages.geminiVision);
      assert.ok(summary.stages.segmentation);
      assert.strictEqual(summary.stages.geminiVision.meta.model, 'gemini-3.6-flash');
      assert.ok(summary.totalDurationMs >= 0);
      assert.strictEqual(summary.authorization, undefined);
    });
  });

  describe('Phase 14: AI Attribute Normalization & Canonical Vocabularies', () => {
    it('should normalize noisy categories, colors, patterns, and fabrics to canonical values', () => {
      const rawGarment = {
        category: 'T-Shirts & Tops',
        subCategory: 'crewneck tee',
        color: 'dark navy',
        pattern: 'floral print pattern',
        fabric: 'pure cotton denim',
        fit: 'oversized loose fit',
        neckline: 'round v neck',
        sleeves: 'short sleeve',
        season: 'Summer / Spring',
        occasion: 'Everyday Casual wear',
      };

      const normalized = attributeNormalizer.normalizeGarmentAttributes(rawGarment);

      assert.strictEqual(normalized.category, 'UPPER_WEAR');
      assert.strictEqual(normalized.subCategory, 'T-Shirt');
      assert.strictEqual(normalized.color, 'navy');
      assert.strictEqual(normalized.colorFamily, 'blue');
      assert.strictEqual(normalized.pattern, 'floral');
      assert.strictEqual(normalized.fabric, 'denim');
      assert.strictEqual(normalized.fit, 'loose');
      assert.strictEqual(normalized.occasion, 'casual');
    });

    it('should map unknown or rare variants safely to other/unspecified without breaking schema', () => {
      const rawGarment = {
        category: 'Exotic Space Suit',
        color: 'cosmic void',
      };

      const normalized = attributeNormalizer.normalizeGarmentAttributes(rawGarment);

      assert.strictEqual(normalized.category, 'OTHER');
      assert.strictEqual(normalized.color, 'cosmic void');
      assert.strictEqual(normalized.colorFamily, 'multi/other');
    });
  });

  describe('Phase 15: User Feedback Loop & Truth Separation', () => {
    it('should store user feedback corrections distinctly from raw AI predictions', async () => {
      const userId = new mongoose.Types.ObjectId();
      const itemId = new mongoose.Types.ObjectId();

      const feedbackData = {
        wardrobeItemId: itemId,
        feedbackType: 'INCORRECT_CATEGORY',
        originalPrediction: { category: 'OUTERWEAR', color: 'black' },
        userCorrection: { category: 'UPPER_WEAR', color: 'black' },
        notes: 'This is a fleece pullover top, not a heavy jacket.',
      };

      const savedFeedback = await wardrobeService.submitFeedback(userId, feedbackData);

      assert.ok(savedFeedback._id);
      assert.strictEqual(savedFeedback.userId.toString(), userId.toString());
      assert.strictEqual(savedFeedback.feedbackType, 'INCORRECT_CATEGORY');
      assert.strictEqual(savedFeedback.originalPrediction.category, 'OUTERWEAR');
      assert.strictEqual(savedFeedback.userCorrection.category, 'UPPER_WEAR');

      const queried = await WardrobeFeedback.findById(savedFeedback._id);
      assert.ok(queried);
      assert.strictEqual(queried.notes, 'This is a fleece pullover top, not a heavy jacket.');
    });
  });

  describe('Phase 8 & 9: Wardrobe Lifecycle & Duplicate Deduplication', () => {
    it('should separate gallery detection counts (useCount) from worn outfits (wearCount)', async () => {
      const userId = new mongoose.Types.ObjectId();

      const item = await WardrobeItem.create({
        userId,
        name: 'Test Classic White Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        sourceType: 'GALLERY_SCAN',
        usageStats: {
          wearCount: 0,
          useCount: 1,
          lastUsedDate: new Date(),
        },
      });

      assert.strictEqual(item.usageStats.useCount, 1);
      assert.strictEqual(item.usageStats.wearCount, 0);

      // Simulate wear logging with valid enum 'CASUAL'
      await wardrobeService.logWornDress(userId, {
        itemIds: [item._id],
        occasion: 'CASUAL',
        notes: 'Wore to dinner',
      });

      const updatedItem = await WardrobeItem.findById(item._id);
      assert.strictEqual(updatedItem.usageStats.wearCount, 1);
      assert.strictEqual(updatedItem.usageStats.useCount, 2);
      assert.ok(updatedItem.usageStats.lastWornDate);
    });
  });

  describe('Phase 13: Security & User Isolation', () => {
    it('should prevent User A from reading or modifying User B items', async () => {
      const userA = new mongoose.Types.ObjectId();
      const userB = new mongoose.Types.ObjectId();

      const itemB = await WardrobeItem.create({
        userId: userB,
        name: 'Test User B Silk Dress',
        category: 'TRADITIONAL',
        subCategory: 'Dress',
      });

      // User A attempts to view itemB
      await assert.rejects(
        async () => {
          await wardrobeService.getItemById(userA, itemB._id);
        },
        /not found/i
      );

      // User A attempts to update itemB
      await assert.rejects(
        async () => {
          await wardrobeService.updateItem(userA, itemB._id, { name: 'Test Hacked Item' });
        },
        /not found/i
      );

      // User A attempts to delete itemB
      await assert.rejects(
        async () => {
          await wardrobeService.deleteItem(userA, itemB._id, true);
        },
        /not found/i
      );

      const untouched = await WardrobeItem.findById(itemB._id);
      assert.strictEqual(untouched.name, 'Test User B Silk Dress');
    });
  });

  describe('Phase 16: Outfit Recommendation Foundation', () => {
    it('should generate structured outfit suggestions with available closet items', async () => {
      const userId = new mongoose.Types.ObjectId();

      await WardrobeItem.create([
        { userId, name: 'Test Navy Blazer', category: 'OUTERWEAR', subCategory: 'Blazer', currentStatus: 'AVAILABLE' },
        { userId, name: 'Test White Crewneck', category: 'UPPER_WEAR', subCategory: 'T-Shirt', currentStatus: 'AVAILABLE' },
        { userId, name: 'Test Charcoal Chinos', category: 'LOWER_WEAR', subCategory: 'Trousers', currentStatus: 'AVAILABLE' },
        { userId, name: 'Test Brown Derby Shoes', category: 'FOOTWEAR', subCategory: 'Shoes', currentStatus: 'AVAILABLE' },
      ]);

      const recommendation = await wardrobeService.suggestOutfit(userId, {
        occasion: 'FORMAL',
      });

      assert.ok(recommendation);
      assert.strictEqual(recommendation.totalAvailableItems, 4);
      assert.ok(Array.isArray(recommendation.outfitSuggestions));
      assert.ok(recommendation.outfitSuggestions.length > 0);
      assert.ok(recommendation.outfitSuggestions[0].items.length >= 1);
    });
  });
});
