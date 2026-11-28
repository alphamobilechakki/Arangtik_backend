const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/auth.middleware');

const upload = require('../../middlewares/upload.middleware');

// Public OTP Authentication Routes
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// Authenticated User Routes
router.get('/profile', protect, authController.getMe);
router.patch('/profile', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), authController.updateProfile);
// Avatar Routes: Add or update avatar (supports multipart upload 'avatar'/'image' or JSON payload)
router.patch('/avatar', protect, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'image', maxCount: 1 }]), authController.updateAvatar);
router.get('/avatar', protect, authController.getAvatar);

router.post('/logout', protect, authController.logout);

// FCM Device Token Registration & Removal (Convenience Auth Endpoints)
const notificationController = require('../notification/notification.controller');
const {
  validateRegisterToken,
  validateRemoveToken,
} = require('../notification/notification.validation');

router.post('/device-token', protect, validateRegisterToken, notificationController.registerDeviceToken);
router.delete('/device-token', protect, validateRemoveToken, notificationController.removeDeviceToken);

module.exports = router;
