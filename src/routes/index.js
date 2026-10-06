const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');
const wardrobeRoutes = require('../modules/wardrobe/wardrobe.routes');
const faceRecognitionRoutes = require('../modules/faceRecognition/faceRecognition.routes');
const clothAnalysisRoutes = require('../modules/clothAnalysis/clothAnalysis.routes');

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Arangtik Backend API is healthy' });
});

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

module.exports = router;
