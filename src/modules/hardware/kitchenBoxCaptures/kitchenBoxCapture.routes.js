const express = require('express');
const router = express.Router();
const kitchenBoxCaptureController = require('./kitchenBoxCapture.controller');
const { protect } = require('../../../middlewares/auth.middleware');

router.use(protect);



module.exports = router;

