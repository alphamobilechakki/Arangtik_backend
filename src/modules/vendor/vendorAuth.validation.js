const ApiError = require('../../utils/apiError');
const { formatPhoneNumber } = require('../../utils/whatsapp.service');

const validateSendOtp = (req, res, next) => {
  const { phone } = req.body;
  if (!phone) {
    return next(new ApiError(400, 'Mobile number is required'));
  }
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
  }
  next();
};

const validateVerifyOtp = (req, res, next) => {
  const { phone, otp } = req.body;
  if (!phone) {
    return next(new ApiError(400, 'Mobile number is required'));
  }
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
  }
  if (!otp || !String(otp).trim()) {
    return next(new ApiError(400, 'OTP is required'));
  }
  next();
};
const validateUpdateCategories = (req, res, next) => {
  const { categories } = req.body;
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return next(new ApiError(400, 'Please select at least one service category'));
  }
  next();
};

const validateUpdateProfile = (req, res, next) => {
  const { categories } = req.body;
  if (categories !== undefined && (!Array.isArray(categories) || categories.length === 0)) {
    return next(new ApiError(400, 'Categories must be a non-empty array of category names'));
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

module.exports = {
  validateSendOtp,
  validateVerifyOtp,
  validateUpdateCategories,
  validateUpdateProfile,
  validateUpdateVendorServices,
};
