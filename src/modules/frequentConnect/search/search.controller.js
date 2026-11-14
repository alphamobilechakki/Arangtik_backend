const searchService = require('./search.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');

/**
 * GET /api/fc/search/messages – Search messages across conversations
 */
const searchMessages = asyncHandler(async (req, res) => {
  const result = await searchService.searchMessages(req.user.id, req.query);
  return ApiResponse.success(res, result, 'Message search results retrieved successfully');
});

/**
 * GET /api/fc/search/conversations – Search contacts and clusters by name/phone
 */
const searchConversations = asyncHandler(async (req, res) => {
  const result = await searchService.searchConversations(req.user.id, req.query);
  return ApiResponse.success(res, result, 'Conversation search results retrieved successfully');
});

module.exports = {
  searchMessages,
  searchConversations,
};
