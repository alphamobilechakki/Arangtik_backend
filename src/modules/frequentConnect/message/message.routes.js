const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const messageController = require('./message.controller');

// All message routes require authentication
router.use(protect);

// Status updates (DELIVERED, SEEN, PLAYED)
router.patch('/:id/status', messageController.updateStatus);

module.exports = router;
