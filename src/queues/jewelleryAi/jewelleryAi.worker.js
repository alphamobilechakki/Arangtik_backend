const { createWorker } = require('../core/base.worker');
const { JEWELLERY_AI_QUEUE_NAME } = require('./jewelleryAi.queue');
const Jewellery = require('../../modules/jewellery/item/jewellery.model');

let jewelleryAiWorker = null;

/**
 * BullMQ processor: picks up each jewellery job and runs the AI pipeline.
 */
const processJewelleryJob = async (job) => {
  const { itemId, userId, file } = job.data;
  console.log(`[BullMQ Worker] 🚀 Jewellery Job #${job.id} — Item: ${itemId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);

  await job.updateProgress(20);
  const { runBackgroundJewelleryPipeline } = require('../../modules/jewellery/analysis/jewelleryAnalysis.service');

  try {
    await job.updateProgress(30);
    await runBackgroundJewelleryPipeline(itemId, userId, file);
    await job.updateProgress(100);
    console.log(`[BullMQ Worker] ✅ Jewellery Job #${job.id} done — Item: ${itemId}`);
    return { success: true, itemId, processedAt: new Date().toISOString() };
  } catch (err) {
    console.error(`[BullMQ Worker] ⚠️ Jewellery Job #${job.id} error:`, err.message);

    // Mark FAILED in DB only after all retries exhausted
    if (job.attemptsMade + 1 >= job.opts.attempts) {
      console.error(`[BullMQ Worker] 🚨 Jewellery Item ${itemId} exhausted all retries — marking FAILED`);
      await Jewellery.findByIdAndUpdate(itemId, {
        processingStatus:        'FAILED',
        processingFailureReason: err.message || 'AI pipeline failed after 3 retries',
      }).catch(() => {});
    }

    throw err; // re-throw so BullMQ schedules retry / backoff
  }
};

/**
 * Start the jewellery AI worker. Called once at app startup.
 */
const initJewelleryAiWorker = () => {
  if (jewelleryAiWorker) return jewelleryAiWorker;

  jewelleryAiWorker = createWorker(JEWELLERY_AI_QUEUE_NAME, processJewelleryJob, {
    concurrency:  parseInt(process.env.JEWELLERY_AI_CONCURRENCY, 10) || 2,
    lockDuration: 180_000, // 3 min — covers Python + Gemini round-trip
  });

  return jewelleryAiWorker;
};

module.exports = { initJewelleryAiWorker, processJewelleryJob };
