const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../src/config/env.config');
const Order = require('../src/modules/order/order.model');
const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');

describe('Order Price Snapshot Verification: Past orders do NOT change when vendor changes rates', () => {
  const testVendorPhone = '919111222333';
  const testUserId = new mongoose.Types.ObjectId();
  let vendorId;
  let day1OrderId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }
  });

  after(async () => {
    if (day1OrderId) await Order.deleteOne({ _id: day1OrderId });
    if (vendorId) await RegisteredVendor.deleteOne({ _id: vendorId });
  });

  test('Step 1: Setup Vendor with Wash & Iron price = ₹10', async () => {
    await RegisteredVendor.deleteOne({ phone: testVendorPhone });
    const vendor = await RegisteredVendor.create({
      phone: testVendorPhone,
      name: 'Ramesh Dhobi Test',
      category: 'Dhobi',
      isRegistered: true,
      services: [
        {
          name: 'Wash and Iron',
          code: 'WASH_AND_IRON',
          price: 10,
          isOffered: true,
        },
      ],
    });
    vendorId = vendor._id;
    assert.strictEqual(vendor.services[0].price, 10);
  });

  test('Step 2: Customer creates Order on Day 1 locked at ₹10', async () => {
    const day1Order = await Order.create({
      userId: testUserId,
      userName: 'Price Lock Customer',
      userPhone: '919876543210',
      vendorId,
      vendorPhone: testVendorPhone,
      vendorName: 'Ramesh Dhobi Test',
      orderCategory: 'Dhobi',
      orderType: 'LAUNDRY_WORK_ORDER',
      items: [
        {
          name: 'Cotton White Shirt',
          serviceName: 'Wash and Iron',
          serviceType: 'WASH_AND_IRON',
          price: 10, // Price snapshotted at time of placement
          quantity: 1,
        },
      ],
      subtotal: 10,
      totalAmount: 10,
      status: 'PENDING_PICKUP',
    });

    day1OrderId = day1Order._id;
    assert.strictEqual(day1Order.items[0].price, 10);
    assert.strictEqual(day1Order.totalAmount, 10);
  });

  test('Step 3: Vendor updates their service catalog price on Day 2 from ₹10 to ₹20', async () => {
    await RegisteredVendor.updateOne(
      { _id: vendorId },
      {
        $set: {
          'services.0.price': 20,
        },
      }
    );

    const vendor = await RegisteredVendor.findById(vendorId);
    assert.strictEqual(vendor.services[0].price, 20, 'Vendor catalog is now ₹20');
  });

  test('Step 4: Past order is fetched: price remains strictly ₹10 (does NOT increase to ₹20)', async () => {
    const fetchedOrder = await Order.findById(day1OrderId);

    assert.ok(fetchedOrder, 'Order exists in database');
    assert.strictEqual(
      fetchedOrder.items[0].price,
      10,
      'VERIFIED: Order item price is still ₹10 (NOT ₹20)'
    );
    assert.strictEqual(
      fetchedOrder.totalAmount,
      10,
      'VERIFIED: Total order cost is still ₹10'
    );
  });
});
