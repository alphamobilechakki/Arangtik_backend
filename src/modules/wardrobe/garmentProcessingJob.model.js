const mongoose = require('mongoose');

const GarmentProcessingJobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WardrobeItem',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'PROCESSING',
        'SEGMENTATION_COMPLETED',
        'RECONSTRUCTION_COMPLETED',
        'COMPLETED',
        'PARTIAL_SUCCESS',
        'FAILED',
      ],
      default: 'PENDING',
      index: true,
    },
    // Media URLs (Original is never overwritten)
    originalImageUrl: {
      type: String,
      required: true,
    },
    segmentedImageUrl: {
      type: String,
      default: null,
    },
    ghostMannequinImageUrl: {
      type: String,
      default: null,
    },
    reconstructedImageUrl: {
      type: String,
      default: null,
    },
    // Reconstruction Lifecycle
    reconstructionStatus: {
      type: String,
      enum: [
        'NOT_ATTEMPTED',
        'SKIPPED_NOT_NEEDED',
        'INPAINTED_LOCAL',
        'RECONSTRUCTED_AI',
        'UNAVAILABLE',
        'FAILED',
      ],
      default: 'NOT_ATTEMPTED',
    },
    isReconstructionUsed: {
      type: Boolean,
      default: false,
    },
    // Pose Alignment & Occlusion Check
    poseValidation: {
      poseStatus: { type: String, default: null },
      poseConfidence: { type: Number, default: 0 },
      personCount: { type: Number, default: 0 },
      handsOverlapGarment: { type: String, default: 'UNKNOWN' },
      canProceed: { type: Boolean, default: true },
      warnings: [{ type: String }],
      recommendedActions: [{ type: String }],
    },
    // Quality Control Metrics
    qualityValidation: {
      passed: { type: Boolean, default: false },
      score: { type: Number, default: 0 },
      maskCoveragePercent: { type: Number, default: 0 },
      remainingSkinPercent: { type: Number, default: 0 },
      alphaIntegrityPassed: { type: Boolean, default: true },
      warnings: [{ type: String }],
      failureReason: { type: String, default: null },
      validatedAt: { type: Date, default: null },
    },
    // Job Options & Metadata
    options: {
      canvasBackground: { type: String, default: 'transparent' }, // 'transparent' | 'white'
      paddingPercent: { type: Number, default: 8 },
      autoInpaint: { type: Boolean, default: true },
      protectCollar: { type: Boolean, default: true },
      reconstructOcclusions: { type: Boolean, default: true },
    },
    error: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      retryable: { type: Boolean, default: true },
    },
    processingDurationMs: {
      type: Number,
      default: 0,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

GarmentProcessingJobSchema.index({ userId: 1, createdAt: -1 });
GarmentProcessingJobSchema.index({ itemId: 1, status: 1 });

module.exports =
  mongoose.models.GarmentProcessingJob ||
  mongoose.model('GarmentProcessingJob', GarmentProcessingJobSchema);
