const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateCreateDensityCategory = (req, res, next) => {
  const { materialType, defaultDensity, densityUnit } = req.body;

  if (!materialType || typeof materialType !== 'string' || !materialType.trim()) {
    return next(new ApiError(400, 'Material type is required'));
  }

  if (defaultDensity === undefined || defaultDensity === null || defaultDensity === '') {
    return next(new ApiError(400, 'Default density is required'));
  }

  const numericDensity = Number(defaultDensity);
  if (isNaN(numericDensity) || numericDensity < 0) {
    return next(new ApiError(400, 'Default density must be a non-negative number'));
  }

  if (densityUnit !== undefined && densityUnit !== 'g/ml') {
    return next(new ApiError(400, 'Density unit must be "g/ml"'));
  }

  next();
};

const validateUpdateDensityCategory = (req, res, next) => {
  const { materialType, defaultDensity, densityUnit } = req.body;

  if (materialType !== undefined) {
    if (typeof materialType !== 'string' || !materialType.trim()) {
      return next(new ApiError(400, 'Material type cannot be empty'));
    }
  }

  if (defaultDensity !== undefined) {
    const numericDensity = Number(defaultDensity);
    if (isNaN(numericDensity) || numericDensity < 0) {
      return next(new ApiError(400, 'Default density must be a non-negative number'));
    }
  }

  if (densityUnit !== undefined && densityUnit !== 'g/ml') {
    return next(new ApiError(400, 'Density unit must be "g/ml"'));
  }

  next();
};

const validateDensityCategoryId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new ApiError(400, 'Invalid density category ID'));
  }
  next();
};

module.exports = {
  validateCreateDensityCategory,
  validateUpdateDensityCategory,
  validateDensityCategoryId,
};

