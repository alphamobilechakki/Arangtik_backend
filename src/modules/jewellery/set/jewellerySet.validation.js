const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateCreateSet = (req, res, next) => {
  const { name, jewelleryBoxId } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Jewellery set name is required'));
  }

  if (name.trim().length > 120) {
    return next(new ApiError(400, 'Set name cannot exceed 120 characters'));
  }

  if (!jewelleryBoxId || !mongoose.Types.ObjectId.isValid(jewelleryBoxId)) {
    return next(new ApiError(400, 'Valid jewelleryBoxId is required'));
  }

  next();
};

const validateUpdateSet = (req, res, next) => {
  const { name, jewelleryBoxId } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Set name cannot be empty'));
    }
    if (name.trim().length > 120) {
      return next(new ApiError(400, 'Set name cannot exceed 120 characters'));
    }
  }

  if (jewelleryBoxId !== undefined) {
    if (!mongoose.Types.ObjectId.isValid(jewelleryBoxId)) {
      return next(new ApiError(400, 'Valid jewelleryBoxId is required'));
    }
  }

  next();
};

const validateSetId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Invalid set ID'));
  }
  next();
};

module.exports = {
  validateCreateSet,
  validateUpdateSet,
  validateSetId,
};
