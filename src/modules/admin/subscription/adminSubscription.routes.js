const express = require('express');
const router = express.Router();
const adminSubscriptionController = require('./adminSubscription.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');

// Protect all admin subscription routes
router.use(protectAdmin);

// Analytics & Stats
router.get('/stats', adminSubscriptionController.getSubscriptionStats);

// User Subscriptions listing
router.get('/users', adminSubscriptionController.getUserSubscriptions);

// Plan CRUD & toggling
router.get('/plans', adminSubscriptionController.getAllPlans);
router.get('/plans/:id', adminSubscriptionController.getPlanById);
router.post('/plans', adminSubscriptionController.createPlan);
router.put('/plans/:id', adminSubscriptionController.updatePlan);
router.patch('/plans/:id/toggle', adminSubscriptionController.togglePlanStatus);

module.exports = router;

