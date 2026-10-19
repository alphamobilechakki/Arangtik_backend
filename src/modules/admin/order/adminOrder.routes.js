const express = require('express');
const router = express.Router();
const adminOrderController = require('./adminOrder.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const { validateUpdateOrderStatus } = require('./adminOrder.validation');

// All admin order endpoints require Admin Authorization (Bearer token or x-api-key)
router.use(protectAdmin);

// 1. Order Aggregated Metrics / KPI Stats
router.get('/stats', adminOrderController.getStats);

// 2. List Orders (Filter by status, category, date, search, paginate)
router.get('/', adminOrderController.getAllOrders);

// 3. Order Details by ID or orderNumber
router.get('/:id', adminOrderController.getOrderById);

// 4. Update / Override Order Status (Strictly PATCH)
router.patch('/:id/status', validateUpdateOrderStatus, adminOrderController.updateOrderStatus);

// 5. Resend WhatsApp PDF Slip
router.post('/:id/resend-whatsapp', adminOrderController.resendWhatsapp);

module.exports = router;
