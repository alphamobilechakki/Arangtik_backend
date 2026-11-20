const { Queue } = require('bullmq');
const { getRedisOptions } = require('../../config/redis.config');

/**
 * Standard default job configuration across all Arangtik background queues
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5s, 10s, 20s
  },
  removeOnComplete: {
    age: 3600, // Keep completed job metadata for 1 hour
    count: 500, // Keep max 500 records
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours for debugging
    count: 1000,
  },
};

const activeQueues = new Map();

/**
 * Reusable Factory: Creates or returns a singleton BullMQ Queue instance
 * @param {string} queueName Unique name of the queue (e.g. 'garment-ai', 'notifications')
 * @param {object} customJobOptions Custom BullMQ defaultJobOptions overrides
 * @returns {Queue} BullMQ Queue instance
 */
const createQueue = (queueName, customJobOptions = {}) => {
  if (activeQueues.has(queueName)) {
    return activeQueues.get(queueName);
  }

  const redisOptions = getRedisOptions();
  const queue = new Queue(queueName, {
    connection: redisOptions,
    defaultJobOptions: {
      ...DEFAULT_JOB_OPTIONS,
      ...customJobOptions,
    },
  });

  queue.on('error', (err) => {
    console.warn(`[Queue:${queueName}] Queue error:`, err.message);
  });

  activeQueues.set(queueName, queue);
  return queue;
};

/**
 * Returns all instantiated active queues
 */
const getActiveQueues = () => activeQueues;

/**
 * Gracefully close all registered queues
 */
const closeAllQueues = async () => {
  for (const [name, q] of activeQueues.entries()) {
    try {
      await q.close();
      console.log(`[Queue:${name}] Closed cleanly.`);
    } catch (err) {
      console.warn(`[Queue:${name}] Error closing:`, err.message);
    }
  }
  activeQueues.clear();
};

module.exports = {
  createQueue,
  getActiveQueues,
  closeAllQueues,
  DEFAULT_JOB_OPTIONS,
};
