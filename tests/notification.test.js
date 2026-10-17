const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const { MONGODB_URI, JWT_SECRET } = require('../src/config/env.config');
const User = require('../src/modules/auth/user.model');
const Otp = require('../src/modules/auth/otp.model');
const authService = require('../src/modules/auth/auth.service');
const authController = require('../src/modules/auth/auth.controller');
const DeviceToken = require('../src/modules/notification/deviceToken.model');
const Notification = require('../src/modules/notification/notification.model');
const notificationService = require('../src/modules/notification/notification.service');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const Vendor = require('../src/modules/vendor/vendor.model');
const LaundryOrder = require('../src/modules/laundry/laundryOrder.model');
const laundryOrderService = require('../src/modules/laundry/laundryOrder.service');

describe('Firebase Cloud Messaging (FCM) & Device Token Management Tests', () => {
  let user1;
  let user2;
  let userToken1;
  let userToken2;
  let sampleItem;
  let registeredVendor;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Clean up test data
    await User.deleteMany({ phone: { $in: ['919777700001', '919777700002'] } });
    await DeviceToken.deleteMany({});
    await Notification.deleteMany({});
    await LaundryOrder.deleteMany({ userPhone: '919777700001' });

    // Create test users
    user1 = await User.create({
      phone: '919777700001',
      name: 'Aarav Patel',
      role: 'user',
    });

    user2 = await User.create({
      phone: '919777700002',
      name: 'Priya Sharma',
      role: 'user',
    });

    userToken1 = jwt.sign(
      { id: user1._id, phone: user1.phone, role: user1.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    userToken2 = jwt.sign(
      { id: user2._id, phone: user2.phone, role: user2.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Create a wardrobe item for laundry integration test
    sampleItem = await WardrobeItem.create({
      userId: user1._id,
      name: 'Royal Blue Silk Kurta',
      category: 'UPPER_WEAR',
      color: 'Blue',
      fabric: 'Silk',
      sourceType: 'MANUAL_UPLOAD',
      images: [
        {
          url: 'https://api.arangtik.com/uploads/sample-kurta.jpg',
          isPrimary: true,
          type: 'ORIGINAL',
        },
      ],
    });

    // Create registered vendor for laundry test
    registeredVendor = await Vendor.create({
      name: 'SuperClean Express',
      phone: '919777711111',
      businessName: 'SuperClean Hub',
      status: 'ACTIVE',
    });
  });

  after(async () => {
    if (user1) await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
    await DeviceToken.deleteMany({});
    await Notification.deleteMany({});
    if (sampleItem) await WardrobeItem.deleteMany({ _id: sampleItem._id });
    if (registeredVendor) await Vendor.deleteMany({ _id: registeredVendor._id });
    await LaundryOrder.deleteMany({ userPhone: '919777700001' });
    await mongoose.disconnect();
  });

  // ==========================================
  // SECTION 1: Device Token Management
  // ==========================================
  describe('1. Device Token Registration & Management', () => {
    it('verifies DeviceToken schema indexes, default values, and timestamp configs', async () => {
      // 1. Verify schema indexes defined in model
      const indexes = DeviceToken.schema.indexes();
      const indexKeys = indexes.map((idx) => Object.keys(idx[0]).join('_'));

      assert.ok(
        indexKeys.some((k) => k === 'userId_isActive'),
        'Must have compound index on { userId: 1, isActive: 1 }'
      );
      assert.ok(
        indexKeys.some((k) => k === 'userId_createdAt'),
        'Must have compound index on { userId: 1, createdAt: -1 } for fast newest-token sorting'
      );
      assert.ok(
        indexKeys.some((k) => k === 'deviceId_userId'),
        'Must have compound index on { deviceId: 1, userId: 1 }'
      );

      // 2. Verify schema defaults when minimal fields provided
      const dummyToken = new DeviceToken({
        userId: user1._id,
        token: 'fcm_test_defaults_check',
      });

      assert.equal(dummyToken.platform, 'ANDROID', 'Default platform should be ANDROID');
      assert.equal(dummyToken.isActive, true, 'Default isActive should be true');
      assert.equal(dummyToken.deviceId, '', 'Default deviceId should be empty string');
      assert.equal(dummyToken.deviceModel, '', 'Default deviceModel should be empty string');
      assert.equal(dummyToken.appVersion, '', 'Default appVersion should be empty string');
      assert.ok(dummyToken.lastUsedAt instanceof Date, 'Default lastUsedAt should be Date');

      // 3. Verify timestamps (createdAt & updatedAt)
      await dummyToken.save();
      assert.ok(dummyToken.createdAt instanceof Date, 'Mongoose timestamps must create createdAt');
      assert.ok(dummyToken.updatedAt instanceof Date, 'Mongoose timestamps must create updatedAt');

      // Clean up dummy token
      await DeviceToken.deleteOne({ _id: dummyToken._id });
    });

    it('successfully registers an FCM device token for an authenticated user', async () => {
      const result = await notificationService.registerDeviceToken(user1._id, {
        token: 'fcm_token_pixel8_abc123',
        platform: 'ANDROID',
        deviceId: 'device_uuid_001',
        deviceModel: 'Google Pixel 8',
        appVersion: '1.2.0',
      });

      assert.ok(result);
      assert.equal(result.token, 'fcm_token_pixel8_abc123');
      assert.equal(result.platform, 'ANDROID');
      assert.equal(result.isActive, true);

      const dbRecord = await DeviceToken.findOne({ token: 'fcm_token_pixel8_abc123' });
      assert.ok(dbRecord);
      assert.equal(dbRecord.userId.toString(), user1._id.toString());
      assert.equal(dbRecord.deviceModel, 'Google Pixel 8');
    });

    it('prevents duplicate active records and updates token on re-registration', async () => {
      const initialCount = await DeviceToken.countDocuments({ token: 'fcm_token_pixel8_abc123' });
      assert.equal(initialCount, 1);

      // Re-register the exact same token with updated appVersion
      await notificationService.registerDeviceToken(user1._id, {
        token: 'fcm_token_pixel8_abc123',
        platform: 'ANDROID',
        appVersion: '1.2.1',
      });

      const updatedCount = await DeviceToken.countDocuments({ token: 'fcm_token_pixel8_abc123' });
      assert.equal(updatedCount, 1, 'Should NOT create duplicate record for same token');

      const updatedDoc = await DeviceToken.findOne({ token: 'fcm_token_pixel8_abc123' });
      assert.equal(updatedDoc.appVersion, '1.2.1');
    });

    it('supports multiple devices per user', async () => {
      // Register a second device (e.g. iPad / iOS tablet) for user1
      await notificationService.registerDeviceToken(user1._id, {
        token: 'fcm_token_ipad_def456',
        platform: 'IOS',
        deviceId: 'device_uuid_002',
        deviceModel: 'iPad Pro 11',
      });

      const userTokens = await DeviceToken.find({ userId: user1._id, isActive: true });
      assert.equal(userTokens.length, 2, 'User should have 2 active devices');
    });

    it('reassigns token ownership if a device changes users', async () => {
      // Device token previously belonging to user1 is now registered by user2
      await notificationService.registerDeviceToken(user2._id, {
        token: 'fcm_token_ipad_def456',
        platform: 'IOS',
      });

      const record = await DeviceToken.findOne({ token: 'fcm_token_ipad_def456' });
      assert.equal(record.userId.toString(), user2._id.toString(), 'Token should now belong to user2');

      const user1Tokens = await DeviceToken.find({ userId: user1._id, isActive: true });
      assert.equal(user1Tokens.length, 1, 'User1 should now only have 1 active device');
    });

    it('rejects registration with missing or invalid token payload', async () => {
      await assert.rejects(
        async () => {
          await notificationService.registerDeviceToken(user1._id, { token: '' });
        },
        { message: 'Device token is required' }
      );
    });

    it('successfully deletes device token upon logout or explicit removal', async () => {
      const removeResult = await notificationService.removeDeviceToken(
        user1._id,
        'fcm_token_pixel8_abc123'
      );
      assert.equal(removeResult.removed, true);
      assert.equal(removeResult.deletedCount, 1);

      const dbRecord = await DeviceToken.findOne({ token: 'fcm_token_pixel8_abc123' });
      assert.equal(dbRecord, null, 'Token should be deleted from database upon logout/removal');
    });

    it('registers FCM token automatically when user verifies OTP on login', async () => {
      const testPhone = '919777700099';
      await User.deleteMany({ phone: testPhone });
      await Otp.deleteMany({ phone: testPhone });
      await DeviceToken.deleteMany({ token: 'fcm_login_test_token_111' });

      // Create OTP
      await Otp.create({
        phone: testPhone,
        otp: '5566',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const loginResult = await authService.verifyOtp(testPhone, '5566', 'Test Login User', {
        token: 'fcm_login_test_token_111',
        platform: 'ANDROID',
        deviceId: 'device_login_001',
      });

      assert.ok(loginResult);
      assert.ok(loginResult.token);
      assert.equal(loginResult.fcmToken, 'fcm_login_test_token_111');
      assert.equal(loginResult.deviceRegistered, true);

      // Verify token in database
      const deviceDoc = await DeviceToken.findOne({ token: 'fcm_login_test_token_111' });
      assert.ok(deviceDoc);
      assert.equal(deviceDoc.userId.toString(), loginResult.user._id.toString());
      assert.equal(deviceDoc.isActive, true);

      // Clean up
      await User.deleteMany({ phone: testPhone });
      await DeviceToken.deleteMany({ token: 'fcm_login_test_token_111' });
    });

    it('permanently deletes FCM token upon user logout', async () => {
      // Register token for user1
      await notificationService.registerDeviceToken(user1._id, {
        token: 'fcm_logout_delete_target',
        platform: 'ANDROID',
      });

      const beforeDoc = await DeviceToken.findOne({ token: 'fcm_logout_delete_target' });
      assert.ok(beforeDoc, 'Token must exist before logout');

      // Simulate logout controller call with specific token
      const req = {
        user: { id: user1._id },
        body: { fcmToken: 'fcm_logout_delete_target' },
      };
      let responseBody = null;
      await new Promise((resolve, reject) => {
        const res = {
          status: () => res,
          json: (data) => {
            responseBody = data;
            resolve(data);
          },
        };
        authController.logout(req, res, reject);
      });

      assert.ok(responseBody);
      assert.equal(responseBody.success, true);

      const afterDoc = await DeviceToken.findOne({ token: 'fcm_logout_delete_target' });
      assert.equal(afterDoc, null, 'Token should be deleted from DB on logout');
    });

    it('deletes all user device tokens on full logout if no specific token passed', async () => {
      // Register two tokens for user2
      await notificationService.registerDeviceToken(user2._id, {
        token: 'fcm_user2_token_alpha',
        platform: 'ANDROID',
      });
      await notificationService.registerDeviceToken(user2._id, {
        token: 'fcm_user2_token_beta',
        platform: 'IOS',
      });

      const countBefore = await DeviceToken.countDocuments({ userId: user2._id });
      assert.ok(countBefore >= 2);

      // Simulate logout controller call with empty body
      const req = {
        user: { id: user2._id },
        body: {},
      };
      let responseBody = null;
      await new Promise((resolve, reject) => {
        const res = {
          status: () => res,
          json: (data) => {
            responseBody = data;
            resolve(data);
          },
        };
        authController.logout(req, res, reject);
      });

      assert.ok(responseBody);
      assert.equal(responseBody.success, true);

      const countAfter = await DeviceToken.countDocuments({ userId: user2._id });
      assert.equal(countAfter, 0, 'All tokens for user2 should be deleted on full logout');
    });

    it('dispatches notifications strictly to the LAST CREATED active FCM token when user has multiple tokens', async () => {
      // Clean tokens for user1
      await DeviceToken.deleteMany({ userId: user1._id });

      // Create older token 1
      await DeviceToken.create({
        userId: user1._id,
        token: 'fcm_user1_device_older_1',
        platform: 'ANDROID',
        isActive: true,
        createdAt: new Date(Date.now() - 60000), // 1 min ago
      });

      // Create older token 2
      await DeviceToken.create({
        userId: user1._id,
        token: 'fcm_user1_device_older_2',
        platform: 'IOS',
        isActive: true,
        createdAt: new Date(Date.now() - 30000), // 30 sec ago
      });

      // Create newest / last created token 3
      await DeviceToken.create({
        userId: user1._id,
        token: 'fcm_user1_device_newest_3',
        platform: 'ANDROID',
        isActive: true,
        createdAt: new Date(), // Now
      });

      // Total active tokens for user1 is 3 (multiple tokens supported per user)
      const allActive = await DeviceToken.find({ userId: user1._id, isActive: true });
      assert.equal(allActive.length, 3, 'User must have 3 active device tokens');

      // Send push notification
      const sendResult = await notificationService.sendToUser(user1._id, {
        title: 'Multi-Device Test',
        body: 'Message for latest device',
        type: 'SYSTEM',
      });

      assert.ok(sendResult);
      assert.ok(sendResult.sentCount === 1 || sendResult.failureCount === 1);
      assert.equal(
        sendResult.targetToken,
        'fcm_user1_device_newest_3',
        'Notification must be dispatched specifically to the LAST CREATED token'
      );
    });
  });

  // ==========================================
  // SECTION 2: Payload Construction & FCM HTTP v1 Formatting
  // ==========================================
  describe('2. Payload Construction & FCM HTTP v1 Compliance', () => {
    it('properly converts mixed data types to strings for FCM HTTP v1 compliance', () => {
      const rawData = {
        orderId: new mongoose.Types.ObjectId(),
        totalItems: 4,
        isExpress: true,
        nested: { stage: 'WASHING', percent: 65 },
        nullField: null,
      };

      const formatted = notificationService.formatDataPayload(rawData);

      assert.equal(typeof formatted.totalItems, 'string');
      assert.equal(formatted.totalItems, '4');
      assert.equal(typeof formatted.isExpress, 'string');
      assert.equal(formatted.isExpress, 'true');
      assert.equal(typeof formatted.nested, 'string');
      assert.ok(formatted.nested.includes('WASHING'));
      assert.equal(formatted.nullField, undefined, 'Null fields should be omitted');
    });

    it('safely handles notification dispatch when user has no active tokens', async () => {
      // User with 0 active tokens
      const randomUserId = new mongoose.Types.ObjectId();
      const result = await notificationService.sendToUser(randomUserId, {
        title: 'Closet Reminder',
        body: 'Check out your new styling recommendations!',
        type: 'SYSTEM',
      });

      assert.equal(result.success, true);
      assert.equal(result.sentCount, 0);
      assert.equal(result.reason, 'NO_ACTIVE_TOKENS');
    });

    it('cleans up invalid or expired tokens returned by FCM', async () => {
      // Create a stale token
      await DeviceToken.create({
        userId: user1._id,
        token: 'expired_fcm_token_xyz999',
        platform: 'ANDROID',
        isActive: true,
      });

      const cleanedCount = await notificationService.deactivateInvalidTokens([
        'expired_fcm_token_xyz999',
      ]);
      assert.equal(cleanedCount, 1);

      const tokenDoc = await DeviceToken.findOne({ token: 'expired_fcm_token_xyz999' });
      assert.equal(tokenDoc.isActive, false);
    });
  });

  // ==========================================
  // SECTION 3: Business Logic Triggers & Integration
  // ==========================================
  describe('3. Notification Triggers on Business Events', () => {
    let createdOrder;

    it('dispatches notifications and logs inbox record on Laundry Work Order creation', async () => {
      // Re-activate a token for user1
      await notificationService.registerDeviceToken(user1._id, {
        token: 'fcm_user1_live_token',
        platform: 'ANDROID',
      });

      const today = new Date();
      const pickupDate = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const deliveryDate = new Date(today.getTime() + 72 * 60 * 60 * 1000);

      createdOrder = await laundryOrderService.createWorkOrder(user1._id, {
        vendorPhone: '919777711111',
        vendorName: 'SuperClean Express',
        pickupDate: pickupDate.toISOString(),
        expectedDeliveryDate: deliveryDate.toISOString(),
        items: [{ wardrobeItemId: sampleItem._id, serviceType: 'DRY_CLEAN' }],
      });

      assert.ok(createdOrder);
      assert.equal(createdOrder.status, 'PENDING_PICKUP');

      // Check notification record was created in user1's inbox
      const notifications = await Notification.find({
        userId: user1._id,
        type: 'LAUNDRY_ORDER_NEW',
      });
      assert.ok(notifications.length > 0);
      assert.ok(notifications[0].title.includes('Laundry Work Order Placed'));
      assert.equal(notifications[0].data.orderNumber, createdOrder.orderNumber);
    });

    it('dispatches status update notification when work order status changes', async () => {
      assert.ok(createdOrder);

      const updatedOrder = await laundryOrderService.updateOrderStatus(
        user1._id,
        createdOrder._id,
        {
          status: 'READY_FOR_DELIVERY',
          note: 'Ironed and packed in garment bag',
        }
      );

      assert.equal(updatedOrder.status, 'READY_FOR_DELIVERY');

      // Check status notification in inbox
      const statusNotifications = await Notification.find({
        userId: user1._id,
        type: 'LAUNDRY_ORDER_STATUS',
      });
      assert.ok(statusNotifications.length > 0);
      assert.ok(statusNotifications[0].body.includes('Ready for Delivery'));
      assert.equal(statusNotifications[0].data.status, 'READY_FOR_DELIVERY');
    });

    it('ensures business operations succeed even if FCM notifications fail', async () => {
      // Test that updating status with a malformed notification or missing token does NOT crash the business transaction
      const cancelledOrder = await laundryOrderService.updateOrderStatus(
        user1._id,
        createdOrder._id,
        {
          status: 'CANCELLED',
          note: 'Plans changed',
        }
      );

      assert.equal(cancelledOrder.status, 'CANCELLED');
    });
  });

  // ==========================================
  // SECTION 4: In-App Notification Inbox & Read State
  // ==========================================
  describe('4. In-App Notification Inbox & State Management', () => {
    it('retrieves user notifications with unread count and pagination', async () => {
      const result = await notificationService.getUserNotifications(user1._id, {
        page: 1,
        limit: 10,
      });

      assert.ok(result);
      assert.ok(Array.isArray(result.notifications));
      assert.ok(result.notifications.length >= 2);
      assert.ok(result.unreadCount >= 2);
      assert.equal(result.pagination.currentPage || result.pagination.page, 1);
    });

    it('marks a single notification as read', async () => {
      const list = await Notification.find({ userId: user1._id, isRead: false });
      assert.ok(list.length > 0);

      const targetId = list[0]._id;
      const readDoc = await notificationService.markAsRead(user1._id, targetId);

      assert.equal(readDoc.isRead, true);
      assert.ok(readDoc.readAt);

      const verifyDoc = await Notification.findById(targetId);
      assert.equal(verifyDoc.isRead, true);
    });

    it('marks all notifications as read for a user', async () => {
      const markResult = await notificationService.markAllAsRead(user1._id);
      assert.ok(markResult.markedCount >= 1);

      const remainingUnread = await Notification.countDocuments({
        userId: user1._id,
        isRead: false,
      });
      assert.equal(remainingUnread, 0, 'All notifications should be marked read');
    });
  });
});
