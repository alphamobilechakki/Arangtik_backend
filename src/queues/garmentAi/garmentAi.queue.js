const { createQueue } = require('../core/base.queue');

const GARMENT_AI_QUEUE_NAME = 'garment-ai-queue';

// Instantiate singleton queue with custom retry & retention configuration
const garmentAiQueue = createQueue(GARMENT_AI_QUEUE_NAME, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,
  },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 86400, count: 1000 },
});

/**
 * Enqueue a garment image for 3D Ghost-Mannequin background synthesis
 * @param {object} payload
 * @param {string} payload.itemId MongoDB WardrobeItem ObjectId string
 * @param {string} payload.userId MongoDB User ObjectId string
 * @param {object} payload.file Uploaded file descriptor (path, filename, mimetype, etc.)
 * @param {object} payload.options Upload options (wardrobeId, mode, name, etc.)
 * @returns {Promise<Job>} BullMQ Job instance
 */
const enqueueGarmentJob = async (payload) => {
  const { itemId, userId, file, options } = payload;
  const jobName = `process-garment-${itemId}`;

  const job = await garmentAiQueue.add(
    jobName,
    {
      itemId,
      userId,
      file: {
        path: file.path,
        filename: file.filename,
        originalname: file.originalname || file.filename,
        mimetype: file.mimetype,
        size: file.size,
      },
      options: options || {},
      enqueuedAt: new Date().toISOString(),
    },
    {
      jobId: String(itemId), // Deduplicate: guarantees only 1 active background job per WardrobeItem
    }
  );

  console.log(`[BullMQ] Enqueued Garment AI Job #${job.id} for Item: ${itemId} (Queue: ${GARMENT_AI_QUEUE_NAME})`);
  return job;
};

module.exports = {
  garmentAiQueue,
  enqueueGarmentJob,
  GARMENT_AI_QUEUE_NAME,
};
