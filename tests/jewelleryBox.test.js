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
  const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');
  await JewelleryBox.deleteMany({ name: { $regex: /^TEST_BOX_LIFECYCLE_/ } });
});

test('JewelleryBox - Model, Service, and Lifecycle tests', async (t) => {
  const jewelleryBoxService = require('../src/modules/jewellery/box/jewelleryBox.service');
  const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');

  const testUserId1 = new mongoose.Types.ObjectId();
  const testUserId2 = new mongoose.Types.ObjectId();

  let box1Id;
  let box2Id;

  await t.test('1. First box for user should automatically be default', async () => {
    const box = await jewelleryBoxService.createBox(testUserId1, {
      name: 'TEST_BOX_LIFECYCLE_Mummy Gold Vault',
      description: 'Gold items safe',
      type: 'FAMILY',
    });

    assert.ok(box._id);
    assert.equal(box.name, 'TEST_BOX_LIFECYCLE_Mummy Gold Vault');
    assert.equal(box.isDefault, true);
    assert.ok(box.storeTypeId);
    box1Id = box._id;
  });

  await t.test('2. Second box without isDefault should not be default', async () => {
    const box2 = await jewelleryBoxService.createBox(testUserId1, {
      name: 'TEST_BOX_LIFECYCLE_Silver Collection',
      type: 'PERSONAL',
    });

    assert.equal(box2.isDefault, false);
    box2Id = box2._id;

    // Check box1 is still default
    const box1 = await JewelleryBox.findById(box1Id);
    assert.equal(box1.isDefault, true);
  });

  await t.test('3. Setting box2 to default via update should unset box1 default', async () => {
    await jewelleryBoxService.updateBox(testUserId1, box2Id, { isDefault: true });

    const updatedBox2 = await JewelleryBox.findById(box2Id);
    assert.equal(updatedBox2.isDefault, true);

    const updatedBox1 = await JewelleryBox.findById(box1Id);
    assert.equal(updatedBox1.isDefault, false);
  });

  await t.test('4. Cross-user isolation - user2 cannot access user1 box', async () => {
    await assert.rejects(
      async () => {
        await jewelleryBoxService.getBoxById(testUserId2, box1Id);
      },
      (err) => {
        assert.equal(err.statusCode, 404);
        return true;
      }
    );
  });

  await t.test('5. Get user boxes should return only user boxes with itemCount', async () => {
    const result = await jewelleryBoxService.getUserBoxes(testUserId1);
    assert.ok(Array.isArray(result.boxes));
    assert.equal(result.boxes.length, 2);
    assert.equal(result.boxes[0].isDefault, true); // default box comes first
    assert.equal(typeof result.boxes[0].itemCount, 'number');
  });

  await t.test('6. Soft delete box should exclude it and re-assign default', async () => {
    // box2 is currently default, delete it
    const delRes = await jewelleryBoxService.deleteBox(testUserId1, box2Id);
    assert.equal(delRes.message, 'Jewellery box and its items deleted successfully');

    // box2 shouldn't be returned by standard find
    const foundBox2 = await JewelleryBox.findById(box2Id);
    assert.equal(foundBox2, null);

    // box1 should now be promoted back to default
    const box1 = await JewelleryBox.findById(box1Id);
    assert.equal(box1.isDefault, true);
  });
});
