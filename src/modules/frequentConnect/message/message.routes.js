const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const messageController = require('./message.controller');

const savedMessageController = require('../savedMessage/savedMessage.controller');

// All message routes require authentication
router.use(protect);

router.patch('/:id/status', messageController.updateStatus);
router.post('/:id/save', savedMessageController.saveMessage);
router.delete('/:id/save', savedMessageController.unsaveMessage);

module.exports = router;
