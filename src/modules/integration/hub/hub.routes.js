const express = require('express');
const router = express.Router();
const hubController = require('./hub.controller');
const { verifyApiKey } = require('../../../middlewares/apiKey.middleware');

// All integration endpoints are secured with x-api-key verification
router.use(verifyApiKey);

// Routes
router.get('/', hubController.getAllHubs);
router.get('/:id', hubController.getHubById);

module.exports = router;

