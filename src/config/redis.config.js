const Redis = require('ioredis');
const {
  REDIS_URL,
  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_TLS,
} = require('./env.config');

let redisClient = null;
let isConnected = false;
let hasLoggedFailure = false;

/**
 * Creates connection options compliant with BullMQ specifications:
 * - maxRetriesPerRequest MUST be null for BullMQ workers and queues
 * - enableReadyCheck: false
 */
const getRedisOptions = () => {
  if (REDIS_URL) {
    return {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) {
          if (!hasLoggedFailure) {
            console.warn('[Redis] Connection attempts exhausted. Running in offline/fallback mode.');
            hasLoggedFailure = true;
          }
          return null; // Stop reconnecting after 5 attempts
        }
        return Math.min(times * 1000, 5000);
      },
    };
  }

  const opts = {
    host: REDIS_HOST || '127.0.0.1',
    port: REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 5) {
        if (!hasLoggedFailure) {
          console.warn(`[Redis] Cannot connect to Redis at ${REDIS_HOST}:${REDIS_PORT}. Running in fallback mode.`);
          hasLoggedFailure = true;
        }
        return null;
      }
      return Math.min(times * 1000, 5000);
    },
  };

  if (REDIS_PASSWORD) {
    opts.password = REDIS_PASSWORD;
  }

  if (REDIS_TLS) {
    opts.tls = {};
  }

  return opts;
};

/**
 * Initialize / get singleton Redis connection instance
 */
const getRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  const options = getRedisOptions();
  redisClient = REDIS_URL ? new Redis(REDIS_URL, options) : new Redis(options);

  redisClient.on('connect', () => {
    isConnected = true;
    hasLoggedFailure = false;
    console.log(`[Redis Connected]: ${REDIS_URL ? 'via REDIS_URL' : `${REDIS_HOST}:${REDIS_PORT}`}`);
  });

  redisClient.on('ready', () => {
    isConnected = true;
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    // Suppress unhandled error crashes when Redis is offline in local dev
    if (!hasLoggedFailure) {
      console.warn(`[Redis Notice]: ${err.message}. Jobs will gracefully execute via in-memory worker.`);
      hasLoggedFailure = true;
    }
  });

  redisClient.on('close', () => {
    isConnected = false;
  });

  // Attempt initial lazy connection without throwing uncaught promise rejection
  redisClient.connect().catch((err) => {
    isConnected = false;
    if (!hasLoggedFailure) {
      console.warn(`[Redis Warning]: Local Redis server not active (${err.message}). Queue fallback active.`);
      hasLoggedFailure = true;
    }
  });

  return redisClient;
};

/**
 * Checks if Redis is currently reachable
 */
const isRedisAvailable = () => isConnected;

/**
 * Clean disconnect for graceful server shutdown
 */
const closeRedisConnection = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
    } catch (e) {
      redisClient.disconnect();
    }
    redisClient = null;
    isConnected = false;
  }
};

module.exports = {
  getRedisOptions,
  getRedisClient,
  isRedisAvailable,
  closeRedisConnection,
};
