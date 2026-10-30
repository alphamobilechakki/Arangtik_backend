const express = require('express');
const router = express.Router();
const kitchenBoxCaptureController = require('./kitchenBoxCapture.controller');
const { verifyApiKey } = require('../../../middlewares/apiKey.middleware');

// All integration endpoints are secured with x-api-key verification
router.use(verifyApiKey);

// Record a new sensor snapshot (auto-syncs latest readings to KitchenBox)
router.post('/', kitchenBoxCaptureController.createCapture);

module.exports = router;
