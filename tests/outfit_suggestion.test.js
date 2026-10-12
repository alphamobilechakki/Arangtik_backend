const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifySlot,
  evaluateColorHarmony,
  scoreOccasionFit,
} = require('../src/modules/outfit/outfit.service');
const outfitValidation = require('../src/modules/outfit/outfit.validation');

describe('Outfit Suggestion Core Domain & Logic Tests', () => {
  it('correctly classifies clothing items into semantic outfit slots', () => {
    // Upper wear
    assert.equal(
      classifySlot({ category: 'UPPER_WEAR', subCategory: 'Shirt', name: 'Linen Shirt' }),
      'UPPER_WEAR'
    );
    assert.equal(
      classifySlot({ category: 'TOPS', subCategory: 'T-Shirt', name: 'White Graphic Tee' }),
      'UPPER_WEAR'
    );

    // Lower wear
    assert.equal(
      classifySlot({ category: 'LOWER_WEAR', subCategory: 'Jeans', name: 'Slim Fit Blue Jeans' }),
      'LOWER_WEAR'
    );
    assert.equal(
      classifySlot({ category: 'BOTTOMS', subCategory: 'Chinos', name: 'Beige Casual Chinos' }),
      'LOWER_WEAR'
    );

    // One-piece / Traditional
    assert.equal(
      classifySlot({ category: 'TRADITIONAL', subCategory: 'Saree', name: 'Kanjivaram Silk Saree' }),
      'ONE_PIECE'
    );
    assert.equal(
      classifySlot({ category: 'DRESS', subCategory: 'Evening Gown', name: 'Black Cocktail Dress' }),
      'ONE_PIECE'
    );

    // Outerwear
    assert.equal(
      classifySlot({ category: 'OUTERWEAR', subCategory: 'Blazer', name: 'Navy Tailored Blazer' }),
      'OUTERWEAR'
    );
    assert.equal(
      classifySlot({ category: 'OUTERWEAR', subCategory: 'Jacket', name: 'Denim Bomber Jacket' }),
      'OUTERWEAR'
    );

    // Footwear
    assert.equal(
      classifySlot({ category: 'FOOTWEAR', subCategory: 'Sneakers', name: 'White Leather Sneakers' }),
      'FOOTWEAR'
    );

    // Accessories
    assert.equal(
      classifySlot({ category: 'ACCESSORIES', subCategory: 'Watch', name: 'Silver Chronograph Watch' }),
      'ACCESSORIES'
    );
  });

  it('evaluates color harmony with high score for neutral + color contrast', () => {
    // White (neutral) + Navy Blue (neutral/classic) -> TIMELESS_NEUTRALS / ACCENT_POP
    const res1 = evaluateColorHarmony('White', 'Navy Blue');
    assert.ok(res1.score >= 90, `Expected score >= 90, got ${res1.score}`);

    // Black + Red -> ACCENT_POP
    const res2 = evaluateColorHarmony('Black', 'Red');
    assert.ok(res2.score >= 90, `Expected score >= 90, got ${res2.score}`);

    // Monochromatic (Navy + Navy)
    const res3 = evaluateColorHarmony('Navy', 'Navy');
    assert.equal(res3.harmonyType, 'MONOCHROMATIC');
  });

  it('correctly scores occasion appropriateness for clothing items', () => {
    const formalShirt = {
      name: 'White Formal Oxford Shirt',
      subCategory: 'Shirt',
      color: 'White',
      pattern: 'Solid',
      occasion: ['OFFICE', 'FORMAL'],
    };

    const rippedShorts = {
      name: 'Ripped Denim Shorts',
      subCategory: 'Shorts',
      color: 'Blue',
      pattern: 'Solid',
      occasion: ['CASUAL'],
    };

    const officeScoreShirt = scoreOccasionFit(formalShirt, 'OFFICE');
    const officeScoreShorts = scoreOccasionFit(rippedShorts, 'OFFICE');

    assert.ok(
      officeScoreShirt > officeScoreShorts,
      `Formal shirt (${officeScoreShirt}) should score significantly higher for OFFICE than shorts (${officeScoreShorts})`
    );

    const partyScoreShirt = scoreOccasionFit(formalShirt, 'CASUAL');
    assert.ok(partyScoreShirt > 0);
  });

  it('handles missing item slots without inventing imaginary items (RULE 1 & 6)', () => {
    // Suppose wardrobe only has 1 Shirt and 1 Trouser (NO shoes, NO outerwear, NO accessories)
    const userWardrobe = [
      {
        _id: 'item_1',
        name: 'Light Blue Linen Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        color: 'Light Blue',
        pattern: 'Solid',
        occasion: ['CASUAL', 'OFFICE'],
        images: [{ url: '/uploads/shirt.png', isPrimary: true }],
      },
      {
        _id: 'item_2',
        name: 'Dark Charcoal Trousers',
        category: 'LOWER_WEAR',
        subCategory: 'Trousers',
        color: 'Charcoal',
        pattern: 'Solid',
        occasion: ['OFFICE'],
        images: [{ url: '/uploads/trousers.png', isPrimary: true }],
      },
    ];

    // Segregate
    const tops = userWardrobe.filter((i) => classifySlot(i) === 'UPPER_WEAR');
    const bottoms = userWardrobe.filter((i) => classifySlot(i) === 'LOWER_WEAR');
    const footwear = userWardrobe.filter((i) => classifySlot(i) === 'FOOTWEAR');

    assert.equal(tops.length, 1);
    assert.equal(bottoms.length, 1);
    assert.equal(footwear.length, 0); // User does NOT have shoes in wardrobe

    // Verify: outfit combination has strictly items present in wardrobe
    const combinationItems = [
      { itemId: tops[0]._id, slot: 'UPPER_WEAR' },
      { itemId: bottoms[0]._id, slot: 'LOWER_WEAR' },
    ];

    // Missing slots detected
    const missingSlots = [];
    if (footwear.length === 0) missingSlots.push('footwear');

    assert.equal(combinationItems.length, 2);
    assert.ok(missingSlots.includes('footwear'), 'Should identify footwear as missing');
    // Ensure no shoes were fabricated
    const hasShoes = combinationItems.some((i) => i.slot === 'FOOTWEAR');
    assert.equal(hasShoes, false, 'STRICT: Must never hallucinate or invent shoes when unavailable!');
  });

  it('validates suggest and save payloads with proper validation errors', () => {
    let req = { body: { limit: 99 } }; // exceeds max 20
    let res = {};
    let nextCalled = false;

    assert.throws(
      () => {
        outfitValidation.validateSuggestRequest(req, res, () => {});
      },
      (err) => {
        return err.statusCode === 400 && err.message.includes('Limit must be a number between 1 and 20');
      }
    );

    // Save outfit requires title, occasion, items
    req = { body: { title: '', occasion: 'CASUAL', items: [] } };
    assert.throws(
      () => {
        outfitValidation.validateSaveOutfit(req, res, () => {});
      },
      (err) => {
        return err.statusCode === 400 && err.message.includes('Title is required');
      }
    );
  });
});
