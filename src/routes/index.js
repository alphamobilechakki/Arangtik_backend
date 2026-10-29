const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const wardrobeRoutes = require('../modules/wardrobe/wardrobe.routes');
const faceRecognitionRoutes = require('../modules/faceRecognition/faceRecognition.routes');
const clothAnalysisRoutes = require('../modules/clothAnalysis/clothAnalysis.routes');
const uploadRoutes = require('../modules/upload/upload.routes');
const integrationRoutes = require('../modules/integration/integration.routes');
const outfitRoutes = require('../modules/outfit/outfit.routes');
const orderRoutes = require('../modules/order/order.routes');
const laundryRoutes = require('../modules/order/laundry/laundry.routes');
const vendorRoutes = require('../modules/vendor/vendor.routes');
const notificationRoutes = require('../modules/notification/notification.routes');
const categoryRoutes = require('../modules/category/category.routes');
const categoryServiceRoutes = require('../modules/categoryService/categoryService.routes');
const adminRoutes = require('../modules/admin/admin.routes');

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Arangtik Backend API is healthy' });
});

// Upload Routes (Single & Multiple Image Storage)
router.use('/upload', uploadRoutes);

// Auth Routes
router.use('/auth', authRoutes);

// Cloth Analysis & AI Vision Routes
router.use('/cloth-analysis', clothAnalysisRoutes);

// Wardrobe Store Routes
router.use('/wardrobe', wardrobeRoutes);

// Face Recognition Routes
router.use('/face-recognition', faceRecognitionRoutes);

// Integration & External Admin Sync Routes (Protected by x-api-key)
router.use('/integration', integrationRoutes);

// Smart Outfit Suggestion & Styling Routes
router.use('/outfit', outfitRoutes);

// Universal Orders Routes (Multi-Category Service Work Orders)
router.use('/orders', orderRoutes);

// Laundry & Specific Work Order Routes
router.use('/laundry', laundryRoutes);

// Vendor Management Routes
router.use('/vendor', vendorRoutes);

// Notification & FCM Routes
router.use('/notifications', notificationRoutes);

// Categories Routes (Level 1 Categories: Washerman, etc.)
router.use('/categories', categoryRoutes);

// Category Services Routes (Public / Customer / Vendor discovery)
router.use('/services', categoryServiceRoutes);

// Vendor Services Routes (Vendor-specific offered services & pricing)
const vendorServiceRoutes = require('../modules/vendorService/vendorService.routes');
router.use('/vendor-services', vendorServiceRoutes);

// Store Types Routes (Public customer and mobile app store types list)
const storeTypeRoutes = require('../modules/admin/storeType/storeType.routes');
router.use('/store-types', storeTypeRoutes);

// Admin Module Routes
router.use('/admin', adminRoutes);

module.exports = router;
