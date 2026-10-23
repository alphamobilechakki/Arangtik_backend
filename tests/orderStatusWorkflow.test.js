const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const LaundryOrder = require('../src/modules/order/order.model');
const laundryOrderService = require('../src/modules/order/laundry/laundryOrder.service');
const vendorService = require('../src/modules/vendor/vendor.service');
const User = require('../src/modules/auth/user.model');
const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');

test('Order Status Rules: User Cancel vs Vendor Reject and 4-step workflow', async (t) => {
  await connectDB();

  // Create temporary test user and vendor
  const testUserId = new mongoose.Types.ObjectId();
  const testVendorId = new mongoose.Types.ObjectId();
  const testVendorPhone = '9998887771';

  const mockVendorObj = {
    _id: testVendorId,
    phone: testVendorPhone,
    name: 'Test Dhobi Vendor',
  };

  // Helper to create a test order in PENDING_PICKUP
  const createTestOrder = async () => {
    return await LaundryOrder.create({
      userId: testUserId,
      userName: 'Test Customer',
      userPhone: '9876543210',
      vendorId: testVendorId,
      vendorPhone: testVendorPhone,
      vendorName: 'Test Dhobi Vendor',
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000),
      items: [
        {
          wardrobeItemId: new mongoose.Types.ObjectId(),
          name: 'Test Shirt',
          serviceType: 'WASH_AND_IRON',
        },
      ],
      status: 'PENDING_PICKUP',
    });
  };

  await t.test('Vendor CANNOT cancel an order (must throw 400)', async () => {
    const order = await createTestOrder();
    await assert.rejects(
      async () => {
        await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
          status: 'CANCELLED',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Vendors cannot cancel/i);
        return true;
      }
    );
  });

  await t.test('Vendor CAN reject an order with a reason', async () => {
    const order = await createTestOrder();
    const updated = await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
      status: 'REJECTED',
      note: 'Shop is overloaded today',
    });

    assert.strictEqual(updated.status, 'REJECTED');
    const lastHistory = updated.statusHistory[updated.statusHistory.length - 1];
    assert.strictEqual(lastHistory.status, 'REJECTED');
    assert.strictEqual(lastHistory.changedBy, 'VENDOR');
    assert.strictEqual(lastHistory.note, 'Shop is overloaded today');
  });

  await t.test('User CANNOT reject an order (must throw 400)', async () => {
    const order = await createTestOrder();
    await assert.rejects(
      async () => {
        await laundryOrderService.updateOrderStatus(testUserId, order._id, {
          status: 'REJECTED',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Customers cannot reject/i);
        return true;
      }
    );
  });

  await t.test('User CAN cancel an order with a reason', async () => {
    const order = await createTestOrder();
    const updated = await laundryOrderService.updateOrderStatus(testUserId, order._id, {
      status: 'CANCELLED',
      note: 'Changed my mind',
    });

    assert.strictEqual(updated.status, 'CANCELLED');
    const lastHistory = updated.statusHistory[updated.statusHistory.length - 1];
    assert.strictEqual(lastHistory.status, 'CANCELLED');
    assert.strictEqual(lastHistory.changedBy, 'USER');
    assert.strictEqual(lastHistory.note, 'Changed my mind');
  });

  await t.test('4-Step Workflow progression: PENDING_PICKUP -> PICKED_UP -> IN_PROCESS -> DELIVERED', async () => {
    const order = await createTestOrder();
    assert.strictEqual(order.status, 'PENDING_PICKUP');

    // Step 2: Picked up by vendor
    const step2 = await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
      status: 'PICKED_UP',
    });
    assert.strictEqual(step2.status, 'PICKED_UP');

    // Step 3: In Process (Washing / Ironing)
    const step3 = await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
      status: 'IN_PROCESS',
    });
    assert.strictEqual(step3.status, 'IN_PROCESS');

    // Step 4: Delivered
    const step4 = await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
      status: 'DELIVERED',
    });
    assert.strictEqual(step4.status, 'DELIVERED');

    // Terminal check: User cannot cancel delivered order
    await assert.rejects(
      async () => {
        await laundryOrderService.updateOrderStatus(testUserId, order._id, {
          status: 'CANCELLED',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Cannot cancel/i);
        return true;
      }
    );

    // Terminal check: Vendor cannot reject delivered order
    await assert.rejects(
      async () => {
        await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
          status: 'REJECTED',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /Cannot reject/i);
        return true;
      }
    );
  });

  // Cleanup
  await LaundryOrder.deleteMany({ userId: testUserId });
  await mongoose.disconnect();
});
