const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Import the aiVision service or test the validation behavior directly
describe('AI Vision Garment Validation Rules', () => {
  // Simulate the validation engine function
  const nonGarmentRegex = /\b(face|chin|beard|hair|human head|human face|bare skin|mannequin stand|dummy stand)\b/i;

  const validateDetections = (rawList) => {
    let validItems = rawList.filter((item) => {
      if (!item || !item.name) return false;
      const name = (item.name || '').toLowerCase();
      const sub = (item.subCategory || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      if (nonGarmentRegex.test(name) || nonGarmentRegex.test(sub)) return false;
      if (cat === 'other' && !item.attributes?.primaryColor) return false;
      if (!Array.isArray(item.box2d) || item.box2d.length !== 4) return false;
      const [ymin, xmin, ymax, xmax] = item.box2d;
      if (ymax <= ymin || xmax <= xmin) return false;
      return true;
    });

    const isCoreGarment = (it) => {
      const c = (it.category || '').toUpperCase();
      const s = (it.subCategory || '').toLowerCase();
      const n = (it.name || '').toLowerCase();
      return (
        c === 'UPPER_WEAR' ||
        c === 'LOWER_WEAR' ||
        c === 'TRADITIONAL' ||
        c === 'OUTERWEAR' ||
        c === 'FULL_BODY' ||
        ['shirt', 't-shirt', 'top', 'polo', 'hoodie', 'jacket', 'blazer', 'jeans', 'pant', 'trousers', 'shorts', 'skirt', 'saree', 'kurta', 'dress', 'gown', 'suit', 'lehenga'].some((k) => s.includes(k) || n.includes(k))
      );
    };

    const isFootwearOrAccessory = (it) => {
      const c = (it.category || '').toUpperCase();
      const s = (it.subCategory || '').toLowerCase();
      const n = (it.name || '').toLowerCase();
      return (
        c === 'ACCESSORIES' ||
        c === 'FOOTWEAR' ||
        ['sunglasses', 'glasses', 'spectacles', 'watch', 'belt', 'cap', 'hat', 'shoes', 'sneakers', 'sandals', 'heels', 'loafers', 'boots', 'jewelry', 'necklace', 'bracelet'].some((k) => s.includes(k) || n.includes(k))
      );
    };

    const hasCoreGarments = validItems.some(isCoreGarment);

    // Rule 1: Exclude accessories & footwear when clothing is present
    if (hasCoreGarments) {
      validItems = validItems.filter((it) => !isFootwearOrAccessory(it));
    }

    // Rule 2: Women's Saree & Blouse Ensemble consolidation
    const sareeIdx = validItems.findIndex((it) => {
      const n = (it.name || '').toLowerCase();
      const s = (it.subCategory || '').toLowerCase();
      return n.includes('saree') || s.includes('saree') || n.includes('sari') || s.includes('sari');
    });

    if (sareeIdx !== -1) {
      const saree = validItems[sareeIdx];
      const blouseIndices = [];
      validItems.forEach((it, idx) => {
        if (idx === sareeIdx) return;
        const n = (it.name || '').toLowerCase();
        const s = (it.subCategory || '').toLowerCase();
        const isBlouse = n.includes('blouse') || s.includes('blouse') || n.includes('choli') || s.includes('choli');
        if (isBlouse) blouseIndices.push(idx);
      });

      if (blouseIndices.length > 0) {
        let [sYmin, sXmin, sYmax, sXmax] = saree.box2d;
        blouseIndices.forEach((bIdx) => {
          const [bYmin, bXmin, bYmax, bXmax] = validItems[bIdx].box2d;
          sYmin = Math.min(sYmin, bYmin);
          sXmin = Math.min(sXmin, bXmin);
          sYmax = Math.max(sYmax, bYmax);
          sXmax = Math.max(sXmax, bXmax);
        });
        saree.box2d = [sYmin, sXmin, sYmax, sXmax];
        saree.category = 'TRADITIONAL';
        saree.subCategory = 'Saree';
        saree.name = `${saree.name} with Blouse Ensemble`;
        validItems = validItems.filter((_, idx) => !blouseIndices.includes(idx));
      }
    }

    // Rule 3: Truncated/Half garment rejection
    const uppers = validItems.filter((it) => (it.category || '').toUpperCase() === 'UPPER_WEAR');
    const lowers = validItems.filter((it) => (it.category || '').toUpperCase() === 'LOWER_WEAR');
    const itemsToDrop = new Set();

    if (lowers.length > 0) {
      const maxLowerHeight = Math.max(...lowers.map((it) => it.box2d[2] - it.box2d[0]));
      uppers.forEach((upper) => {
        const [uYmin, , uYmax] = upper.box2d;
        const uHeight = uYmax - uYmin;
        if (uYmin <= 25 && uHeight < 240 && maxLowerHeight > 340) {
          itemsToDrop.add(upper);
        }
      });
    }

    validItems = validItems.filter((item) => !itemsToDrop.has(item));
    return validItems;
  };

  it('RULE 1: Drops cutoff/half T-shirt at the top and keeps only the full pant', () => {
    const rawItems = [
      {
        name: 'Half Cutoff Grey T-Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'T-Shirt',
        box2d: [0, 200, 150, 800], // ymin=0, height=150 (truncated)
        attributes: { primaryColor: 'Grey' },
      },
      {
        name: 'Blue Slim-Fit Denim Jeans',
        category: 'LOWER_WEAR',
        subCategory: 'Jeans',
        box2d: [160, 180, 950, 820], // height=790 (prominent full lower wear)
        attributes: { primaryColor: 'Blue' },
      },
    ];

    const result = validateDetections(rawItems);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Blue Slim-Fit Denim Jeans');
    assert.equal(result[0].category, 'LOWER_WEAR');
  });

  it('RULE 2: Suppresses watch, sunglasses, and shoes in a full clothing outfit photo', () => {
    const rawItems = [
      {
        name: 'White Linen Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        box2d: [100, 200, 500, 800],
        attributes: { primaryColor: 'White' },
      },
      {
        name: 'Beige Chino Trousers',
        category: 'LOWER_WEAR',
        subCategory: 'Trousers',
        box2d: [500, 200, 900, 800],
        attributes: { primaryColor: 'Beige' },
      },
      {
        name: 'Brown Leather Watch',
        category: 'ACCESSORIES',
        subCategory: 'Watch',
        box2d: [480, 180, 520, 220],
        attributes: { primaryColor: 'Brown' },
      },
      {
        name: 'Black Wayfarer Sunglasses',
        category: 'ACCESSORIES',
        subCategory: 'Sunglasses',
        box2d: [50, 400, 100, 600],
        attributes: { primaryColor: 'Black' },
      },
      {
        name: 'White Sneakers',
        category: 'FOOTWEAR',
        subCategory: 'Shoes',
        box2d: [900, 220, 980, 780],
        attributes: { primaryColor: 'White' },
      },
    ];

    const result = validateDetections(rawItems);
    assert.equal(result.length, 2);
    assert.equal(result[0].name, 'White Linen Shirt');
    assert.equal(result[1].name, 'Beige Chino Trousers');
  });

  it('RULE 3: Allows footwear when photo is a standalone shoe photo (no core clothes)', () => {
    const rawItems = [
      {
        name: 'Nike Air Max Sneakers',
        category: 'FOOTWEAR',
        subCategory: 'Shoes',
        box2d: [150, 100, 850, 900],
        attributes: { primaryColor: 'White' },
      },
    ];

    const result = validateDetections(rawItems);
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'Nike Air Max Sneakers');
    assert.equal(result[0].category, 'FOOTWEAR');
  });

  it('RULE 4: Consolidates Saree and Blouse into a single unified ensemble', () => {
    const rawItems = [
      {
        name: 'Red Silk Saree',
        category: 'TRADITIONAL',
        subCategory: 'Saree',
        box2d: [300, 150, 950, 850],
        attributes: { primaryColor: 'Red' },
      },
      {
        name: 'Golden Embroidered Blouse',
        category: 'UPPER_WEAR',
        subCategory: 'Blouse',
        box2d: [180, 250, 320, 750],
        attributes: { primaryColor: 'Gold' },
      },
    ];

    const result = validateDetections(rawItems);
    assert.equal(result.length, 1);
    assert.equal(result[0].category, 'TRADITIONAL');
    assert.equal(result[0].subCategory, 'Saree');
    assert.ok(result[0].name.includes('Ensemble'));
    // Bounding box merged to cover from blouse top (180) down to saree bottom (950)
    assert.equal(result[0].box2d[0], 180);
    assert.equal(result[0].box2d[2], 950);
  });
});
