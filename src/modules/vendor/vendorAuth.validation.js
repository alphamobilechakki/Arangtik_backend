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

const validateVendorRegister = (req, res, next) => {
  const { phone, password, otp, name, category, categoryId, categories } = req.body;

  if (!phone) {
    return next(new ApiError(400, 'Mobile number is required'));
  }
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
  }

  // If registering via password, validate length
  if (!otp && password && (typeof password !== 'string' || password.trim().length < 6)) {
    return next(new ApiError(400, 'Password must be at least 6 characters long'));
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(new ApiError(400, 'Vendor name is required'));
  }

  const hasCategory =
    (category && String(category).trim()) ||
    (categoryId && String(categoryId).trim()) ||
    (Array.isArray(categories) && categories.length > 0);

  if (!hasCategory) {
    return next(new ApiError(400, 'Vendor category is required. Please select a category (e.g. Dhobi, Doodh Wala).'));
  }

  next();
};

const validateVendorLogin = (req, res, next) => {
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

const validateForgotPassword = (req, res, next) => {
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

const validateResetPassword = (req, res, next) => {
  const { phone, otp, newPassword } = req.body;

  if (!phone) {
    return next(new ApiError(400, 'Mobile number is required'));
  }
  if (!otp || !String(otp).trim()) {
    return next(new ApiError(400, 'OTP is required'));
  }
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
    return next(new ApiError(400, 'New password must be at least 6 characters long'));
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
  validateVendorRegister,
  validateVendorLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateCategories,
  validateUpdateProfile,
  validateUpdateVendorServices,
};
