const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/whatsapp.service');

const validateCreateVendor = (req, res, next) => {
  const { name, phone, status, rating } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Vendor name is required'));
  }

  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Vendor name cannot exceed 100 characters'));
  }

  if (!phone || typeof phone !== 'string') {
    return next(new ApiError(400, 'Vendor phone number is required'));
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Invalid phone number format (at least 10 digits required)'));
  }

  if (status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return next(new ApiError(400, 'Status must be ACTIVE, INACTIVE, or SUSPENDED'));
  }

  if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return next(new ApiError(400, 'Rating must be a number between 1.0 and 5.0'));
  }

  next();
};

const validateUpdateVendor = (req, res, next) => {
  const { name, status, rating } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Vendor name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Vendor name cannot exceed 100 characters'));
    }
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return next(new ApiError(400, 'Status must be ACTIVE, INACTIVE, or SUSPENDED'));
  }

  if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
    return next(new ApiError(400, 'Rating must be a number between 1.0 and 5.0'));
  }

  next();
};

const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body;

  if (!status || !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
    return next(new ApiError(400, 'Status is required and must be ACTIVE, INACTIVE, or SUSPENDED'));
  }

  next();
};

module.exports = {
  validateCreateVendor,
  validateUpdateVendor,
  validateUpdateStatus,
};
