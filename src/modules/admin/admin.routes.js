const express = require('express');
const router = express.Router();

// ── Authentication ──────────────────────────────────────────
const adminAuthRoutes = require('./auth/adminAuth.routes');

// ── Core Management ─────────────────────────────────────────
const categoryRoutes = require('../category/category.routes');
const categoryServiceRoutes = require('../categoryService/categoryService.routes');
const storeTypeRoutes = require('./storeType/storeType.routes');
const densityCategoryRoutes = require('./densityCategory/densityCategory.routes');
const productRoutes = require('./product/product.routes');
const coinPackageRoutes = require('./subscription/coins/coinPackage.routes');
const adminSubscriptionRoutes = require('./subscription/adminSubscription.routes');
const clusterFeatureRoutes = require('./clusterFeature/clusterFeature.routes');
const garmentAiRoutes = require('./garmentAi/adminGarmentAi.routes');
const terminalRoutes = require('./terminal/terminal.routes');
const jewelleryCategoryRoutes = require('../jewellery/category/jewelleryCategory.routes');
const adminJewelleryRoutes = require('./jewellery/adminJewellery.routes');
const adminEventRoutes = require('./event/adminEvent.routes');

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
router.use('/vendor-categories', categoryRoutes);
router.use('/services', categoryServiceRoutes);
router.use('/store-types', storeTypeRoutes);
router.use('/density-categories', densityCategoryRoutes);
router.use('/products', productRoutes);
router.use('/coin-packages', coinPackageRoutes);
router.use('/subscription', adminSubscriptionRoutes);
router.use('/cluster-features', clusterFeatureRoutes);
router.use('/garment-ai', garmentAiRoutes);
router.use('/terminal', terminalRoutes);
router.use('/jewellery-categories', jewelleryCategoryRoutes);
router.use('/jewellery', adminJewelleryRoutes);
router.use('/events', adminEventRoutes);
router.use('/event-types', adminEventRoutes.eventTypeRouter);

// ── Business Management Routes ──────────────────────────────
router.use('/vendors', adminVendorRoutes);
router.use('/orders', adminOrderRoutes);

// ── Hardware Management Routes ─────────────────────────────
const adminFCRoutes = require('./frequentConnect/routes/adminFC.routes');

router.use('/hardware/hubs', hubRoutes);
router.use('/hardware/kitchenBox', kitchenBoxRoutes);
router.use('/hardware/captures', kitchenBoxCaptureRoutes);

// ── Frequent Connect Administrative Monitoring Routes ───────
router.use('/fc', adminFCRoutes);

module.exports = router;
