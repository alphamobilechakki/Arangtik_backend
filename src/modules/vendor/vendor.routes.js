const express = require('express');
const router = express.Router();
const vendorController = require('./vendor.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.use(protect);

// Vendor Phone Lookup (contacts or manual input)
router.get('/lookup', vendorController.lookupVendor);

module.exports = router;
