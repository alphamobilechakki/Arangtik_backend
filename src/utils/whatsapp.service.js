const {
  API24_BASE_URL,
  API24_API_KEY,
  API24_API_SECRET,
  API24_CHANNEL_ID,
  API24_TEMPLATE,
  API24_LANGUAGE,
  OTP_DEV_MODE,
} = require('../config/env.config');
const ApiError = require('./apiError');
const { formatPhoneNumber, sendSmsOtp } = require('./sms.service');

/**
 * Send OTP - Legacy WhatsApp OTP signature now delegates to VoiceNSMS SMS Gateway.
 * Kept for backward compatibility with existing tests and modules.
 */
const sendWhatsAppOtp = async (phone, otp) => {
  return await sendSmsOtp(phone, otp);
};

module.exports = {
  formatPhoneNumber,
  sendWhatsAppOtp,
};
