const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../src/config/env.config');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const Collection = require('../src/modules/wardrobe/collection.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');

describe('Arangtik Wardrobe AI — Clean API & Schema Verification', () => {
  let userId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
  });

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    await WardrobeItem.deleteMany({ userId });
    await Collection.deleteMany({ userId });
    await Wardrobe.deleteMany({ userId });
  });

  it('1. Should create a new Wardrobe (Closet container) via service', async () => {
    const wardrobe = await wardrobeService.createWardrobe(userId, {
      name: 'Mummy Wardrobe',
      description: 'Festive & Traditional Collection',
      ownerName: 'Mummy',
      type: 'FAMILY',
      isDefault: true,
    });

    assert.ok(wardrobe._id);
    assert.strictEqual(wardrobe.name, 'Mummy Wardrobe');
    assert.strictEqual(wardrobe.isDefault, true);

    const userWardrobes = await wardrobeService.getWardrobes(userId);
    assert.strictEqual(userWardrobes.length, 1);
    assert.strictEqual(userWardrobes[0].name, 'Mummy Wardrobe');
  });

  it('2. Should create a Collection inside a Wardrobe', async () => {
    const wardrobe = await wardrobeService.createWardrobe(userId, { name: 'My Main Closet' });
    const collection = await wardrobeService.createCollection(userId, {
      wardrobeId: wardrobe._id,
      name: 'Festive Diwali Collection',
      colorTheme: { primary: 'Maroon', secondary: 'Gold' },
      season: ['WINTER'],
      occasion: ['FESTIVE'],
    });

    assert.ok(collection._id);
    assert.strictEqual(collection.wardrobeId.toString(), wardrobe._id.toString());
    assert.strictEqual(collection.name, 'Festive Diwali Collection');

    const collections = await wardrobeService.getCollections(userId, { wardrobeId: wardrobe._id });
    assert.strictEqual(collections.length, 1);
  });

  it('3. Should create and fetch a WardrobeItem inside a Wardrobe & Collection', async () => {
    const wardrobe = await wardrobeService.createWardrobe(userId, { name: 'My Main Closet' });
    const collection = await wardrobeService.createCollection(userId, {
      wardrobeId: wardrobe._id,
      name: 'Festive Collection',
    });

    const item = await wardrobeService.addItem(userId, {
      wardrobeId: wardrobe._id,
      collectionId: collection._id,
      name: 'Navy Blue Silk Kurta',
      category: 'TRADITIONAL',
      subCategory: 'Kurta',
      color: 'Navy Blue',
      fabric: 'SILK',
    });

    assert.ok(item._id);
    assert.strictEqual(item.wardrobeId.toString(), wardrobe._id.toString());
    assert.strictEqual(item.collectionId.toString(), collection._id.toString());

    const allItems = await wardrobeService.getAllItems(userId);
    assert.strictEqual(allItems.items.length, 1);
    assert.strictEqual(allItems.items[0].name, 'Navy Blue Silk Kurta');
  });
});
