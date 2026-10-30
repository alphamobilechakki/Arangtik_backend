const express = require('express');
const router = express.Router();
const kitchenBoxController = require('./kitchenBox.controller');
const { verifyApiKey } = require('../../../middlewares/apiKey.middleware');

// All integration endpoints are secured with x-api-key verification
router.use(verifyApiKey);

// Routes
// 1. Get all kitchen boxes (paginated, filterable, searchable)
router.get('/', kitchenBoxController.getAllKitchenBoxes);

// 2. Get all kitchen boxes paired to a hub (by Hub ID or Hub MAC)
router.get('/hub/:hubId', kitchenBoxController.getKitchenBoxesByHubId);

// 3. Get single kitchen box by ID or MAC ID
router.get('/:id', kitchenBoxController.getKitchenBoxById);

module.exports = router;

