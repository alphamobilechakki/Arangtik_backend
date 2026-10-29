const express = require('express');
const router = express.Router();
const ctrl = require('./vendorService.controller');
const { protectVendor, protectAdmin } = require('../../middlewares/auth.middleware');
const {
  validateCreateVendorService,
  validateBulkAssignServices,
  validateUpdateVendorService,
  validateToggleAvailability,
} = require('./vendorService.validation');

// ==========================================
// 1. Authenticated Vendor Endpoints
// ==========================================
router.get('/my-services', protectVendor, ctrl.getMyServices);
router.post('/my-services', protectVendor, validateCreateVendorService, ctrl.addService);
router.post('/my-services/bulk', protectVendor, validateBulkAssignServices, ctrl.bulkAssign);
router.patch('/my-services/:id', protectVendor, validateUpdateVendorService, ctrl.updateVendorService);
router.patch('/my-services/:id/availability', protectVendor, validateToggleAvailability, ctrl.toggleAvailability);
router.delete('/my-services/:id', protectVendor, ctrl.deleteVendorService);

// ==========================================
// 2. Public / Discovery / Customer Endpoints
// ==========================================
// Fetch all services offered by a specific vendor
router.get('/vendor/:vendorId', ctrl.getServicesByVendor);

// Find all vendors offering a specific service
router.get('/service/:serviceId', ctrl.getVendorsByService);

// Get a single vendor-service detail by ID
router.get('/:id', ctrl.getById);

// ==========================================
// 3. General & Admin Management Endpoints
// ==========================================
router.post('/', protectVendor, validateCreateVendorService, ctrl.addService);
router.post('/bulk', protectVendor, validateBulkAssignServices, ctrl.bulkAssign);
router.patch('/:id', protectVendor, validateUpdateVendorService, ctrl.updateVendorService);
router.patch('/:id/availability', protectVendor, validateToggleAvailability, ctrl.toggleAvailability);
router.patch('/:id/status', protectVendor, ctrl.toggleStatus);
router.delete('/:id', protectVendor, ctrl.deleteVendorService);

module.exports = router;
