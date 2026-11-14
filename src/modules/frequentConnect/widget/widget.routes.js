const express = require('express');
const router = express.Router();
const { protect } = require('../../../middlewares/auth.middleware');
const widgetController = require('./widget.controller');

// All widget endpoints require user authentication
router.use(protect);

router.get('/clusters', widgetController.getWidgetClusters);
router.get('/recent', widgetController.getWidgetRecent);

module.exports = router;
