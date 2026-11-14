const express = require('express');
const router = express.Router();

const clusterRoutes = require('./cluster/cluster.routes');
const memberRoutes = require('./member/member.routes');
const inviteRoutes = require('./invite/invite.routes');
const conversationRoutes = require('./conversation/conversation.routes');
const messageRoutes = require('./message/message.routes');
const savedMessageRoutes = require('./savedMessage/savedMessage.routes');
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

// Saved / bookmarked messages
router.use('/saved-messages', savedMessageRoutes);

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
