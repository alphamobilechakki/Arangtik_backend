const express = require('express');
const router = express.Router();
const laundryController = require('./laundry.controller');
const { protect } = require('../../../middlewares/auth.middleware');

// All laundry endpoints require authentication
router.use(protect);

// Vendor Lookup (Contacts / Manual Number check)
router.get('/vendors/lookup', laundryController.lookupVendor);
router.get('/vendors/eligible', laundryController.getEligibleVendors);
router.post('/vendors/eligible', laundryController.getEligibleVendors);

// Laundry Work Orders
router.route('/orders')
  .post(laundryController.createOrder)
  .get(laundryController.getOrders);

router.route('/orders/:id')
  .get(laundryController.getOrderDetails);

// Status Update (PATCH per Arangtik Rule 4)
router.patch('/orders/:id/status', laundryController.updateOrderStatus);

// Re-send WhatsApp PDF to Vendor
router.post('/orders/:id/resend-whatsapp', laundryController.resendWhatsApp);

module.exports = router;
