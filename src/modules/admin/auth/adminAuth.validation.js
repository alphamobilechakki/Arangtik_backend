const ApiError = require('../../../utils/apiError');
const { formatPhoneNumber } = require('../../../utils/whatsapp.service');

const validateAdminLogin = (req, res, next) => {
  const { phone, password } = req.body;

  if (!phone) {
    return next(new ApiError(400, 'Mobile number is required'));
  }

  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone || formattedPhone.length < 10) {
    return next(new ApiError(400, 'Please provide a valid 10-digit mobile number'));
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    return next(new ApiError(400, 'Password is required'));
  }

  next();
};

module.exports = {
  validateAdminLogin,
};
