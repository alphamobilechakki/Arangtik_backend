const mongoose = require('mongoose');
const Event = require('./event.model');
const EventType = require('./eventType.model');
const FCCluster = require('../frequentConnect/cluster/cluster.model');
const ApiError = require('../../utils/apiError');

/**
 * 1. EVENT TYPES CATALOG
 */

/**
 * Fetch all active event types sorted by sortOrder
 */
const getActiveEventTypes = async () => {
  let types = await EventType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();

  // If no types exist yet, automatically seed standard presets
  if (!types || types.length === 0) {
    await seedDefaultEventTypes();
    types = await EventType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  }

  return types;
};

/**
 * Seed default event types if not already seeded
 */
const seedDefaultEventTypes = async () => {
  const defaults = [
    { name: 'Wedding', code: 'WEDDING', icon: 'heart', sortOrder: 1 },
    { name: 'Party & Celebration', code: 'PARTY', icon: 'party-popper', sortOrder: 2 },
    { name: 'Birthday', code: 'BIRTHDAY', icon: 'cake', sortOrder: 3 },
    { name: 'Date Night', code: 'DATE_NIGHT', icon: 'sparkles', sortOrder: 4 },
    { name: 'Office & Formal Meeting', code: 'FORMAL_MEETING', icon: 'briefcase', sortOrder: 5 },
    { name: 'Festival & Puja', code: 'FESTIVAL', icon: 'flame', sortOrder: 6 },
    { name: 'Casual Outing', code: 'CASUAL_OUTING', icon: 'coffee', sortOrder: 7 },
    { name: 'Vacation & Travel', code: 'VACATION', icon: 'plane', sortOrder: 8 },
    { name: 'Sports & Fitness', code: 'SPORTS', icon: 'dumbbell', sortOrder: 9 },
  ];

  for (const item of defaults) {
    await EventType.findOneAndUpdate(
      { code: item.code },
      { $setOnInsert: item },
      { upsert: true, new: true }
    );
  }
};

/**
 * Parse & normalize Location and Address
 * - address: text string venue/address description
 * - location: GeoJSON Point { type: 'Point', coordinates: [longitude, latitude] }
 */
const parseLocationAndAddress = (rawLocation, rawAddress) => {
  let address = typeof rawAddress === 'string' ? rawAddress.trim() : '';
  let location = undefined;

  // 1. If rawLocation is a string (e.g. "Taj Lands End, Mumbai")
  if (typeof rawLocation === 'string') {
    const trimmed = rawLocation.trim();
    if (!address && trimmed) {
      address = trimmed;
    }
  } else if (rawLocation && typeof rawLocation === 'object') {
    // Extract address if not already provided
    if (!address) {
      if (typeof rawLocation.address === 'string' && rawLocation.address.trim()) {
        address = rawLocation.address.trim();
      } else if (typeof rawLocation.name === 'string' && rawLocation.name.trim()) {
        address = rawLocation.name.trim();
      }
    }

    // Extract GeoJSON Point coordinates: [longitude, latitude]
    let coords = null;

    if (Array.isArray(rawLocation) && rawLocation.length === 2) {
      coords = rawLocation;
    } else if (Array.isArray(rawLocation.coordinates) && rawLocation.coordinates.length === 2) {
      coords = rawLocation.coordinates;
    } else if (Array.isArray(rawLocation.geo?.coordinates) && rawLocation.geo.coordinates.length === 2) {
      coords = rawLocation.geo.coordinates;
    } else if (
      (rawLocation.latitude !== undefined || rawLocation.lat !== undefined) &&
      (rawLocation.longitude !== undefined || rawLocation.lng !== undefined)
    ) {
      const lat = Number(rawLocation.latitude ?? rawLocation.lat);
      const lng = Number(rawLocation.longitude ?? rawLocation.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        coords = [lng, lat];
      }
    }

    if (coords) {
      const [lng, lat] = coords.map(Number);
      if (!isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        location = {
          type: 'Point',
          coordinates: [lng, lat],
        };
      }
    }
  }

  return { address, location };
};

const normalizeLocation = (loc) => parseLocationAndAddress(loc).location;

/**
 * Normalize attachments (files, PDFs, images)
 */
const normalizeAttachments = (items) => {
  if (!items) return [];
  const list = Array.isArray(items) ? items : [items];

  return list
    .map((item) => {
      if (typeof item === 'string' && item.trim()) {
        const isDoc = /\.(pdf|doc|docx|txt|csv|xlsx)$/i.test(item);
        return {
          url: item.trim(),
          name: item.split('/').pop() || 'Attachment',
          type: isDoc ? 'DOCUMENT' : 'IMAGE',
          size: 0,
        };
      }
      if (item && item.url) {
        const isDoc =
          item.type === 'DOCUMENT' ||
          /\.(pdf|doc|docx|txt|csv|xlsx)$/i.test(item.url) ||
          item.mimeType?.includes('pdf') ||
          item.mimeType?.includes('document');

        return {
          url: item.url.trim(),
          name: item.name ? item.name.trim() : item.url.split('/').pop() || 'Attachment',
          type: isDoc ? 'DOCUMENT' : 'IMAGE',
          size: Number(item.size) || 0,
          mimeType: item.mimeType ? item.mimeType.trim() : '',
        };
      }
      return null;
    })
    .filter(Boolean);
};

/**
 * 2. EVENT CREATION & CRUD
 */

/**
 * Create event with minimal required fields (few clicks flow)
 */
const createEvent = async (userId, data) => {
  const {
    eventTypeId,
    eventDate,
    eventTime = null,
    clusterIds = [],
    title,
    address = '',
    location,
    imageUrl = '',
    attachments = [],
    dressCode = '',
    note = '',
    timeZone = 'Asia/Kolkata',
    aiSuggestionsEnabled = true,
  } = data;

  // 1. Verify EventType
  const eventType = await EventType.findById(eventTypeId);
  if (!eventType || !eventType.isActive) {
    throw new ApiError(404, 'Event type not found or is currently inactive');
  }

  // 2. Validate Clusters / Groups (if provided)
  const validClusterIds = [];
  if (Array.isArray(clusterIds) && clusterIds.length > 0) {
    const userClusters = await FCCluster.find({
      _id: { $in: clusterIds },
      'members.userId': userId,
      'members.status': 'ACTIVE',
    }).select('_id');

    validClusterIds.push(...userClusters.map((c) => c._id));
  }

  // 3. Auto-generate Title if user left it blank
  const resolvedTitle = title && title.trim().length > 0 ? title.trim() : `${eventType.name} Event`;

  // 4. Normalize Location, Address & Attachments
  const { address: resolvedAddress, location: resolvedLocation } = parseLocationAndAddress(location, address);
  const resolvedAttachments = normalizeAttachments(attachments);

  // If imageUrl not explicitly provided but attachments has an image, auto-assign cover
  let resolvedImageUrl = imageUrl ? imageUrl.trim() : '';
  if (!resolvedImageUrl && resolvedAttachments.length > 0) {
    const firstImg = resolvedAttachments.find((a) => a.type === 'IMAGE');
    if (firstImg) resolvedImageUrl = firstImg.url;
  }

  // 5. Save Event
  const eventPayload = {
    userId,
    title: resolvedTitle,
    eventTypeId: eventType._id,
    eventTypeCode: eventType.code,
    eventDate: new Date(eventDate),
    eventTime: eventTime || null,
    clusterIds: validClusterIds,
    address: resolvedAddress,
    imageUrl: resolvedImageUrl,
    attachments: resolvedAttachments,
    dressCode: dressCode ? dressCode.trim() : '',
    note: note ? note.trim() : '',
    timeZone,
    aiSuggestionsEnabled,
    status: 'PLANNED',
    isDeleted: false,
  };

  if (resolvedLocation) {
    eventPayload.location = resolvedLocation;
  }

  const newEvent = await Event.create(eventPayload);

  return await Event.findById(newEvent._id)
    .populate('eventTypeId', 'name code icon imageUrl')
    .populate('clusterIds', 'name icon type');
};

/**
 * Get user's events (upcoming / past / all)
 */
const getUserEvents = async (userId, query = {}) => {
  const { filter = 'upcoming', page = 1, limit = 20, search } = query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filterObj = {
    userId,
    isDeleted: false,
  };

  if (filter === 'upcoming') {
    filterObj.eventDate = { $gte: startOfToday };
  } else if (filter === 'past') {
    filterObj.eventDate = { $lt: startOfToday };
  }

  if (search && search.trim()) {
    filterObj.title = { $regex: search.trim(), $options: 'i' };
  }

  const sortOrder = filter === 'past' ? { eventDate: -1 } : { eventDate: 1 };

  const [events, total] = await Promise.all([
    Event.find(filterObj)
      .sort(sortOrder)
      .skip(skip)
      .limit(take)
      .populate('eventTypeId', 'name code icon imageUrl')
      .populate('clusterIds', 'name icon type')
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
 * Get events inside a specific Cluster / Group
 */
const getClusterEvents = async (userId, clusterId, query = {}) => {
  // Check if cluster exists and user is an active member
  const cluster = await FCCluster.findOne({
    _id: clusterId,
    'members.userId': userId,
    'members.status': 'ACTIVE',
  }).select('_id name');

  if (!cluster) {
    throw new ApiError(403, 'You are not a member of this cluster or cluster not found');
  }

  const { filter = 'upcoming', page = 1, limit = 20 } = query;
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.min(50, Math.max(1, parseInt(limit, 10)));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const filterObj = {
    clusterIds: clusterId,
    isDeleted: false,
  };

  if (filter === 'upcoming') {
    filterObj.eventDate = { $gte: startOfToday };
  } else if (filter === 'past') {
    filterObj.eventDate = { $lt: startOfToday };
  }

  const sortOrder = filter === 'past' ? { eventDate: -1 } : { eventDate: 1 };

  const [events, total] = await Promise.all([
    Event.find(filterObj)
      .sort(sortOrder)
      .skip(skip)
      .limit(take)
      .populate('userId', 'name phone profileImage')
      .populate('eventTypeId', 'name code icon imageUrl')
      .lean(),
    Event.countDocuments(filterObj),
  ]);

  return {
    cluster: {
      _id: cluster._id,
      name: cluster.name,
    },
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
 * Get single event details by ID
 */
const getEventById = async (userId, eventId) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: false })
    .populate('userId', 'name phone profileImage')
    .populate('eventTypeId', 'name code icon imageUrl')
    .populate('clusterIds', 'name icon type');

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  // Authorization check: User must be owner OR member of one of the event's clusters
  const ownerId = event.populated('userId') || event.userId?._id || event.userId;
  const isOwner = ownerId && String(ownerId) === String(userId);
  if (!isOwner && event.clusterIds && event.clusterIds.length > 0) {
    const isClusterMember = await FCCluster.exists({
      _id: { $in: event.clusterIds.map((c) => c._id || c) },
      'members.userId': userId,
      'members.status': 'ACTIVE',
    });
    if (!isClusterMember) {
      throw new ApiError(403, 'You do not have permission to view this event');
    }
  } else if (!isOwner) {
    throw new ApiError(403, 'You do not have permission to view this event');
  }

  return event;
};

/**
 * Update event
 */
const updateEvent = async (userId, eventId, updates) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (String(event.userId) !== String(userId)) {
    throw new ApiError(403, 'Only the creator can edit this event');
  }

  // If eventTypeId changed, update snapshot
  if (updates.eventTypeId && String(updates.eventTypeId) !== String(event.eventTypeId)) {
    const eventType = await EventType.findById(updates.eventTypeId);
    if (!eventType || !eventType.isActive) {
      throw new ApiError(404, 'Event type not found or inactive');
    }
    event.eventTypeId = eventType._id;
    event.eventTypeCode = eventType.code;
  }

  if (updates.title) event.title = updates.title.trim();
  if (updates.eventDate) event.eventDate = new Date(updates.eventDate);
  if (updates.eventTime !== undefined) event.eventTime = updates.eventTime;
  if (updates.address !== undefined) {
    event.address = typeof updates.address === 'string' ? updates.address.trim() : '';
  }
  if (updates.location !== undefined) {
    const { address: locAddress, location: locGeo } = parseLocationAndAddress(updates.location, updates.address);
    if (locGeo) {
      event.location = locGeo;
    } else if (updates.location === null || updates.location === '') {
      event.location = undefined;
    }
    if (locAddress && !event.address) {
      event.address = locAddress;
    }
  }
  if (updates.imageUrl !== undefined) event.imageUrl = updates.imageUrl ? updates.imageUrl.trim() : '';
  if (updates.attachments !== undefined) event.attachments = normalizeAttachments(updates.attachments);
  if (updates.dressCode !== undefined) event.dressCode = updates.dressCode ? updates.dressCode.trim() : '';
  if (updates.note !== undefined) event.note = updates.note ? updates.note.trim() : '';
  if (updates.status) event.status = updates.status;
  if (updates.aiSuggestionsEnabled !== undefined) event.aiSuggestionsEnabled = updates.aiSuggestionsEnabled;

  if (updates.clusterIds !== undefined && Array.isArray(updates.clusterIds)) {
    const validClusters = await FCCluster.find({
      _id: { $in: updates.clusterIds },
      'members.userId': userId,
      'members.status': 'ACTIVE',
    }).select('_id');
    event.clusterIds = validClusters.map((c) => c._id);
  }

  await event.save();

  return await Event.findById(event._id)
    .populate('eventTypeId', 'name code icon imageUrl')
    .populate('clusterIds', 'name icon type');
};

/**
 * Soft delete an event
 */
const deleteEvent = async (userId, eventId) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: false });
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  if (String(event.userId) !== String(userId)) {
    throw new ApiError(403, 'Only the creator can delete this event');
  }

  event.isDeleted = true;
  event.deletedAt = new Date();
  event.deletedBy = userId;
  await event.save();

  return { id: eventId, isDeleted: true };
};

/**
 * Restore a soft-deleted event
 */
const restoreEvent = async (userId, eventId) => {
  const event = await Event.findOne({ _id: eventId, isDeleted: true });
  if (!event) {
    throw new ApiError(404, 'Deleted event not found');
  }

  if (String(event.userId) !== String(userId)) {
    throw new ApiError(403, 'Only the creator can restore this event');
  }

  event.isDeleted = false;
  event.deletedAt = null;
  event.deletedBy = null;
  await event.save();

  return event;
};

module.exports = {
  parseLocationAndAddress,
  normalizeLocation,
  normalizeAttachments,
  getActiveEventTypes,
  seedDefaultEventTypes,
  createEvent,
  getUserEvents,
  getClusterEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  restoreEvent,
};
