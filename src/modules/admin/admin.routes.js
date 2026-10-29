const express = require('express');
const router = express.Router();
const adminAuthRoutes = require('./auth/adminAuth.routes');
const categoryRoutes = require('../category/category.routes');
const adminVendorRoutes = require('./vendor/adminVendor.routes');

// Admin Submodule: Authentication (/api/admin/auth/login, /api/admin/auth/me)
router.use('/auth', adminAuthRoutes);

// Admin Submodule: Categories Management (/api/admin/categories & /api/admin/vendor-categories)
router.use('/vendor-categories', categoryRoutes);
router.use('/categories', categoryRoutes);

// Admin Submodule: Vendors Hub Management (/api/admin/vendors)
router.use('/vendors', adminVendorRoutes);

// Admin Submodule: Orders Management (/api/admin/orders)
const adminOrderRoutes = require('./order/adminOrder.routes');
router.use('/orders', adminOrderRoutes);

// Admin Submodule: Services Management (/api/admin/services)
const categoryServiceRoutes = require('../categoryService/categoryService.routes');
router.use('/services', categoryServiceRoutes);

// Admin Submodule: Store Types Management (/api/admin/store-types)
const storeTypeRoutes = require('./storeType/storeType.routes');
router.use('/store-types', storeTypeRoutes);

module.exports = router;

