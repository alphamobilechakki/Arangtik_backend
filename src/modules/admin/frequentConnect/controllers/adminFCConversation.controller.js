const adminFCConversationService = require('../services/adminFCConversation.service');
const asyncHandler = require('../../../../utils/asyncHandler');
const ApiResponse = require('../../../../utils/apiResponse');

/**
 * GET /api/admin/fc/conversations – List conversations
 */
const getConversations = asyncHandler(async (req, res) => {
  const result = await adminFCConversationService.getConversations(req.query);
  return ApiResponse.success(res, result, 'Conversations retrieved successfully');
});

/**
 * GET /api/admin/fc/conversations/:id/messages – Messages for conversation
 */
const getConversationMessages = asyncHandler(async (req, res) => {
  const result = await adminFCConversationService.getConversationMessages(
    req.params.id,
    req.query
  );
  return ApiResponse.success(res, result, 'Conversation messages retrieved successfully');
});

/**
 * GET /api/admin/fc/messages – Cross-conversation message logs
 */
const getAllMessageLogs = asyncHandler(async (req, res) => {
  const result = await adminFCConversationService.getAllMessageLogs(req.query);
  return ApiResponse.success(res, result, 'Message logs retrieved successfully');
});

module.exports = {
  getConversations,
  getConversationMessages,
  getAllMessageLogs,
};
