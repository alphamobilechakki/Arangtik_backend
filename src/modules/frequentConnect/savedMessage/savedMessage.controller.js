const savedMessageService = require('./savedMessage.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');

/**
 * POST /api/fc/messages/:id/save – Bookmark / save message
 */
const saveMessage = asyncHandler(async (req, res) => {
  const result = await savedMessageService.saveMessage(
    req.user.id,
    req.params.id,
    req.body.note
  );
  return ApiResponse.success(res, result, 'Message saved successfully');
});

/**
 * DELETE /api/fc/messages/:id/save – Unsave / remove bookmark
 */
const unsaveMessage = asyncHandler(async (req, res) => {
  const result = await savedMessageService.unsaveMessage(
    req.user.id,
    req.params.id
  );
  return ApiResponse.success(res, result, 'Message unsaved successfully');
});

/**
 * GET /api/fc/saved-messages – List all saved messages
 */
const getSavedMessages = asyncHandler(async (req, res) => {
  const result = await savedMessageService.getSavedMessages(
    req.user.id,
    req.query
  );
  return ApiResponse.success(res, result, 'Saved messages retrieved successfully');
});

module.exports = {
  saveMessage,
  unsaveMessage,
  getSavedMessages,
};
