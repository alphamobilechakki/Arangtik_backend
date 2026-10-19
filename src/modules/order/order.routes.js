const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { protect } = require('../../middlewares/auth.middleware');

// All universal order endpoints require customer authentication
router.use(protect);

router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderDetails);
router.patch('/:id/cancel', orderController.cancelOrder);

module.exports = router;
