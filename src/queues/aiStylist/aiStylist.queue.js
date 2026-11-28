const { createQueue } = require('../core/base.queue');

const AI_STYLIST_QUEUE_NAME = 'ai-stylist-queue';

const aiStylistQueue = createQueue(AI_STYLIST_QUEUE_NAME, {
  attempts: 2,
  backoff: {
    type: 'exponential',
    delay: 10000,
  },
  removeOnComplete: { age: 3600, count: 200 },
  removeOnFail: { age: 86400, count: 500 },
});

/**
 * Enqueue a virtual try-on generation job
 */
const enqueueAiStylistJob = async (payload) => {
  const { lookId, userId, avatarUrl, garmentUrls, occasion, maxCombinations } = payload;

  const job = await aiStylistQueue.add(
    `tryon-${lookId}`,
    {
      lookId,
      userId,
      avatarUrl,
      garmentUrls,
      occasion: occasion || 'smart_casual',
      maxCombinations: maxCombinations || 1,
    },
    {
      jobId: `ai-stylist-${lookId}`,
    }
  );

  console.log(`[BullMQ] Enqueued AI Stylist Job #${job.id} for Look: ${lookId}`);
  return job;
};

module.exports = {
  AI_STYLIST_QUEUE_NAME,
  aiStylistQueue,
  enqueueAiStylistJob,
};
