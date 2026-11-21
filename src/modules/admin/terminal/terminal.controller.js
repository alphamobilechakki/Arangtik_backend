const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const terminalLogger = require('./terminalLogger');
const { garmentAiQueue } = require('../../../queues');
const { isRedisAvailable, getRedisClient } = require('../../../config/redis.config');

/**
 * @desc    Get snapshot of recent in-memory server logs and live BullMQ stats
 * @route   GET /api/admin/terminal/logs
 * @access  Private (Admin only)
 */
const getLogs = asyncHandler(async (req, res) => {
  const logs = terminalLogger.getRecentLogs();
  
  let queueStats = {
    online: isRedisAvailable(),
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
  };

  try {
    if (garmentAiQueue) {
      const counts = await garmentAiQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
      queueStats = {
        online: isRedisAvailable(),
        ...counts,
      };
    }
  } catch (err) {
    queueStats.error = err.message;
  }

  return ApiResponse.success(
    res,
    {
      logs,
      totalInMemory: logs.length,
      queueStats,
      serverTime: new Date().toISOString(),
    },
    'Server logs fetched successfully'
  );
});

/**
 * @desc    Clear in-memory server logs
 * @route   DELETE /api/admin/terminal/clear
 * @access  Private (Admin only)
 */
const clearLogs = asyncHandler(async (req, res) => {
  terminalLogger.clearLogs();
  return ApiResponse.success(res, { cleared: true }, 'In-memory server logs cleared');
});

module.exports = {
  getLogs,
  clearLogs,
};
