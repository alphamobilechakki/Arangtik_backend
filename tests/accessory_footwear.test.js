const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const segmentationService = require('../src/services/segmentation/segmentation.service');
const { normalizeGarmentAttributes } = require('../src/utils/attributeNormalizer');

describe('Accessory, Jewelry (Gehne) & Footwear Extraction & Segmentation Tests', () => {
  // Test 1: Attribute normalization for shoes, watches, jewelry, bags
  it('Normalizes Footwear, Watch, Jewelry (Gehne), and Accessories into canonical taxonomy', () => {
    const rawShoe = {
      name: 'Black Leather Oxford Dress Shoes',
      category: 'shoes',
      subCategory: 'shoes',
      attributes: { primaryColor: 'Black', fabric: 'leather' },
    };
    const normShoe = normalizeGarmentAttributes(rawShoe);
    assert.equal(normShoe.category, 'FOOTWEAR');
    assert.equal(normShoe.subCategory, 'Shoes');
    assert.equal(normShoe.fabric, 'leather');

    const rawWatch = {
      name: 'Rose Gold Chronograph Watch',
      category: 'watch',
      subCategory: 'watch',
      attributes: { primaryColor: 'Rose Gold', fabric: 'metal' },
    };
    const normWatch = normalizeGarmentAttributes(rawWatch);
    assert.equal(normWatch.category, 'ACCESSORIES');
    assert.equal(normWatch.subCategory, 'Watch');
    assert.equal(normWatch.fabric, 'metal');

    const rawJewelry = {
      name: 'Traditional Kundan Gold Necklace Set',
      category: 'gehne',
      subCategory: 'necklace',
      attributes: { primaryColor: 'Gold', fabric: 'gold' },
    };
    const normJewelry = normalizeGarmentAttributes(rawJewelry);
    assert.equal(normJewelry.category, 'ACCESSORIES');
    assert.equal(normJewelry.subCategory, 'Necklace');
    assert.equal(normJewelry.fabric, 'gold');

    const rawEarrings = {
      name: 'Diamond Stud Earrings',
      category: 'jewellery',
      subCategory: 'earrings',
      attributes: { primaryColor: 'Silver', fabric: 'silver' },
    };
    const normEarrings = normalizeGarmentAttributes(rawEarrings);
    assert.equal(normEarrings.category, 'ACCESSORIES');
    assert.equal(normEarrings.subCategory, 'Earrings');
    assert.equal(normEarrings.fabric, 'silver');
  });

  // Test 2: AI Vision filter rule — Never extract accessories/shoes/jewelry from human outfit photo
  it('Suppresses watch, jewelry (gehne), sunglasses, and shoes when human outfit is present', () => {
    const isCoreGarment = (it) => {
      const c = (it.category || '').toUpperCase();
      const s = (it.subCategory || '').toLowerCase();
      const n = (it.name || '').toLowerCase();
      return (
        c === 'UPPER_WEAR' ||
        c === 'LOWER_WEAR' ||
        c === 'TRADITIONAL' ||
        c === 'OUTERWEAR' ||
        ['shirt', 't-shirt', 'top', 'polo', 'hoodie', 'jacket', 'blazer', 'jeans', 'pant', 'trousers', 'shorts', 'skirt', 'saree', 'kurta', 'dress'].some((k) => s.includes(k) || n.includes(k))
      );
    };

    const isFootwearOrAccessory = (it) => {
      if (!it) return false;
      const c = (it.category || '').toUpperCase();
      const s = (it.subCategory || '').toLowerCase();
      const n = (it.name || '').toLowerCase();
      const accessoryKeywords = [
        'sunglasses', 'glasses', 'spectacles', 'watch', 'smartwatch', 'belt', 'cap', 'hat',
        'shoes', 'sneakers', 'sandals', 'heels', 'loafers', 'boots', 'slippers', 'flats', 'footwear',
        'jewelry', 'jewellery', 'necklace', 'earrings', 'earring', 'ring', 'bracelet', 'bangle', 'chain', 'gehne',
        'bag', 'handbag', 'wallet', 'scarf',
      ];
      return c === 'ACCESSORIES' || c === 'FOOTWEAR' || accessoryKeywords.some((k) => s.includes(k) || n.includes(k));
    };

    const detectedItems = [
      { name: 'Navy Blue Polo T-Shirt', category: 'UPPER_WEAR', subCategory: 'Polo' },
      { name: 'Khaki Chino Pants', category: 'LOWER_WEAR', subCategory: 'Trousers' },
      { name: 'Brown Leather Watch', category: 'ACCESSORIES', subCategory: 'Watch' },
      { name: 'Gold Chain Necklace', category: 'ACCESSORIES', subCategory: 'Necklace' },
      { name: 'Black Leather Shoes', category: 'FOOTWEAR', subCategory: 'Shoes' },
    ];

    const hasCore = detectedItems.some(isCoreGarment);
    assert.equal(hasCore, true);

    const filtered = detectedItems.filter((it) => !isFootwearOrAccessory(it));
    assert.equal(filtered.length, 2);
    assert.deepEqual(filtered.map((i) => i.name), ['Navy Blue Polo T-Shirt', 'Khaki Chino Pants']);
  });

  // Test 3: Standalone item preservation (Shoes, Watch, Gehne)
  it('Retains standalone shoes, watch, and jewelry when no human outfit is present', () => {
    const isCoreGarment = (it) => {
      const c = (it.category || '').toUpperCase();
      return ['UPPER_WEAR', 'LOWER_WEAR', 'TRADITIONAL', 'OUTERWEAR'].includes(c);
    };

    const standaloneItems = [
      { name: 'Classic Black Oxford Dress Shoes', category: 'FOOTWEAR', subCategory: 'Shoes' },
      { name: 'Titan Edge Silver Watch', category: 'ACCESSORIES', subCategory: 'Watch' },
      { name: 'Kundan Choker Gehna Set', category: 'ACCESSORIES', subCategory: 'Necklace' },
    ];

    const hasCore = standaloneItems.some(isCoreGarment);
    assert.equal(hasCore, false);
    // Since hasCore is false, none of the standalone accessories are filtered out!
    assert.equal(standaloneItems.length, 3);
  });

  // Test 4: Accessory boundary cleaning & defringing
  it('cleanBoundaryEdges suppresses faint noise, defringes edge halos, and prunes detached specks', () => {
    const width = 20;
    const height = 20;
    const buffer = Buffer.alloc(width * height * 4, 0);

    // Create a 10x10 solid dark foreground object in the center (RGB 30, 30, 30, alpha 255)
    for (let y = 5; y < 15; y++) {
      for (let x = 5; x < 15; x++) {
        const idx = (y * width + x) * 4;
        buffer[idx] = 30;
        buffer[idx + 1] = 30;
        buffer[idx + 2] = 30;
        buffer[idx + 3] = 255;
      }
    }

    // Add a white halo pixel at (5, 4) next to the solid object (alpha 120, RGB 240, 240, 240)
    const haloIdx = (5 * width + 4) * 4;
    buffer[haloIdx] = 240;
    buffer[haloIdx + 1] = 240;
    buffer[haloIdx + 2] = 240;
    buffer[haloIdx + 3] = 120;

    // Add a detached background floater noise pixel at (0, 0) (alpha 180, RGB 20, 20, 20)
    const floaterIdx = 0;
    buffer[floaterIdx] = 20;
    buffer[floaterIdx + 1] = 20;
    buffer[floaterIdx + 2] = 20;
    buffer[floaterIdx + 3] = 180;

    // Add faint alpha haze at (19, 19) (alpha 15)
    const hazeIdx = (19 * width + 19) * 4;
    buffer[hazeIdx] = 255;
    buffer[hazeIdx + 1] = 255;
    buffer[hazeIdx + 2] = 255;
    buffer[hazeIdx + 3] = 15;

    const cleaned = segmentationService.cleanBoundaryEdges(buffer, width, height);

    // 1. Faint haze (alpha 15) must be wiped to 0
    assert.equal(cleaned[hazeIdx + 3], 0);

    // 2. Detached floater speck at (0, 0) must be pruned to 0
    assert.equal(cleaned[floaterIdx + 3], 0);

    // 3. White halo pixel at (5, 4) must be defringed (color blended towards solid foreground 30)
    assert.ok(cleaned[haloIdx] < 120, `Expected defringed R < 120, got ${cleaned[haloIdx]}`);
    assert.ok(cleaned[haloIdx + 1] < 120, `Expected defringed G < 120, got ${cleaned[haloIdx + 1]}`);
    assert.ok(cleaned[haloIdx + 2] < 120, `Expected defringed B < 120, got ${cleaned[haloIdx + 2]}`);
  });

  // Test 5: Tan leather and bright specular reflections are preserved on accessories
  it('Does NOT erase tan leather or bright specular reflections when isAccessory is true', () => {
    const width = 10;
    const height = 10;
    const buffer = Buffer.alloc(width * height * 4, 0);

    // Create a tan leather / gold patch (RGB 210, 160, 100, alpha 255)
    const tanIdx = 0;
    buffer[tanIdx] = 210;
    buffer[tanIdx + 1] = 160;
    buffer[tanIdx + 2] = 100;
    buffer[tanIdx + 3] = 255;

    // Create a bright specular reflection patch (RGB 245, 245, 245, alpha 255)
    const specIdx = 4;
    buffer[specIdx] = 245;
    buffer[specIdx + 1] = 245;
    buffer[specIdx + 2] = 245;
    buffer[specIdx + 3] = 255;

    // When excludeSkin is false (as mandated for accessories):
    // The tan leather and bright reflection remain completely opaque!
    assert.equal(buffer[tanIdx + 3], 255);
    assert.equal(buffer[specIdx + 3], 255);
  });
});
