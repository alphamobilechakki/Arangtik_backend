const DeviceToken = require('./deviceToken.model');
const Notification = require('./notification.model');
const { getMessaging, isFirebaseReady } = require('../../config/firebase.config');
const { FCM_DEV_MODE } = require('../../config/env.config');
const ApiError = require('../../utils/apiError');

/**
 * Known FCM error codes indicating the token is no longer valid or unregistered
 */
const UNREGISTERED_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/mismatched-credential',
];

class NotificationService {
  /**
   * Register or update an FCM device token for an authenticated user
   */
  async registerDeviceToken(userId, payload = {}) {
    const { token, platform, deviceId, deviceModel, appVersion } = payload;

    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new ApiError(400, 'Device token is required');
    }

    const cleanToken = token.trim();
    let normalizedPlatform = (platform || 'ANDROID').toUpperCase().trim();
    if (!['ANDROID', 'IOS', 'WEB', 'OTHER'].includes(normalizedPlatform)) {
      normalizedPlatform = 'OTHER';
    }

    // Find if this token already exists (even if belonged to another user previously)
    let deviceRecord = await DeviceToken.findOne({ token: cleanToken });

    if (deviceRecord) {
      deviceRecord.userId = userId;
      deviceRecord.platform = normalizedPlatform;
      deviceRecord.deviceId = deviceId ? String(deviceId).trim() : deviceRecord.deviceId;
      deviceRecord.deviceModel = deviceModel ? String(deviceModel).trim() : deviceRecord.deviceModel;
      deviceRecord.appVersion = appVersion ? String(appVersion).trim() : deviceRecord.appVersion;
      deviceRecord.isActive = true;
      deviceRecord.lastUsedAt = new Date();
      await deviceRecord.save();
    } else {
      deviceRecord = await DeviceToken.create({
        userId,
        token: cleanToken,
        platform: normalizedPlatform,
        deviceId: deviceId ? String(deviceId).trim() : '',
        deviceModel: deviceModel ? String(deviceModel).trim() : '',
        appVersion: appVersion ? String(appVersion).trim() : '',
        isActive: true,
        lastUsedAt: new Date(),
      });
    }

    return {
      id: deviceRecord._id,
      userId: deviceRecord.userId,
      token: deviceRecord.token,
      platform: deviceRecord.platform,
      isActive: deviceRecord.isActive,
      lastUsedAt: deviceRecord.lastUsedAt,
    };
  }

  /**
   * Remove / delete a device token on logout or user request
   */
  async removeDeviceToken(userId, token) {
    if (!token || typeof token !== 'string') {
      throw new ApiError(400, 'Device token is required');
    }

    const cleanToken = token.trim();
    const result = await DeviceToken.deleteMany({ userId, token: cleanToken });

    return {
      removed: true,
      deletedCount: result.deletedCount || 0,
      deactivatedCount: result.deletedCount || 0,
    };
  }

  /**
   * Permanently delete a device token for user
   */
  async deleteDeviceToken(userId, token) {
    if (!token || typeof token !== 'string') {
      return { deleted: false, deletedCount: 0 };
    }
    const cleanToken = token.trim();
    const result = await DeviceToken.deleteMany({ userId, token: cleanToken });
    return {
      deleted: true,
      deletedCount: result.deletedCount || 0,
    };
  }

  /**
   * Delete all device tokens belonging to a user on full logout
   */
  async deleteAllUserDeviceTokens(userId) {
    if (!userId) return { deleted: false, deletedCount: 0 };
    const result = await DeviceToken.deleteMany({ userId });
    return {
      deleted: true,
      deletedCount: result.deletedCount || 0,
    };
  }

  /**
   * Deactivate tokens that were marked invalid/unregistered by FCM
   */
  async deactivateInvalidTokens(tokens = []) {
    if (!Array.isArray(tokens) || tokens.length === 0) return 0;
    try {
      const res = await DeviceToken.updateMany(
        { token: { $in: tokens } },
        { $set: { isActive: false } }
      );
      console.log(`[FCM]: Deactivated ${res.modifiedCount} invalid/expired device tokens`);
      return res.modifiedCount;
    } catch (err) {
      console.error('[FCM]: Failed to deactivate invalid tokens:', err.message);
      return 0;
    }
  }

  /**
   * Helper to format data payload:
   * FCM HTTP v1 mandates that all values in the 'data' map MUST BE STRINGS
   */
  formatDataPayload(data = {}) {
    const formatted = {};
    if (!data || typeof data !== 'object') return formatted;

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value === 'object') {
        formatted[key] = JSON.stringify(value);
      } else {
        formatted[key] = String(value);
      }
    }
    return formatted;
  }

  /**
   * Send notification to all active devices of a user
   */
  async sendToUser(userId, { title, body, data = {}, type = 'OTHER', imageUrl = null }) {
    if (!userId) {
      console.warn('[FCM]: sendToUser called without userId');
      return { success: false, reason: 'MISSING_USER_ID' };
    }

    if (!title || !body) {
      console.warn('[FCM]: sendToUser called with empty title or body');
      return { success: false, reason: 'EMPTY_CONTENT' };
    }

    // 1. Create in-app notification record in DB
    let notificationDoc = null;
    try {
      notificationDoc = await Notification.create({
        userId,
        title,
        body,
        data,
        type,
        status: 'PENDING',
      });
    } catch (dbErr) {
      console.error('[Notification DB Error]:', dbErr.message);
    }

    // 2. Fetch all active device tokens for the user, ordered by newest first (last created)
    const activeTokens = await DeviceToken.find({ userId, isActive: true })
      .sort({ createdAt: -1, _id: -1 })
      .select('token platform createdAt');

    if (!activeTokens || activeTokens.length === 0) {
      if (notificationDoc) {
        notificationDoc.status = 'DELIVERED';
        await notificationDoc.save().catch(() => {});
      }
      return {
        success: true,
        sentCount: 0,
        reason: 'NO_ACTIVE_TOKENS',
        notificationId: notificationDoc?._id,
      };
    }

    // A user can register multiple device tokens across multiple devices/sessions.
    // Business requirement: Always dispatch push notifications to the LAST CREATED active FCM token.
    const lastCreatedDevice = activeTokens[0];
    const tokens = [lastCreatedDevice.token];
    const sanitizedData = this.formatDataPayload({
      ...data,
      notificationId: notificationDoc ? notificationDoc._id.toString() : '',
      type,
    });

    const messaging = getMessaging();
    const isMock = FCM_DEV_MODE || !isFirebaseReady() || !messaging;

    // 3. Mock / Dry-Run Mode
    if (isMock) {
      console.log(`[FCM Mock Delivery]: Dispatched "${title}" to User ${userId} via last created token (${lastCreatedDevice.token.substring(0, 16)}...)`);
      if (notificationDoc) {
        notificationDoc.status = 'DELIVERED';
        await notificationDoc.save().catch(() => {});
      }
      return {
        success: true,
        sentCount: 1,
        targetToken: lastCreatedDevice.token,
        mock: true,
        notificationId: notificationDoc?._id,
      };
    }

    // 4. Live FCM HTTP v1 Delivery via Firebase Admin SDK
    try {
      const message = {
        tokens,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: sanitizedData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'arangtik_primary_channel',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await messaging.sendEachForMulticast(message);

      let successCount = response.successCount;
      let failureCount = response.failureCount;
      const invalidTokens = [];

      if (failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (errCode && UNREGISTERED_TOKEN_ERRORS.includes(errCode)) {
              invalidTokens.push(tokens[idx]);
            }
          }
        });

        // Automatically clean up invalid or expired tokens
        if (invalidTokens.length > 0) {
          await this.deactivateInvalidTokens(invalidTokens);
        }
      }

      if (notificationDoc) {
        notificationDoc.status = successCount > 0 ? 'DELIVERED' : 'FAILED';
        if (failureCount > 0 && successCount === 0) {
          notificationDoc.failureReason = 'All target device tokens failed delivery';
        }
        await notificationDoc.save().catch(() => {});
      }

      return {
        success: successCount > 0,
        sentCount: successCount,
        targetToken: lastCreatedDevice.token,
        failureCount,
        invalidTokensCleaned: invalidTokens.length,
        notificationId: notificationDoc?._id,
      };
    } catch (fcmError) {
      console.error('[FCM Delivery Error]:', fcmError.message);
      if (notificationDoc) {
        notificationDoc.status = 'FAILED';
        notificationDoc.failureReason = fcmError.message;
        await notificationDoc.save().catch(() => {});
      }
      return {
        success: false,
        sentCount: 0,
        error: fcmError.message,
        notificationId: notificationDoc?._id,
      };
    }
  }

  /**
   * Send notification to a specific single token
   */
  async sendToToken(token, { title, body, data = {}, type = 'OTHER', imageUrl = null }) {
    if (!token) {
      return { success: false, reason: 'MISSING_TOKEN' };
    }

    const sanitizedData = this.formatDataPayload({
      ...data,
      type,
    });

    const messaging = getMessaging();
    const isMock = FCM_DEV_MODE || !isFirebaseReady() || !messaging;

    if (isMock) {
      console.log(`[FCM Mock Delivery]: Single token delivery for "${title}"`);
      return { success: true, sentCount: 1, mock: true };
    }

    try {
      const message = {
        token,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: sanitizedData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'arangtik_primary_channel',
          },
        },
      };

      const responseId = await messaging.send(message);
      return { success: true, messageId: responseId };
    } catch (err) {
      const errCode = err.code;
      if (errCode && UNREGISTERED_TOKEN_ERRORS.includes(errCode)) {
        await this.deactivateInvalidTokens([token]);
      }
      console.error('[FCM Single Token Send Error]:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch paginated notification history for a user
   */
  async getUserNotifications(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (query.unreadOnly === 'true' || query.unreadOnly === true) {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId, notificationId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return {
      markedCount: result.modifiedCount || 0,
    };
  }
}

module.exports = new NotificationService();
