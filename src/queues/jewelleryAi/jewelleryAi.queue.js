const { createQueue } = require('../core/base.queue');

const JEWELLERY_AI_QUEUE_NAME = 'jewellery-ai-queue';

const jewelleryAiQueue = createQueue(JEWELLERY_AI_QUEUE_NAME, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail:     { age: 86400, count: 1000 },
});

/**
 * Enqueue a jewellery image for background removal + Gemini analysis.
 * jobId = itemId guarantees only 1 active job per jewellery item (auto-dedup).
 */
const enqueueJewelleryJob = async ({ itemId, userId, file }) =>
  jewelleryAiQueue.add(
    `process-jewellery-${itemId}`,
    {
      itemId:   String(itemId),
      userId:   String(userId),
      file: {
        path:         file.path,
        filename:     file.filename,
        originalname: file.originalname || file.filename,
        mimetype:     file.mimetype,
        size:         file.size,
      },
      enqueuedAt: new Date().toISOString(),
    },
    { jobId: String(itemId) }
  );

module.exports = { jewelleryAiQueue, enqueueJewelleryJob, JEWELLERY_AI_QUEUE_NAME };
