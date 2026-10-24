const ApiError = require('../../../utils/apiError');

const validateStoreTypesInput = (raw) => {
  if (raw === undefined || raw === null) return null;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  if (!list || list.length === 0) {
    return 'storeTypes must be an array of storage types or a comma-separated string';
  }

  for (const st of list) {
    if (!st || typeof st !== 'string' || !st.trim()) {
      return 'Each storeType must be a valid non-empty string or StoreType ID';
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
