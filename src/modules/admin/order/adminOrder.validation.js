const ApiError = require('../../../utils/apiError');

const validateUpdateOrderStatus = (req, res, next) => {
  const { status, note } = req.body;

  const validStatuses = [
    'PENDING_PICKUP',
    'PICKED_UP',
    'IN_PROCESS',
    'READY_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'REJECTED',
  ];

  if (!status || !validStatuses.includes(status)) {
    return next(
      new ApiError(
        400,
        `Status is required and must be one of: ${validStatuses.join(', ')}`
      )
    );
  }

  if (note !== undefined && typeof note === 'string' && note.trim().length > 500) {
    return next(new ApiError(400, 'Note cannot exceed 500 characters'));
  }

  next();
};

module.exports = {
  validateUpdateOrderStatus,
};
