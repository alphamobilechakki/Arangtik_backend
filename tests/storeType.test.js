const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const storeTypeService = require('../src/modules/admin/storeType/storeType.service');
const StoreType = require('../src/modules/admin/storeType/storeType.model');
const vendorCategoryService = require('../src/modules/admin/vendorCategory/vendorCategory.service');
const VendorCategory = require('../src/modules/admin/vendorCategory/vendorCategory.model');

test('Dynamic StoreType Management & Category Integration Tests', async (t) => {
  await connectDB();

  const testTypeName = 'Test Kitchen Store';
  await StoreType.deleteMany({ name: { $in: [testTypeName, 'Kitchen Store Updated', 'Wardrobe Store Test'] } });
  await VendorCategory.deleteMany({ name: 'Test Kitchen Utensil Category' });

  let createdStoreTypeId = null;

  await t.test('1. createStoreType creates store type dynamically with only 2 fields: name and image', async () => {
    const created = await storeTypeService.createStoreType({
      name: testTypeName,
      image: '/uploads/store_types/kitchen.png',
    });

    assert.ok(created._id, 'StoreType ID must exist');
    assert.strictEqual(created.name, testTypeName);
    assert.strictEqual(created.code, 'TEST_KITCHEN_STORE');
    assert.ok(created.image.includes('/uploads/store_types/kitchen.png'), 'image should contain path');
    assert.ok(created.imageUrl.includes('/uploads/store_types/kitchen.png'), 'imageUrl should contain path');
    assert.strictEqual(created.isActive, true);

    createdStoreTypeId = created._id;
  });

  await t.test('2. Duplicate store type name throws 409 conflict', async () => {
    await assert.rejects(
      async () => {
        await storeTypeService.createStoreType({ name: testTypeName });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 409);
        return true;
      }
    );
  });

  await t.test('3. getAllStoreTypes lists dynamic store types', async () => {
    const list = await storeTypeService.getAllStoreTypes();
    assert.ok(list.length >= 1, 'Should have at least Test Kitchen Store');
    const found = list.find((st) => st._id.toString() === createdStoreTypeId.toString());
    assert.ok(found, 'Created test store type must be returned');
    assert.strictEqual(found.name, testTypeName);
  });

  await t.test('4. updateStoreType via PATCH updates name and image', async () => {
    const updated = await storeTypeService.updateStoreType(createdStoreTypeId, {
      name: 'Kitchen Store Updated',
      image: '/uploads/store_types/kitchen_v2.png',
    });

    assert.strictEqual(updated.name, 'Kitchen Store Updated');
    assert.ok(updated.image.includes('kitchen_v2.png'));
    assert.strictEqual(updated.image, updated.imageUrl);
  });

  await t.test('5. VendorCategory links to StoreType dynamically by ObjectId and code', async () => {
    const testCatName = 'Test Kitchen Utensil Category';
    await VendorCategory.deleteMany({ name: testCatName });

    const cat = await vendorCategoryService.createCategory({
      name: testCatName,
      icon: '🍳',
      storeTypeIds: [createdStoreTypeId],
    });

    try {
      assert.ok(cat._id);
      assert.ok(cat.storeTypeIds.includes(createdStoreTypeId));
      assert.ok(cat.storeTypes.includes('KITCHEN_STORE_UPDATED'));

      // Query categories by store type ID
      const byId = await vendorCategoryService.getCategoriesByStoreType(createdStoreTypeId.toString());
      assert.ok(byId.some((c) => c._id.toString() === cat._id.toString()));

      // 6. Linked StoreType cannot be deleted while in use
      await assert.rejects(
        async () => {
          await storeTypeService.deleteStoreType(createdStoreTypeId);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 400);
          assert.ok(err.message.includes('currently linked to category'));
          return true;
        }
      );
    } finally {
      // Clean up category
      await VendorCategory.findByIdAndDelete(cat._id);
    }
  });

  await t.test('7. deleteStoreType permanently cleans up unlinked test store type', async () => {
    const res = await storeTypeService.deleteStoreType(createdStoreTypeId, { hard: true });
    assert.ok(res.message.includes('permanently deleted'));
    const verify = await StoreType.findById(createdStoreTypeId);
    assert.strictEqual(verify, null);
  });
});
