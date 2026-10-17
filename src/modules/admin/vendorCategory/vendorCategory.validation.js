const ApiError = require('../../../utils/apiError');

const validateCreateCategory = (req, res, next) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Vendor category name is required'));
  }

  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Vendor category name cannot exceed 100 characters'));
  }

  next();
};

const validateUpdateCategory = (req, res, next) => {
  const { name } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Vendor category name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Vendor category name cannot exceed 100 characters'));
    }
  }

  next();
};

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
};
