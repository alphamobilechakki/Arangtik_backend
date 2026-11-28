const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/apiResponse');
const eventService = require('./event.service');

/**
 * @desc    Get all available active event types
 * @route   GET /api/events/types
 * @access  Private / Public
 */
const getEventTypes = asyncHandler(async (req, res) => {
  const types = await eventService.getActiveEventTypes();
  return ApiResponse.success(res, types, 'Event types fetched successfully');
});

/**
 * @desc    Create a new event in few clicks
 * @route   POST /api/events
 * @access  Private
 */
const createEvent = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const event = await eventService.createEvent(userId, req.body);
  return ApiResponse.created(res, event, 'Event created successfully');
});

/**
 * @desc    Get user's personal events (upcoming, past, all)
 * @route   GET /api/events
 * @access  Private
 */
const getUserEvents = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const result = await eventService.getUserEvents(userId, req.query);
  return ApiResponse.success(res, result, 'Events retrieved successfully');
});

/**
 * @desc    Get all events shared inside a specific group / cluster
 * @route   GET /api/events/cluster/:clusterId
 * @access  Private
 */
const getClusterEvents = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { clusterId } = req.params;
  const result = await eventService.getClusterEvents(userId, clusterId, req.query);
  return ApiResponse.success(res, result, 'Cluster events retrieved successfully');
});

/**
 * @desc    Get event by ID
 * @route   GET /api/events/:id
 * @access  Private
 */
const getEventById = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const event = await eventService.getEventById(userId, req.params.id);
  return ApiResponse.success(res, event, 'Event details retrieved successfully');
});

/**
 * @desc    Update an event
 * @route   PATCH /api/events/:id
 * @access  Private
 */
const updateEvent = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const event = await eventService.updateEvent(userId, req.params.id, req.body);
  return ApiResponse.success(res, event, 'Event updated successfully');
});

/**
 * @desc    Soft delete an event
 * @route   DELETE /api/events/:id
 * @access  Private
 */
const deleteEvent = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const result = await eventService.deleteEvent(userId, req.params.id);
  return ApiResponse.success(res, result, 'Event deleted successfully');
});

/**
 * @desc    Restore a soft-deleted event
 * @route   POST /api/events/:id/restore
 * @access  Private
 */
const restoreEvent = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const event = await eventService.restoreEvent(userId, req.params.id);
  return ApiResponse.success(res, event, 'Event restored successfully');
});

module.exports = {
  getEventTypes,
  createEvent,
  getUserEvents,
  getClusterEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  restoreEvent,
};
