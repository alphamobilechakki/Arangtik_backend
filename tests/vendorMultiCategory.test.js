const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env.config');

const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');
const LaundryOrder = require('../src/modules/order/order.model');
const vendorAuthService = require('../src/modules/vendor/vendorAuth.service');
const vendorService = require('../src/modules/vendor/vendor.service');
const laundryOrderService = require('../src/modules/order/laundry/laundryOrder.service');
const User = require('../src/modules/auth/user.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');

describe('Multi-Category Vendor Support & Explicit Order Category Tests', () => {
  const testPhone = '919999988881';
  let createdVendorId;
  let testUserId;
  let testWardrobeItemId;
  let testOrderNumber;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Clean up test records
    await RegisteredVendor.deleteMany({ phone: testPhone });
    await LaundryOrder.deleteMany({ vendorPhone: testPhone });

    // Setup or retrieve test user
    let user = await User.findOne({ phone: '919999999999' });
    if (!user) {
      user = await User.create({
        phone: '919999999999',
        name: 'Test Customer User',
        isProfileComplete: true,
      });
    }
    testUserId = user._id;

    // Setup test wardrobe item
    let item = await WardrobeItem.findOne({ userId: testUserId, name: 'MultiCat Test Oxford Shirt' });
    if (!item) {
      item = await WardrobeItem.create({
        userId: testUserId,
        name: 'MultiCat Test Oxford Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'Shirt',
        brand: 'Arangtik Tailors',
        images: [{ url: 'https://api.arangtik.com/uploads/shirts/test.webp', isPrimary: true, type: 'ORIGINAL' }],
        attributes: { color: 'White', fabric: 'Cotton' },
        status: 'ACTIVE',
      });
    } else {
      item.status = 'ACTIVE';
      await item.save();
    }
    testWardrobeItemId = item._id;
  });

  after(async () => {
    // Cleanup created test records
    if (createdVendorId) {
      await RegisteredVendor.findByIdAndDelete(createdVendorId);
    }
    await LaundryOrder.deleteMany({ vendorPhone: testPhone });
    if (testWardrobeItemId) {
      await WardrobeItem.findByIdAndDelete(testWardrobeItemId);
    }
    await mongoose.disconnect();
  });

  test('1. Vendor registration initializes default category and categories array', async () => {
    const regResult = await vendorAuthService.registerVendor({
      phone: testPhone,
      name: 'Ramesh Multi-Service Hub',
      category: 'Dhobi',
      businessName: 'Ramesh Laundry & Services',
      password: 'password123',
    });

    assert.ok(regResult.token, 'Token should be returned upon registration');
    assert.ok(regResult.vendor, 'Vendor profile should be returned');
    assert.strictEqual(regResult.vendor.category, 'Dhobi');
    assert.strictEqual(regResult.vendor.primaryCategory, 'Dhobi');
    assert.ok(Array.isArray(regResult.vendor.categories));
    assert.ok(regResult.vendor.categories.includes('Dhobi'));

    createdVendorId = regResult.vendor._id;

    // Verify in database
    const dbVendor = await RegisteredVendor.findById(createdVendorId).lean();
    assert.strictEqual(dbVendor.primaryCategory, 'Dhobi');
    assert.deepStrictEqual(dbVendor.categories, ['Dhobi']);
    assert.strictEqual(dbVendor.category, 'Dhobi');
  });

  test('2. Vendor can tick/add multiple categories via updateVendorCategories', async () => {
    const updated = await vendorAuthService.updateVendorCategories(createdVendorId, {
      categories: ['Dhobi', 'Press / Ironing', 'Tailor'],
      primaryCategory: 'Dhobi',
    });

    assert.strictEqual(updated.primaryCategory, 'Dhobi');
    assert.strictEqual(updated.category, 'Dhobi');
    assert.strictEqual(updated.categories.length, 3);
    assert.ok(updated.categories.includes('Dhobi'));
    assert.ok(updated.categories.includes('Press / Ironing'));
    assert.ok(updated.categories.includes('Tailor'));

    // Verify database document
    const dbVendor = await RegisteredVendor.findById(createdVendorId).lean();
    assert.strictEqual(dbVendor.categories.length, 3);
    assert.strictEqual(dbVendor.category, 'Dhobi');
  });

  test('3. Switching primaryCategory updates both primaryCategory and legacy category', async () => {
    const updated = await vendorAuthService.updateVendorCategories(createdVendorId, {
      categories: ['Dhobi', 'Press / Ironing', 'Tailor'],
      primaryCategory: 'Tailor',
    });

    assert.strictEqual(updated.primaryCategory, 'Tailor');
    assert.strictEqual(updated.category, 'Tailor');

    // Verify database document
    const dbVendor = await RegisteredVendor.findById(createdVendorId).lean();
    assert.strictEqual(dbVendor.primaryCategory, 'Tailor');
    assert.strictEqual(dbVendor.category, 'Tailor');
  });

  test('4. Rejection of empty categories array during update', async () => {
    await assert.rejects(
      async () => {
        await vendorAuthService.updateVendorCategories(createdVendorId, {
          categories: [],
        });
      },
      /select at least one service category/i
    );
  });

  test('5. Creating work order explicitly assigns orderCategory: Dhobi', async () => {
    const now = new Date();
    const pickupDate = new Date(now.getTime() + 86400000);
    const deliveryDate = new Date(now.getTime() + 172800000);

    const order = await laundryOrderService.createWorkOrder(testUserId, {
      vendorPhone: testPhone,
      vendorName: 'Ramesh Multi-Service Hub',
      pickupDate: pickupDate.toISOString(),
      expectedDeliveryDate: deliveryDate.toISOString(),
      items: [
        {
          wardrobeItemId: testWardrobeItemId,
          serviceType: 'WASH_AND_IRON',
        },
      ],
    });

    assert.ok(order._id, 'Order should be created');
    assert.strictEqual(order.orderCategory, 'Dhobi', 'Order category must explicitly be Dhobi');
    testOrderNumber = order.orderNumber;

    // Verify in database
    const dbOrder = await LaundryOrder.findById(order._id).lean();
    assert.strictEqual(dbOrder.orderCategory, 'Dhobi');
  });

  test('6. getVendorOrders supports category-wise filtering for vendor app switching', async () => {
    const vendorDoc = await RegisteredVendor.findById(createdVendorId);

    // 6a. Query Dhobi orders -> Should find the created order
    const dhobiOrders = await vendorService.getVendorOrders(vendorDoc, {
      category: 'Dhobi',
    });
    assert.ok(dhobiOrders.orders.length >= 1, 'Should find order under Dhobi category');
    const foundOrder = dhobiOrders.orders.find((o) => o.orderNumber === testOrderNumber);
    assert.ok(foundOrder, 'Order should be present in Dhobi category list');

    // 6b. Query Tailor orders -> Should find 0 orders (since this is a laundry order)
    const tailorOrders = await vendorService.getVendorOrders(vendorDoc, {
      category: 'Tailor',
    });
    const foundInTailor = tailorOrders.orders.find((o) => o.orderNumber === testOrderNumber);
    assert.strictEqual(foundInTailor, undefined, 'Dhobi work order should not show under Tailor category');
  });

  test('7. Direct index query on orderCategory functions efficiently', async () => {
    const directResults = await LaundryOrder.find({ orderCategory: 'Dhobi' })
      .select('orderNumber orderCategory')
      .limit(10)
      .lean();

    assert.ok(directResults.length > 0, 'Direct index query on orderCategory returns orders');
    directResults.forEach((ord) => {
      assert.strictEqual(ord.orderCategory, 'Dhobi');
    });
  });
});
