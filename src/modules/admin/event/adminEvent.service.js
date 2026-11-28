const mongoose = require('mongoose');
const Event = require('../../event/event.model');
const EventType = require('../../event/eventType.model');
const { parseLocationAndAddress, normalizeLocation, normalizeAttachments } = require('../../event/event.service');
const ApiError = require('../../../utils/apiError');

/**
 * 1. Admin KPI Stats Overview
 */
const getStats = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalEvents,
    upcomingEvents,
    completedEvents,
    cancelledEvents,
    deletedEvents,
    totalCategories,
  ] = await Promise.all([
    Event.countDocuments({ isDeleted: false }),
    Event.countDocuments({ isDeleted: false, eventDate: { $gte: startOfToday }, status: 'PLANNED' }),
    Event.countDocuments({ isDeleted: false, status: 'COMPLETED' }),
    Event.countDocuments({ isDeleted: false, status: 'CANCELLED' }),
    Event.countDocuments({ isDeleted: true }),
    EventType.countDocuments({ isActive: true }),
  ]);

  return {
    totalEvents,
    upcomingEvents,
    completedEvents,
    cancelledEvents,
    deletedEvents,
    totalCategories,
  };
};

/**
 * 2. Global Events Operations List (with search, filter, pagination)
 */
const getAllEvents = async (query = {}) => {
  const {
    page = 1,
    limit = 20,
    search,
    status,
    isDeleted = 'false',
    eventTypeId,
  } = query;

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const filterObj = {};

  // Soft delete filter
  if (isDeleted === 'true') {
    filterObj.isDeleted = true;
  } else if (isDeleted === 'false') {
    filterObj.isDeleted = false;
  } // if 'all', do not add isDeleted filter

  // Status filter
  if (status && ['PLANNED', 'COMPLETED', 'CANCELLED'].includes(status.toUpperCase())) {
    filterObj.status = status.toUpperCase();
  }

  // Event category filter
  if (eventTypeId && mongoose.Types.ObjectId.isValid(eventTypeId)) {
    filterObj.eventTypeId = eventTypeId;
  }

  // Text search
  if (search && search.trim()) {
    filterObj.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { address: { $regex: search.trim(), $options: 'i' } },
      { dressCode: { $regex: search.trim(), $options: 'i' } },
    ];
  }

  const [events, total] = await Promise.all([
    Event.find(filterObj)
      .sort({ eventDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(take)
      .populate('userId', 'name phone profileImage')
      .populate('eventTypeId', 'name code icon')
      .populate('clusterIds', 'name type')
      .lean(),
    Event.countDocuments(filterObj),
  ]);

  return {
    events,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take) || 1,
    },
  };
};

/**
 * 3. Moderate / Update / Restore an Event
 */
const updateEvent = async (eventId, updates, adminId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    throw new ApiError(400, 'Invalid event ID');
  }

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  // Handle Restore or Soft-delete toggle
  if (updates.isDeleted !== undefined) {
    event.isDeleted = Boolean(updates.isDeleted);
    if (!event.isDeleted) {
      event.deletedAt = null;
      event.deletedBy = null;
    } else {
      event.deletedAt = new Date();
      event.deletedBy = adminId || null;
    }
  }

  // Handle Status change
  if (updates.status && ['PLANNED', 'COMPLETED', 'CANCELLED'].includes(updates.status.toUpperCase())) {
    event.status = updates.status.toUpperCase();
  }

  if (updates.title) event.title = updates.title.trim();
  if (updates.address !== undefined) {
    event.address = typeof updates.address === 'string' ? updates.address.trim() : '';
  }
  if (updates.location !== undefined) {
    const { address: locAddr, location: locGeo } = parseLocationAndAddress(updates.location, updates.address);
    if (locGeo) {
      event.location = locGeo;
    } else if (updates.location === null || updates.location === '') {
      event.location = undefined;
    }
    if (locAddr && !event.address) {
      event.address = locAddr;
    }
  }
  if (updates.imageUrl !== undefined) event.imageUrl = updates.imageUrl ? updates.imageUrl.trim() : '';
  if (updates.attachments !== undefined) event.attachments = normalizeAttachments(updates.attachments);
  if (updates.dressCode !== undefined) event.dressCode = updates.dressCode.trim();
  if (updates.note !== undefined) event.note = updates.note.trim();

  await event.save();

  return await Event.findById(event._id)
    .populate('userId', 'name phone profileImage')
    .populate('eventTypeId', 'name code icon')
    .populate('clusterIds', 'name type');
};

/**
 * 4. Create New Event Category
 */
const createEventType = async (data) => {
  const { name, code, icon = '', imageUrl = '', sortOrder = 0, isActive = true } = data;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new ApiError(400, 'Category name is required');
  }

  if (!code || typeof code !== 'string' || code.trim().length === 0) {
    throw new ApiError(400, 'Category code is required (e.g. CONCERT)');
  }

  const formattedCode = code.trim().toUpperCase();

  const existing = await EventType.findOne({ code: formattedCode });
  if (existing) {
    throw new ApiError(409, `Event type with code '${formattedCode}' already exists`);
  }

  const eventType = await EventType.create({
    name: name.trim(),
    code: formattedCode,
    icon: icon.trim(),
    imageUrl: imageUrl.trim(),
    sortOrder: Number(sortOrder) || 0,
    isActive: Boolean(isActive),
  });

  return eventType;
};

/**
 * 5. Update / Toggle Event Category
 */
const updateEventType = async (typeId, updates) => {
  if (!mongoose.Types.ObjectId.isValid(typeId)) {
    throw new ApiError(400, 'Invalid category ID');
  }

  const eventType = await EventType.findById(typeId);
  if (!eventType) {
    throw new ApiError(404, 'Event type category not found');
  }

  if (updates.name) eventType.name = updates.name.trim();
  if (updates.icon !== undefined) eventType.icon = updates.icon.trim();
  if (updates.imageUrl !== undefined) eventType.imageUrl = updates.imageUrl.trim();
  if (updates.sortOrder !== undefined) eventType.sortOrder = Number(updates.sortOrder) || 0;
  if (updates.isActive !== undefined) eventType.isActive = Boolean(updates.isActive);

  await eventType.save();
  return eventType;
};

module.exports = {
  getStats,
  getAllEvents,
  updateEvent,
  createEventType,
  updateEventType,
};
