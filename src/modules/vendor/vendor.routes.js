const express = require('express');
const router = express.Router();
const vendorController = require('./vendor.controller');
const vendorAuthController = require('./vendorAuth.controller');
const { protect, protectVendor } = require('../../middlewares/auth.middleware');
const {
  validateSendOtp,
  validateVerifyOtp,
  validateVendorRegister,
  validateVendorLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateCategories,
  validateUpdateProfile,
} = require('./vendorAuth.validation');

// ==========================================
// 1. Vendor Authentication Endpoints (Public - WhatsApp OTP & Passwordless)
// ==========================================
// Category & Available Services
router.get('/categories', vendorAuthController.getCategories);
router.get('/auth/categories', vendorAuthController.getCategories);
router.get('/categories/:category/services', vendorAuthController.getCategoryServices);

// Primary Mobile OTP Flow
router.post('/auth/send-otp', validateSendOtp, vendorAuthController.sendOtp);
router.post('/auth/verify-otp', validateVerifyOtp, vendorAuthController.verifyOtp);

// Registration & Login (Supports OTP & fallback)
router.post('/auth/register', validateVendorRegister, vendorAuthController.register);
router.post('/auth/login', validateVendorLogin, vendorAuthController.login);

// Legacy Password Reset Flow
router.post('/auth/forgot-password', validateForgotPassword, vendorAuthController.forgotPassword);
router.post('/auth/verify-reset-otp', vendorAuthController.verifyResetOtp);
router.post('/auth/reset-password', validateResetPassword, vendorAuthController.resetPassword);

// ==========================================
// 2. Vendor Profile & Category Management (Protected by Vendor JWT)
// ==========================================
router.get('/auth/me', protectVendor, vendorAuthController.getMe);
router.get('/profile', protectVendor, vendorAuthController.getMe);
router.patch('/profile', protectVendor, validateUpdateProfile, vendorAuthController.updateProfile);
router.patch('/categories', protectVendor, validateUpdateCategories, vendorAuthController.updateCategories);

// Vendor Offered Services Selection (Protected by Vendor JWT)
const { validateUpdateVendorServices } = require('./vendorAuth.validation');
router.get('/services', protectVendor, vendorAuthController.getVendorServices);
router.patch('/services', protectVendor, validateUpdateVendorServices, vendorAuthController.updateServices);

// ==========================================
// 3. Vendor Lookup & Eligible Matching (App Users & Public)
// ==========================================
router.get('/lookup', protect, vendorController.lookupVendor);
router.get('/eligible', vendorController.getEligibleVendors);
router.post('/eligible', vendorController.getEligibleVendors);
router.get('/:id/services', vendorController.getVendorServices);

// ==========================================
// 4. Vendor Work Orders & Payment Transactions (Protected by Vendor JWT)
// ==========================================
const transactionController = require('../order/transaction.controller');
const { validateUpdatePaymentStatus } = require('../order/transaction.validation');

router.get('/orders', protectVendor, vendorController.getVendorOrders);
router.get('/orders/:id', protectVendor, vendorController.getVendorOrderDetails);
router.patch('/orders/:id/status', protectVendor, vendorController.updateVendorOrderStatus);
router.patch('/orders/:id/payment', protectVendor, validateUpdatePaymentStatus, transactionController.updateVendorOrderPayment);
router.get('/transactions', protectVendor, transactionController.getVendorTransactions);

module.exports = router;
