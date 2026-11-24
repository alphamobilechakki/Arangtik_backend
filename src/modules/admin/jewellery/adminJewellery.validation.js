const mongoose = require('mongoose');
const ApiError = require('../../../utils/apiError');

const validateItemId = (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError(400, 'Invalid jewellery item ID'));
  }
  next();
};

const validateUserId = (req, res, next) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new ApiError(400, 'Invalid user ID'));
  }
  next();
};

const validateStatusOverride = (req, res, next) => {
  const { status, reason } = req.body;

  if (!status) {
    return next(new ApiError(400, 'Status is required'));
  }

  const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
  if (!validStatuses.includes(String(status).toUpperCase().trim())) {
    return next(new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`));
  }

  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    return next(new ApiError(400, 'Reason is required for administrative status override'));
  }

  next();
};

const validateGetAllItems = (req, res, next) => {
  const { status, type, page, limit } = req.query;

  if (status !== undefined) {
    const validStatuses = ['IN_LOCKER', 'LEND', 'CLEANING', 'OTHER'];
    if (!validStatuses.includes(String(status).toUpperCase().trim())) {
      return next(new ApiError(400, `Invalid status filter. Must be one of: ${validStatuses.join(', ')}`));
    }
  }

  if (type !== undefined) {
    const validTypes = ['GOLD', 'SILVER', 'ARTIFICIAL', 'CUSTOM'];
    if (!validTypes.includes(String(type).toUpperCase().trim())) {
      return next(new ApiError(400, `Invalid type filter. Must be one of: ${validTypes.join(', ')}`));
    }
  }

  if (page !== undefined) {
    const p = parseInt(page, 10);
    if (isNaN(p) || p < 1) {
      return next(new ApiError(400, 'Page must be a positive integer'));
    }
  }

  if (limit !== undefined) {
    const l = parseInt(limit, 10);
    if (isNaN(l) || l < 1) {
      return next(new ApiError(400, 'Limit must be a positive integer'));
    }
  }

  next();
};

module.exports = {
  validateItemId,
  validateUserId,
  validateStatusOverride,
  validateGetAllItems,
};
