const express = require('express');
const router = express.Router();
const adminVendorController = require('./adminVendor.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const {
  validateCreateVendor,
  validateUpdateVendor,
  validateUpdateStatus,
} = require('./adminVendor.validation');

// All admin vendor routes require admin authentication (Bearer token or x-api-key)
router.use(protectAdmin);

// ==========================================
// 1. Vendor Metrics / KPI Stats
// ==========================================
router.get('/stats', adminVendorController.getStats);

// ==========================================
// 2. Registered Vendors Management
// ==========================================
router.get('/registered', adminVendorController.getRegisteredVendors);
router.post('/registered', validateCreateVendor, adminVendorController.createRegisteredVendor);
router.get('/registered/:id', adminVendorController.getRegisteredVendorById);
router.patch('/registered/:id', validateUpdateVendor, adminVendorController.updateRegisteredVendor);
router.patch('/registered/:id/status', validateUpdateStatus, adminVendorController.updateRegisteredVendorStatus);
router.delete('/registered/:id', adminVendorController.deleteRegisteredVendor);

// ==========================================
// 3. Unregistered Customer-Saved Vendors
// ==========================================
router.get('/unregistered', adminVendorController.getUnregisteredVendors);
router.get('/unregistered/:id', adminVendorController.getUnregisteredVendorById);
router.post('/unregistered/:id/convert', adminVendorController.convertUnregisteredVendor);

module.exports = router;
