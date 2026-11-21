const express = require('express');
const router = express.Router();
const terminalController = require('./terminal.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');

// Protect all admin terminal routes
router.use(protectAdmin);

// 1. Get recent in-memory logs and live BullMQ stats
router.get('/logs', terminalController.getLogs);

// 2. Clear in-memory logs
router.delete('/clear', terminalController.clearLogs);

module.exports = router;
