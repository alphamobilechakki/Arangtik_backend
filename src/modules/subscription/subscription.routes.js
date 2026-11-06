const express = require('express');
const router = express.Router();
const subscriptionController = require('./subscription.controller');
const { protect } = require('../../middlewares/auth.middleware');

// Public route to view plans
router.get('/plans', subscriptionController.getPlans);

// Webhook endpoint (Raw body/verification)
router.post('/webhook', subscriptionController.handleWebhook);

// User-protected subscription endpoints
router.use(protect);
router.get('/my', subscriptionController.getMySubscription);
router.post('/create-order', subscriptionController.createOrder);
router.post('/verify', subscriptionController.verifyPayment);

module.exports = router;

