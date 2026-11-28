const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/apiResponse');
const adminEventService = require('./adminEvent.service');

/**
 * 1. GET /api/admin/events/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const stats = await adminEventService.getStats();
  return ApiResponse.success(res, stats, 'Admin event stats retrieved successfully');
});

/**
 * 2. GET /api/admin/events
 */
const getAllEvents = asyncHandler(async (req, res) => {
  const result = await adminEventService.getAllEvents(req.query);
  return ApiResponse.success(res, result, 'Global events retrieved successfully');
});

/**
 * 3. PATCH /api/admin/events/:id
 */
const updateEvent = asyncHandler(async (req, res) => {
  const adminId = req.user?.id || req.user?._id;
  const event = await adminEventService.updateEvent(req.params.id, req.body, adminId);
  return ApiResponse.success(res, event, 'Event updated successfully');
});

/**
 * 4. POST /api/admin/events/types  OR  POST /api/admin/event-types
 */
const createEventType = asyncHandler(async (req, res) => {
  const eventType = await adminEventService.createEventType(req.body);
  return ApiResponse.created(res, eventType, 'Event category created successfully');
});

/**
 * 5. PATCH /api/admin/events/types/:id  OR  PATCH /api/admin/event-types/:id
 */
const updateEventType = asyncHandler(async (req, res) => {
  const eventType = await adminEventService.updateEventType(req.params.id, req.body);
  return ApiResponse.success(res, eventType, 'Event category updated successfully');
});

module.exports = {
  getStats,
  getAllEvents,
  updateEvent,
  createEventType,
  updateEventType,
};
