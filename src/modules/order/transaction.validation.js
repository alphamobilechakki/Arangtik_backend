const ApiError = require('../../utils/apiError');

/**
 * Validate payment status update payload
 */
const validateUpdatePaymentStatus = (req, res, next) => {
  const { status, note } = req.body || {};

  if (!status || typeof status !== 'string') {
    return next(new ApiError(400, "Payment status is required and must be a string ('PAID' or 'UNPAID')"));
  }

  const upperStatus = status.trim().toUpperCase();
  if (!['PAID', 'UNPAID'].includes(upperStatus)) {
    return next(new ApiError(400, "Invalid payment status. Allowed values are 'PAID' or 'UNPAID'"));
  }

  if (note !== undefined && typeof note !== 'string') {
    return next(new ApiError(400, 'Note must be a valid string'));
  }

  req.body.status = upperStatus;
  next();
};

module.exports = {
  validateUpdatePaymentStatus,
};
