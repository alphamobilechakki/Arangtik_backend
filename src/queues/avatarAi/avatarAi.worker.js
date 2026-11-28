const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { createWorker } = require('../core/base.worker');
const { AVATAR_AI_QUEUE_NAME } = require('./avatarAi.queue');
const User = require('../../modules/auth/user.model');

const AVATAR_AI_SERVICE_URL =
  process.env.AVATAR_AI_SERVICE_URL || 'http://127.0.0.1:8000';

const AVATAR_AI_TIMEOUT_MS =
  parseInt(process.env.AVATAR_AI_TIMEOUT_MS, 10) || 180_000; // 3 min

let avatarAiWorker = null;

/**
 * BullMQ processor: sends the uploaded photo to the Python avatar service
 * and saves the returned stylized avatar_url back to user.avatar.
 *
 * @param {Job} job BullMQ Job object
 */
const processAvatarJob = async (job) => {
  const {
    userId,
    filePath,
    filename,
    mimetype,
    originalAvatarUrl,
    style,
    haloColor,
    doodleAccent,
  } = job.data;

  console.log(
    `[BullMQ Worker] 🚀 Avatar AI Job #${job.id} — User: ${userId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
  );

  await job.updateProgress(10);

  // --- Verify the file still exists on disk ---
  if (!filePath || !fs.existsSync(filePath)) {
    // File missing — nothing to send; keep the original upload URL and exit
    console.warn(
      `[BullMQ Worker] ⚠️ Avatar file not found at "${filePath}" for User ${userId}. Keeping original URL.`
    );
    return { success: false, reason: 'file_not_found', userId };
  }

  await job.updateProgress(25);

  // --- Build multipart/form-data request to Python service ---
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: filename || path.basename(filePath),
    contentType: mimetype || 'image/jpeg',
  });

  if (style)        form.append('style', style);
  if (haloColor)    form.append('halo_color', haloColor);
  if (doodleAccent) form.append('doodle_accent', doodleAccent);

  await job.updateProgress(40);

  let avatarUrl;

  try {
    const response = await axios.post(
      `${AVATAR_AI_SERVICE_URL}/api/generate-avatar`,
      form,
      {
        headers: form.getHeaders(),
        timeout: AVATAR_AI_TIMEOUT_MS,
      }
    );

    avatarUrl = response.data?.avatar_url;

    if (!avatarUrl) {
      throw new Error('Python service returned no avatar_url');
    }

    console.log(
      `[BullMQ Worker] 🎨 Avatar generated for User ${userId}: ${avatarUrl}`
    );
  } catch (err) {
    console.error(
      `[BullMQ Worker] ⚠️ Avatar AI call failed for User ${userId}:`,
      err.message
    );

    // On final retry, keep the original upload URL — don't leave the user with blank avatar
    const isLastAttempt = job.attemptsMade + 1 >= job.opts.attempts;
    if (isLastAttempt && originalAvatarUrl) {
      console.warn(
        `[BullMQ Worker] 🔄 All retries exhausted. Keeping original upload URL for User ${userId}.`
      );
      // avatar was already saved by updateAvatar(); nothing to update
      return { success: false, reason: 'ai_service_error', userId };
    }

    throw err; // re-throw → BullMQ schedules next retry
  }

  await job.updateProgress(80);

  // --- Save the AI-generated avatar URL to MongoDB ---
  try {
    await User.findByIdAndUpdate(userId, { avatar: avatarUrl });
    console.log(
      `[BullMQ Worker] ✅ Avatar AI Job #${job.id} complete — User ${userId} avatar updated.`
    );
  } catch (dbErr) {
    console.error(
      `[BullMQ Worker] ❌ Failed to save avatar_url to DB for User ${userId}:`,
      dbErr.message
    );
    throw dbErr; // allow BullMQ to retry saving
  }

  await job.updateProgress(100);

  return {
    success: true,
    userId,
    avatarUrl,
    processedAt: new Date().toISOString(),
  };
};

/**
 * Start the Avatar AI worker. Called once at app startup.
 */
const initAvatarAiWorker = () => {
  if (avatarAiWorker) return avatarAiWorker;

  avatarAiWorker = createWorker(AVATAR_AI_QUEUE_NAME, processAvatarJob, {
    concurrency: parseInt(process.env.AVATAR_AI_CONCURRENCY, 10) || 2,
    lockDuration: 240_000, // 4 min — covers Python GPU queue time
  });

  return avatarAiWorker;
};

module.exports = { initAvatarAiWorker, processAvatarJob };
