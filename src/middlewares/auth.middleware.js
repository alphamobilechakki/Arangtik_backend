const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env.config');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Unauthorized access, token missing');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, phone, email }
    next();
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw new ApiError(403, 'Forbidden: Insufficient permissions');
    }
    next();
  };
};

module.exports = {
  protect,
  authorize,
};
