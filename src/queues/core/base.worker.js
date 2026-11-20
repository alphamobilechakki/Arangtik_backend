const { Worker } = require('bullmq');
const { getRedisOptions } = require('../../config/redis.config');

const activeWorkers = new Map();

/**
 * Reusable Factory: Creates a BullMQ Worker instance with standardized telemetry & error handling
 * @param {string} queueName Queue name to listen on
 * @param {Function} processor Async function `async (job) => { ... }`
 * @param {object} customWorkerOptions Concurrency, lockDuration, etc.
 * @returns {Worker} BullMQ Worker instance
 */
const createWorker = (queueName, processor, customWorkerOptions = {}) => {
  if (activeWorkers.has(queueName)) {
    return activeWorkers.get(queueName);
  }

  const redisOptions = getRedisOptions();
  const worker = new Worker(queueName, processor, {
    connection: redisOptions,
    concurrency: customWorkerOptions.concurrency || 2,
    lockDuration: customWorkerOptions.lockDuration || 180000, // 3 minutes lock for heavy diffusion jobs
    ...customWorkerOptions,
  });

  worker.on('active', (job) => {
    console.log(`[Worker:${queueName}] ⏳ Job #${job.id} started (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);
  });

  worker.on('progress', (job, progress) => {
    console.log(`[Worker:${queueName}] 📊 Job #${job.id} progress: ${progress}%`);
  });

  worker.on('completed', (job, returnvalue) => {
    console.log(`[Worker:${queueName}] ✅ Job #${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    const isExhausted = job ? job.attemptsMade >= job.opts.attempts : false;
    console.error(
      `[Worker:${queueName}] ❌ Job #${job?.id} failed (${job?.attemptsMade}/${job?.opts.attempts}): ${err.message}`
    );
    if (isExhausted) {
      console.error(`[Worker:${queueName}] 🚨 Job #${job?.id} exhausted all retries! Moved to Dead-Letter Queue.`);
    }
  });

  worker.on('error', (err) => {
    console.warn(`[Worker:${queueName}] Worker connection warning:`, err.message);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`[Worker:${queueName}] ⚠️ Job #${jobId} stalled. Re-assigning to worker.`);
  });

  activeWorkers.set(queueName, worker);
  return worker;
};

/**
 * Returns all instantiated active workers
 */
const getActiveWorkers = () => activeWorkers;

/**
 * Gracefully close all registered workers
 */
const closeAllWorkers = async () => {
  for (const [name, w] of activeWorkers.entries()) {
    try {
      await w.close();
      console.log(`[Worker:${name}] Closed cleanly.`);
    } catch (err) {
      console.warn(`[Worker:${name}] Error closing:`, err.message);
    }
  }
  activeWorkers.clear();
};

module.exports = {
  createWorker,
  getActiveWorkers,
  closeAllWorkers,
};
