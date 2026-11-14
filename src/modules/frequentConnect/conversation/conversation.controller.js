const conversationService = require('./conversation.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const { validateCreateConversation } = require('../message/message.validation');

/**
 * POST /api/fc/conversations – Create or fetch direct 1:1 conversation
 */
const createOrGetDirectConversation = asyncHandler(async (req, res) => {
  validateCreateConversation(req.body);
  const conversation = await conversationService.getOrCreateDirectConversation(
    req.user.id,
    req.body.participantId
  );
  return ApiResponse.success(res, conversation, 'Conversation retrieved successfully');
});

/**
 * GET /api/fc/conversations – List all conversations for the user
 */
const getUserConversations = asyncHandler(async (req, res) => {
  const conversations = await conversationService.getUserConversations(req.user.id);
  return ApiResponse.success(res, conversations, 'User conversations retrieved successfully');
});

/**
 * GET /api/fc/conversations/:id – Get details of a single conversation
 */
const getConversationById = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getConversationById(
    req.params.id,
    req.user.id
  );
  return ApiResponse.success(res, conversation, 'Conversation details retrieved successfully');
});

/**
 * GET /api/fc/conversations/:id/history – Get full paginated conversation history
 */
const getConversationHistory = asyncHandler(async (req, res) => {
  const messageService = require('../message/message.service');
  const result = await messageService.getMessages(
    req.params.id,
    req.user.id,
    req.query
  );
  return ApiResponse.success(res, result, 'Conversation history retrieved successfully');
});

module.exports = {
  createOrGetDirectConversation,
  getUserConversations,
  getConversationById,
  getConversationHistory,
};
