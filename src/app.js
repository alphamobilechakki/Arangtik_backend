const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { CLIENT_URL } = require('./config/env.config');
const apiRoutes = require('./routes/index');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

const app = express();

// Security Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: CLIENT_URL || '*',
    credentials: true,
  })
);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const fs = require('fs');

const uploadsDir = path.resolve(__dirname, '../uploads');
const cwdUploadsDir = path.resolve(process.cwd(), 'uploads');

// Ensure upload folders exist
[uploadsDir, cwdUploadsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Request Parsers (10mb limit for base64 uploads and image metadata)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploaded images / documents (Supports both /api/uploads and /uploads)
app.use('/api/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(cwdUploadsDir));
app.use('/uploads', express.static(uploadsDir));
app.use('/uploads', express.static(cwdUploadsDir));

// Direct handler for uploaded media with local filesystem verification
app.get(['/api/uploads/:filename', '/uploads/:filename'], (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const possiblePaths = [
    path.join(uploadsDir, filename),
    path.join(cwdUploadsDir, filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }

  return next();
});

// Root Route
app.get('/', (req, res) => {
  res.json({
    name: 'Arangtik Backend API',
    version: '1.0.0',
    status: 'running',
    docs: '/api/health',
  });
});

// API Routes
app.use('/api', apiRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;
