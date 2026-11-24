const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateCreateCategory = (req, res, next) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Category name is required'));
  }

  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Category name cannot exceed 100 characters'));
  }

  next();
};

const validateUpdateCategory = (req, res, next) => {
  const { name, code } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Category name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Category name cannot exceed 100 characters'));
    }
  }

  if (code !== undefined) {
    if (typeof code !== 'string' || !code.trim()) {
      return next(new ApiError(400, 'Category code cannot be empty'));
    }
  }

  next();
};

const validateCategoryId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) && typeof id !== 'string') {
    return next(new ApiError(400, 'Invalid category ID'));
  }
  next();
};

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
  validateCategoryId,
};
