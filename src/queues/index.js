const { getRedisClient, closeRedisConnection, isRedisAvailable } = require('../config/redis.config');
const { closeAllQueues } = require('./core/base.queue');
const { closeAllWorkers } = require('./core/base.worker');
const { garmentAiQueue, enqueueGarmentJob } = require('./garmentAi/garmentAi.queue');
const { initGarmentAiWorker } = require('./garmentAi/garmentAi.worker');
const { jewelleryAiQueue, enqueueJewelleryJob } = require('./jewelleryAi/jewelleryAi.queue');
const { initJewelleryAiWorker } = require('./jewelleryAi/jewelleryAi.worker');

let isInitialized = false;

/**
 * Initializes all queues, workers, and Redis connections
 */
const initQueuesAndWorkers = () => {
  if (isInitialized) return;

  try {
    // 1. Initialize Redis connection client
    getRedisClient();

    // 2. Initialize Garment AI Worker
    initGarmentAiWorker();

    // 3. Initialize Jewellery AI Worker
    initJewelleryAiWorker();

    isInitialized = true;
    console.log('⚡ [Queue Engine] Redis & BullMQ subsystem initialized successfully.');
  } catch (err) {
    console.warn('[Queue Engine] Initialization warning:', err.message);
  }
};

/**
 * Graceful shutdown of all BullMQ workers, queues, and Redis connections
 */
const closeQueuesAndWorkers = async () => {
  console.log('⏳ [Queue Engine] Closing all workers and queues gracefully...');
  await closeAllWorkers();
  await closeAllQueues();
  await closeRedisConnection();
  isInitialized = false;
  console.log('✅ [Queue Engine] All queue workers disconnected cleanly.');
};

module.exports = {
  initQueuesAndWorkers,
  closeQueuesAndWorkers,
  isRedisAvailable,
  // Wardrobe
  garmentAiQueue,
  enqueueGarmentJob,
  // Jewellery
  jewelleryAiQueue,
  enqueueJewelleryJob,
};
