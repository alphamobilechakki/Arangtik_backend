const express = require('express');
const router = express.Router();
const adminAuthController = require('./adminAuth.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const { validateAdminLogin } = require('./adminAuth.validation');

// ==========================================
// 1. Admin Authentication Endpoints (Public)
// ==========================================
router.post('/login', validateAdminLogin, adminAuthController.login);

// ==========================================
// 2. Admin Profile (Protected by Admin Token)
// ==========================================
router.get('/me', protectAdmin, adminAuthController.getMe);

module.exports = router;
