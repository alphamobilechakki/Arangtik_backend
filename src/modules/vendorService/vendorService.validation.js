const mongoose = require('mongoose');
const ApiError = require('../../utils/apiError');

const validateObjectId = (id, fieldName = 'ID') => {
  return id && mongoose.Types.ObjectId.isValid(String(id).trim());
};

const validateCreateVendorService = (req, res, next) => {
  const { serviceId, price, durationMinutes, isAvailable, status, vendorId } = req.body;

  // If vendorId is passed in body (e.g. by admin)
  if (vendorId !== undefined && !validateObjectId(vendorId)) {
    return next(new ApiError(400, 'Valid Vendor ID is required'));
  }

  if (!serviceId || !validateObjectId(serviceId)) {
    return next(new ApiError(400, 'Valid Service ID is required'));
  }

  if (price === undefined || isNaN(Number(price)) || Number(price) < 0) {
    return next(new ApiError(400, 'Valid non-negative price is required'));
  }

  if (
    durationMinutes !== undefined &&
    durationMinutes !== null &&
    (isNaN(Number(durationMinutes)) || Number(durationMinutes) < 1)
  ) {
    return next(new ApiError(400, 'Duration must be at least 1 minute'));
  }

  if (isAvailable !== undefined && typeof isAvailable !== 'boolean') {
    return next(new ApiError(400, 'isAvailable must be a boolean (true or false)'));
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    return next(new ApiError(400, 'Status must be ACTIVE or INACTIVE'));
  }

  next();
};

const validateBulkAssignServices = (req, res, next) => {
  const { services, vendorId } = req.body;

  if (vendorId !== undefined && !validateObjectId(vendorId)) {
    return next(new ApiError(400, 'Valid Vendor ID is required'));
  }

  if (!services || !Array.isArray(services) || services.length === 0) {
    return next(new ApiError(400, 'Services list must be a non-empty array'));
  }

  for (let i = 0; i < services.length; i++) {
    const item = services[i];
    const sId = item.serviceId || item._id;
    if (!sId || !validateObjectId(sId)) {
      return next(new ApiError(400, `Item at index ${i} has an invalid serviceId`));
    }
    if (item.price !== undefined && (isNaN(Number(item.price)) || Number(item.price) < 0)) {
      return next(new ApiError(400, `Item at index ${i} has an invalid price (must be >= 0)`));
    }
    if (
      item.durationMinutes !== undefined &&
      item.durationMinutes !== null &&
      (isNaN(Number(item.durationMinutes)) || Number(item.durationMinutes) < 1)
    ) {
      return next(new ApiError(400, `Item at index ${i} has invalid duration (must be >= 1)`));
    }
  }

  next();
};

const validateUpdateVendorService = (req, res, next) => {
  const { id } = req.params;
  if (!validateObjectId(id)) {
    return next(new ApiError(400, 'Valid VendorService ID is required'));
  }

  const { price, durationMinutes, isAvailable, status } = req.body;

  if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
    return next(new ApiError(400, 'Price must be a non-negative number'));
  }

  if (
    durationMinutes !== undefined &&
    durationMinutes !== null &&
    (isNaN(Number(durationMinutes)) || Number(durationMinutes) < 1)
  ) {
    return next(new ApiError(400, 'Duration must be at least 1 minute'));
  }

  if (isAvailable !== undefined && typeof isAvailable !== 'boolean') {
    return next(new ApiError(400, 'isAvailable must be a boolean (true or false)'));
  }

  if (status !== undefined && !['ACTIVE', 'INACTIVE'].includes(status)) {
    return next(new ApiError(400, 'Status must be ACTIVE or INACTIVE'));
  }

  next();
};

const validateToggleAvailability = (req, res, next) => {
  const { id } = req.params;
  if (!validateObjectId(id)) {
    return next(new ApiError(400, 'Valid VendorService ID is required'));
  }

  if (req.body.isAvailable === undefined || typeof req.body.isAvailable !== 'boolean') {
    return next(new ApiError(400, 'isAvailable must be a boolean (true or false)'));
  }

  next();
};

module.exports = {
  validateCreateVendorService,
  validateBulkAssignServices,
  validateUpdateVendorService,
  validateToggleAvailability,
};
