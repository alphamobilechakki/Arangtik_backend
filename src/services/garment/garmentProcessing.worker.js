const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const GarmentProcessingJob = require('../../modules/wardrobe/garmentProcessingJob.model');
const WardrobeItem = require('../../modules/wardrobe/wardrobeItem.model');
const garmentMaskService = require('./garmentMask.service');
const garmentReconstructionService = require('./garmentReconstruction.service');
const ghostMannequinService = require('./ghostMannequin.service');
const garmentQualityService = require('./garmentQuality.service');

/**
 * Garment Processing Orchestrator & Worker
 * Coordinates Stages A through F of the Human-to-Garment extraction pipeline.
 */
class GarmentProcessingWorker {
  constructor() {
    this.activeJobs = new Map();
  }

  /**
   * Enqueues and initiates asynchronous processing for a wardrobe item.
   * 
   * @param {string} jobId Unique Job ID
   * @param {string} userId User ObjectId
   * @param {string} itemId WardrobeItem ObjectId
   * @param {string} originalImagePath Path to original image on disk
   * @param {Object} options Configuration options
   * @returns {Promise<Object>} Created job document
   */
  async createAndStartJob(jobId, userId, itemId, originalImagePath, options = {}) {
    // Stage A — Input Validation & Record Creation
    if (!fs.existsSync(originalImagePath)) {
      throw new Error(`Original image does not exist: ${originalImagePath}`);
    }

    const job = await GarmentProcessingJob.create({
      jobId,
      userId,
      itemId,
      status: 'PENDING',
      originalImageUrl: options.originalImageUrl || `/uploads/${path.basename(originalImagePath)}`,
      options: {
        canvasBackground: options.canvasBackground || 'transparent',
        paddingPercent: options.paddingPercent || 8,
        autoInpaint: options.autoInpaint !== false,
        protectCollar: options.protectCollar !== false,
        reconstructOcclusions: options.reconstructOcclusions !== false,
      },
    });

    // Execute asynchronously (non-blocking background execution)
    setImmediate(() => {
      this.executeJob(job.jobId, originalImagePath, options).catch((err) => {
        console.error(`[GarmentWorker] Unhandled error processing job ${jobId}:`, err.message);
      });
    });

    return job;
  }

  /**
   * Executes the full pipeline for a job.
   */
  async executeJob(jobId, originalImagePath, options = {}) {
    const startTime = Date.now();
    let job = await GarmentProcessingJob.findOne({ jobId });
    if (!job) return;

    try {
      job.status = 'PROCESSING';
      await job.save();

      // Stage A — Image Integrity & Orientation Normalization
      const meta = await sharp(originalImagePath).metadata();
      if (!meta.width || !meta.height) {
        throw new Error('Invalid image dimensions or corrupted file.');
      }

      // Stage B & C — Garment Mask & Segmentation Extraction
      const maskResult = await garmentMaskService.extractGarmentMask(originalImagePath, {
        polygon: options.polygon || null,
        featherBlur: 2.0,
        filenamePrefix: `job-${jobId}`,
      });

      job.segmentedImageUrl = maskResult.outputUrl;
      job.status = 'SEGMENTATION_COMPLETED';
      await job.save();

      let currentGarmentBuffer = maskResult.buffer;

      // Stage D — Human Removal & Occlusion Reconstruction
      let reconstructionStatus = 'NOT_ATTEMPTED';
      let isReconstructed = false;
      let warnings = [];

      if (options.reconstructOcclusions !== false) {
        const recResult = await garmentReconstructionService.reconstructGarment(currentGarmentBuffer, {
          referenceImage: originalImagePath,
          garmentName: options.garmentName || 'Garment',
          protectCollar: options.protectCollar !== false,
        });

        currentGarmentBuffer = recResult.buffer;
        job.reconstructedImageUrl = recResult.outputUrl;
        reconstructionStatus = recResult.status;
        isReconstructed = recResult.isReconstructed;
        warnings = recResult.warnings || [];
      } else {
        reconstructionStatus = 'SKIPPED_NOT_NEEDED';
      }

      job.reconstructionStatus = reconstructionStatus;
      job.isReconstructionUsed = isReconstructed;
      job.status = 'RECONSTRUCTION_COMPLETED';
      await job.save();

      // Stage E — Ghost Mannequin Presentation (Centered & Normalized)
      const gmResult = await ghostMannequinService.generateGhostMannequin(currentGarmentBuffer, {
        targetWidth: 1024,
        targetHeight: 1024,
        paddingPercent: options.paddingPercent || 8,
        backgroundColor: options.canvasBackground || 'transparent',
        filenamePrefix: `gm-${jobId}`,
      });

      job.ghostMannequinImageUrl = gmResult.outputUrl;

      // Stage F — Quality Validation
      const quality = await garmentQualityService.validateQuality(gmResult.buffer);
      if (warnings.length > 0) {
        quality.warnings.push(...warnings);
      }

      job.qualityValidation = quality;
      job.processingDurationMs = Date.now() - startTime;
      job.status = quality.passed ? 'COMPLETED' : 'PARTIAL_SUCCESS';
      await job.save();

      // Update WardrobeItem in Database (Preserve original image, append new image types)
      const item = await WardrobeItem.findById(job.itemId);
      if (item) {
        // Add segmented and ghost mannequin assets
        const newImages = [...(item.images || [])];

        if (job.segmentedImageUrl) {
          newImages.push({
            url: job.segmentedImageUrl,
            type: 'SEGMENTED',
            isPrimary: false,
            createdAt: new Date(),
          });
        }

        if (job.ghostMannequinImageUrl) {
          // Promote ghost mannequin as primary catalog image if quality passed
          if (quality.passed) {
            newImages.forEach((img) => (img.isPrimary = false));
          }
          newImages.push({
            url: job.ghostMannequinImageUrl,
            type: 'GHOST_MANNEQUIN',
            isPrimary: quality.passed,
            createdAt: new Date(),
          });
        }

        item.images = newImages;
        await item.save();
      }

      console.log(`[GarmentWorker] Successfully completed job ${jobId} in ${job.processingDurationMs}ms (Status: ${job.status})`);
      return job;
    } catch (err) {
      console.error(`[GarmentWorker] Job ${jobId} failed:`, err.message);
      job.status = 'FAILED';
      job.error = {
        code: 'PROCESSING_ERROR',
        message: err.message,
        retryable: true,
      };
      job.processingDurationMs = Date.now() - startTime;
      await job.save();
      return job;
    }
  }
}

module.exports = new GarmentProcessingWorker();
