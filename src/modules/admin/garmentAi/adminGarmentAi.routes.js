const express = require('express');
const router = express.Router();
const adminGarmentAiController = require('./adminGarmentAi.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const upload = require('../../../middlewares/upload.middleware');

// Protect all admin Garment AI routes
router.use(protectAdmin);

// Multer upload middleware supporting 'file' or 'image'
const uploadGarmentTest = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

// 1. Health & GPU Worker Telemetry
router.get('/health', adminGarmentAiController.getHealth);

// 2. Test Garment Image Pipeline (Upload raw photo -> Get 3D Ghost Mannequin)
router.post('/test', uploadGarmentTest, adminGarmentAiController.testImage);

module.exports = router;
