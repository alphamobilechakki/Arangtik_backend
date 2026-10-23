const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env.config');

const Order = require('../src/modules/order/order.model');
const orderService = require('../src/modules/order/order.service');
const User = require('../src/modules/auth/user.model');
const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');

describe('Universal Orders Collection (orders) Tests', () => {
  const testPhone = '919888877771';
  let testUserId;
  let createdKitchenOrderId;
  let createdDhobiOrderId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Setup test user
    let user = await User.findOne({ phone: testPhone });
    if (!user) {
      user = await User.create({
        phone: testPhone,
        name: 'Universal Order Tester',
        isProfileComplete: true,
      });
    }
    testUserId = user._id;

    // Clean up test orders
    await Order.deleteMany({ userPhone: testPhone });
  });

  after(async () => {
    await Order.deleteMany({ userPhone: testPhone });
    if (testUserId) {
      await User.findByIdAndDelete(testUserId);
    }
    await mongoose.disconnect();
  });

  test('1. Order model targets universal "orders" collection in MongoDB', () => {
    assert.strictEqual(Order.collection.name, 'orders');
  });

  test('2. Create Dhobi Laundry Order in universal orders collection', async () => {
    const dhobiOrder = await Order.create({
      userId: testUserId,
      userName: 'Universal Order Tester',
      userPhone: testPhone,
      orderCategory: 'Dhobi',
      orderType: 'SERVICE',
      vendorName: 'Ramu Dhobi',
      vendorPhone: '919876543210',
      isRegisteredVendor: true,
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000),
      items: [
        {
          name: 'Blue Denim Jeans',
          serviceType: 'WASH_AND_IRON',
          color: 'Blue',
          fabric: 'Denim',
        },
      ],
      status: 'PENDING_PICKUP',
    });

    assert.ok(dhobiOrder._id);
    assert.strictEqual(dhobiOrder.orderCategory, 'Dhobi');
    assert.ok(dhobiOrder.orderNumber.startsWith('WO-'));
    createdDhobiOrderId = dhobiOrder._id;
  });

  test('3. Create Future Kitchen / Food Order in the EXACT SAME universal orders collection', async () => {
    const kitchenOrder = await Order.create({
      userId: testUserId,
      userName: 'Universal Order Tester',
      userPhone: testPhone,
      orderCategory: 'Kitchen',
      orderType: 'PRODUCT',
      vendorName: 'Annapurna Tiffin Center',
      vendorPhone: '919876543211',
      isRegisteredVendor: true,
      expectedDeliveryDate: new Date(Date.now() + 7200000),
      items: [
        {
          name: 'Special North Indian Thali',
          quantity: 2,
          price: 180,
          specialInstructions: 'Less spicy please',
        },
      ],
      totalAmount: 360,
      payment: {
        method: 'ONLINE',
        status: 'PAID',
        transactionId: 'TXN-982189421',
      },
      status: 'PENDING_PICKUP',
    });

    assert.ok(kitchenOrder._id);
    assert.strictEqual(kitchenOrder.orderCategory, 'Kitchen');
    assert.ok(kitchenOrder.orderNumber.startsWith('ORD-'));
    assert.strictEqual(kitchenOrder.totalAmount, 360);
    createdKitchenOrderId = kitchenOrder._id;
  });

  test('4. Universal getUserOrders returns BOTH Dhobi and Kitchen orders for customer', async () => {
    const result = await orderService.getUserOrders(testUserId);
    assert.ok(result.orders.length >= 2, 'Customer should see both Dhobi and Kitchen orders');

    const categoriesFound = result.orders.map((o) => o.orderCategory);
    assert.ok(categoriesFound.includes('Dhobi'), 'Dhobi order should be in universal list');
    assert.ok(categoriesFound.includes('Kitchen'), 'Kitchen order should be in universal list');
  });

  test('5. Category filter isolates orders per active mobile tab', async () => {
    // 5a. Filter Kitchen orders only
    const kitchenOnly = await orderService.getUserOrders(testUserId, { category: 'Kitchen' });
    assert.strictEqual(kitchenOnly.orders.length, 1);
    assert.strictEqual(kitchenOnly.orders[0].orderCategory, 'Kitchen');

    // 5b. Filter Dhobi orders only
    const dhobiOnly = await orderService.getUserOrders(testUserId, { category: 'Dhobi' });
    assert.ok(dhobiOnly.orders.length >= 1);
    dhobiOnly.orders.forEach((o) => {
      assert.strictEqual(o.orderCategory, 'Dhobi');
    });
  });

  test('6. Customer can cancel PENDING_PICKUP order via cancelOrder', async () => {
    const cancelled = await orderService.cancelOrder(testUserId, createdKitchenOrderId, {
      reason: 'Need to change delivery location',
    });

    assert.strictEqual(cancelled.status, 'CANCELLED');
    const lastHistory = cancelled.statusHistory[cancelled.statusHistory.length - 1];
    assert.strictEqual(lastHistory.status, 'CANCELLED');
    assert.strictEqual(lastHistory.changedBy, 'USER');
    assert.ok(lastHistory.note.includes('Need to change delivery location'));
  });

  test('7. Rejection of cancellation for already cancelled order', async () => {
    await assert.rejects(
      async () => {
        await orderService.cancelOrder(testUserId, createdKitchenOrderId, {
          reason: 'Double cancel',
        });
      },
      /cannot be cancelled in 'CANCELLED' state/i
    );
  });
});
