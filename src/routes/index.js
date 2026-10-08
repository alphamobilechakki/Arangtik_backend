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

module.exports = router;
