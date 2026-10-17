const ApiError = require('../../utils/apiError');

const validateRegisterToken = (req, res, next) => {
  const { token, platform } = req.body || {};

  if (!token || typeof token !== 'string' || !token.trim()) {
    return next(new ApiError(400, 'Device token is required and must be a non-empty string'));
  }

  if (platform) {
    const cleanPlatform = String(platform).trim().toUpperCase();
    if (!['ANDROID', 'IOS', 'WEB', 'OTHER'].includes(cleanPlatform)) {
      return next(
        new ApiError(400, 'Invalid platform. Allowed values: ANDROID, IOS, WEB, OTHER')
      );
    }
  }

  next();
};

const validateRemoveToken = (req, res, next) => {
  const token = req.body?.token || req.query?.token;

  if (!token || typeof token !== 'string' || !token.trim()) {
    return next(new ApiError(400, 'Device token is required to remove'));
  }

  next();
};

module.exports = {
  validateRegisterToken,
  validateRemoveToken,
};
