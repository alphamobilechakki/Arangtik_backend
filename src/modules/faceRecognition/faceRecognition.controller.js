const faceRecognitionService = require('./faceRecognition.service');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');

/**
 * Face Recognition Controller
 * Handles incoming HTTP requests for Reference Face validation/generation
 * and single Gallery image scanning.
 */
class FaceRecognitionController {
  /**
   * @desc    Validate user's existing profile image for face recognition
   * @route   POST /api/face-recognition/reference/validate
   * @access  Private
   */
  validateReference = asyncHandler(async (req, res) => {
    const result = await faceRecognitionService.validateReferenceFace(req.user.id);
    return ApiResponse.success(res, result, 'Profile image validated for face recognition');
  });

  /**
   * @desc    Generate / refresh reference face embedding from user's profile image
   * @route   POST /api/face-recognition/reference
   * @access  Private
   */
  generateReference = asyncHandler(async (req, res) => {
    const result = await faceRecognitionService.generateReferenceEmbedding(req.user.id);
    return ApiResponse.success(res, result, 'Reference face embedding generated successfully');
  });

  /**
   * @desc    Get user's reference face embedding metadata & status
   * @route   GET /api/face-recognition/reference
   * @access  Private
   */
  getReferenceStatus = asyncHandler(async (req, res) => {
    const result = await faceRecognitionService.getReferenceStatus(req.user.id);
    return ApiResponse.success(res, result, 'Reference face status retrieved successfully');
  });

  /**
   * @desc    Delete / invalidate reference face embedding
   * @route   DELETE /api/face-recognition/reference
   * @access  Private
   */
  deleteReference = asyncHandler(async (req, res) => {
    const result = await faceRecognitionService.deleteReferenceEmbedding(req.user.id);
    return ApiResponse.success(res, result, 'Reference face embedding deleted successfully');
  });

  /**
   * @desc    Scan one gallery image against the authenticated user's reference face
   * @route   POST /api/face-recognition/scan
   * @access  Private
   */
  scanImage = asyncHandler(async (req, res) => {
    let imageInput;
    let fileMeta = {};

    if (req.file) {
      imageInput = req.file.path || req.file.buffer;
      fileMeta = {
        filename: req.file.filename || req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };
    } else if (req.body.imageUrl || req.body.imagePath) {
      imageInput = req.body.imageUrl || req.body.imagePath;
      fileMeta = {
        filename: imageInput,
      };
    }

    const customThreshold = req.customThreshold || null;
    const result = await faceRecognitionService.scanGalleryImage(
      req.user.id,
      imageInput,
      fileMeta,
      customThreshold
    );

    return ApiResponse.success(res, result, 'Gallery image scan completed');
  });
}

module.exports = new FaceRecognitionController();
