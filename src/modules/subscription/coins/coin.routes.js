const express = require('express');
const router = express.Router();
const coinController = require('./coin.controller');
const { protect } = require('../../../middlewares/auth.middleware');

// Public route to view active coin packages
router.get('/packages', coinController.getPackages);

// Public route for Razorpay webhook callbacks
router.post('/webhook', coinController.handleWebhook);

// User-protected coin endpoints
router.use(protect);
router.post('/create-order', coinController.createOrder);
router.post('/verify', coinController.verifyPayment);
router.get('/wallet', coinController.getWallet);
router.get('/transactions', coinController.getTransactions);
router.post('/debit', coinController.debitCoins);

module.exports = router;

