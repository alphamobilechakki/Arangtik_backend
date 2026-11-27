const messageService = require('./message.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const { validateSendMessage, validateUpdateStatus } = require('./message.validation');

/**
 * POST /api/fc/conversations/:id/messages – Send message in a conversation
 */
const sendMessage = asyncHandler(async (req, res) => {
  validateSendMessage(req.body);
  const message = await messageService.sendMessage(
    req.params.id,
    req.user.id,
    req.body
  );
  return ApiResponse.created(res, message, 'Message sent successfully');
});

/**
 * GET /api/fc/conversations/:id/messages – Retrieve messages for a conversation
 */
const getMessages = asyncHandler(async (req, res) => {
  const result = await messageService.getMessages(
    req.params.id,
    req.user.id,
    req.query
  );
  return ApiResponse.success(res, result, 'Messages retrieved successfully');
});

/**
 * PATCH /api/fc/messages/:id/status – Update read / delivery status of a message
 */
const updateStatus = asyncHandler(async (req, res) => {
  validateUpdateStatus(req.body);
  const result = await messageService.updateMessageStatus(
    req.params.id,
    req.user.id,
    req.body.status
  );
  return ApiResponse.success(res, result, 'Message status updated successfully');
});

/**
 * POST /api/fc/conversations/:id/voice – Upload and send a voice message
 */
const sendVoiceMessage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Audio voice file is required' });
  }

  const { formatUploadUrl } = require('../../../utils/url.util');
  const voiceRelativePath = `/uploads/voice/${req.file.filename}`;
  const voiceUrl = formatUploadUrl(voiceRelativePath);
  const voiceDuration = parseFloat(req.body.duration) || 0;

  const message = await messageService.sendMessage(
    req.params.id,
    req.user.id,
    {
      type: 'VOICE',
      content: req.body.caption || '',
      voiceUrl,
      voiceDuration,
    }
  );

  return ApiResponse.created(res, message, 'Voice message sent successfully');
});

module.exports = {
  sendMessage,
  sendVoiceMessage,
  getMessages,
  updateStatus,
};
