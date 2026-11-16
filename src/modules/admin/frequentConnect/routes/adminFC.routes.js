const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../../../../middlewares/auth.middleware');

const adminFCOverviewController = require('../controllers/adminFCOverview.controller');
const adminFCClusterController = require('../controllers/adminFCCluster.controller');
const adminFCConversationController = require('../controllers/adminFCConversation.controller');
const adminFCWalkieController = require('../controllers/adminFCWalkie.controller');
const adminFCAuditController = require('../controllers/adminFCAudit.controller');

// All Admin Frequent Connect routes require Admin authorization
router.use(protectAdmin);

// 1. Overview Dashboard Metrics
router.get('/overview', adminFCOverviewController.getOverview);

// 2. Clusters & Members
router.get('/clusters', adminFCClusterController.getClusters);
router.get('/clusters/:id', adminFCClusterController.getClusterDetails);
router.get('/members', adminFCClusterController.getMembers);

// 3. Conversations & Messages
router.get('/conversations', adminFCConversationController.getConversations);
router.get('/conversations/:id/messages', adminFCConversationController.getConversationMessages);
router.get('/messages', adminFCConversationController.getAllMessageLogs);

// 4. Voice & Walkie-Talkie
router.get('/walkie/active', adminFCWalkieController.getActiveSessions);
router.get('/walkie/history', adminFCWalkieController.getSessionHistory);
router.get('/voice/logs', adminFCWalkieController.getVoiceLogs);

// 5. Saved Messages, Auto-Delete Logs, Invitations & Audit Logs
router.get('/saved-messages', adminFCAuditController.getSavedMessages);
router.get('/auto-delete/logs', adminFCAuditController.getAutoDeleteLogs);
router.get('/invitations', adminFCAuditController.getInvitations);
router.get('/audit-logs', adminFCAuditController.getAuditLogs);

module.exports = router;
