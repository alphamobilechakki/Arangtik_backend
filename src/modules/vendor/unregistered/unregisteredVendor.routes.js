const express = require('express');
const router = express.Router();
const unregisteredController = require('./unregisteredVendor.controller');
const { protect } = require('../../../middlewares/auth.middleware');

router.get('/lookup', protect, unregisteredController.lookupVendor);
router.get('/', protect, unregisteredController.getUnregisteredVendors);
router.get('/list', protect, unregisteredController.getUnregisteredVendors);

module.exports = router;
