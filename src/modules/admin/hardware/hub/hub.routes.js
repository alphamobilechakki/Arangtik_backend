const express = require('express');
const router = express.Router();
const hubController = require('./hub.controller');
const { protectAdmin } = require('../../../../middlewares/auth.middleware');

router.use(protectAdmin);

router.get('/stats', hubController.getStats);
router.post('/', hubController.createHub);
router.get('/', hubController.getHubs);
router.get('/:id', hubController.getHubById);
router.patch('/:id', hubController.updateHub);
router.patch('/:id/status', hubController.updateHubStatus);
router.delete('/:id', hubController.deleteHub);

module.exports = router;

