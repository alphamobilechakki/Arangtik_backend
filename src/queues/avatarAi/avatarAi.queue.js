const { createQueue } = require('../core/base.queue');

const AVATAR_AI_QUEUE_NAME = 'avatar-ai-queue';

// Singleton queue — 3 retries with exponential backoff
const avatarAiQueue = createQueue(AVATAR_AI_QUEUE_NAME, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 10000, // 10 s base — GPU is slow to start
  },
  removeOnComplete: { age: 3600, count: 200 },
  removeOnFail: { age: 86400, count: 500 },
});

/**
 * Enqueue a user photo for AI-stylized avatar generation.
 * The worker will call the Python avatar service and save the returned
 * avatar_url back to user.avatar in MongoDB.
 *
 * @param {object} payload
 * @param {string} payload.userId   MongoDB User ObjectId string
 * @param {string} payload.filePath Absolute path of the uploaded original image on disk
 * @param {string} payload.filename Original filename (e.g. "photo.jpg")
 * @param {string} payload.mimetype MIME type (e.g. "image/jpeg")
 * @param {string} [payload.originalAvatarUrl] URL of the original uploaded image (fallback)
 * @param {string} [payload.style]        "vector_art" | "digital_illustration" | "anime_portrait"
 * @param {string} [payload.haloColor]    "auto" | "soft_blue" | "lavender" | "blush_pink" | "mint_green"
 * @param {string} [payload.doodleAccent] "auto" | "crown" | "heart" | "sparks" | "none"
 * @returns {Promise<Job>} BullMQ Job instance
 */
const enqueueAvatarJob = async (payload) => {
  const { userId } = payload;
  const jobName = `generate-avatar-${userId}`;

  const job = await avatarAiQueue.add(
    jobName,
    {
      userId,
      filePath: payload.filePath,
      filename: payload.filename,
      mimetype: payload.mimetype || 'image/jpeg',
      originalAvatarUrl: payload.originalAvatarUrl || '',
      style: payload.style || 'vector_art',
      haloColor: payload.haloColor || 'auto',
      doodleAccent: payload.doodleAccent || 'auto',
      enqueuedAt: new Date().toISOString(),
    },
    {
      // One active AI job per user at a time (deduplication)
      jobId: `avatar-${userId}`,
    }
  );

  console.log(`[BullMQ] Enqueued Avatar AI Job #${job.id} for User: ${userId} (Queue: ${AVATAR_AI_QUEUE_NAME})`);
  return job;
};

module.exports = {
  avatarAiQueue,
  enqueueAvatarJob,
  AVATAR_AI_QUEUE_NAME,
};
