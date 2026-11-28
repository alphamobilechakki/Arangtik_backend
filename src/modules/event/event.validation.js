const mongoose = require('mongoose');
const ApiError = require('../../utils/apiError');

/**
 * Validate Location: Accepts string name OR GeoJSON object with coordinates [lng, lat]
 */
const validateLocationInput = (location) => {
  if (!location) return;
  if (typeof location === 'string') return;
  if (typeof location !== 'object' || location === null) {
    throw new ApiError(400, 'Location must be a text string or an object with name, address, and coordinates');
  }

  // If coordinates array provided [lng, lat]
  const coords = location.coordinates || location.geo?.coordinates;
  if (coords !== undefined) {
    if (!Array.isArray(coords) || coords.length !== 2) {
      throw new ApiError(400, 'GeoJSON location coordinates must be an array of [longitude, latitude]');
    }
    const [lng, lat] = coords.map(Number);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, 'Longitude must be a number between -180 and 180');
    }
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, 'Latitude must be a number between -90 and 90');
    }
  }

  // Also support { latitude, longitude } or { lat, lng }
  if (location.latitude !== undefined || location.lat !== undefined) {
    const lat = Number(location.latitude ?? location.lat);
    const lng = Number(location.longitude ?? location.lng);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new ApiError(400, 'Latitude must be a number between -90 and 90');
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new ApiError(400, 'Longitude must be a number between -180 and 180');
    }
  }
};

/**
 * Validate attachments array (images, document files, etc.)
 */
const validateAttachmentsInput = (attachments) => {
  if (!attachments) return;
  if (!Array.isArray(attachments)) {
    throw new ApiError(400, 'Attachments must be an array of files/images');
  }
  for (const item of attachments) {
    if (typeof item === 'string') {
      if (item.trim().length === 0) throw new ApiError(400, 'Attachment URL cannot be empty');
    } else if (typeof item === 'object' && item !== null) {
      if (!item.url || typeof item.url !== 'string') {
        throw new ApiError(400, 'Each attachment must have a valid url');
      }
    } else {
      throw new ApiError(400, 'Invalid attachment format');
    }
  }
};

/**
 * Validate Create Event payload
 */
const validateCreateEvent = (req, res, next) => {
  const {
    eventTypeId,
    eventDate,
    eventTime,
    clusterIds,
    title,
    address,
    location,
    imageUrl,
    attachments,
    dressCode,
    note,
  } = req.body;

  if (!eventTypeId || !mongoose.Types.ObjectId.isValid(eventTypeId)) {
    throw new ApiError(400, 'A valid eventTypeId is required');
  }

  if (!eventDate || isNaN(new Date(eventDate).getTime())) {
    throw new ApiError(400, 'A valid eventDate is required');
  }

  if (title && (typeof title !== 'string' || title.trim().length > 100)) {
    throw new ApiError(400, 'Title must be a string up to 100 characters');
  }

  if (address && (typeof address !== 'string' || address.trim().length > 300)) {
    throw new ApiError(400, 'Address must be a string up to 300 characters');
  }

  if (eventTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(eventTime)) {
      throw new ApiError(400, 'eventTime must be in HH:mm 24-hour format (e.g. 19:30)');
    }
  }

  if (clusterIds !== undefined) {
    if (!Array.isArray(clusterIds)) {
      throw new ApiError(400, 'clusterIds must be an array of group/cluster IDs');
    }
    for (const id of clusterIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, `Invalid cluster ID: ${id}`);
      }
    }
  }

  validateLocationInput(location);

  if (imageUrl && typeof imageUrl !== 'string') {
    throw new ApiError(400, 'imageUrl must be a text URL string');
  }

  validateAttachmentsInput(attachments);

  if (dressCode && typeof dressCode !== 'string') {
    throw new ApiError(400, 'dressCode must be a text string');
  }

  if (note && typeof note !== 'string') {
    throw new ApiError(400, 'Note must be a text string');
  }

  next();
};

/**
 * Validate Update Event payload
 */
const validateUpdateEvent = (req, res, next) => {
  const { id } = req.params;
  const {
    eventTypeId,
    eventDate,
    eventTime,
    clusterIds,
    title,
    address,
    location,
    imageUrl,
    attachments,
    dressCode,
    note,
    status,
  } = req.body;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, 'Invalid event ID parameter');
  }

  if (eventTypeId && !mongoose.Types.ObjectId.isValid(eventTypeId)) {
    throw new ApiError(400, 'Invalid eventTypeId');
  }

  if (eventDate && isNaN(new Date(eventDate).getTime())) {
    throw new ApiError(400, 'Invalid eventDate');
  }

  if (eventTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(eventTime)) {
      throw new ApiError(400, 'eventTime must be in HH:mm 24-hour format');
    }
  }

  if (clusterIds !== undefined) {
    if (!Array.isArray(clusterIds)) {
      throw new ApiError(400, 'clusterIds must be an array of cluster IDs');
    }
    for (const cId of clusterIds) {
      if (!mongoose.Types.ObjectId.isValid(cId)) {
        throw new ApiError(400, `Invalid cluster ID: ${cId}`);
      }
    }
  }

  if (title && (typeof title !== 'string' || title.trim().length > 100)) {
    throw new ApiError(400, 'Title must be a string up to 100 characters');
  }

  if (address !== undefined && (typeof address !== 'string' || address.trim().length > 300)) {
    throw new ApiError(400, 'Address must be a string up to 300 characters');
  }

  validateLocationInput(location);

  if (imageUrl !== undefined && typeof imageUrl !== 'string') {
    throw new ApiError(400, 'imageUrl must be a text URL string');
  }

  validateAttachmentsInput(attachments);

  if (status && !['PLANNED', 'COMPLETED', 'CANCELLED'].includes(status)) {
    throw new ApiError(400, 'Status must be one of PLANNED, COMPLETED, CANCELLED');
  }

  next();
};

module.exports = {
  validateCreateEvent,
  validateUpdateEvent,
};
