const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { protect } = require('../../middlewares/auth.middleware');

const transactionController = require('./transaction.controller');
const { validateUpdatePaymentStatus } = require('./transaction.validation');

// All universal order endpoints require customer authentication
router.use(protect);

router.get('/transactions', transactionController.getUserTransactions);
router.get('/', orderController.getUserOrders);
router.get('/:id', orderController.getOrderDetails);
router.patch('/:id/cancel', orderController.cancelOrder);
router.patch('/:id/payment', validateUpdatePaymentStatus, transactionController.updateUserOrderPayment);

module.exports = router;
