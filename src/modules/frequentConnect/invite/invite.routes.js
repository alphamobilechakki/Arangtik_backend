const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const inviteController = require('./invite.controller');

// All invite routes require authentication
router.use(protect);

router.post('/', inviteController.createInvite);
router.post('/respond', inviteController.acceptInvite);
router.get('/', inviteController.getSentInvites);
router.post('/:code/accept', inviteController.acceptInvite);

module.exports = router;
