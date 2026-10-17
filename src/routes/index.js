const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const wardrobeRoutes = require('../modules/wardrobe/wardrobe.routes');
const faceRecognitionRoutes = require('../modules/faceRecognition/faceRecognition.routes');
const clothAnalysisRoutes = require('../modules/clothAnalysis/clothAnalysis.routes');
const uploadRoutes = require('../modules/upload/upload.routes');

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Arangtik Backend API is healthy' });
});

// Upload Routes (Single & Multiple Image Storage matching Pravisti setup)
router.use('/upload', uploadRoutes);
router.use('/v1/upload', uploadRoutes);

// Auth Routes
router.use('/auth', authRoutes);

// Cloth Analysis & AI Vision Routes (Phase 2 & 3)
router.use('/cloth-analysis', clothAnalysisRoutes);
router.use('/v1/cloth-analysis', clothAnalysisRoutes);
router.use('/clothing-analysis', clothAnalysisRoutes);

// Wardrobe Store Routes
router.use('/wardrobe', wardrobeRoutes);
router.use('/v1/wardrobe', wardrobeRoutes);

// Face Recognition Routes (Phase 1)
router.use('/face-recognition', faceRecognitionRoutes);
router.use('/v1/face-recognition', faceRecognitionRoutes);

// Integration & External Admin Sync Routes (Protected by x-api-key)
const integrationRoutes = require('../modules/integration/integration.routes');
router.use('/integration', integrationRoutes);
router.use('/v1/integration', integrationRoutes);

// Smart Outfit Suggestion & Styling Routes
const outfitRoutes = require('../modules/outfit/outfit.routes');
router.use('/outfit', outfitRoutes);
router.use('/v1/outfit', outfitRoutes);

// Laundry & Work Order Routes
const laundryRoutes = require('../modules/laundry/laundry.routes');
router.use('/laundry', laundryRoutes);
router.use('/v1/laundry', laundryRoutes);

// Vendor Management Routes
const vendorRoutes = require('../modules/vendor/vendor.routes');
router.use('/vendor', vendorRoutes);
router.use('/v1/vendor', vendorRoutes);

// Notification & FCM Routes
const notificationRoutes = require('../modules/notification/notification.routes');
router.use('/notifications', notificationRoutes);
router.use('/v1/notifications', notificationRoutes);

// Admin Module Routes
const adminRoutes = require('../modules/admin/admin.routes');
router.use('/admin', adminRoutes);
router.use('/v1/admin', adminRoutes);

module.exports = router;
