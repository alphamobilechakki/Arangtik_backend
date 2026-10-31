const express = require('express');
const router = express.Router();

// ── Authentication ──────────────────────────────────────────
const adminAuthRoutes = require('./auth/adminAuth.routes');

// ── Core Management ─────────────────────────────────────────
const categoryRoutes = require('../category/category.routes');
const categoryServiceRoutes = require('../categoryService/categoryService.routes');
const storeTypeRoutes = require('./storeType/storeType.routes');

// ── Vendor & Order Management ──────────────────────────────
const adminVendorRoutes = require('./vendor/adminVendor.routes');
const adminOrderRoutes = require('./order/adminOrder.routes');

// ── Hardware Management ─────────────────────────────────────
const hubRoutes = require('./hardware/hub/hub.routes');
const kitchenBoxRoutes = require('./hardware/kitechenBox/kitchenBox.routes');
const kitchenBoxCaptureRoutes = require('./hardware/kitchenBoxCaptures/kitchenBoxCapture.routes');

// ── Authentication Routes ──────────────────────────────────
router.use('/auth', adminAuthRoutes);

// ── Core Management Routes ──────────────────────────────────
router.use('/categories', categoryRoutes);
router.use('/services', categoryServiceRoutes);
router.use('/store-types', storeTypeRoutes);

// ── Business Management Routes ──────────────────────────────
router.use('/vendors', adminVendorRoutes);
router.use('/orders', adminOrderRoutes);

// ── Hardware Management Routes ─────────────────────────────
router.use('/hardware/hubs', hubRoutes);
router.use('/hardware/kitchenBox', kitchenBoxRoutes);
router.use('/hardware/captures', kitchenBoxCaptureRoutes);

module.exports = router;