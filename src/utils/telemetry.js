/**
 * Lightweight Structured Telemetry & Diagnostics Logger for Wardrobe AI Pipeline
 * Zero-dependency, privacy-safe: Never logs tokens, secrets, or raw image buffers.
 */

class TelemetryLogger {
  constructor() {
    this.enabled = process.env.NODE_ENV !== 'test' || process.env.ENABLE_TELEMETRY === 'true';
  }

  createTraceLogger(action = 'PIPELINE_ACTION', context = {}) {
    const startTime = Date.now();
    const stages = {};

    return {
      start(stageName) {
        stages[stageName] = { start: Date.now() };
      },
      end(stageName, meta = {}) {
        if (stages[stageName]) {
          stages[stageName].durationMs = Date.now() - stages[stageName].start;
          stages[stageName].meta = meta;
        }
      },
      summary(additionalData = {}) {
        const totalDurationMs = Date.now() - startTime;
        return {
          action,
          userId: context.userId,
          requestId: context.requestId,
          stages,
          totalDurationMs,
          ...additionalData,
        };
      },
    };
  }

  logPipelineEvent(eventData) {
    const payload = {
      timestamp: new Date().toISOString(),
      type: 'WARDROBE_AI_PIPELINE',
      requestId: eventData.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: eventData.userId ? eventData.userId.toString() : 'anonymous',
      action: eventData.action || 'SCAN_GALLERY',
      timings: {
        faceDetectionMs: Math.round(eventData.faceMs || 0),
        geminiMs: Math.round(eventData.geminiMs || 0),
        segmentationMs: Math.round(eventData.segMs || 0),
        similarityMs: Math.round(eventData.simMs || 0),
        dbPersistenceMs: Math.round(eventData.dbMs || 0),
        totalLatencyMs: Math.round(eventData.totalMs || 0),
      },
      counts: {
        facesDetected: eventData.facesDetected || 0,
        garmentsDetected: eventData.garmentsDetected || 0,
        exactMatches: eventData.exactMatches || 0,
        newItemsCreated: eventData.newItemsCreated || 0,
        ambiguousMatches: eventData.ambiguousMatches || 0,
      },
      modelInfo: {
        geminiModel: eventData.geminiModel || 'gemini-3.6-flash',
        fallbackTriggered: !!eventData.fallbackTriggered,
        segmentationModel: 'ISNet-medium-1024',
        segmentationConcurrency: eventData.segConcurrency || 2,
      },
      status: eventData.status || 'SUCCESS',
      error: eventData.error ? eventData.error.message || String(eventData.error) : null,
    };

    if (this.enabled) {
      console.log(`[Telemetry] ${JSON.stringify(payload)}`);
    }
    return payload;
  }
}

module.exports = new TelemetryLogger();
