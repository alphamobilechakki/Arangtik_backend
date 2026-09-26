const express = require('express');
const router = express.Router();

const authRoutes = require('../modules/auth/auth.routes');

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Arangtik Backend API is healthy' });
});

// Auth Routes
router.use('/auth', authRoutes);

module.exports = router;
