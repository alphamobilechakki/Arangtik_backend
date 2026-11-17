const ApiError = require('../../../utils/apiError');

const validateFeature = (req, res, next) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Feature name is required'));
  }
  next();
};

module.exports = {
  validateFeature,
};
