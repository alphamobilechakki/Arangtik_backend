const express = require('express');
const router = express.Router();

const kitchenBoxController = require('./kitchenBox.controller');
const { protect } = require('../../../middlewares/auth.middleware');

// ── Register / List ──────────────────────────────────────────────────────────
router
  .route('/')
  .post(protect, kitchenBoxController.create)   // Register a new box
  .get(protect, kitchenBoxController.getAll);   // List boxes (by user / hub)



module.exports = router;

