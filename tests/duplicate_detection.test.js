const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const aiVisionService = require('../src/modules/clothAnalysis/aiVision.service');

describe('Dress Duplicate & Ambiguity Detection Engine', () => {
  const existingWardrobeItems = [
    {
      _id: 'item_101',
      name: 'Navy Blue Linen Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      color: 'Navy Blue',
      fabric: 'Linen',
      pattern: 'Solid',
      fit: 'Slim Fit',
      neckline: 'Collar',
      currentStatus: 'CLEAN',
      usageStats: { wearCount: 4, lastWornDate: '2026-10-01' },
      images: [{ url: '/uploads/navy_shirt.png', isPrimary: true }],
      attributes: {
        primaryColor: 'Navy Blue',
        fabric: 'Linen',
        pattern: 'Solid',
      },
    },
    {
      _id: 'item_102',
      name: 'Black Regular Denim Jeans',
      category: 'LOWER_WEAR',
      subCategory: 'Jeans',
      color: 'Black',
      fabric: 'Denim',
      pattern: 'Solid',
      fit: 'Regular Fit',
      currentStatus: 'CLEAN',
      usageStats: { wearCount: 12, lastWornDate: '2026-10-08' },
      images: [{ url: '/uploads/black_jeans.png', isPrimary: true }],
      attributes: {
        primaryColor: 'Black',
        fabric: 'Denim',
        pattern: 'Solid',
      },
    },
  ];

  it('correctly detects an EXACT_MATCH duplicate and populates matched item details', () => {
    // Exact duplicate dress detected in new photo
    const detectedItem = {
      tempId: 'det_dup_1',
      name: 'Navy Blue Linen Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      croppedImageUrl: '/uploads/crops/crop_navy_shirt.png',
      attributes: {
        primaryColor: 'Navy Blue',
        fabric: 'Linen',
        pattern: 'Solid',
        fit: 'Slim Fit',
        neckline: 'Collar',
      },
    };

    const matches = aiVisionService.matchAgainstWardrobe([detectedItem], existingWardrobeItems);
    assert.equal(matches.length, 1);

    const match = matches[0];
    assert.equal(match.matchResult.status, 'EXACT_MATCH');
    assert.equal(match.matchType, 'EXISTING_ITEM');
    assert.ok(match.matchResult.confidenceScore >= 0.72);
    assert.ok(match.matchedItem);
    assert.equal(match.matchedItem._id, 'item_101');
    assert.equal(match.matchedItem.name, 'Navy Blue Linen Shirt');
    assert.equal(match.matchedItem.color, 'Navy Blue');
    assert.equal(match.matchedItem.fabric, 'Linen');
  });

  it('correctly detects an AMBIGUOUS_MATCH when dress is similar but model requires user confirmation', () => {
    // Same category and color family, but different sub-category / fabric
    const similarItem = {
      tempId: 'det_amb_1',
      name: 'Dark Blue Casual T-Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'T-Shirt',
      croppedImageUrl: '/uploads/crops/crop_blue_tshirt.png',
      attributes: {
        primaryColor: 'Dark Blue', // In same color family as Navy Blue
        fabric: 'Cotton',          // Different fabric
        pattern: 'Solid',
      },
    };

    const matches = aiVisionService.matchAgainstWardrobe([similarItem], existingWardrobeItems);
    assert.equal(matches.length, 1);

    const match = matches[0];
    assert.equal(match.matchResult.status, 'AMBIGUOUS_MATCH');
    assert.equal(match.matchType, 'POTENTIAL_DUPLICATE');
    assert.ok(match.matchResult.confidenceScore >= 0.52);
    assert.ok(match.matchResult.confidenceScore < 0.72);
    assert.ok(match.matchedItem);
    assert.equal(match.matchedItem._id, 'item_101');
    assert.ok(match.matchResult.message.includes('similar item'));
  });

  it('correctly marks a distinct dress as NEW_ITEM when no matches exist', () => {
    // Unique dress
    const uniqueItem = {
      tempId: 'det_uniq_1',
      name: 'Yellow Silk Saree',
      category: 'TRADITIONAL',
      subCategory: 'Saree',
      croppedImageUrl: '/uploads/crops/crop_yellow_saree.png',
      attributes: {
        primaryColor: 'Yellow',
        fabric: 'Silk',
        pattern: 'Floral',
      },
    };

    const matches = aiVisionService.matchAgainstWardrobe([uniqueItem], existingWardrobeItems);
    assert.equal(matches.length, 1);

    const match = matches[0];
    assert.equal(match.matchResult.status, 'NEW_ITEM');
    assert.equal(match.matchType, 'NEW_ITEM');
    assert.ok(match.matchResult.confidenceScore < 0.52);
    assert.equal(match.matchedItem, null);
  });

  it('correctly detects an EXACT_MATCH for sparse items (without optional fabric/fit/neckline attributes)', () => {
    // Real-world scan with minimal attributes: Category, SubCategory, Color, Pattern
    const sparseDetectedItem = {
      tempId: 'det_sparse_1',
      name: 'Navy Blue Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      croppedImageUrl: '/uploads/crops/crop_navy_shirt_minimal.png',
      attributes: {
        primaryColor: 'Navy Blue',
        pattern: 'Solid',
      },
    };

    const matches = aiVisionService.matchAgainstWardrobe([sparseDetectedItem], existingWardrobeItems);
    assert.equal(matches.length, 1);

    const match = matches[0];
    assert.equal(match.matchResult.status, 'EXACT_MATCH');
    assert.ok(match.matchResult.confidenceScore >= 0.72);
    assert.ok(match.matchedItem);
    assert.equal(match.matchedItem._id, 'item_101');
  });

  it('correctly avoids duplicate match when colors are distinct (Red Shirt vs Navy Blue Shirt)', () => {
    // Red Shirt should NEVER match a Navy Blue Shirt
    const redShirt = {
      tempId: 'det_red_1',
      name: 'Crimson Red Shirt',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      croppedImageUrl: '/uploads/crops/crop_red_shirt.png',
      attributes: {
        primaryColor: 'Red',
        pattern: 'Solid',
      },
    };

    const matches = aiVisionService.matchAgainstWardrobe([redShirt], existingWardrobeItems);
    assert.equal(matches.length, 1);

    const match = matches[0];
    assert.equal(match.matchResult.status, 'NEW_ITEM');
    assert.ok(match.matchResult.confidenceScore < 0.52);
    assert.equal(match.matchedItem, null);
  });

  it('calculates perceptual dHash and high similarity for matching visual gradients', () => {
    const hashA = '0000000000000000';
    const hashB = '0000000000000000';
    const simExact = aiVisionService.calculateHashSimilarity(hashA, hashB);
    assert.equal(simExact, 1.0);

    // 1-bit difference
    const hashC = '0000000000000001';
    const simNear = aiVisionService.calculateHashSimilarity(hashA, hashC);
    assert.ok(simNear >= 0.98);
  });
});
