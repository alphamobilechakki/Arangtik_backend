const express = require('express');
const router = express.Router();

const hubController = require('./hub.controller');
const { protect } = require('../../../middlewares/auth.middleware');

// ── Register / List ─────────────────────────────────────────────────────────
router
  .route('/')
  .post(protect, hubController.create)   // Register a new hub
  .get(protect, hubController.getAll);   // List hubs (filtered by user)



module.exports = router;

