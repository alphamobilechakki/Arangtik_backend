const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const Order = require('../src/modules/order/order.model');
const Transaction = require('../src/modules/order/transaction.model');
const transactionService = require('../src/modules/order/transaction.service');
const vendorService = require('../src/modules/vendor/vendor.service');
const laundryOrderService = require('../src/modules/order/laundry/laundryOrder.service');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const fs = require('fs');

test('Order Payment & Transaction Synchronization Suite', async (t) => {
  await connectDB();

  const testUserId = new mongoose.Types.ObjectId();
  const unauthorizedUserId = new mongoose.Types.ObjectId();
  const testVendorId = new mongoose.Types.ObjectId();
  const unauthorizedVendorId = new mongoose.Types.ObjectId();
  const testVendorPhone = '9991112233';

  const mockVendorObj = {
    _id: testVendorId,
    phone: testVendorPhone,
    name: 'Sharma Dry Cleaners',
  };

  const mockUnauthorizedVendorObj = {
    _id: unauthorizedVendorId,
    phone: '8880001122',
    name: 'Other Vendor',
  };

  // Helper to create test order
  const createTestOrder = async (extra = {}) => {
    const order = await Order.create({
      userId: testUserId,
      userName: 'Rahul Verma',
      userPhone: '9876543210',
      vendorId: testVendorId,
      vendorPhone: testVendorPhone,
      vendorName: 'Sharma Dry Cleaners',
      orderCategory: 'Laundry',
      pickupDate: new Date(),
      expectedDeliveryDate: new Date(Date.now() + 86400000),
      items: [
        {
          wardrobeItemId: new mongoose.Types.ObjectId(),
          name: 'Silk Kurta',
          serviceType: 'WASH_AND_IRON',
          price: 150,
          quantity: 2,
        },
      ],
      subtotal: 300,
      totalAmount: 300,
      status: 'PENDING_PICKUP',
      ...extra,
    });

    // Synchronize initial transaction like in laundryOrder.service
    await transactionService.syncOrderTransaction(order, {
      status: order.payment?.status || 'UNPAID',
      updatedBy: 'USER',
      note: 'Test order creation',
    });

    return order;
  };

  await t.test('1. Default order payment status is UNPAID and Transaction record is created', async () => {
    const order = await createTestOrder();
    assert.strictEqual(order.payment?.status, 'UNPAID');

    const txn = await Transaction.findOne({ orderId: order._id });
    assert.ok(txn, 'Transaction record must exist');
    assert.strictEqual(txn.status, 'UNPAID');
    assert.strictEqual(txn.amount, 300);
    assert.strictEqual(txn.vendorPhone, testVendorPhone);
    assert.strictEqual(txn.orderNumber, order.orderNumber);
    assert.ok(txn.transactionNumber.startsWith('TXN-'));
  });

  await t.test('2. Vendor can update payment status to PAID when order is DELIVERED', async () => {
    const order = await createTestOrder({ status: 'DELIVERED', deliveredAt: new Date() });
    const result = await transactionService.updateOrderPaymentStatus({
      orderId: order._id,
      status: 'PAID',
      actorType: 'VENDOR',
      actorId: mockVendorObj,
      note: 'Payment received',
    });

    assert.strictEqual(result.order.payment.status, 'PAID');
    assert.strictEqual(result.order.payment.updatedBy, 'VENDOR');
    assert.ok(result.order.payment.paidAt, 'paidAt timestamp must be set');

    // Verify transaction document was synchronized
    const txn = await Transaction.findOne({ orderId: order._id });
    assert.strictEqual(txn.status, 'PAID');
    assert.strictEqual(txn.updatedBy, 'VENDOR');
    assert.ok(txn.paidAt, 'paidAt must be set in Transaction');
  });

  await t.test('3. Enforce DELIVERED status and one-time payment update immutability', async () => {
    const order = await createTestOrder({ status: 'IN_PROCESS' });

    // a) Attempting to update payment before order is DELIVERED throws 400
    await assert.rejects(
      async () => {
        await transactionService.updateOrderPaymentStatus({
          orderId: order._id,
          status: 'PAID',
          actorType: 'USER',
          actorId: testUserId,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /not yet DELIVERED/i);
        return true;
      }
    );

    // Now set order to DELIVERED
    order.status = 'DELIVERED';
    order.deliveredAt = new Date();
    await order.save();

    // b) Customer updates payment to PAID on DELIVERED order -> succeeds
    const resPaid = await transactionService.updateOrderPaymentStatus({
      orderId: order._id,
      status: 'PAID',
      actorType: 'USER',
      actorId: testUserId,
      note: 'Paid at delivery',
    });
    assert.strictEqual(resPaid.order.payment.status, 'PAID');
    assert.strictEqual(resPaid.transaction.status, 'PAID');

    // c) Attempting to change payment status again after it is already PAID throws 400
    await assert.rejects(
      async () => {
        await transactionService.updateOrderPaymentStatus({
          orderId: order._id,
          status: 'UNPAID',
          actorType: 'USER',
          actorId: testUserId,
          note: 'Reversing payment',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /already been marked as PAID and cannot be changed/i);
        return true;
      }
    );
  });

  await t.test('4. Unauthorized user or vendor cannot update payment status (throws 403)', async () => {
    const order = await createTestOrder();

    await assert.rejects(
      async () => {
        await transactionService.updateOrderPaymentStatus({
          orderId: order._id,
          status: 'PAID',
          actorType: 'USER',
          actorId: unauthorizedUserId,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /only update payment status for your own orders/i);
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await transactionService.updateOrderPaymentStatus({
          orderId: order._id,
          status: 'PAID',
          actorType: 'VENDOR',
          actorId: mockUnauthorizedVendorObj,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /not assigned to your vendor account/i);
        return true;
      }
    );
  });

  await t.test('5. Vendor marks order as DELIVERED with paymentStatus PAID in single flow', async () => {
    const order = await createTestOrder({ status: 'READY_FOR_DELIVERY' });

    // a) Attempting to set paymentStatus when status is NOT DELIVERED throws 400
    await assert.rejects(
      async () => {
        await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
          status: 'IN_PROCESS',
          paymentStatus: 'PAID',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /not yet DELIVERED/i);
        return true;
      }
    );

    // b) Setting DELIVERED with paymentStatus PAID succeeds
    const updated = await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      note: 'Delivered and payment collected',
    });

    assert.strictEqual(updated.status, 'DELIVERED');
    assert.strictEqual(updated.payment.status, 'PAID');
    assert.ok(updated.deliveredAt);

    const txn = await Transaction.findOne({ orderId: order._id });
    assert.strictEqual(txn.status, 'PAID');

    // c) Attempting to change paymentStatus on already PAID order throws 400
    await assert.rejects(
      async () => {
        await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
          status: 'DELIVERED',
          paymentStatus: 'UNPAID',
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /already been marked as PAID and cannot be changed/i);
        return true;
      }
    );
  });

  await t.test('6. Vendor can retrieve transactions list with aggregation metrics & filtering', async () => {
    // Create 2 orders: one PAID and one UNPAID (both DELIVERED)
    const o1 = await createTestOrder({ totalAmount: 500, status: 'DELIVERED' });
    const o2 = await createTestOrder({ totalAmount: 700, status: 'DELIVERED' });

    await transactionService.updateOrderPaymentStatus({
      orderId: o1._id,
      status: 'PAID',
      actorType: 'VENDOR',
      actorId: mockVendorObj,
    });

    const res = await transactionService.getVendorTransactions(mockVendorObj, {
      status: 'ALL',
      limit: 50,
    });

    assert.ok(Array.isArray(res.transactions));
    assert.ok(res.transactions.length >= 2);
    assert.ok(res.stats.totalTransactions >= 2);
    assert.ok(res.stats.paidCount >= 1);
    assert.ok(res.stats.paidAmount >= 500);
    assert.ok(res.stats.unpaidCount >= 1);

    // Test filter by status = 'PAID'
    const paidOnly = await transactionService.getVendorTransactions(mockVendorObj, {
      status: 'PAID',
    });
    for (const t of paidOnly.transactions) {
      assert.strictEqual(t.status, 'PAID');
    }

    // Test filter by status = 'UNPAID'
    const unpaidOnly = await transactionService.getVendorTransactions(mockVendorObj, {
      status: 'UNPAID',
    });
    for (const t of unpaidOnly.transactions) {
      assert.strictEqual(t.status, 'UNPAID');
    }
  });

  await t.test('7. Invalid payment status throws 400', async () => {
    const order = await createTestOrder({ status: 'DELIVERED' });
    await assert.rejects(
      async () => {
        await transactionService.updateOrderPaymentStatus({
          orderId: order._id,
          status: 'INVALID_STATUS',
          actorType: 'VENDOR',
          actorId: mockVendorObj,
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  await t.test('8. Partial delivery workflow (5 dresses, 3 delivered): status PARTIALLY_DELIVERED, deliveredAmount calculation, partial wardrobe sync, and transaction sync', async () => {
    // Create 5 wardrobe items
    const wardrobeDocs = await WardrobeItem.create([
      { userId: testUserId, name: 'Silk Kurta 1', category: 'Traditional', status: 'INACTIVE' },
      { userId: testUserId, name: 'Silk Kurta 2', category: 'Traditional', status: 'INACTIVE' },
      { userId: testUserId, name: 'Silk Kurta 3', category: 'Traditional', status: 'INACTIVE' },
      { userId: testUserId, name: 'Linen Shirt 4', category: 'Formal', status: 'INACTIVE' },
      { userId: testUserId, name: 'Linen Shirt 5', category: 'Formal', status: 'INACTIVE' },
    ]);

    const items = [
      { wardrobeItemId: wardrobeDocs[0]._id, name: 'Silk Kurta 1', price: 100, serviceType: 'DRY_CLEAN' },
      { wardrobeItemId: wardrobeDocs[1]._id, name: 'Silk Kurta 2', price: 100, serviceType: 'DRY_CLEAN' },
      { wardrobeItemId: wardrobeDocs[2]._id, name: 'Silk Kurta 3', price: 100, serviceType: 'DRY_CLEAN' },
      { wardrobeItemId: wardrobeDocs[3]._id, name: 'Linen Shirt 4', price: 150, serviceType: 'STEAM_IRON' },
      { wardrobeItemId: wardrobeDocs[4]._id, name: 'Linen Shirt 5', price: 150, serviceType: 'STEAM_IRON' },
    ];

    const order = await createTestOrder({
      status: 'IN_PROCESS',
      items,
      totalItems: 5,
      subtotal: 600,
      totalAmount: 600,
    });

    // Vendor updates status to PARTIALLY_DELIVERED (delivering first 3 items: Silk Kurta 1, 2, 3)
    const deliveredIds = [wardrobeDocs[0]._id, wardrobeDocs[1]._id, wardrobeDocs[2]._id];
    const updated = await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
      status: 'PARTIALLY_DELIVERED',
      deliveredItemIds: deliveredIds,
      note: 'Delivered 3 Kurtas, 2 Shirts remaining',
    });

    assert.strictEqual(updated.status, 'PARTIALLY_DELIVERED');
    assert.strictEqual(updated.deliveredItemsCount, 3);
    assert.strictEqual(updated.deliveredAmount, 300);

    // Verify item-level status
    assert.strictEqual(updated.items[0].status, 'DELIVERED');
    assert.strictEqual(updated.items[1].status, 'DELIVERED');
    assert.strictEqual(updated.items[2].status, 'DELIVERED');
    assert.strictEqual(updated.items[3].status, 'PENDING');
    assert.strictEqual(updated.items[4].status, 'PENDING');

    // Verify partial wardrobe sync: delivered 3 are ACTIVE, remaining 2 are INACTIVE
    const w1 = await WardrobeItem.findById(wardrobeDocs[0]._id);
    const w2 = await WardrobeItem.findById(wardrobeDocs[1]._id);
    const w3 = await WardrobeItem.findById(wardrobeDocs[2]._id);
    const w4 = await WardrobeItem.findById(wardrobeDocs[3]._id);
    const w5 = await WardrobeItem.findById(wardrobeDocs[4]._id);

    assert.strictEqual(w1.status, 'ACTIVE');
    assert.strictEqual(w2.status, 'ACTIVE');
    assert.strictEqual(w3.status, 'ACTIVE');
    assert.strictEqual(w4.status, 'INACTIVE');
    assert.strictEqual(w5.status, 'INACTIVE');

    // Verify transaction synchronization for partial delivery
    const txn = await Transaction.findOne({ orderId: order._id });
    assert.ok(txn);
    assert.strictEqual(txn.orderStatus, 'PARTIALLY_DELIVERED');
    assert.strictEqual(txn.amount, 300); // Delivered amount payable
    assert.strictEqual(txn.totalAmount, 600);
    assert.strictEqual(txn.deliveredAmount, 300);
    assert.strictEqual(txn.deliveredItemsCount, 3);
    assert.strictEqual(txn.totalItems, 5);
    assert.strictEqual(txn.status, 'UNPAID');

    // Verify vendor CAN mark payment as PAID for PARTIALLY_DELIVERED order
    const paidResult = await transactionService.updateOrderPaymentStatus({
      orderId: order._id,
      status: 'PAID',
      actorType: 'VENDOR',
      actorId: mockVendorObj,
    });

    assert.strictEqual(paidResult.order.payment.status, 'PAID');
    assert.strictEqual(paidResult.transaction.status, 'PAID');
    assert.ok(paidResult.transaction.paidAt);

    // Verify PDF was generated and contains file on disk
    if (paidResult.order.pdfPath) {
      assert.ok(fs.existsSync(paidResult.order.pdfPath));
    }

    // Cleanup wardrobe docs
    await WardrobeItem.deleteMany({ _id: { $in: wardrobeDocs.map((w) => w._id) } });
  });

  await t.test('9. Full delivery of remaining garments advances status to DELIVERED and all wardrobe items become ACTIVE', async () => {
    const wardrobeDocs = await WardrobeItem.create([
      { userId: testUserId, name: 'Garment A', category: 'General', status: 'INACTIVE' },
      { userId: testUserId, name: 'Garment B', category: 'General', status: 'INACTIVE' },
    ]);

    const order = await createTestOrder({
      status: 'PARTIALLY_DELIVERED',
      deliveredItemsCount: 1,
      deliveredAmount: 200,
      items: [
        { wardrobeItemId: wardrobeDocs[0]._id, name: 'Garment A', price: 200, status: 'DELIVERED' },
        { wardrobeItemId: wardrobeDocs[1]._id, name: 'Garment B', price: 200, status: 'PENDING' },
      ],
      totalItems: 2,
      totalAmount: 400,
    });

    // Deliver all remaining items
    const updated = await vendorService.updateVendorOrderStatus(mockVendorObj, order._id, {
      status: 'DELIVERED',
      note: 'All garments delivered',
    });

    assert.strictEqual(updated.status, 'DELIVERED');
    assert.strictEqual(updated.deliveredItemsCount, 2);
    assert.strictEqual(updated.deliveredAmount, 400);

    const wA = await WardrobeItem.findById(wardrobeDocs[0]._id);
    const wB = await WardrobeItem.findById(wardrobeDocs[1]._id);
    assert.strictEqual(wA.status, 'ACTIVE');
    assert.strictEqual(wB.status, 'ACTIVE');

    await WardrobeItem.deleteMany({ _id: { $in: wardrobeDocs.map((w) => w._id) } });
  });

  t.after(async () => {
    await Order.deleteMany({ userId: testUserId });
    await Transaction.deleteMany({ vendorPhone: testVendorPhone });
    await mongoose.connection.close();
  });
});
