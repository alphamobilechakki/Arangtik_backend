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

router.post(
  '/reference',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
  ]),
  faceRecognitionController.generateReference
);

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
 * @route   POST /api/face-recognition/scan-photo
 * @desc    Scan a single photo against user or wardrobe owner reference face
 */
router.post(
  '/scan-photo',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  validateScanUpload,
  validateThresholdParam,
  faceRecognitionController.scanImage
);

// Backward-compatibility aliases
router.post(
  ['/scan-gallery-photo', '/verify-user-face'],
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]),
  validateScanUpload,
  validateThresholdParam,
  faceRecognitionController.scanImage
);

module.exports = router;

