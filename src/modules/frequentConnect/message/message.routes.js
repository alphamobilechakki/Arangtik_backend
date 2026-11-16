const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const messageController = require('./message.controller');

// All message routes require authentication
router.use(protect);

// Saved / bookmarked messages listing
router.get('/saved', messageController.getSavedMessages);

// Status updates
router.patch('/:id/status', messageController.updateStatus);

// Bookmark / save operations
router.post('/:id/save', messageController.saveMessage);
router.delete('/:id/save', messageController.unsaveMessage);
router.post('/:id/bookmark', messageController.saveMessage);
router.delete('/:id/bookmark', messageController.unsaveMessage);

module.exports = router;
