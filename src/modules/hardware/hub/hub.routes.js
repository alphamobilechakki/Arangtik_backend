const express = require('express');
const router = express.Router();

const hubController = require('./hub.controller');
const { protect } = require('../../../middlewares/auth.middleware');

router.patch('/activate', protect, hubController.activate); // activate the hubs by scanning
router.patch('/deactivate', protect, hubController.deactivate); // deactivate by mac_id or hubId in body
router.get('/get-myhubs', protect, hubController.getMyHubs);
module.exports = router;


