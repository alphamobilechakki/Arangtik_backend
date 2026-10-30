const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const { verifyApiKey } = require('../../../middlewares/apiKey.middleware');

// All integration endpoints are secured with x-api-key verification
router.use(verifyApiKey);

// Routes
router.get('/stats', userController.getStats);
router.get('/users', userController.getUsers);
router.get('/users/:identifier', userController.getUserDetail);

module.exports = router;
