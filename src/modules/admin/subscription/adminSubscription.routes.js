const express = require('express');
const router = express.Router();
const adminSubscriptionController = require('./adminSubscription.controller');
const adminCoinRoutes = require('./coins/adminCoin.routes');
const { protectAdmin } = require('../../../middlewares/auth.middleware');

// Protect all admin subscription routes
router.use(protectAdmin);

// Coins purchases & transaction logs (Aggregation pipeline)
router.use('/coins', adminCoinRoutes);

// Analytics & Stats
router.get('/stats', adminSubscriptionController.getSubscriptionStats);

// User Subscriptions: Listing (light data) & Details by ID (show more)
router.get('/user-subscriptions', adminSubscriptionController.getUserSubscriptions);
router.get('/user-subscriptions/:id', adminSubscriptionController.getUserSubscriptionById);
router.get('/users', adminSubscriptionController.getUserSubscriptions);
router.get('/users/:id', adminSubscriptionController.getUserSubscriptionById);

// Plan CRUD & toggling
router.get('/plans', adminSubscriptionController.getAllPlans);
router.get('/plans/:id', adminSubscriptionController.getPlanById);
router.post('/plans', adminSubscriptionController.createPlan);
router.put('/plans/:id', adminSubscriptionController.updatePlan);
router.patch('/plans/:id/toggle', adminSubscriptionController.togglePlanStatus);

module.exports = router;

