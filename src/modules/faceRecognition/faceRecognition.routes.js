const express = require('express');
const router = express.Router();
const faceRecognitionController = require('./faceRecognition.controller');
const { protect } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');
const { validateScanUpload, validateThresholdParam } = require('./faceRecognition.validation');

// All face recognition routes are strictly protected by authentication
router.use(protect);

/**
 * @route   POST /api/face-recognition/reference/validate
 * @desc    Validate user's existing profile photo (checks for exactly 1 high-quality face)
 */
router.post('/reference/validate', faceRecognitionController.validateReference);

/**
 * @route   POST /api/face-recognition/reference
 * @desc    Generate / update reference face embedding from profile image
 */
router.post('/reference', faceRecognitionController.generateReference);

/**
 * @route   GET /api/face-recognition/reference
 * @desc    Get reference face embedding metadata & status
 */
router.get('/reference', faceRecognitionController.getReferenceStatus);

/**
 * @route   DELETE /api/face-recognition/reference
 * @desc    Delete / invalidate reference face embedding
 */
router.delete('/reference', faceRecognitionController.deleteReference);

/**
 * @route   POST /api/face-recognition/scan
 * @desc    Scan a single gallery photo against the logged-in user's reference face
 */
router.post(
  '/scan',
  upload.single('image'),
  validateScanUpload,
  validateThresholdParam,
  faceRecognitionController.scanImage
);

const wardrobeController = require('../wardrobe/wardrobe.controller');

/**
 * @route   POST /api/face-recognition/scan-and-ingest
 * @desc    Scan gallery photos, match user's face, extract clothing with AI vision and auto-ingest into digital wardrobe
 */
router.post(
  '/scan-and-ingest',
  upload.array('photos', 20),
  wardrobeController.ingestGalleryPhotos
);

module.exports = router;
