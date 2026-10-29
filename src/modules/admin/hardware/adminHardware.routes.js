const express = require('express');
const router = express.Router();
const adminHardwareController = require('./adminHardware.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');

// All hardware admin routes are protected by admin authentication (Bearer token or x-api-key)
router.use(protectAdmin);

// ==========================================
// 1. Hardware Overview & Analytics Stats
// ==========================================
router.get('/stats', adminHardwareController.getStats);

// ==========================================
// 2. Hub Management
// ==========================================
router.get('/hubs', adminHardwareController.getHubs);
router.get('/hubs/:id', adminHardwareController.getHubById);
router.patch('/hubs/:id', adminHardwareController.updateHub);
router.patch('/hubs/:id/status', adminHardwareController.updateHubStatus);
router.delete('/hubs/:id', adminHardwareController.deleteHub);

// ==========================================
// 3. KitchenBox Management
// ==========================================
router.get('/boxes', adminHardwareController.getKitchenBoxes);
router.get('/boxes/:id', adminHardwareController.getKitchenBoxById);
router.patch('/boxes/:id', adminHardwareController.updateKitchenBox);
router.patch('/boxes/:id/status', adminHardwareController.updateKitchenBoxStatus);
router.delete('/boxes/:id', adminHardwareController.deleteKitchenBox);

module.exports = router;

