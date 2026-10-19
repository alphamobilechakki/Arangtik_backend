const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const LaundryOrder = require('../src/modules/order/order.model');
const laundryOrderService = require('../src/modules/order/laundry/laundryOrder.service');
const vendorService = require('../src/modules/vendor/vendor.service');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const outfitService = require('../src/modules/outfit/outfit.service');
const User = require('../src/modules/auth/user.model');

test('Wardrobe Item Status & Laundry Workflow Integration', async (t) => {
  await connectDB();

  const testUserId = new mongoose.Types.ObjectId();
  const testVendorId = new mongoose.Types.ObjectId();
  const testVendorPhone = '9998886665';

  // Seed test user
  await User.create({
    _id: testUserId,
    name: 'Laundry Test User',
    phone: '9888777665',
    role: 'USER',
    status: 'active',
  });

  // Seed default wardrobe container
  const testWardrobe = await Wardrobe.create({
    userId: testUserId,
    name: 'Main Closet',
    isDefault: true,
  });

  // Helper to create wardrobe item
  const createItem = async (name, category = 'UPPER_WEAR', subCategory = 'SHIRT') => {
    return await WardrobeItem.create({
      userId: testUserId,
      wardrobeId: testWardrobe._id,
      name,
      category,
      subCategory,
      color: 'Blue',
      fabric: 'Cotton',
    });
  };

  await t.test('1. Wardrobe items default to status ACTIVE and only accept ACTIVE or INACTIVE', async () => {
    const item = await createItem('Formal White Shirt');
    assert.strictEqual(item.status, 'ACTIVE');

    // Updating to INACTIVE is valid
    item.status = 'INACTIVE';
    await item.save();
    assert.strictEqual(item.status, 'INACTIVE');

    // Updating back to ACTIVE is valid
    item.status = 'ACTIVE';
    await item.save();
    assert.strictEqual(item.status, 'ACTIVE');

    // Invalid status should fail validation
    item.status = 'DIRTY';
    await assert.rejects(async () => {
      await item.save();
    });
  });

  await t.test('2. Creating laundry order sets wardrobe item status to INACTIVE', async () => {
    const itemA = await createItem('Blue Denim Jacket');
    assert.strictEqual(itemA.status, 'ACTIVE');

    const order = await laundryOrderService.createWorkOrder(testUserId, {
      vendorPhone: testVendorPhone,
      vendorName: 'Super Cleaner',
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 2),
      items: [
        {
          wardrobeItemId: itemA._id,
          serviceType: 'WASH_AND_IRON',
        },
      ],
    });

    assert.ok(order._id);
    assert.strictEqual(order.status, 'PENDING_PICKUP');

    // Verify item is now INACTIVE
    const refreshed = await WardrobeItem.findById(itemA._id);
    assert.strictEqual(refreshed.status, 'INACTIVE');
  });

  await t.test('3. An INACTIVE item cannot be sent to laundry again (re-order blocked with 400)', async () => {
    const itemB = await createItem('Black T-Shirt');
    // First send to laundry
    await laundryOrderService.createWorkOrder(testUserId, {
      vendorPhone: testVendorPhone,
      vendorName: 'Super Cleaner',
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 2),
      items: [{ wardrobeItemId: itemB._id }],
    });

    const refreshed = await WardrobeItem.findById(itemB._id);
    assert.strictEqual(refreshed.status, 'INACTIVE');

    // Attempting to send again must fail with 400
    await assert.rejects(
      async () => {
        await laundryOrderService.createWorkOrder(testUserId, {
          vendorPhone: testVendorPhone,
          vendorName: 'Super Cleaner',
          pickupDate: new Date(),
          expectedDeliveryDate: new Date(Date.now() + 86400000 * 2),
          items: [{ wardrobeItemId: itemB._id }],
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /already in laundry|inactive/i);
        return true;
      }
    );
  });

  await t.test('4. INACTIVE wardrobe items are NOT suggested in Outfit Suggestions', async () => {
    // Clean up items for this user and add 1 Active Top, 1 Active Bottom, and 1 Inactive Top
    await WardrobeItem.deleteMany({ userId: testUserId });

    const activeTop = await createItem('Active Polo Shirt', 'UPPER_WEAR', 'POLO');
    const activeBottom = await createItem('Active Chino Trouser', 'LOWER_WEAR', 'TROUSER');
    const inactiveTop = await createItem('Inactive Linen Shirt', 'UPPER_WEAR', 'SHIRT');
    inactiveTop.status = 'INACTIVE';
    await inactiveTop.save();

    const result = await outfitService.suggestOutfits(testUserId, {
      wardrobeId: testWardrobe._id.toString(),
      occasion: 'CASUAL',
    });

    // Verify the inactive item is NOT included in any suggested outfit
    assert.ok(result.outfits && result.outfits.length > 0);
    for (const outfit of result.outfits) {
      for (const it of outfit.items) {
        assert.notStrictEqual(
          it.itemId?.toString(),
          inactiveTop._id.toString(),
          'Inactive garment was mistakenly suggested in an outfit!'
        );
      }
    }
  });

  await t.test('5. When laundry order is DELIVERED, wardrobe items revert to ACTIVE', async () => {
    const itemC = await createItem('Silk Kurta');
    const order = await laundryOrderService.createWorkOrder(testUserId, {
      vendorPhone: testVendorPhone,
      vendorName: 'Super Cleaner',
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 2),
      items: [{ wardrobeItemId: itemC._id }],
    });

    let checkItem = await WardrobeItem.findById(itemC._id);
    assert.strictEqual(checkItem.status, 'INACTIVE');

    // Update order through vendor to DELIVERED
    const mockVendor = { _id: testVendorId, phone: testVendorPhone, name: 'Super Cleaner' };
    await vendorService.updateVendorOrderStatus(mockVendor, order._id, {
      status: 'DELIVERED',
    });

    checkItem = await WardrobeItem.findById(itemC._id);
    assert.strictEqual(checkItem.status, 'ACTIVE');
  });

  await t.test('6. When laundry order is CANCELLED by user, wardrobe items revert to ACTIVE', async () => {
    const itemD = await createItem('Woolen Sweater');
    const order = await laundryOrderService.createWorkOrder(testUserId, {
      vendorPhone: testVendorPhone,
      vendorName: 'Super Cleaner',
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 2),
      items: [{ wardrobeItemId: itemD._id }],
    });

    let checkItem = await WardrobeItem.findById(itemD._id);
    assert.strictEqual(checkItem.status, 'INACTIVE');

    // Customer cancels order
    await laundryOrderService.updateOrderStatus(testUserId, order._id, {
      status: 'CANCELLED',
      note: 'Found another dry cleaner',
    });

    checkItem = await WardrobeItem.findById(itemD._id);
    assert.strictEqual(checkItem.status, 'ACTIVE');
  });

  await t.test('7. When laundry order is REJECTED by vendor, wardrobe items revert to ACTIVE', async () => {
    const itemE = await createItem('Party Blazer');
    const order = await laundryOrderService.createWorkOrder(testUserId, {
      vendorPhone: testVendorPhone,
      vendorName: 'Super Cleaner',
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000 * 2),
      items: [{ wardrobeItemId: itemE._id }],
    });

    let checkItem = await WardrobeItem.findById(itemE._id);
    assert.strictEqual(checkItem.status, 'INACTIVE');

    // Vendor rejects order
    const mockVendor = { _id: testVendorId, phone: testVendorPhone, name: 'Super Cleaner' };
    await vendorService.updateVendorOrderStatus(mockVendor, order._id, {
      status: 'REJECTED',
      note: 'Too busy',
    });

    checkItem = await WardrobeItem.findById(itemE._id);
    assert.strictEqual(checkItem.status, 'ACTIVE');
  });

  // Cleanup
  await LaundryOrder.deleteMany({ userId: testUserId });
  await WardrobeItem.deleteMany({ userId: testUserId });
  await Wardrobe.deleteMany({ userId: testUserId });
  await User.deleteMany({ _id: testUserId });
  await mongoose.disconnect();
});
