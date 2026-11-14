const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env.config');
const User = require('../modules/auth/user.model');

/**
 * Socket.IO authentication middleware
 * Validates Bearer JWT token from socket handshake auth or headers
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    const user = await User.findById(decoded.id).select('_id name phone status').lean();
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    if (user.status === 'blocked' || user.status === 'inactive') {
      return next(new Error('Authentication error: User account is inactive or blocked'));
    }

    socket.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      phone: user.phone,
    };

    next();
  } catch (error) {
    return next(new Error(`Authentication error: ${error.message}`));
  }
};

module.exports = socketAuthMiddleware;
