const notificationService = require('./notification.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');

class NotificationController {
  /**
   * @desc    Register or update FCM device token for authenticated user
   * @route   POST /api/notifications/device-token
   * @access  Private
   */
  registerDeviceToken = asyncHandler(async (req, res) => {
    const result = await notificationService.registerDeviceToken(req.user.id, req.body);
    return ApiResponse.success(res, result, 'Device token registered successfully');
  });

  /**
   * @desc    Remove / deactivate FCM device token
   * @route   DELETE /api/notifications/device-token
   * @access  Private
   */
  removeDeviceToken = asyncHandler(async (req, res) => {
    const token = req.body?.token || req.query?.token;
    const result = await notificationService.removeDeviceToken(req.user.id, token);
    return ApiResponse.success(res, result, 'Device token removed successfully');
  });

  /**
   * @desc    Get user's notification inbox history
   * @route   GET /api/notifications
   * @access  Private
   */
  getNotifications = asyncHandler(async (req, res) => {
    const result = await notificationService.getUserNotifications(req.user.id, req.query);
    return ApiResponse.success(res, result, 'Notifications retrieved successfully');
  });

  /**
   * @desc    Mark single notification as read
   * @route   PATCH /api/notifications/:id/read
   * @access  Private
   */
  markAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAsRead(req.user.id, req.params.id);
    return ApiResponse.success(res, result, 'Notification marked as read');
  });

  /**
   * @desc    Mark all notifications as read
   * @route   PATCH /api/notifications/read-all
   * @access  Private
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    const result = await notificationService.markAllAsRead(req.user.id);
    return ApiResponse.success(res, result, 'All notifications marked as read');
  });
}

module.exports = new NotificationController();
