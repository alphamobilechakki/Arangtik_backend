const express = require('express');
const router = express.Router();
const adminCoinController = require('./adminCoin.controller');
const { protectAdmin } = require('../../../../middlewares/auth.middleware');

// All routes require admin authentication
router.use(protectAdmin);

// 1. Transaction logs (Light listing) & Full details by ID
router.get('/transactions', adminCoinController.getCoinTransactions);
router.get('/transactions/:id', adminCoinController.getCoinTransactionById);

// 2. Purchased logs (Light listing) & Full details by ID
router.get('/purchases', adminCoinController.getCoinPurchases);
router.get('/purchases/:id', adminCoinController.getCoinPurchaseById);

module.exports = router;
