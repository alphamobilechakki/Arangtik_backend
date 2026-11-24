const express = require('express');
const router = express.Router();

const jewelleryBoxRoutes = require('./box/jewelleryBox.routes');
const jewellerySetRoutes = require('./set/jewellerySet.routes');
const jewelleryCategoryRoutes = require('./category/jewelleryCategory.routes');
const jewelleryItemRoutes = require('./item/jewellery.routes');

// Category exploration (public/authenticated for mobile app dropdowns)
router.use('/categories', jewelleryCategoryRoutes);

// Box management
router.use('/boxes', jewelleryBoxRoutes);

// Set management
router.use('/sets', jewellerySetRoutes);

// Core items (list, create, update, status, move, favorite, delete)
router.use('/', jewelleryItemRoutes);

module.exports = router;
