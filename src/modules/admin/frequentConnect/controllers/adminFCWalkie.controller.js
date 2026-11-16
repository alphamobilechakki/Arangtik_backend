const adminFCWalkieService = require('../services/adminFCWalkie.service');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');

/**
 * GET /api/admin/fc/walkie/active – Active walkie-talkie sessions
 */
const getActiveSessions = asyncHandler(async (req, res) => {
  const result = await adminFCWalkieService.getActiveSessions();
  return ApiResponse.success(res, result, 'Active walkie-talkie sessions retrieved successfully');
});

/**
 * GET /api/admin/fc/walkie/history – Historical walkie-talkie sessions
 */
const getSessionHistory = asyncHandler(async (req, res) => {
  const result = await adminFCWalkieService.getSessionHistory(req.query);
  return ApiResponse.success(res, result, 'Walkie-talkie history retrieved successfully');
});

/**
 * GET /api/admin/fc/voice/logs – Voice message logs
 */
const getVoiceLogs = asyncHandler(async (req, res) => {
  const result = await adminFCWalkieService.getVoiceLogs(req.query);
  return ApiResponse.success(res, result, 'Voice message logs retrieved successfully');
});

module.exports = {
  getActiveSessions,
  getSessionHistory,
  getVoiceLogs,
};
