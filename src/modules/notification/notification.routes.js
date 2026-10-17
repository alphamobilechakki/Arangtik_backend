const express = require('express');
const router = express.Router();
const notificationController = require('./notification.controller');
const { protect } = require('../../middlewares/auth.middleware');
const {
  validateRegisterToken,
  validateRemoveToken,
} = require('./notification.validation');

// Token management endpoints
router.post(
  '/device-token',
  protect,
  validateRegisterToken,
  notificationController.registerDeviceToken
);

router.delete(
  '/device-token',
  protect,
  validateRemoveToken,
  notificationController.removeDeviceToken
);

// In-app notifications inbox endpoints
router.get('/', protect, notificationController.getNotifications);
router.patch('/read-all', protect, notificationController.markAllAsRead);
router.patch('/:id/read', protect, notificationController.markAsRead);

module.exports = router;
