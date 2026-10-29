const express = require('express');
const router = express.Router();

const vendorController = require('./vendor.controller');
const unregisteredController = require('./unregistered/unregisteredVendor.controller');
const transactionController = require('../order/transaction.controller');

const { protect, protectVendor } = require('../../middlewares/auth.middleware');

const {
  validateSendOtp,
  validateVerifyOtp,
  validateCreateVendor,
  validateUpdateProfile,
  validateUpdateVendor,
  validateUpdateStatus,
  validateVerifyVendor,
  validateVendorQuery,
  validateNearbyQuery,
  validateIdParam,
  validateUpdateVendorServices,
} = require('./vendor.validation');
const { validateUpdatePaymentStatus } = require('../order/transaction.validation');

// ==========================================
// 1. AUTHENTICATION & ONBOARDING (OTP FLOW)
// ==========================================
router.post('/send-otp', validateSendOtp, vendorController.sendOtp);
router.post('/verify-otp', validateVerifyOtp, vendorController.verifyOtp);

// ==========================================
// 2. PROFILE MANAGEMENT (AUTHENTICATED VENDOR)
// ==========================================
router.get('/profile', protectVendor, vendorController.getProfile);
router.patch('/profile', protectVendor, validateUpdateProfile, vendorController.updateProfile);

// ==========================================
// 3. VENDOR OFFERED SERVICES (AUTHENTICATED VENDOR)
// ==========================================
router.get('/services', protectVendor, vendorController.getServices);
router.patch('/services', protectVendor, validateUpdateVendorServices, vendorController.updateServices);

// ==========================================
// 4. DISCOVERY & GEOSPATIAL SEARCH
// ==========================================
router.get('/eligible', validateNearbyQuery, vendorController.getEligibleVendors);
router.get('/nearby', validateNearbyQuery, vendorController.getNearbyVendors);
router.get('/categories', vendorController.getCategories);
router.get('/categories/:category/services', vendorController.getCategoryServices);

// ==========================================
// 5. UNREGISTERED VENDORS & LOOKUP
// ==========================================
router.get('/lookup', protect, unregisteredController.lookupVendor);
router.get('/unregistered', protect, unregisteredController.getUnregisteredVendors);

// ==========================================
// 6. WORK ORDERS & TRANSACTIONS (AUTHENTICATED VENDOR)
// ==========================================
router.get('/orders', protectVendor, vendorController.getOrders);
router.get('/orders/:id', protectVendor, vendorController.getOrderById);
router.patch('/orders/:id/status', protectVendor, vendorController.updateOrderStatus);
router.patch('/orders/:id/payment', protectVendor, validateUpdatePaymentStatus, transactionController.updateVendorOrderPayment);
router.get('/transactions', protectVendor, transactionController.getVendorTransactions);

// ==========================================
// 7. VENDOR CRUD & MANAGEMENT (MODEL BASED)
// ==========================================
router
  .route('/')
  .get(validateVendorQuery, vendorController.getAllVendors)
  .post(validateCreateVendor, vendorController.createVendor);

router.get('/:id/services', validateIdParam, vendorController.getVendorServices);
router.patch('/:id/status', validateIdParam, validateUpdateStatus, vendorController.updateVendorStatus);
router.patch('/:id/verify', validateIdParam, validateVerifyVendor, vendorController.verifyVendor);

router
  .route('/:id')
  .get(validateIdParam, vendorController.getVendorById)
  .patch(validateIdParam, validateUpdateVendor, vendorController.updateVendor)
  .delete(validateIdParam, vendorController.deleteVendor);

module.exports = router;
