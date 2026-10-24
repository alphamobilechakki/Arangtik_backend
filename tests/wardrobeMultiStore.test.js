const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const wardrobeService = require('../src/modules/wardrobe/wardrobe.service');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');

test('Wardrobe Multi-Store Isolation & Container Retrieval Suite', async (t) => {
  await connectDB();

  const testUserId = new mongoose.Types.ObjectId();

  // Cleanup before tests
  await Wardrobe.deleteMany({ userId: testUserId });
  await WardrobeItem.deleteMany({ userId: testUserId });

  let wardrobeAlmariId = null;
  let kitchenStorageId = null;
  let legacyWardrobeId = null;

  await t.test('1. Create containers for 2 distinct stores: WARDROBE and KITCHEN', async () => {
    const almari = await wardrobeService.createWardrobe(testUserId, {
      name: 'Main Clothes Almari',
      storeType: 'WARDROBE',
      type: 'PERSONAL',
      isDefault: true,
    });
    assert.ok(almari._id);
    assert.strictEqual(almari.storeType, 'WARDROBE');
    assert.strictEqual(almari.isDefault, true);
    assert.strictEqual(almari.itemCount, 0);
    wardrobeAlmariId = almari._id;

    const kitchen = await wardrobeService.createWardrobe(testUserId, {
      name: 'Kitchen Spice Rack',
      storeType: 'KITCHEN',
      type: 'SHARED',
      isDefault: false,
    });
    assert.ok(kitchen._id);
    assert.strictEqual(kitchen.storeType, 'KITCHEN');
    assert.strictEqual(kitchen.isDefault, false);
    kitchenStorageId = kitchen._id;

    // Simulate legacy wardrobe without storeType field
    const legacy = await Wardrobe.create({
      userId: testUserId,
      name: 'Legacy Almari Container',
      type: 'PERSONAL',
      isDefault: false,
      isActive: true,
    });
    legacyWardrobeId = legacy._id;
  });

  await t.test('2. Add items to Almari and verify itemCount calculation', async () => {
    // Add 2 items to Main Clothes Almari
    await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: wardrobeAlmariId,
      name: 'Blue Formal Shirt',
      category: 'UPPER_WEAR',
      status: 'ACTIVE',
    });
    await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: wardrobeAlmariId,
      name: 'Black Slim Trousers',
      category: 'BOTTOM_WEAR',
      status: 'ACTIVE',
    });

    // Add 1 item to Kitchen container
    await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: kitchenStorageId,
      name: 'Non-stick Frying Pan',
      category: 'OTHER',
      status: 'ACTIVE',
    });
  });

  await t.test('3. Query getWardrobes with storeType: "WARDROBE" returns only Wardrobe containers + legacy with accurate itemCount', async () => {
    const list = await wardrobeService.getWardrobes(testUserId, { storeType: 'WARDROBE' });

    assert.ok(list.length >= 2, 'Should return Main Clothes Almari and Legacy Almari');
    const ids = list.map((w) => w._id.toString());
    assert.ok(ids.includes(wardrobeAlmariId.toString()), 'Must contain Main Clothes Almari');
    assert.ok(ids.includes(legacyWardrobeId.toString()), 'Must contain Legacy Almari (backward compatibility)');
    assert.ok(!ids.includes(kitchenStorageId.toString()), 'Must NOT contain Kitchen container');

    const mainAlmari = list.find((w) => w._id.toString() === wardrobeAlmariId.toString());
    assert.strictEqual(mainAlmari.itemCount, 2, 'Main Almari must report 2 items');
  });

  await t.test('4. Case-insensitivity check: storeType="wardrobe" behaves identically', async () => {
    const list = await wardrobeService.getWardrobes(testUserId, { storeType: 'wardrobe' });
    const ids = list.map((w) => w._id.toString());
    assert.ok(ids.includes(wardrobeAlmariId.toString()));
    assert.ok(!ids.includes(kitchenStorageId.toString()));
  });

  await t.test('5. Query getWardrobes with storeType: "KITCHEN" returns only Kitchen containers', async () => {
    const list = await wardrobeService.getWardrobes(testUserId, { storeType: 'KITCHEN' });

    assert.strictEqual(list.length, 1, 'Should return only 1 Kitchen container');
    assert.strictEqual(list[0]._id.toString(), kitchenStorageId.toString());
    assert.strictEqual(list[0].itemCount, 1, 'Kitchen container must report 1 item');
    assert.strictEqual(list[0].name, 'Kitchen Spice Rack');
  });

  await t.test('6. Query getWardrobes without parameters defaults to WARDROBE (kitchen is excluded)', async () => {
    const defaultList = await wardrobeService.getWardrobes(testUserId);
    assert.strictEqual(defaultList.length, 2, 'Must return only the 2 wardrobe containers');
    const ids = defaultList.map((w) => w._id.toString());
    assert.ok(ids.includes(wardrobeAlmariId.toString()));
    assert.ok(ids.includes(legacyWardrobeId.toString()));
    assert.ok(!ids.includes(kitchenStorageId.toString()), 'Kitchen must NEVER appear in default getWardrobes');

    // Query with storeType: 'ALL' returns all containers across both stores
    const allList = await wardrobeService.getWardrobes(testUserId, { storeType: 'ALL' });
    assert.strictEqual(allList.length, 3, 'Must return all 3 containers across both stores');
  });

  await t.test('7. Cleanup test data', async () => {
    await Wardrobe.deleteMany({ userId: testUserId });
    await WardrobeItem.deleteMany({ userId: testUserId });
  });

  process.exit(0);
});
