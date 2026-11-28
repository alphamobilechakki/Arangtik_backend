const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const aiStylistService = require('./aiStylist.service');

const generateLook = asyncHandler(async (req, res) => {
  const result = await aiStylistService.generateLook(req.user.id || req.user._id, req.body);
  return ApiResponse.success(res, result, 'AI look generation started', 202);
});

const getSavedLooks = asyncHandler(async (req, res) => {
  const result = await aiStylistService.getSavedLooks(req.user.id || req.user._id, req.query);
  return ApiResponse.success(res, result, 'AI looks fetched successfully');
});

const getLookById = asyncHandler(async (req, res) => {
  const look = await aiStylistService.getLookById(req.user.id || req.user._id, req.params.id);
  return ApiResponse.success(res, look, 'AI look fetched successfully');
});

const deleteLook = asyncHandler(async (req, res) => {
  await aiStylistService.softDeleteLook(req.user.id || req.user._id, req.params.id);
  return ApiResponse.success(res, null, 'AI look deleted successfully');
});

module.exports = {
  generateLook,
  getSavedLooks,
  getLookById,
  deleteLook,
};
