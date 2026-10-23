const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const vendorCategoryService = require('../src/modules/admin/vendorCategory/vendorCategory.service');
const VendorCategory = require('../src/modules/admin/vendorCategory/vendorCategory.model');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const { validateCreateCategory, validateUpdateCategory } = require('../src/modules/admin/vendorCategory/vendorCategory.validation');

test('Vendor Category Storage Assignment & Resolution Tests', async (t) => {
  await connectDB();

  const wardrobeCatName = 'Test Wardrobe Service ' + Date.now();
  const kitchenCatName = 'Test Kitchen Service ' + Date.now();
  const multiCatName = 'Test Multi-Storage Service ' + Date.now();

  let wardrobeCatId = null;
  let kitchenCatId = null;
  let multiCatId = null;
  let testWardrobeId = null;
  let testItemId = null;
  const dummyUserId = new mongoose.Types.ObjectId();

  t.after(async () => {
    // Cleanup
    await VendorCategory.deleteMany({
      name: { $in: [wardrobeCatName, kitchenCatName, multiCatName] },
    });
    if (testWardrobeId) {
      await Wardrobe.findByIdAndDelete(testWardrobeId);
    }
    if (testItemId) {
      await WardrobeItem.findByIdAndDelete(testItemId);
    }
  });

  await t.test('1. Creating category without storeTypes defaults to ["WARDROBE"]', async () => {
    const cat = await vendorCategoryService.createCategory({
      name: wardrobeCatName,
      description: 'Wardrobe laundry & garment care',
    });

    assert.ok(cat._id);
    assert.deepStrictEqual(cat.storeTypes, ['WARDROBE']);
    wardrobeCatId = cat._id;
  });

  await t.test('2. Creating category with explicit storeTypes: ["KITCHEN"]', async () => {
    const cat = await vendorCategoryService.createCategory({
      name: kitchenCatName,
      storeTypes: ['KITCHEN'],
      description: 'Kitchen appliance & deep cleaning',
    });

    assert.ok(cat._id);
    assert.deepStrictEqual(cat.storeTypes, ['KITCHEN']);
    kitchenCatId = cat._id;
  });

  await t.test('3. Creating category with multiple storeTypes: ["WARDROBE", "HOUSEHOLD"]', async () => {
    const cat = await vendorCategoryService.createCategory({
      name: multiCatName,
      storeTypes: ['WARDROBE', 'HOUSEHOLD'],
      description: 'Multi-storage sanitization service',
    });

    assert.ok(cat._id);
    assert.ok(cat.storeTypes.includes('WARDROBE'));
    assert.ok(cat.storeTypes.includes('HOUSEHOLD'));
    multiCatId = cat._id;
  });

  await t.test('4. Validation middleware rejects invalid storage types', async () => {
    let capturedError = null;
    const req = {
      body: {
        name: 'Invalid Storage Cat',
        storeTypes: ['INVALID_STORE_TYPE'],
      },
    };
    const res = {};
    const next = (err) => {
      capturedError = err;
    };

    validateCreateCategory(req, res, next);
    assert.ok(capturedError, 'Validation should fail for invalid storeType');
    assert.strictEqual(capturedError.statusCode, 400);
    assert.ok(capturedError.message.includes('Invalid storage type'));
  });

  await t.test('5. getAllCategories({ storeType: "WARDROBE" }) filters correctly', async () => {
    const list = await vendorCategoryService.getAllCategories({
      includeInactive: true,
      storeType: 'WARDROBE',
    });

    const hasWardrobe = list.some((c) => c._id.toString() === wardrobeCatId.toString());
    const hasMulti = list.some((c) => c._id.toString() === multiCatId.toString());
    const hasKitchen = list.some((c) => c._id.toString() === kitchenCatId.toString());

    assert.strictEqual(hasWardrobe, true, 'Should include WARDROBE category');
    assert.strictEqual(hasMulti, true, 'Should include multi-store WARDROBE category');
    assert.strictEqual(hasKitchen, false, 'Must NOT include KITCHEN-only category');
  });

  await t.test('6. getAllCategories({ storeType: "KITCHEN" }) filters correctly', async () => {
    const list = await vendorCategoryService.getAllCategories({
      includeInactive: true,
      storeType: 'KITCHEN',
    });

    const hasKitchen = list.some((c) => c._id.toString() === kitchenCatId.toString());
    const hasWardrobe = list.some((c) => c._id.toString() === wardrobeCatId.toString());

    assert.strictEqual(hasKitchen, true, 'Should include KITCHEN category');
    assert.strictEqual(hasWardrobe, false, 'Must NOT include WARDROBE-only category');
  });

  await t.test('7. Automatic category resolution via wardrobeId', async () => {
    const kitchenStorage = await Wardrobe.create({
      userId: dummyUserId,
      name: 'Main Kitchen Pantry',
      storeType: 'KITCHEN',
    });
    testWardrobeId = kitchenStorage._id;

    const list = await vendorCategoryService.getAllCategories({
      includeInactive: true,
      wardrobeId: testWardrobeId.toString(),
    });

    const hasKitchen = list.some((c) => c._id.toString() === kitchenCatId.toString());
    const hasWardrobe = list.some((c) => c._id.toString() === wardrobeCatId.toString());

    assert.strictEqual(hasKitchen, true, 'Should return KITCHEN category for kitchen wardrobeId');
    assert.strictEqual(hasWardrobe, false, 'Should not return WARDROBE category for kitchen wardrobeId');
  });

  await t.test('8. Automatic category resolution via itemId', async () => {
    const kitchenItem = await WardrobeItem.create({
      userId: dummyUserId,
      wardrobeId: testWardrobeId,
      name: 'Blender Jar',
      category: 'APPLIANCE',
    });
    testItemId = kitchenItem._id;

    const list = await vendorCategoryService.getAllCategories({
      includeInactive: true,
      itemId: testItemId.toString(),
    });

    const hasKitchen = list.some((c) => c._id.toString() === kitchenCatId.toString());
    const hasWardrobe = list.some((c) => c._id.toString() === wardrobeCatId.toString());

    assert.strictEqual(hasKitchen, true, 'Should resolve to KITCHEN categories for kitchen itemId');
    assert.strictEqual(hasWardrobe, false, 'Should not return WARDROBE category for kitchen itemId');
  });

  await t.test('9. updateCategory updates storeTypes via PATCH', async () => {
    const updated = await vendorCategoryService.updateCategory(wardrobeCatId, {
      storeTypes: ['WARDROBE', 'KITCHEN'],
    });

    assert.ok(updated.storeTypes.includes('WARDROBE'));
    assert.ok(updated.storeTypes.includes('KITCHEN'));

    const list = await vendorCategoryService.getAllCategories({
      includeInactive: true,
      storeType: 'KITCHEN',
    });
    const found = list.some((c) => c._id.toString() === wardrobeCatId.toString());
    assert.strictEqual(found, true, 'Updated category should now match KITCHEN filter');
  });
});
