const ApiError = require('../../utils/apiError');
const { formatPhoneNumber } = require('../../utils/whatsapp.service');
const mongoose = require('mongoose');

// ==========================================
// HELPER VALIDATORS
// ==========================================

const isValidObjectIdOrVendorId = (val) => {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) return true;
  // Custom vendorId format, e.g. VND-123456
  return /^VND-[A-Za-z0-9_-]+$/i.test(trimmed);
};

const parseAndValidateLocation = (location) => {
  if (!location) return null;

  // Case 1: GeoJSON format { type: 'Point', coordinates: [lng, lat] }
  if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    const [lng, lat] = location.coordinates.map(Number);
    if (isNaN(lng) || isNaN(lat)) {
      throw new ApiError(400, 'Location coordinates must contain valid numbers [longitude, latitude]');
    }
    if (lng < -180 || lng > 180) {
      throw new ApiError(400, 'Longitude must be between -180 and 180 degrees');
    }
    if (lat < -90 || lat > 90) {
      throw new ApiError(400, 'Latitude must be between -90 and 90 degrees');
    }
    return { type: 'Point', coordinates: [lng, lat] };
  }

  // Case 2: Object { latitude, longitude } or { lat, lng }
  const lat = location.latitude ?? location.lat;
  const lng = location.longitude ?? location.lng;

  if (lat !== undefined && lng !== undefined) {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng)) {
      throw new ApiError(400, 'Latitude and Longitude must be valid numbers');
    }
    if (numLng < -180 || numLng > 180) {
      throw new ApiError(400, 'Longitude must be between -180 and 180 degrees');
    }
    if (numLat < -90 || numLat > 90) {
      throw new ApiError(400, 'Latitude must be between -90 and 90 degrees');
    }
    return { type: 'Point', coordinates: [numLng, numLat] };
  }

  throw new ApiError(
    400,
    'Invalid location format. Expected GeoJSON { type: "Point", coordinates: [lng, lat] } or { latitude, longitude }'
  );
};

const validateAddressFields = (address) => {
  if (address === null || address === undefined) return;
  if (typeof address !== 'object' || Array.isArray(address)) {
    throw new ApiError(400, 'Address must be a valid object');
  }

  const { street, city, state, pincode } = address;
  if (street !== undefined && typeof street !== 'string') {
    throw new ApiError(400, 'Street must be a string');
  }
  if (city !== undefined && typeof city !== 'string') {
    throw new ApiError(400, 'City must be a string');
  }
  if (state !== undefined && typeof state !== 'string') {
    throw new ApiError(400, 'State must be a string');
  }
  if (pincode !== undefined && typeof pincode !== 'string') {
    throw new ApiError(400, 'Pincode must be a string');
  }
};

// ==========================================
// 1. AUTHENTICATION (OTP FLOW) VALIDATIONS
// ==========================================

const validateSendOtp = (req, res, next) => {
  const { phone } = req.body;
  if (!phone) {
    return next(new ApiError(400, 'Vendor phone number is required'));
  }
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
  }
  next();
};

const validateVerifyOtp = (req, res, next) => {
  const { phone, otp, name, businessName, address, location } = req.body;

  if (!phone) {
    return next(new ApiError(400, 'Vendor phone number is required'));
  }
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
  }

  if (!otp || !String(otp).trim()) {
    return next(new ApiError(400, 'OTP is required'));
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Vendor name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Vendor name cannot exceed 100 characters'));
    }
  }

  if (businessName !== undefined) {
    if (typeof businessName !== 'string') {
      return next(new ApiError(400, 'Business name must be a string'));
    }
    if (businessName.trim().length > 150) {
      return next(new ApiError(400, 'Business name cannot exceed 150 characters'));
    }
  }

  try {
    if (address !== undefined) validateAddressFields(address);
    if (location !== undefined) parseAndValidateLocation(location);
  } catch (err) {
    return next(err);
  }

  next();
};

// ==========================================
// 2. VENDOR MODEL CRUD VALIDATIONS
// ==========================================

const validateCreateVendor = (req, res, next) => {
  const {
    name,
    phone,
    businessName,
    address,
    location,
    status,
    isVerified,
    rating,
    totalOrdersHandled,
  } = req.body;

  // Name (required, max 100)
  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Vendor name is required'));
  }
  if (name.trim().length > 100) {
    return next(new ApiError(400, 'Vendor name cannot exceed 100 characters'));
  }

  // Phone (required, unique)
  if (!phone) {
    return next(new ApiError(400, 'Vendor phone number is required'));
  }
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
  }

  // Business Name (optional, max 150)
  if (businessName !== undefined) {
    if (typeof businessName !== 'string') {
      return next(new ApiError(400, 'Business name must be a string'));
    }
    if (businessName.trim().length > 150) {
      return next(new ApiError(400, 'Business name cannot exceed 150 characters'));
    }
  }

  // Address (optional object)
  try {
    if (address !== undefined) validateAddressFields(address);
    if (location !== undefined) parseAndValidateLocation(location);
  } catch (err) {
    return next(err);
  }

  // Status (optional, enum)
  if (status !== undefined) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return next(
        new ApiError(400, `Invalid vendor status. Allowed values: ${validStatuses.join(', ')}`)
      );
    }
  }

  // isVerified (optional boolean)
  if (isVerified !== undefined && typeof isVerified !== 'boolean') {
    return next(new ApiError(400, 'isVerified must be a boolean (true or false)'));
  }

  // Rating (optional number 0-5)
  if (rating !== undefined) {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 0 || numRating > 5) {
      return next(new ApiError(400, 'Rating must be a number between 0 and 5'));
    }
  }

  // totalOrdersHandled (optional number >= 0)
  if (totalOrdersHandled !== undefined) {
    const numOrders = Number(totalOrdersHandled);
    if (isNaN(numOrders) || numOrders < 0) {
      return next(new ApiError(400, 'totalOrdersHandled must be a non-negative number'));
    }
  }

  next();
};

const validateUpdateProfile = (req, res, next) => {
  const { name, businessName, address, location } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Vendor name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Vendor name cannot exceed 100 characters'));
    }
  }

  if (businessName !== undefined) {
    if (typeof businessName !== 'string') {
      return next(new ApiError(400, 'Business name must be a string'));
    }
    if (businessName.trim().length > 150) {
      return next(new ApiError(400, 'Business name cannot exceed 150 characters'));
    }
  }

  try {
    if (address !== undefined) validateAddressFields(address);
    if (location !== undefined) parseAndValidateLocation(location);
  } catch (err) {
    return next(err);
  }

  next();
};

const validateUpdateVendor = (req, res, next) => {
  const {
    name,
    phone,
    businessName,
    address,
    location,
    status,
    isVerified,
    rating,
    totalOrdersHandled,
  } = req.body;

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return next(new ApiError(400, 'Vendor name cannot be empty'));
    }
    if (name.trim().length > 100) {
      return next(new ApiError(400, 'Vendor name cannot exceed 100 characters'));
    }
  }

  if (phone !== undefined) {
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone || formattedPhone.length < 10) {
      return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
    }
  }

  if (businessName !== undefined) {
    if (typeof businessName !== 'string') {
      return next(new ApiError(400, 'Business name must be a string'));
    }
    if (businessName.trim().length > 150) {
      return next(new ApiError(400, 'Business name cannot exceed 150 characters'));
    }
  }

  try {
    if (address !== undefined) validateAddressFields(address);
    if (location !== undefined) parseAndValidateLocation(location);
  } catch (err) {
    return next(err);
  }

  if (status !== undefined) {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return next(
        new ApiError(400, `Invalid vendor status. Allowed values: ${validStatuses.join(', ')}`)
      );
    }
  }

  if (isVerified !== undefined && typeof isVerified !== 'boolean') {
    return next(new ApiError(400, 'isVerified must be a boolean (true or false)'));
  }

  if (rating !== undefined) {
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 0 || numRating > 5) {
      return next(new ApiError(400, 'Rating must be a number between 0 and 5'));
    }
  }

  if (totalOrdersHandled !== undefined) {
    const numOrders = Number(totalOrdersHandled);
    if (isNaN(numOrders) || numOrders < 0) {
      return next(new ApiError(400, 'totalOrdersHandled must be a non-negative number'));
    }
  }

  next();
};

const validateUpdateStatus = (req, res, next) => {
  const { status } = req.body;
  const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

  if (!status || !validStatuses.includes(status)) {
    return next(
      new ApiError(
        400,
        `Status is required and must be one of: ${validStatuses.join(', ')}`
      )
    );
  }
  next();
};

const validateVerifyVendor = (req, res, next) => {
  const { isVerified } = req.body;
  if (isVerified !== undefined && typeof isVerified !== 'boolean') {
    return next(new ApiError(400, 'isVerified must be a boolean (true or false)'));
  }
  next();
};

// ==========================================
// 3. QUERY PARAMETERS & PARAM VALIDATIONS
// ==========================================

const validateVendorQuery = (req, res, next) => {
  const { page, limit, status, isVerified, minRating, maxRating } = req.query;

  if (page !== undefined && (isNaN(Number(page)) || Number(page) < 1)) {
    return next(new ApiError(400, 'Page must be a positive integer'));
  }

  if (limit !== undefined && (isNaN(Number(limit)) || Number(limit) < 1)) {
    return next(new ApiError(400, 'Limit must be a positive integer'));
  }

  if (status !== undefined && status !== 'ALL') {
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      return next(
        new ApiError(400, `Invalid status filter. Allowed values: ${validStatuses.join(', ')} or ALL`)
      );
    }
  }

  if (isVerified !== undefined && isVerified !== 'ALL') {
    if (isVerified !== 'true' && isVerified !== 'false' && typeof isVerified !== 'boolean') {
      return next(new ApiError(400, 'isVerified query filter must be true, false, or ALL'));
    }
  }

  if (minRating !== undefined) {
    const minR = Number(minRating);
    if (isNaN(minR) || minR < 0 || minR > 5) {
      return next(new ApiError(400, 'minRating must be a number between 0 and 5'));
    }
  }

  if (maxRating !== undefined) {
    const maxR = Number(maxRating);
    if (isNaN(maxR) || maxR < 0 || maxR > 5) {
      return next(new ApiError(400, 'maxRating must be a number between 0 and 5'));
    }
  }

  next();
};

const validateNearbyQuery = (req, res, next) => {
  const lat = req.query?.latitude ?? req.query?.lat ?? req.body?.latitude ?? req.body?.lat;
  const lng = req.query?.longitude ?? req.query?.lng ?? req.body?.longitude ?? req.body?.lng;
  const radius = req.query?.radius ?? req.query?.maxDistance ?? req.body?.radius ?? req.body?.maxDistance;

  if (lat !== undefined) {
    const numLat = Number(lat);
    if (isNaN(numLat) || numLat < -90 || numLat > 90) {
      return next(new ApiError(400, 'Latitude must be a valid number between -90 and 90'));
    }
  }

  if (lng !== undefined) {
    const numLng = Number(lng);
    if (isNaN(numLng) || numLng < -180 || numLng > 180) {
      return next(new ApiError(400, 'Longitude must be a valid number between -180 and 180'));
    }
  }

  if (radius !== undefined) {
    const numRadius = Number(radius);
    if (isNaN(numRadius) || numRadius <= 0) {
      return next(new ApiError(400, 'Radius must be a positive number in kilometers'));
    }
  }

  next();
};

const validateIdParam = (req, res, next) => {
  const { id } = req.params;
  if (!id || !isValidObjectIdOrVendorId(id)) {
    return next(new ApiError(400, 'Invalid Vendor ID parameter. Must be a valid ObjectId or VND code'));
  }
  next();
};

const validateUpdateVendorServices = (req, res, next) => {
  const { services } = req.body;
  if (!services || !Array.isArray(services)) {
    return next(new ApiError(400, 'Services must be provided as an array'));
  }
  next();
};

const validateUpdateCategories = (req, res, next) => {
  const { categories } = req.body;
  if (categories !== undefined && (!Array.isArray(categories) || categories.length === 0)) {
    return next(new ApiError(400, 'Please select at least one service category'));
  }
  next();
};

module.exports = {
  isValidObjectIdOrVendorId,
  parseAndValidateLocation,
  validateSendOtp,
  validateVerifyOtp,
  validateCreateVendor,
  validateUpdateProfile,
  validateUpdateVendor,
  validateUpdateStatus,
  validateVerifyVendor,
  validateVendorQuery,
  validateNearbyQuery,
  validateIdParam,
  validateUpdateVendorServices,
  validateUpdateCategories,
};
