const express = require('express');
const router = express.Router();
const vendorController = require('./vendor.controller');
const vendorAuthController = require('./vendorAuth.controller');
const { protect, protectVendor } = require('../../middlewares/auth.middleware');
const {
  validateVendorRegister,
  validateVendorLogin,
  validateForgotPassword,
  validateResetPassword,
} = require('./vendorAuth.validation');

// ==========================================
// 1. Vendor Authentication Endpoints (Public)
// ==========================================
router.get('/categories', vendorAuthController.getCategories);
router.get('/auth/categories', vendorAuthController.getCategories);
router.post('/auth/register', validateVendorRegister, vendorAuthController.register);
router.post('/auth/login', validateVendorLogin, vendorAuthController.login);
router.post('/auth/forgot-password', validateForgotPassword, vendorAuthController.forgotPassword);
router.post('/auth/verify-reset-otp', vendorAuthController.verifyResetOtp);
router.post('/auth/reset-password', validateResetPassword, vendorAuthController.resetPassword);

// ==========================================
// 2. Vendor Profile (Protected by Vendor JWT)
// ==========================================
router.get('/auth/me', protectVendor, vendorAuthController.getMe);
router.get('/profile', protectVendor, vendorAuthController.getMe);

// ==========================================
// 3. Vendor Lookup (Protected for App Users)
// ==========================================
router.get('/lookup', protect, vendorController.lookupVendor);

// ==========================================
// 4. Vendor Work Orders (Protected by Vendor JWT)
// ==========================================
router.get('/orders', protectVendor, vendorController.getVendorOrders);
router.get('/orders/:id', protectVendor, vendorController.getVendorOrderDetails);
router.patch('/orders/:id/status', protectVendor, vendorController.updateVendorOrderStatus);

module.exports = router;
