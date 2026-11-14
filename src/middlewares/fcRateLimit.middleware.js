const ApiError = require('../utils/apiError');

// In-memory sliding window rate limiter: userId -> array of timestamps
const messageRateMap = new Map();

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // Clean every 5 mins

// Background cleanup of stale limiter entries
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of messageRateMap.entries()) {
    const recent = timestamps.filter((t) => now - t < 60000);
    if (recent.length === 0) {
      messageRateMap.delete(userId);
    } else {
      messageRateMap.set(userId, recent);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Express middleware to rate limit message creation:
 * Default: Max 40 messages per minute per user
 */
const rateLimitMessages = (maxPerMinute = 40) => {
  return (req, res, next) => {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return next();

    const now = Date.now();
    const timestamps = messageRateMap.get(userId.toString()) || [];

    // Filter timestamps within last 60 seconds
    const recentTimestamps = timestamps.filter((t) => now - t < 60000);

    if (recentTimestamps.length >= maxPerMinute) {
      return next(
        new ApiError(
          429,
          `Too many messages sent. Please slow down (limit: ${maxPerMinute} messages per minute).`
        )
      );
    }

    recentTimestamps.push(now);
    messageRateMap.set(userId.toString(), recentTimestamps);

    next();
  };
};

/**
 * Socket.IO rate limit check helper
 */
const checkSocketMessageRate = (userId, maxPerMinute = 40) => {
  if (!userId) return true;
  const now = Date.now();
  const timestamps = messageRateMap.get(userId.toString()) || [];
  const recent = timestamps.filter((t) => now - t < 60000);

  if (recent.length >= maxPerMinute) {
    return false;
  }

  recent.push(now);
  messageRateMap.set(userId.toString(), recent);
  return true;
};

module.exports = {
  rateLimitMessages,
  checkSocketMessageRate,
};
