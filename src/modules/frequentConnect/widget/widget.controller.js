const widgetService = require('./widget.service');
const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');

/**
 * GET /api/fc/widget/clusters – Lightweight cluster list for mobile widget
 */
const getWidgetClusters = asyncHandler(async (req, res) => {
  const result = await widgetService.getWidgetClusters(req.user.id);
  return ApiResponse.success(res, result, 'Widget clusters retrieved successfully');
});

/**
 * GET /api/fc/widget/recent – Recent contacts and clusters with unread counts
 */
const getWidgetRecent = asyncHandler(async (req, res) => {
  const result = await widgetService.getWidgetRecentConversations(
    req.user.id,
    req.query.limit
  );
  return ApiResponse.success(res, result, 'Widget recent conversations retrieved successfully');
});

module.exports = {
  getWidgetClusters,
  getWidgetRecent,
};
