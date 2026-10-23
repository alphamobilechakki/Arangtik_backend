const ApiError = require('../../../utils/apiError');
const { ALLOWED_STORE_TYPES } = require('./vendorCategory.model');

const validateStoreTypesInput = (raw) => {
  if (raw === undefined || raw === null) return null;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
    ? raw.split(',').map((s) => s.trim())
    : null;

  if (!list || list.length === 0) {
    return 'storeTypes must be an array of storage types or a comma-separated string';
  }

  for (const st of list) {
    const upper = String(st).trim().toUpperCase();
    if (!ALLOWED_STORE_TYPES.includes(upper)) {
      return `Invalid storage type "${st}". Allowed types are: ${ALLOWED_STORE_TYPES.join(', ')}`;
    }
  }

  return null;
};

const validateCreateCategory = (req, res, next) => {
  const { name, storeTypes, storeType } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Vendor category name is required'));
  }

  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Vendor category name cannot exceed 100 characters'));
  }

  const storeError = validateStoreTypesInput(storeTypes !== undefined ? storeTypes : storeType);
  if (storeError) {
    return next(new ApiError(400, storeError));
  }

  next();
};

const validateUpdateCategory = (req, res, next) => {
  const { name, storeTypes, storeType } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Vendor category name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Vendor category name cannot exceed 100 characters'));
    }
  }

  const storeError = validateStoreTypesInput(storeTypes !== undefined ? storeTypes : storeType);
  if (storeError) {
    return next(new ApiError(400, storeError));
  }

  next();
};

module.exports = {
  validateCreateCategory,
  validateUpdateCategory,
};
