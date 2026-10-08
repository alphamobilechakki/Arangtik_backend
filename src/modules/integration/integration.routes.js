const express = require('express');
const router = express.Router();
const integrationController = require('./integration.controller');
const { verifyApiKey } = require('../../middlewares/apiKey.middleware');

// All integration endpoints are secured with x-api-key verification
router.use(verifyApiKey);

// Routes
router.get('/stats', integrationController.getStats);
router.get('/users', integrationController.getUsers);
router.get('/users/:identifier', integrationController.getUserDetail);

module.exports = router;
