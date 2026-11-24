const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateCreateBox = (req, res, next) => {
  const { name, type } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Jewellery box name is required'));
  }

  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Box name cannot exceed 100 characters'));
  }

  if (type !== undefined) {
    const validTypes = ['PERSONAL', 'FAMILY', 'SHARED', 'OTHER'];
    if (!validTypes.includes(type)) {
      return next(new ApiError(400, `Type must be one of: ${validTypes.join(', ')}`));
    }
  }

  next();
};

const validateUpdateBox = (req, res, next) => {
  const { name, type } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Box name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Box name cannot exceed 100 characters'));
    }
  }

  if (type !== undefined) {
    const validTypes = ['PERSONAL', 'FAMILY', 'SHARED', 'OTHER'];
    if (!validTypes.includes(type)) {
      return next(new ApiError(400, `Type must be one of: ${validTypes.join(', ')}`));
    }
  }

  next();
};

const validateBoxId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Invalid box ID'));
  }
  next();
};

module.exports = {
  validateCreateBox,
  validateUpdateBox,
  validateBoxId,
};
