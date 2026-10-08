const { ADMIN_SYNC_API_KEY } = require('../config/env.config');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Middleware to verify external / admin service API Key (x-api-key header)
 */
const verifyApiKey = asyncHandler(async (req, res, next) => {
  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['X-API-KEY'] ||
    req.query.api_key;

  if (!ADMIN_SYNC_API_KEY) {
    throw new ApiError(
      500,
      'ADMIN_SYNC_API_KEY is not configured on the server. Please set it in .env file.'
    );
  }

  if (!apiKey) {
    throw new ApiError(401, 'Unauthorized: Missing API Key. Provide it in x-api-key header.');
  }

  if (apiKey !== ADMIN_SYNC_API_KEY) {
    throw new ApiError(403, 'Forbidden: Invalid API Key');
  }

  // Mark request as authorized via service API Key
  req.isServiceAdmin = true;
  next();
});

module.exports = {
  verifyApiKey,
};
