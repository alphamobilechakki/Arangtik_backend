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
  const JewellerySet = require('../src/modules/jewellery/set/jewellerySet.model');
  const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');
  await JewellerySet.deleteMany({ name: { $regex: /^TEST_SET_/ } });
  await JewelleryBox.deleteMany({ name: { $regex: /^TEST_BOX_FOR_SET_/ } });
});

test('JewellerySet - Model, Service, and Lifecycle tests', async (t) => {
  const jewellerySetService = require('../src/modules/jewellery/set/jewellerySet.service');
  const jewelleryBoxService = require('../src/modules/jewellery/box/jewelleryBox.service');
  const JewellerySet = require('../src/modules/jewellery/set/jewellerySet.model');

  const testUserId = new mongoose.Types.ObjectId();
  let boxId;
  let setId;

  await t.test('1. Setup box for sets', async () => {
    const box = await jewelleryBoxService.createBox(testUserId, {
      name: 'TEST_BOX_FOR_SET_Wedding Trunk',
    });
    assert.ok(box._id);
    boxId = box._id;
  });

  await t.test('2. Create jewellery set under user box', async () => {
    const set = await jewellerySetService.createSet(testUserId, {
      jewelleryBoxId: boxId,
      name: 'TEST_SET_Bridal Emerald Set',
      coverImageUrl: 'https://example.com/emerald.jpg',
    });

    assert.ok(set._id);
    assert.equal(set.name, 'TEST_SET_Bridal Emerald Set');
    assert.equal(set.jewelleryBoxId.toString(), boxId.toString());
    assert.equal(set.isDeleted, false);
    setId = set._id;
  });

  await t.test('3. Fetch user sets with box filtering', async () => {
    const res = await jewellerySetService.getUserSets(testUserId, {
      jewelleryBoxId: boxId,
    });
    assert.ok(Array.isArray(res.sets));
    assert.equal(res.sets.length, 1);
    assert.equal(res.sets[0].name, 'TEST_SET_Bridal Emerald Set');
    assert.equal(typeof res.sets[0].itemCount, 'number');
  });

  await t.test('4. Update jewellery set details', async () => {
    const updated = await jewellerySetService.updateSet(testUserId, setId, {
      name: 'TEST_SET_Bridal Emerald & Diamond Set',
    });
    assert.equal(updated.name, 'TEST_SET_Bridal Emerald & Diamond Set');
  });

  await t.test('5. Soft delete jewellery set', async () => {
    const delRes = await jewellerySetService.deleteSet(testUserId, setId);
    assert.equal(delRes.message, 'Jewellery set and member items deleted successfully');

    const found = await JewellerySet.findById(setId);
    assert.equal(found, null);

    const withDel = await JewellerySet.findById(setId).withDeleted();
    assert.ok(withDel);
    assert.equal(withDel.isDeleted, true);
  });
});
