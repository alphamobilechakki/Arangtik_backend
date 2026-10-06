const { ERROR_CODES, SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } = require('./faceRecognition.constants');
const ApiError = require('../../utils/apiError');

/**
 * Validation middlewares and helpers for Face Recognition module
 */
const validateScanUpload = (req, res, next) => {
  const file = req.file || (req.files?.image?.[0] || req.files?.photo?.[0]);
  if (!file && !req.body.imageUrl && !req.body.imagePath) {
    throw new ApiError(400, 'Gallery image file or path is required for scanning', [
      { code: ERROR_CODES.INVALID_IMAGE, message: 'Please upload an image file under field name "photo" or "image"' },
    ]);
  }

  if (file) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.mimetype)) {
      throw new ApiError(400, `Unsupported image format (${file.mimetype}). Supported formats: JPEG, PNG, WEBP`, [
        { code: ERROR_CODES.UNSUPPORTED_IMAGE, message: 'Invalid MIME type' },
      ]);
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new ApiError(400, `Image size exceeds maximum allowed limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`, [
        { code: ERROR_CODES.IMAGE_TOO_LARGE, message: 'File too large' },
      ]);
    }
  }

  next();
};

const validateThresholdParam = (req, res, next) => {
  if (req.query.threshold !== undefined || req.body.threshold !== undefined) {
    const rawVal = req.query.threshold !== undefined ? req.query.threshold : req.body.threshold;
    const threshold = parseFloat(rawVal);
    if (isNaN(threshold) || threshold <= 0 || threshold > 2.0) {
      throw new ApiError(400, 'Threshold must be a positive number between 0.1 and 2.0', [
        { code: ERROR_CODES.INVALID_IMAGE, message: 'Invalid threshold parameter' },
      ]);
    }
    req.customThreshold = threshold;
  }
  next();
};

module.exports = {
  validateScanUpload,
  validateThresholdParam,
};
