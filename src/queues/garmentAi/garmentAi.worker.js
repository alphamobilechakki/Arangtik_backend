const { createWorker } = require('../core/base.worker');
const { GARMENT_AI_QUEUE_NAME } = require('./garmentAi.queue');
const { GARMENT_AI_CONCURRENCY } = require('../../config/env.config');
const WardrobeItem = require('../../modules/wardrobe/wardrobeItem.model');

let garmentAiWorker = null;

/**
 * BullMQ Worker Processor for Garment AI 3D Ghost-Mannequin Synthesis
 * @param {Job} job BullMQ Job object
 */
const processGarmentJob = async (job) => {
  const { itemId, userId, file, options } = job.data;
  console.log(`[BullMQ Worker] 🚀 Processing Garment AI Job #${job.id} for Item: ${itemId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);

  await job.updateProgress(15);

  const clothAnalysisService = require('../../modules/clothAnalysis/clothAnalysis.service');

  try {
    await job.updateProgress(30);

    // Execute the unified pipeline (Python AI 3D Ghost-Mannequin + Gemini Vision + MongoDB update)
    await clothAnalysisService.runBackgroundClothingPipeline(itemId, userId, file, options);

    await job.updateProgress(100);
    console.log(`[BullMQ Worker] ✅ Successfully finished Garment AI Job #${job.id} for Item: ${itemId}`);

    return {
      success: true,
      itemId,
      processedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[BullMQ Worker] ⚠️ Error in Garment AI Job #${job.id}:`, err.message);

    // If this is the final attempt, update database status to FAILED
    const isLastAttempt = job.attemptsMade + 1 >= job.opts.attempts;
    if (isLastAttempt) {
      console.error(`[BullMQ Worker] 🚨 Final attempt failed for Item ${itemId}. Marking status as FAILED in MongoDB.`);
      try {
        await WardrobeItem.findByIdAndUpdate(itemId, {
          processingStatus: 'FAILED',
          name: options.name || 'Dress Item',
          category: options.category || 'OTHER',
          failureReason: err.message || 'Background AI diffusion processing failed after 3 retries',
        });
      } catch (dbErr) {
        console.error('[BullMQ Worker] Failed to update item failure status:', dbErr.message);
      }
    }

    // Re-throw so BullMQ triggers retry / backoff schedule
    throw err;
  }
};

/**
 * Initialize the Garment AI Worker
 */
const initGarmentAiWorker = () => {
  if (garmentAiWorker) return garmentAiWorker;

  const concurrency = parseInt(GARMENT_AI_CONCURRENCY, 10) || 2;
  garmentAiWorker = createWorker(GARMENT_AI_QUEUE_NAME, processGarmentJob, {
    concurrency,
    lockDuration: 180000, // 3 minutes lock for GPU diffusion
  });

  return garmentAiWorker;
};

module.exports = {
  initGarmentAiWorker,
  processGarmentJob,
};
