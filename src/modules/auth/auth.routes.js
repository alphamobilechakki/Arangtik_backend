const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { protect } = require('../../middlewares/auth.middleware');

const upload = require('../../middlewares/upload.middleware');

// Public OTP Authentication Routes
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);

// Authenticated User Routes
router.get('/me', protect, authController.getMe);
router.get('/profile', protect, authController.getMe);
router.patch('/profile', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), authController.updateProfile);
router.put('/profile', protect, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), authController.updateProfile);
router.post('/profile-image', protect, upload.single('image'), authController.uploadProfileImage);
router.post('/logout', protect, authController.logout);

module.exports = router;
