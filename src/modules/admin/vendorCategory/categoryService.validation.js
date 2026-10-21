const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateCreateService = (req, res, next) => {
  const { name, price, sortOrder } = req.body;
  const categoryId = req.params.categoryId || req.body.categoryId || req.body.category;

  if (!categoryId || !String(categoryId).trim()) {
    return next(new ApiError(400, 'Category ID or category name is required'));
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Service name is required and cannot be empty'));
  }

  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Service name cannot exceed 100 characters'));
  }

  if (price !== undefined && price !== null && price !== '') {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return next(new ApiError(400, 'Price must be a valid non-negative number'));
    }
  }

  if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
    const numSort = Number(sortOrder);
    if (isNaN(numSort)) {
      return next(new ApiError(400, 'Sort order must be a valid number'));
    }
  }

  next();
};

const validateUpdateService = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Valid Service ID is required'));
  }

  const { name, price, sortOrder, isActive } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Service name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Service name cannot exceed 100 characters'));
    }
  }

  if (price !== undefined && price !== null && price !== '') {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return next(new ApiError(400, 'Price must be a valid non-negative number'));
    }
  }

  if (sortOrder !== undefined && sortOrder !== null && sortOrder !== '') {
    const numSort = Number(sortOrder);
    if (isNaN(numSort)) {
      return next(new ApiError(400, 'Sort order must be a valid number'));
    }
  }

  if (isActive !== undefined && typeof isActive !== 'boolean') {
    return next(new ApiError(400, 'isActive must be a boolean (true or false)'));
  }

  next();
};

const validateServiceStatus = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Valid Service ID is required'));
  }

  const { isActive } = req.body;
  if (isActive === undefined || typeof isActive !== 'boolean') {
    return next(new ApiError(400, 'isActive is required and must be a boolean'));
  }

  next();
};

module.exports = {
  validateCreateService,
  validateUpdateService,
  validateServiceStatus,
};
