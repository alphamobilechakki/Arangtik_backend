const express = require('express');
const router = express.Router();
const faceRecognitionController = require('./faceRecognition.controller');
const { protect } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');
const { validateScanUpload, validateThresholdParam } = require('./faceRecognition.validation');

// All face recognition routes are strictly protected by authentication
router.use(protect);

const uploadMedia = upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

/**
 * 1. REGISTER FACE
 * @route   POST /api/face-recognition/register
 * @alias   POST /api/face-recognition/reference
 * @desc    Register or update user reference face from uploaded photo or existing profile photo
 */
router.post(
  ['/register', '/reference'],
  uploadMedia,
  faceRecognitionController.generateReference
);

/**
 * 2. VERIFY FACE
 * @route   POST /api/face-recognition/verify
 * @alias   POST /api/face-recognition/verify-user-face, /scan-photo, /scan-gallery-photo
 * @desc    Verify face in uploaded photo against user's registered face (or wardrobe owner's face)
 */
router.post(
  ['/verify', '/verify-user-face', '/scan-photo', '/scan-gallery-photo'],
  uploadMedia,
  validateScanUpload,
  validateThresholdParam,
  faceRecognitionController.scanImage
);

/**
 * 3. GET FACE STATUS
 * @route   GET /api/face-recognition/status
 * @alias   GET /api/face-recognition/get, /reference
 * @desc    Get user's registered reference face status and metadata
 */
router.get(
  ['/status', '/get', '/reference'],
  faceRecognitionController.getReferenceStatus
);

// Backward-compatibility utility routes
router.post('/reference/validate', faceRecognitionController.validateReference);
router.delete(['/reference', '/delete', '/'], faceRecognitionController.deleteReference);

module.exports = router;

