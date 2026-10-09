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
   * @desc    Generate / refresh reference face embedding from user's profile image or directly uploaded photo
   * @route   POST /api/face-recognition/reference
   * @access  Private
   */
  generateReference = asyncHandler(async (req, res) => {
    const file = req.file || (req.files?.image?.[0] || req.files?.photo?.[0]);
    const result = await faceRecognitionService.generateReferenceEmbedding(req.user.id, file);
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

    const file =
      req.file ||
      req.files?.photo?.[0] ||
      req.files?.image?.[0] ||
      req.files?.file?.[0];
    if (file) {
      imageInput = file.path || file.buffer;
      fileMeta = {
        filename: file.filename || file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    } else if (req.body.imageUrl || req.body.imagePath) {
      imageInput = req.body.imageUrl || req.body.imagePath;
      fileMeta = {
        filename: imageInput,
      };
    }

    const customThreshold =
      req.customThreshold ||
      (req.body.threshold ? parseFloat(req.body.threshold) : null);
    const wardrobeId = req.body.wardrobeId || req.query.wardrobeId || null;

    const result = await faceRecognitionService.scanGalleryImage(
      req.user.id,
      imageInput,
      fileMeta,
      customThreshold,
      wardrobeId
    );

    const targetLabel = result.targetPersonName ? `(${result.targetPersonName})` : '';
    const message = result.matched
      ? `Face matched successfully ${targetLabel} - ${result.matchedFaces?.length || 1} face(s) verified`
      : `Target face ${targetLabel} not detected in this photo`;

    return ApiResponse.success(res, result, message);
  });
}

module.exports = new FaceRecognitionController();
