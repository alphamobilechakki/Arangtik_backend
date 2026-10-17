const express = require('express');
const router = express.Router();
const adminAuthRoutes = require('./auth/adminAuth.routes');
const vendorCategoryRoutes = require('./vendorCategory/vendorCategory.routes');

// Admin Submodule: Authentication (/api/admin/auth/login, /api/admin/auth/me)
router.use('/auth', adminAuthRoutes);

// Admin Submodule: Vendor Categories Management (/api/admin/vendor-categories and /api/admin/categories)
router.use('/vendor-categories', vendorCategoryRoutes);
router.use('/categories', vendorCategoryRoutes);

module.exports = router;
