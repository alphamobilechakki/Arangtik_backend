const ApiError = require('../../../utils/apiError');

const validateCreateStoreType = (req, res, next) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Store type name is required'));
  }

  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Store type name cannot exceed 100 characters'));
  }

  next();
};

const validateUpdateStoreType = (req, res, next) => {
  const { name } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Store type name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Store type name cannot exceed 100 characters'));
    }
  }

  next();
};

module.exports = {
  validateCreateStoreType,
  validateUpdateStoreType,
};
