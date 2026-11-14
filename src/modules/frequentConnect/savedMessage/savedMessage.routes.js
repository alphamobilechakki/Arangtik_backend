const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const savedMessageController = require('./savedMessage.controller');

// All saved message routes require authentication
router.use(protect);

router.get('/', savedMessageController.getSavedMessages);

module.exports = router;
