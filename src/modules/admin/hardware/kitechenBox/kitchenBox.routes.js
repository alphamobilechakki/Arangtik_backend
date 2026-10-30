const express = require('express');
const router = express.Router();
const kitchenBoxController = require('./kitchenBox.controller');
const { protectAdmin } = require('../../../../middlewares/auth.middleware');

router.use(protectAdmin);

router.get('/stats', kitchenBoxController.getStats);
router.post('/', kitchenBoxController.createKitchenBox);
router.get('/', kitchenBoxController.getKitchenBoxes);
router.get('/:id', kitchenBoxController.getKitchenBoxById);
router.patch('/:id', kitchenBoxController.updateKitchenBox);
router.patch('/:id/status', kitchenBoxController.updateKitchenBoxStatus);
router.delete('/:id', kitchenBoxController.deleteKitchenBox);

module.exports = router;

