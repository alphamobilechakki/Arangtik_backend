const { BASE_URL } = require('../config/env.config');

/**
 * Ensures an uploaded media path is converted to a complete, absolute URL with domain.
 * e.g. "/uploads/img_123.jpg" -> "https://api.arangtik.com/uploads/img_123.jpg"
 * e.g. "uploads/crops/crop_123.webp" -> "https://api.arangtik.com/uploads/crops/crop_123.webp"
 * If already an absolute http/https or data URI, returns untouched.
 *
 * @param {string} relativeOrAbsoluteUrl
 * @returns {string}
 */
const formatUploadUrl = (relativeOrAbsoluteUrl, req = null) => {
  if (!relativeOrAbsoluteUrl || typeof relativeOrAbsoluteUrl !== 'string') {
    return relativeOrAbsoluteUrl;
  }

  const trimmed = relativeOrAbsoluteUrl.trim();

  // In development, automatically map api.arangtik.com to local backend server
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  const localPort = process.env.PORT || 8083;
  const localBase = `http://localhost:${localPort}`;

  if (isDev && (trimmed.includes('api.arangtik.com/uploads') || trimmed.includes('api.arangtik.com/api/uploads'))) {
    return trimmed.replace(/https?:\/\/api\.arangtik\.com/, localBase);
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  let base;
  if (req && req.get) {
    base = `${req.protocol}://${req.get('host')}`;
  } else if (isDev) {
    base = localBase;
  } else {
    base = (process.env.BASE_URL || BASE_URL || 'https://api.arangtik.com').replace(/\/+$/, '');
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${base}${cleanPath}`;
};

module.exports = {
  formatUploadUrl,
};
