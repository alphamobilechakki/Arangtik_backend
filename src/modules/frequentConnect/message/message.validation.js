const ApiError = require('../../../utils/apiError');

/**
 * Validate direct conversation creation payload
 */
const validateCreateConversation = (body) => {
  const { participantId } = body;
  if (!participantId || typeof participantId !== 'string') {
    throw new ApiError(400, 'participantId is required');
  }
};

/**
 * Validate sending a message
 */
const validateSendMessage = (body) => {
  const { content, type } = body;
  const messageType = type ? String(type).toUpperCase() : 'TEXT';

  if (messageType === 'TEXT') {
    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new ApiError(400, 'Message content cannot be empty');
    }
    if (content.length > 5000) {
      throw new ApiError(400, 'Message cannot exceed 5000 characters');
    }
  }

  const validTypes = ['TEXT', 'VOICE', 'WALKIE_TALKIE'];
  if (!validTypes.includes(messageType)) {
    throw new ApiError(400, `Invalid message type: ${type}. Must be one of: ${validTypes.join(', ')}`);
  }
};

/**
 * Validate updating message status
 */
const validateUpdateStatus = (body) => {
  const { status } = body;
  const validStatuses = ['DELIVERED', 'SEEN', 'PLAYED'];
  if (!status || !validStatuses.includes(String(status).toUpperCase())) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }
};

/**
 * Sanitize text against common injection / script injection
 */
const sanitizeMessageContent = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
};

module.exports = {
  validateCreateConversation,
  validateSendMessage,
  validateUpdateStatus,
  sanitizeMessageContent,
};
