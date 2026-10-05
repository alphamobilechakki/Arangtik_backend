const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const { MONGODB_URI } = require('../src/config/env.config');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');

describe('Arangtik Wardrobe AI — Clean Dress Cataloging & Almari Storage', () => {
  let userId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
  });

  beforeEach(async () => {
    userId = new mongoose.Types.ObjectId();
    await WardrobeItem.deleteMany({ userId });
    await Wardrobe.deleteMany({ userId });
  });

  after(async () => {
    await WardrobeItem.deleteMany({ userId });
    await Wardrobe.deleteMany({ userId });
  });

  it('1. Should create a new Wardrobe (Almari container) via service', async () => {
    const wardrobe = await wardrobeService.createWardrobe(userId, {
      name: 'Mummy Wardrobe',
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

  it('2. Should store a new Dress directly into a Wardrobe Almari', async () => {
    const wardrobe = await wardrobeService.createWardrobe(userId, { name: 'Master Bedroom Almari' });

    const item = await wardrobeService.addItem(userId, {
      wardrobeId: wardrobe._id,
      name: 'Navy Blue Silk Kurta',
      category: 'TRADITIONAL',
      subCategory: 'Kurta',
      color: 'Navy Blue',
      fabric: 'SILK',
      occasion: ['FESTIVE', 'WEDDING'],
      images: [{ url: '/uploads/kurta.jpg', isPrimary: true }],
    });

    assert.ok(item._id);
    assert.strictEqual(item.wardrobeId.toString(), wardrobe._id.toString());
    assert.strictEqual(item.name, 'Navy Blue Silk Kurta');
    assert.strictEqual(item.category, 'TRADITIONAL');
    assert.strictEqual(item.fabric, 'SILK');

    const allItems = await wardrobeService.getAllItems(userId, { wardrobeId: wardrobe._id });
    assert.ok(Array.isArray(allItems) || Array.isArray(allItems.items));
    const itemsList = Array.isArray(allItems) ? allItems : allItems.items;
    assert.strictEqual(itemsList.length, 1);
    assert.strictEqual(itemsList[0].name, 'Navy Blue Silk Kurta');
  });

  it('3. Should delete a Dress item cleanly', async () => {
    const wardrobe = await wardrobeService.createWardrobe(userId, { name: 'Main Closet' });
    const item = await wardrobeService.addItem(userId, {
      wardrobeId: wardrobe._id,
      name: 'Black Denim Jeans',
      category: 'LOWER_WEAR',
      subCategory: 'Jeans',
    });

    const deleteRes = await wardrobeService.deleteItem(userId, item._id);
    assert.strictEqual(deleteRes.deleted, true);

    const found = await WardrobeItem.findById(item._id);
    assert.strictEqual(found, null);
  });

  it('4. Should support multiple storeTypes (Wardrobe, Kitchen, Electronics) with zero schema collision', async () => {
    // 1. Create a Kitchen Store Container
    const kitchenStore = await wardrobeService.createWardrobe(userId, {
      name: 'Main Modular Kitchen',
      storeType: 'KITCHEN',
      isDefault: true,
    });
    assert.strictEqual(kitchenStore.storeType, 'KITCHEN');

    // 2. Add Item to Kitchen Store (linked directly via wardrobeId)
    const blender = await wardrobeService.addItem(userId, {
      wardrobeId: kitchenStore._id,
      name: 'Philips 750W Mixer Grinder',
      category: 'APPLIANCES',
      subCategory: 'Mixer Grinder',
      attributes: {
        wattage: 750,
        jarsCount: 3,
        warrantyYears: 2,
      },
    });

    assert.strictEqual(blender.wardrobeId.toString(), kitchenStore._id.toString());
    assert.strictEqual(blender.attributes.get('wattage'), 750);

    // 3. Query stores filtered by storeType
    const kitchenStores = await wardrobeService.getWardrobes(userId, { storeType: 'KITCHEN' });
    assert.strictEqual(kitchenStores.length, 1);
    assert.strictEqual(kitchenStores[0].name, 'Main Modular Kitchen');

    // 4. Query items filtered by storeType
    const kitchenItems = await wardrobeService.getAllItems(userId, { storeType: 'KITCHEN' });
    const kList = Array.isArray(kitchenItems) ? kitchenItems : kitchenItems.items;
    assert.strictEqual(kList.length, 1);
    assert.strictEqual(kList[0].name, 'Philips 750W Mixer Grinder');
  });
});
