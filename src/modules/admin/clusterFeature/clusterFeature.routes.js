const express = require('express');
const router = express.Router();
const clusterFeatureController = require('./clusterFeature.controller');
const { protectAdmin } = require('../../../middlewares/auth.middleware');
const { validateFeature } = require('./clusterFeature.validation');

// Read (Public & Admin)
router.get('/', clusterFeatureController.getAllFeatures);
router.get('/:id', clusterFeatureController.getFeatureById);

// Write (Admin Only)
router.post('/seed', protectAdmin, clusterFeatureController.seedDefaultFeatures);
router.post('/', protectAdmin, validateFeature, clusterFeatureController.createFeature);
router.patch('/:id', protectAdmin, clusterFeatureController.updateFeature);
router.patch('/:id/restore', protectAdmin, clusterFeatureController.restoreFeature);
router.delete('/:id', protectAdmin, clusterFeatureController.deleteFeature);

module.exports = router;
