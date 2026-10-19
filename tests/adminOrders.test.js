const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const adminOrderService = require('../src/modules/admin/order/adminOrder.service');
const Order = require('../src/modules/order/order.model');
const LaundryOrder = Order;
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const User = require('../src/modules/auth/user.model');

test('Admin Order Management Service & Workflows', async (t) => {
  await connectDB();

  let testOrderId = null;
  let testOrderNumber = null;
  let testWardrobeItemId = null;
  let testUserId = null;

  // Setup test user and wardrobe item
  let user = await User.findOne({ phone: '919999111199' });
  if (!user) {
    user = await User.create({
      name: 'Order Test User',
      phone: '919999111199',
      role: 'user',
    });
  }
  testUserId = user._id;

  let wardrobeItem = await WardrobeItem.findOne({ userId: testUserId });
  if (!wardrobeItem) {
    wardrobeItem = await WardrobeItem.create({
      userId: testUserId,
      name: 'Test Blue Shirt',
      category: 'Tops',
      status: 'ACTIVE',
    });
  }
  testWardrobeItemId = wardrobeItem._id;

  // Cleanup past test orders
  await LaundryOrder.deleteMany({ userPhone: '919999111199' });

  // Create a test order
  const newOrder = await LaundryOrder.create({
    userId: testUserId,
    userName: user.name,
    userPhone: user.phone,
    vendorPhone: '919876543299',
    vendorName: 'Express Dhobi',
    orderCategory: 'LAUNDRY',
    pickupDate: new Date(),
    expectedDeliveryDate: new Date(Date.now() + 2 * 86400000),
    items: [
      {
        wardrobeItemId: testWardrobeItemId,
        name: 'Test Blue Shirt',
        category: 'Tops',
        serviceType: 'WASH_AND_IRON',
      },
    ],
    status: 'PENDING_PICKUP',
  });
  testOrderId = newOrder._id;
  testOrderNumber = newOrder.orderNumber;

  await t.test('1. getOrderStats returns valid KPI metrics', async () => {
    const stats = await adminOrderService.getOrderStats();
    assert.ok(stats.totalOrders >= 1, 'totalOrders should be at least 1');
    assert.strictEqual(typeof stats.pendingPickup, 'number');
    assert.strictEqual(typeof stats.delivered, 'number');
    assert.strictEqual(typeof stats.totalGarments, 'number');
    assert.ok(Array.isArray(stats.categoryDistribution), 'categoryDistribution must be an array');
    assert.ok(Array.isArray(stats.serviceTypeDistribution), 'serviceTypeDistribution must be an array');
  });

  await t.test('2. getAllOrders retrieves orders with pagination & search filter', async () => {
    const res = await adminOrderService.getAllOrders({
      search: 'Order Test User',
      page: 1,
      limit: 10,
    });

    assert.ok(Array.isArray(res.orders), 'orders should be array');
    assert.ok(res.orders.length >= 1, 'Should find at least 1 order');
    assert.strictEqual(res.pagination.currentPage, 1);
    const found = res.orders.find((o) => o._id.toString() === testOrderId.toString());
    assert.ok(found, 'Should find created test order');
    assert.strictEqual(found.userName, 'Order Test User');
  });

  await t.test('3. getAllOrders category filter works', async () => {
    const res = await adminOrderService.getAllOrders({
      category: 'LAUNDRY',
      status: 'PENDING_PICKUP',
    });

    assert.ok(res.orders.length >= 1);
    const found = res.orders.find((o) => o._id.toString() === testOrderId.toString());
    assert.ok(found);
  });

  await t.test('4. getOrderById fetches full order by ID and orderNumber', async () => {
    const byId = await adminOrderService.getOrderById(testOrderId);
    assert.strictEqual(byId.orderNumber, testOrderNumber);
    assert.strictEqual(byId.items.length, 1);

    const byNumber = await adminOrderService.getOrderById(testOrderNumber);
    assert.strictEqual(byNumber._id.toString(), testOrderId.toString());
  });

  await t.test('5. updateOrderStatus updates status with ADMIN changedBy and syncs wardrobe item', async () => {
    // 5a. Move to IN_PROCESS
    const updated = await adminOrderService.updateOrderStatus(testOrderId, {
      status: 'IN_PROCESS',
      note: 'Admin verified items are in washing machine',
    });

    assert.strictEqual(updated.status, 'IN_PROCESS');
    const lastHistory = updated.statusHistory[updated.statusHistory.length - 1];
    assert.strictEqual(lastHistory.status, 'IN_PROCESS');
    assert.strictEqual(lastHistory.changedBy, 'ADMIN');

    // Verify wardrobe item became INACTIVE
    const itemInProcess = await WardrobeItem.findById(testWardrobeItemId);
    assert.strictEqual(itemInProcess.status, 'INACTIVE');

    // 5b. Move to DELIVERED
    const deliveredOrder = await adminOrderService.updateOrderStatus(testOrderId, {
      status: 'DELIVERED',
      note: 'Admin marked delivered after confirmation call',
    });

    assert.strictEqual(deliveredOrder.status, 'DELIVERED');

    // Verify wardrobe item reverted to ACTIVE
    const itemDelivered = await WardrobeItem.findById(testWardrobeItemId);
    assert.strictEqual(itemDelivered.status, 'ACTIVE');
  });

  await t.test('6. updateOrderStatus rejects invalid status', async () => {
    await assert.rejects(
      async () => {
        await adminOrderService.updateOrderStatus(testOrderId, {
          status: 'INVALID_STATUS',
        });
      },
      /Invalid status/i
    );
  });

  // Cleanup
  await LaundryOrder.deleteMany({ userPhone: '919999111199' });
  await WardrobeItem.deleteMany({ userId: testUserId });
  await User.deleteMany({ phone: '919999111199' });
  await mongoose.connection.close();
});
