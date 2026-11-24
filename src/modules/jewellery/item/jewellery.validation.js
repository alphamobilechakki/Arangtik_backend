const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateCreateItem = (req, res, next) => {
  const { name, jewelleryCategory, type, status, weight } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Jewellery name is required'));
  }

  if (name.trim().length > 120) {
    return next(new ApiError(400, 'Name cannot exceed 120 characters'));
  }

  if (!jewelleryCategory) {
    return next(new ApiError(400, 'Jewellery category is required'));
  }

  if (type !== undefined) {
    const validTypes = ['GOLD', 'SILVER', 'ARTIFICIAL', 'CUSTOM'];
    if (!validTypes.includes(String(type).toUpperCase().trim())) {
      return next(new ApiError(400, `Type must be one of: ${validTypes.join(', ')}`));
    }
  }

  if (status !== undefined) {
    const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
    if (!validStatuses.includes(String(status).toUpperCase().trim())) {
      return next(new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`));
    }
  }

  if (weight !== undefined && weight !== null && weight !== '') {
    const num = Number(weight);
    if (isNaN(num) || num < 0) {
      return next(new ApiError(400, 'Weight must be a non-negative number'));
    }
  }

  next();
};

const validateUpdateItem = (req, res, next) => {
  const { name, type, status, weight } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Jewellery name cannot be empty'));
    }
    if (name.trim().length > 120) {
      return next(new ApiError(400, 'Name cannot exceed 120 characters'));
    }
  }

  if (type !== undefined) {
    const validTypes = ['GOLD', 'SILVER', 'ARTIFICIAL', 'CUSTOM'];
    if (!validTypes.includes(String(type).toUpperCase().trim())) {
      return next(new ApiError(400, `Type must be one of: ${validTypes.join(', ')}`));
    }
  }

  if (status !== undefined) {
    const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
    if (!validStatuses.includes(String(status).toUpperCase().trim())) {
      return next(new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`));
    }
  }

  if (weight !== undefined && weight !== null && weight !== '') {
    const num = Number(weight);
    if (isNaN(num) || num < 0) {
      return next(new ApiError(400, 'Weight must be a non-negative number'));
    }
  }

  next();
};

const validateStatusUpdate = (req, res, next) => {
  const { status } = req.body;
  if (!status) {
    return next(new ApiError(400, 'Status is required'));
  }
  const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
  if (!validStatuses.includes(String(status).toUpperCase().trim())) {
    return next(new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`));
  }
  next();
};

const validateMoveItem = (req, res, next) => {
  const { targetJewelleryBoxId } = req.body;
  if (!targetJewelleryBoxId || !mongoose.Types.ObjectId.isValid(targetJewelleryBoxId)) {
    return next(new ApiError(400, 'Valid targetJewelleryBoxId is required'));
  }
  next();
};

const validateItemId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Invalid jewellery item ID'));
  }
  next();
};

module.exports = {
  validateCreateItem,
  validateUpdateItem,
  validateStatusUpdate,
  validateMoveItem,
  validateItemId,
};
