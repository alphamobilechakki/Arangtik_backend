const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const { MONGODB_URI, JWT_SECRET } = require('../src/config/env.config');
const User = require('../src/modules/auth/user.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const Vendor = require('../src/modules/vendor/vendor.model');
const UnregisteredVendor = require('../src/modules/vendor/unregisteredVendor.model');
const LaundryOrder = require('../src/modules/laundry/laundryOrder.model');
const vendorService = require('../src/modules/vendor/vendor.service');
const laundryOrderService = require('../src/modules/laundry/laundryOrder.service');
const laundryPdfService = require('../src/modules/laundry/laundryPdf.service');
const laundryWhatsappService = require('../src/modules/laundry/laundryWhatsapp.service');

describe('Arangtik Laundry & Work Order Module Tests', () => {
  let testUser;
  let otherUser;
  let testItem1;
  let testItem2;
  let registeredVendor;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Clean up test collections for isolated run
    await User.deleteMany({ phone: { $in: ['919888800001', '919888800002', '919888800003'] } });
    await Vendor.deleteMany({ phone: { $in: ['919888811111', '919888822222', '919888833333'] } });
    await UnregisteredVendor.deleteMany({ phone: { $in: ['919888822222', '919888833333'] } });
    await LaundryOrder.deleteMany({ userPhone: '919888800001' });

    // Create primary test user
    testUser = await User.create({
      phone: '919888800001',
      name: 'Rahul Sharma',
      role: 'user',
    });

    // Create another user to test unauthorized access
    otherUser = await User.create({
      phone: '919888800002',
      name: 'Sneha Patel',
      role: 'user',
    });

    // Create sample wardrobe items
    testItem1 = await WardrobeItem.create({
      userId: testUser._id,
      name: 'Classic White Linen Shirt',
      category: 'UPPER_WEAR',
      color: 'White',
      fabric: 'Linen',
      sourceType: 'MANUAL_UPLOAD',
      images: [
        {
          url: 'https://api.arangtik.com/uploads/sample-white-shirt.jpg',
          isPrimary: true,
          type: 'ORIGINAL',
        },
      ],
    });

    testItem2 = await WardrobeItem.create({
      userId: testUser._id,
      name: 'Navy Blue Formal Blazer',
      category: 'OUTERWEAR',
      color: 'Navy Blue',
      fabric: 'Wool Blend',
      sourceType: 'MANUAL_UPLOAD',
      images: [
        {
          url: 'https://api.arangtik.com/uploads/sample-blazer.jpg',
          isPrimary: true,
          type: 'ORIGINAL',
        },
      ],
    });

    // Create a pre-registered vendor
    registeredVendor = await Vendor.create({
      name: 'CleanWash Laundry Hub',
      phone: '919888811111',
      businessName: 'CleanWash Express',
      status: 'ACTIVE',
    });
  });

  after(async () => {
    // Cleanup created test records
    if (testUser) await User.deleteMany({ _id: { $in: [testUser._id, otherUser._id] } });
    if (testItem1) await WardrobeItem.deleteMany({ _id: { $in: [testItem1._id, testItem2._id] } });
    await Vendor.deleteMany({ phone: { $in: ['919888811111', '919888822222', '919888833333'] } });
    await UnregisteredVendor.deleteMany({ phone: { $in: ['919888822222', '919888833333'] } });
    await LaundryOrder.deleteMany({ userPhone: '919888800001' });
    await mongoose.disconnect();
  });

  // ==========================================
  // Test 1: Vendor Lookup (Requirement 5 & 6)
  // ==========================================
  it('1. Correctly identifies a registered vendor by phone and returns their name & details', async () => {
    const lookup = await vendorService.lookupVendor('9888811111', testUser._id);
    assert.equal(lookup.isRegistered, true);
    assert.equal(lookup.vendor.name, 'CleanWash Laundry Hub');
    assert.equal(lookup.vendor.phone, '919888811111');
    assert.ok(lookup.vendor.vendorId.startsWith('VND-'));
  });

  it('2. Correctly flags unregistered phone numbers and returns isRegistered: false', async () => {
    const lookup = await vendorService.lookupVendor('9888822222', testUser._id);
    assert.equal(lookup.isRegistered, false);
    assert.equal(lookup.vendor.name, '');
    assert.equal(lookup.vendor.phone, '919888822222');
  });

  // ==========================================
  // Test 2: Work Order Creation & Validation (Requirements 1, 2, 3, 7, 8)
  // ==========================================
  it('3. Successfully creates a Work Order with registered vendor, snapshots garments, and sets PENDING_PICKUP status', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);

    const orderPayload = {
      vendorPhone: '9888811111',
      vendorName: 'CleanWash Laundry Hub',
      pickupDate: tomorrow.toISOString(),
      expectedDeliveryDate: deliveryDate.toISOString(),
      items: [
        {
          wardrobeItemId: testItem1._id,
          serviceType: 'WASH_AND_IRON',
          specialInstructions: 'Handle collar with care',
        },
        {
          wardrobeItemId: testItem2._id,
          serviceType: 'DRY_CLEAN',
          specialInstructions: 'Steam press only',
        },
      ],
      specialInstructions: 'Please ring doorbell on arrival',
    };

    const order = await laundryOrderService.createWorkOrder(testUser._id, orderPayload);

    assert.ok(order._id);
    assert.ok(order.orderNumber.startsWith('WO-'));
    assert.equal(order.status, 'PENDING_PICKUP');
    assert.equal(order.isRegisteredVendor, true);
    assert.equal(order.vendorPhone, '919888811111');
    assert.equal(order.userName, 'Rahul Sharma');
    assert.equal(order.items.length, 2);
    assert.equal(order.items[0].name, 'Classic White Linen Shirt');
    assert.equal(order.items[1].name, 'Navy Blue Formal Blazer');
    assert.equal(order.totalItems, 2);
    assert.ok(order.pdfUrl.includes('.pdf'));

    // Verify PDF file exists on local filesystem
    assert.ok(order.pdfPath);
    assert.ok(fs.existsSync(order.pdfPath));

    // Verify WhatsApp template selected is registered vendor template (or fallback during review)
    assert.ok(
      ['vendors_order_registereds', 'vendors_order_registered'].includes(
        order.whatsappNotification.templateUsed
      )
    );
  });

  it('4. Successfully creates Work Order with unregistered vendor and stores in UnregisteredVendor table', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1);
    const delDate = new Date();
    delDate.setDate(delDate.getDate() + 2);

    const orderPayload = {
      vendorPhone: '9888822222',
      vendorName: 'Local Dhobi Ramu',
      pickupDate: pickupDate.toISOString(),
      expectedDeliveryDate: delDate.toISOString(),
      itemIds: [testItem1._id],
    };

    const order = await laundryOrderService.createWorkOrder(testUser._id, orderPayload);

    assert.equal(order.isRegisteredVendor, false);
    assert.equal(order.vendorPhone, '919888822222');
    assert.equal(order.vendorName, 'Local Dhobi Ramu');
    assert.ok(
      ['vendors_order_unregistereds', 'vendors_order_unregistered'].includes(
        order.whatsappNotification.templateUsed
      )
    );

    // Verify UnregisteredVendor table has the record
    const unreg = await UnregisteredVendor.findOne({ phone: '919888822222' });
    assert.ok(unreg);
    assert.equal(unreg.name, 'Local Dhobi Ramu');
    assert.equal(unreg.isConvertedToRegistered, false);
    assert.equal(unreg.totalOrders, 1);
  });

  it('5. Validates and rejects order creation when delivery date is before pickup date', async () => {
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 3);
    const pastDeliveryDate = new Date();
    pastDeliveryDate.setDate(pastDeliveryDate.getDate() + 1);

    await assert.rejects(
      async () => {
        await laundryOrderService.createWorkOrder(testUser._id, {
          vendorPhone: '9888811111',
          vendorName: 'CleanWash',
          pickupDate: pickupDate.toISOString(),
          expectedDeliveryDate: pastDeliveryDate.toISOString(),
          itemIds: [testItem1._id],
        });
      },
      {
        message: 'Expected delivery date cannot be before pickup date',
      }
    );
  });

  it('6. Validates and rejects order creation when attempting to include garments owned by another user', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    await assert.rejects(
      async () => {
        await laundryOrderService.createWorkOrder(otherUser._id, {
          vendorPhone: '9888811111',
          vendorName: 'CleanWash',
          pickupDate: tomorrow.toISOString(),
          expectedDeliveryDate: dayAfter.toISOString(),
          itemIds: [testItem1._id], // Owned by testUser, not otherUser
        });
      },
      (err) => {
        return err.statusCode === 404 && err.message.includes('not found or does not belong to user');
      }
    );
  });

  // ==========================================
  // Test 3: Status Updates (Requirement 9 & 10)
  // ==========================================
  it('7. Allows user to update Work Order status and tracks status history', async () => {
    const orders = await laundryOrderService.getUserOrders(testUser._id);
    const orderId = orders.orders[0]._id;

    // Status: PICKED_UP
    const updated1 = await laundryOrderService.updateOrderStatus(testUser._id, orderId, {
      status: 'PICKED_UP',
      note: 'Vendor collected 2 shirts',
    });
    assert.equal(updated1.status, 'PICKED_UP');
    assert.equal(updated1.statusHistory.length, 2);
    assert.equal(updated1.statusHistory[1].status, 'PICKED_UP');
    assert.equal(updated1.statusHistory[1].changedBy, 'USER');

    // Status: IN_PROCESS
    const updated2 = await laundryOrderService.updateOrderStatus(testUser._id, orderId, {
      status: 'IN_PROCESS',
      note: 'Washing in progress',
    });
    assert.equal(updated2.status, 'IN_PROCESS');

    // Status: READY_FOR_DELIVERY
    const updated3 = await laundryOrderService.updateOrderStatus(testUser._id, orderId, {
      status: 'READY_FOR_DELIVERY',
    });
    assert.equal(updated3.status, 'READY_FOR_DELIVERY');

    // Status: DELIVERED
    const updated4 = await laundryOrderService.updateOrderStatus(testUser._id, orderId, {
      status: 'DELIVERED',
      note: 'Garments safely received back',
    });
    assert.equal(updated4.status, 'DELIVERED');
  });

  it('8. Rejects invalid status transitions with clear 400 error', async () => {
    const orders = await laundryOrderService.getUserOrders(testUser._id);
    const orderId = orders.orders[0]._id;

    await assert.rejects(
      async () => {
        await laundryOrderService.updateOrderStatus(testUser._id, orderId, {
          status: 'INVALID_STATUS',
        });
      },
      (err) => err.statusCode === 400 && err.message.includes('Allowed values are')
    );
  });

  // ==========================================
  // Test 4: Unregistered to Registered Sync (Requirement 8)
  // ==========================================
  it('9. Automatically converts UnregisteredVendor to registered Vendor when vendor registers / logs in with that phone', async () => {
    // Unregistered vendor '919888822222' was previously used in Test 4
    const unregBefore = await UnregisteredVendor.findOne({ phone: '919888822222' });
    assert.ok(unregBefore);
    assert.equal(unregBefore.isConvertedToRegistered, false);

    // Vendor creates account or logs in with this phone
    const vendorUser = await User.create({
      phone: '919888822222',
      name: 'Ramu Dhobi Official',
      role: 'user',
    });

    // Simulate login sync hook
    const syncResult = await vendorService.syncUnregisteredToRegistered(vendorUser);
    assert.ok(syncResult);
    assert.equal(syncResult.converted, true);
    assert.equal(syncResult.vendor.name, 'Ramu Dhobi Official');
    assert.equal(syncResult.vendor.phone, '919888822222');

    // Verify UnregisteredVendor is marked converted
    const unregAfter = await UnregisteredVendor.findOne({ phone: '919888822222' });
    assert.equal(unregAfter.isConvertedToRegistered, true);
    assert.ok(unregAfter.convertedVendorId);

    // Verify existing LaundryOrder records are upgraded to registeredVendor: true
    const updatedOrders = await LaundryOrder.find({ vendorPhone: '919888822222' });
    assert.ok(updatedOrders.length > 0);
    updatedOrders.forEach((o) => {
      assert.equal(o.isRegisteredVendor, true);
      assert.equal(o.vendorName, 'Ramu Dhobi Official');
    });

    // Cleanup vendor user
    await User.deleteOne({ _id: vendorUser._id });
  });

  // ==========================================
  // Test 5: Re-send WhatsApp
  // ==========================================
  it('10. Allows re-sending WhatsApp PDF notification to vendor', async () => {
    const orders = await laundryOrderService.getUserOrders(testUser._id);
    const orderId = orders.orders[0]._id;

    const resendResult = await laundryOrderService.resendWhatsApp(testUser._id, orderId);
    assert.ok(resendResult.whatsappNotification);
    assert.equal(typeof resendResult.whatsappNotification.sent, 'boolean');
    assert.ok(resendResult.whatsappNotification.status);
  });
});
