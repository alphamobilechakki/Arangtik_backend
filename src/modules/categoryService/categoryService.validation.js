const mongoose = require('mongoose');
const ApiError = require('../../utils/apiError');

const validateCreateService = (req, res, next) => {
  const { name, basePrice, price } = req.body;
  const categoryId = req.params.categoryId || req.body.categoryId || req.body.category;

  if (!categoryId || !mongoose.Types.ObjectId.isValid(String(categoryId).trim())) {
    return next(new ApiError(400, 'Valid Category ID is required'));
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Service name is required'));
  }

  const rawPrice = basePrice !== undefined ? basePrice : price;
  if (rawPrice !== undefined && (isNaN(Number(rawPrice)) || Number(rawPrice) < 0)) {
    return next(new ApiError(400, 'Base price must be a non-negative number'));
  }

  next();
};

const validateUpdateService = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Valid Service ID is required'));
  }

  const { name, basePrice, price } = req.body;
  if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
    return next(new ApiError(400, 'Service name cannot be empty'));
  }

  const rawPrice = basePrice !== undefined ? basePrice : price;
  if (rawPrice !== undefined && (isNaN(Number(rawPrice)) || Number(rawPrice) < 0)) {
    return next(new ApiError(400, 'Base price must be a non-negative number'));
  }

  next();
};

const validateServiceStatus = (req, res, next) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Valid Service ID is required'));
  }
  if (req.body.isActive === undefined || typeof req.body.isActive !== 'boolean') {
    return next(new ApiError(400, 'isActive must be a boolean (true or false)'));
  }
  next();
};

module.exports = {
  validateCreateService,
  validateUpdateService,
  validateServiceStatus,
};
