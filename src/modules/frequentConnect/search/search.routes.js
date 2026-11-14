const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const searchController = require('./search.controller');

// All search endpoints require authentication
router.use(protect);

router.get('/messages', searchController.searchMessages);
router.get('/conversations', searchController.searchConversations);

module.exports = router;
