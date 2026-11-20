const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const ApiError = require('../../../utils/apiError');
const adminGarmentAiService = require('./adminGarmentAi.service');

/**
 * @desc    Get Arangtik Garment AI Service Health & GPU Info
 * @route   GET /api/admin/garment-ai/health
 * @access  Private (Admin)
 */
const getHealth = asyncHandler(async (req, res) => {
  const healthData = await adminGarmentAiService.getHealthStatus();
  return ApiResponse.success(res, healthData, 'Garment AI service health checked successfully');
});

/**
 * @desc    Test Garment Image with Arangtik Garment AI Microservice
 * @route   POST /api/admin/garment-ai/test
 * @access  Private (Admin)
 */
const testImage = asyncHandler(async (req, res) => {
  // Support both single file under 'file' or 'image' field
  const file = req.file || (req.files && (req.files.file?.[0] || req.files.image?.[0]));

  if (!file) {
    throw new ApiError(400, 'Please upload a garment image file (key: "file" or "image")');
  }

  const result = await adminGarmentAiService.testGarmentImage(file, req.body);
  return ApiResponse.success(res, result, 'Garment processed cleanly through 3D Ghost-Mannequin Pipeline');
});

module.exports = {
  getHealth,
  testImage,
};
