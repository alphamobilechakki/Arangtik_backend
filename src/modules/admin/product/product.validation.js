const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateCreateProduct = (req, res, next) => {
  const { name, densityCategoryId, densityOverride, aliases } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Product name is required'));
  }

  if (!densityCategoryId || !mongoose.Types.ObjectId.isValid(densityCategoryId)) {
    return next(new ApiError(400, 'A valid density category ID is required'));
  }

  if (densityOverride !== undefined && densityOverride !== null && densityOverride !== '') {
    const numericOverride = Number(densityOverride);
    if (isNaN(numericOverride) || numericOverride < 0) {
      return next(new ApiError(400, 'Density override must be a non-negative number'));
    }
  }

  if (aliases !== undefined && aliases !== null) {
    if (!Array.isArray(aliases) && typeof aliases !== 'string') {
      return next(new ApiError(400, 'Aliases must be an array of strings or comma-separated text'));
    }
  }

  next();
};

const validateUpdateProduct = (req, res, next) => {
  const { name, densityCategoryId, densityOverride, aliases } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Product name cannot be empty'));
    }
  }

  if (densityCategoryId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(densityCategoryId)) {
      return next(new ApiError(400, 'Invalid density category ID'));
    }
  }

  if (densityOverride !== undefined && densityOverride !== null && densityOverride !== '') {
    const numericOverride = Number(densityOverride);
    if (isNaN(numericOverride) || numericOverride < 0) {
      return next(new ApiError(400, 'Density override must be a non-negative number'));
    }
  }

  if (aliases !== undefined && aliases !== null) {
    if (!Array.isArray(aliases) && typeof aliases !== 'string') {
      return next(new ApiError(400, 'Aliases must be an array of strings or comma-separated text'));
    }
  }

  next();
};

const validateProductId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ApiError(400, 'Invalid product ID'));
  }
  next();
};

module.exports = {
  validateCreateProduct,
  validateUpdateProduct,
  validateProductId,
};
