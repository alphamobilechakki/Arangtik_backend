const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const notificationService = require('../src/modules/notification/notification.service');
const Notification = require('../src/modules/notification/notification.model');
const DeviceToken = require('../src/modules/notification/deviceToken.model');

test('FCM Event Connectivity & Notification Service Verification', async (t) => {
  await connectDB();

  const testUserId = new mongoose.Types.ObjectId();
  const testFcmToken = 'fcm_test_device_token_' + Date.now();

  await t.test('1. Register FCM device token on login', async () => {
    const reg = await notificationService.registerDeviceToken(testUserId, {
      token: testFcmToken,
      platform: 'ANDROID',
      deviceId: 'pixel_test_uuid',
      deviceModel: 'Pixel 8',
      appVersion: '1.2.0',
    });

    assert.strictEqual(reg.token, testFcmToken);
    assert.strictEqual(reg.platform, 'ANDROID');
    assert.strictEqual(reg.isActive, true);
  });

  await t.test('2. Dispatch FCM event notification (e.g. Laundry Order Status)', async () => {
    const result = await notificationService.sendToUser(testUserId, {
      title: 'Laundry Order Update #WO-TEST-001',
      body: 'Your garments have been picked up by the vendor.',
      data: {
        type: 'LAUNDRY_ORDER_STATUS',
        orderId: 'mock_order_id_123',
        status: 'PICKED_UP',
      },
      type: 'LAUNDRY_ORDER_STATUS',
    });

    // In-app notification must be persisted in database
    const notif = await Notification.findOne({ userId: testUserId }).sort({ createdAt: -1 });
    assert.ok(notif, 'Notification document must be saved in MongoDB');
    assert.strictEqual(notif.type, 'LAUNDRY_ORDER_STATUS');
    assert.strictEqual(notif.title, 'Laundry Order Update #WO-TEST-001');
    assert.strictEqual(notif.isRead, false);

    // Verify FCM response was processed
    assert.ok(result.notificationId, 'Notification ID should be returned');
  });

  await t.test('3. Dispatch FCM event notification (e.g. 3D Mesh Completed)', async () => {
    const result = await notificationService.sendToUser(testUserId, {
      title: '3D Model Ready: Silk Kurta',
      body: 'Your 3D garment model is ready to view in 360°!',
      data: {
        type: 'GARMENT_3D_COMPLETED',
        itemId: 'mock_item_id_456',
      },
      type: 'GARMENT_3D_COMPLETED',
    });

    const notif = await Notification.findOne({
      userId: testUserId,
      type: 'GARMENT_3D_COMPLETED',
    });
    assert.ok(notif, '3D Model notification must be saved in database');
    assert.ok(result.notificationId);
  });

  await t.test('4. Remove FCM device token on logout', async () => {
    const rem = await notificationService.removeDeviceToken(testUserId, testFcmToken);
    assert.strictEqual(rem.removed, true);

    const tokenDoc = await DeviceToken.findOne({ token: testFcmToken });
    assert.strictEqual(tokenDoc, null, 'Token should be removed');
  });

  // Cleanup
  await Notification.deleteMany({ userId: testUserId });
  await DeviceToken.deleteMany({ userId: testUserId });
  await mongoose.disconnect();
});
