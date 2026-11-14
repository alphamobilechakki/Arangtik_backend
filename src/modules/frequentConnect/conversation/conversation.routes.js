const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const conversationController = require('./conversation.controller');
const messageController = require('../message/message.controller');

// All conversation routes require authentication
router.use(protect);

router.post('/', conversationController.createOrGetDirectConversation);
router.get('/', conversationController.getUserConversations);
router.get('/:id', conversationController.getConversationById);

const { uploadVoice } = require('../../../middlewares/voiceUpload.middleware');
const { rateLimitMessages } = require('../../../middlewares/fcRateLimit.middleware');

// Nested message endpoints under conversation (with 40 msg/min rate limit)
router.post('/:id/messages', rateLimitMessages(40), messageController.sendMessage);
router.post('/:id/voice', rateLimitMessages(20), uploadVoice.single('audio'), messageController.sendVoiceMessage);
router.get('/:id/messages', messageController.getMessages);
router.get('/:id/history', conversationController.getConversationHistory);

module.exports = router;
