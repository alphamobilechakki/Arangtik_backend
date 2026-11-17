const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/auth.middleware');

const clusterRoutes = require('./cluster/cluster.routes');
const memberRoutes = require('./member/member.routes');
const inviteRoutes = require('./invite/invite.routes');
const conversationRoutes = require('./conversation/conversation.routes');
const messageRoutes = require('./message/message.routes');
const messageController = require('./message/message.controller');
const widgetRoutes = require('./widget/widget.routes');
const searchRoutes = require('./search/search.routes');

// Cluster management
router.use('/clusters', clusterRoutes);

// Member management (nested under clusters)
router.use('/clusters/:id/members', memberRoutes);

// Invite management
router.use('/invites', inviteRoutes);

// Conversations and message handling
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);

// Saved / bookmarked messages (served directly by message controller)
router.get('/saved-messages', protect, messageController.getSavedMessages);

// Active cluster features (for group creation checkboxes/toggles)
const clusterController = require('./cluster/cluster.controller');
router.get('/features', protect, clusterController.getAvailableFeatures);

// Quick-Action Home Screen Widget Data APIs
router.use('/widget', widgetRoutes);

// Message & Conversation Search
router.use('/search', searchRoutes);

// Health check for Frequent Connect subsystem
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    feature: 'Frequent Connect',
    timestamp: new Date(),
  });
});

module.exports = router;
