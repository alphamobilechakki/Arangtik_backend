require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
});

test.after(async () => {
  const Jewellery = require('../src/modules/jewellery/item/jewellery.model');
  const JewellerySet = require('../src/modules/jewellery/set/jewellerySet.model');
  const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');

  await Jewellery.deleteMany({ name: { $regex: /^TEST_ITEM_/ } });
  await JewellerySet.deleteMany({ name: { $regex: /^TEST_SET_ITEM_/ } });
  await JewelleryBox.deleteMany({ name: { $regex: /^TEST_BOX_ITEM_/ } });
});

test('Jewellery - Model, Service, and Integration tests', async (t) => {
  const jewelleryService = require('../src/modules/jewellery/item/jewellery.service');
  const jewelleryBoxService = require('../src/modules/jewellery/box/jewelleryBox.service');
  const jewelleryCategoryService = require('../src/modules/jewellery/category/jewelleryCategory.service');
  const Jewellery = require('../src/modules/jewellery/item/jewellery.model');

  const testUserId = new mongoose.Types.ObjectId();
  let box1Id;
  let box2Id;
  let categoryId;
  let singleItemId;

  await t.test('1. Setup box and category for item tests', async () => {
    const box1 = await jewelleryBoxService.createBox(testUserId, {
      name: 'TEST_BOX_ITEM_Gold Vault',
    });
    box1Id = box1._id;

    const box2 = await jewelleryBoxService.createBox(testUserId, {
      name: 'TEST_BOX_ITEM_Bank Locker',
    });
    box2Id = box2._id;

    const cat = await jewelleryCategoryService.getCategoryById('NECKLACE');
    assert.ok(cat._id);
    categoryId = cat._id;
  });

  await t.test('2. Create single jewellery item with source & generated images', async () => {
    const item = await jewelleryService.createItem(testUserId, {
      jewelleryBoxId: box1Id,
      jewelleryCategory: categoryId,
      name: 'TEST_ITEM_Royal Choker Necklace',
      type: 'GOLD',
      status: 'IN_LOCKER',
      color: 'Yellow Gold',
      gemstone: 'Kundan & Pearl',
      weight: 45.5,
      brand: 'Tanishq',
      sourceImageUrl: 'https://example.com/choker_original.jpg',
      generatedImageUrl: 'https://example.com/choker_transparent.png',
    });

    assert.ok(item._id);
    assert.equal(item.name, 'TEST_ITEM_Royal Choker Necklace');
    assert.equal(item.type, 'GOLD');
    assert.equal(item.status, 'IN_LOCKER');
    assert.equal(item.weight, 45.5);
    assert.ok(item.sourceImage.url);
    assert.ok(item.generatedImage.url);
    assert.equal(item.isDeleted, false);

    singleItemId = item._id;
  });

  await t.test('3. Create set with multiple items from single photo (e.g. 1 necklace + 2 earrings)', async () => {
    const res = await jewelleryService.createSetWithItems(testUserId, {
      setName: 'TEST_SET_ITEM_Bridal Kundan Set',
      jewelleryBoxId: box1Id,
      sourcePhotoUrl: 'https://example.com/complete_bridal_set.jpg',
      items: [
        {
          name: 'TEST_ITEM_Kundan Centerpiece Necklace',
          jewelleryCategory: 'NECKLACE',
          type: 'GOLD',
          status: 'IN_LOCKER',
          weight: 60,
        },
        {
          name: 'TEST_ITEM_Kundan Jhumka Left',
          jewelleryCategory: 'EARRING',
          type: 'GOLD',
          status: 'IN_LOCKER',
          weight: 15,
        },
        {
          name: 'TEST_ITEM_Kundan Jhumka Right',
          jewelleryCategory: 'EARRING',
          type: 'GOLD',
          status: 'IN_LOCKER',
          weight: 15,
        },
      ],
    });

    assert.ok(res.set._id);
    assert.equal(res.items.length, 3);
    assert.equal(res.items[0].setId.toString(), res.set._id.toString());
    assert.equal(res.items[1].setId.toString(), res.set._id.toString());
    assert.equal(res.items[2].setId.toString(), res.set._id.toString());
  });

  await t.test('4. Query items with filters (type, status, boxId)', async () => {
    const listRes = await jewelleryService.getUserItems(testUserId, {
      jewelleryBoxId: box1Id,
      type: 'GOLD',
      status: 'IN_LOCKER',
    });

    assert.ok(Array.isArray(listRes.items));
    assert.equal(listRes.items.length, 4); // 1 single + 3 set items
  });

  await t.test('5. Update item status (IN_LOCKER -> LEND -> CLEANING -> IN_LOCKER)', async () => {
    // 5a. Lend
    const lent = await jewelleryService.updateItemStatus(testUserId, singleItemId, 'LEND');
    assert.equal(lent.status, 'LEND');

    // 5b. Cleaning
    const cleaning = await jewelleryService.updateItemStatus(testUserId, singleItemId, 'CLEANING');
    assert.equal(cleaning.status, 'CLEANING');

    // 5c. Returned to Locker
    const locker = await jewelleryService.updateItemStatus(testUserId, singleItemId, 'IN_LOCKER');
    assert.equal(locker.status, 'IN_LOCKER');
  });

  await t.test('6. Move item to another box', async () => {
    const moved = await jewelleryService.moveItem(testUserId, singleItemId, box2Id);
    assert.equal(moved.jewelleryBoxId.toString(), box2Id.toString());

    // Verify it's now in box2
    const fetched = await jewelleryService.getItemById(testUserId, singleItemId);
    assert.equal(fetched.jewelleryBoxId._id.toString(), box2Id.toString());
  });

  await t.test('7. Toggle favorite status', async () => {
    const fav1 = await jewelleryService.toggleFavorite(testUserId, singleItemId);
    assert.equal(fav1.isFavorite, true);

    const fav2 = await jewelleryService.toggleFavorite(testUserId, singleItemId);
    assert.equal(fav2.isFavorite, false);
  });

  await t.test('8. Soft delete single item and verify query exclusion', async () => {
    const delRes = await jewelleryService.deleteItem(testUserId, singleItemId);
    assert.equal(delRes.message, 'Jewellery item deleted successfully');

    const found = await Jewellery.findById(singleItemId);
    assert.equal(found, null);

    const withDel = await Jewellery.findById(singleItemId).withDeleted();
    assert.ok(withDel);
    assert.equal(withDel.isDeleted, true);
    assert.ok(withDel.deletedAt);
  });

  await t.test('9. Soft deleting box1 should cascade soft delete remaining items in box1', async () => {
    await jewelleryBoxService.deleteBox(testUserId, box1Id);

    // Standard query for items in box1 should now return 0 active items
    const remaining = await jewelleryService.getUserItems(testUserId, {
      jewelleryBoxId: box1Id,
    });
    assert.equal(remaining.items.length, 0);
  });
});
