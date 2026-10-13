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
const formatUploadUrl = (relativeOrAbsoluteUrl) => {
  if (!relativeOrAbsoluteUrl || typeof relativeOrAbsoluteUrl !== 'string') {
    return relativeOrAbsoluteUrl;
  }

  const trimmed = relativeOrAbsoluteUrl.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }

  const base = (process.env.BASE_URL || BASE_URL || 'https://api.arangtik.com').replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${base}${cleanPath}`;
};

module.exports = {
  formatUploadUrl,
};
