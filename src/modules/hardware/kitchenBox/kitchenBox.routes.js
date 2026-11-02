const express = require('express');
const router = express.Router();

const kitchenBoxController = require('./kitchenBox.controller');
const { protect } = require('../../../middlewares/auth.middleware');

router.patch('/activate', protect, kitchenBoxController.activate);
router.patch('/deactivate', protect, kitchenBoxController.deactivate);
router.get('/get-myboxes', protect, kitchenBoxController.getMyBoxes);


module.exports = router;


