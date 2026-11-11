const {
  SMS_API_URL,
  SMS_UKEY,
  SMS_SENDER_ID,
  SMS_FILE_TYPE,
  SMS_LANGUAGE,
  SMS_CREDIT_TYPE,
  SMS_TEMPLATE_ID,
  SMS_MESSAGE_TEMPLATE,
  OTP_DEV_MODE,
} = require('../config/env.config');
const ApiError = require('./apiError');

/**
 * Format phone to international digits only (e.g. 919876543210)
 * Prepend India country code (91) if 10-digit number is provided.
 */
const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

/**
 * Format phone for SMS gateway msisdn array (e.g. 10-digit number 9876543210)
 */
const formatPhoneForSms = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
};

/**
 * Construct SMS body from template
 */
const buildOtpMessage = (otp) => {
  const template =
    SMS_MESSAGE_TEMPLATE ||
    'Welcome to Arangtik! Use OTP {#otp#} to verify your Arangtik app account. Do not share this code with anyone.';
  if (template.includes('{#otp#}')) {
    return template.replace(/\{#otp#\}/g, String(otp));
  }
  if (template.includes('{otp}')) {
    return template.replace(/\{otp\}/g, String(otp));
  }
  return `Welcome to Arangtik! Use OTP ${otp} to verify your Arangtik app account. Do not share this code with anyone.`;
};

/**
 * Send OTP via VoiceNSMS CreateSMSCampaignPost API
 * Payload structure:
 * {
 *   "filetype": 2,
 *   "msisdn": ["7665034488"],
 *   "language": 0,
 *   "credittype": 2,
 *   "senderid": "ARNGTK",
 *   "templateid": 0,
 *   "message": "Welcome to Arangtik! Use OTP 123456 to verify your Arangtik app account. Do not share this code with anyone.",
 *   "ukey": "wAyyRoOjRX5nhTpHCFdDTz3vb"
 * }
 */
const sendSmsOtp = async (phone, otp) => {
  const formattedPhone = formatPhoneNumber(phone);
  const smsMsisdn = formatPhoneForSms(phone);

  if (!smsMsisdn || smsMsisdn.length < 10) {
    throw new ApiError(400, 'Invalid phone number format');
  }

  // If in Dev Mode, log to console and return
  if (OTP_DEV_MODE) {
    console.log(`[DEV MODE] SMS OTP for ${smsMsisdn} (formatted: ${formattedPhone}): ${otp}`);
    return { success: true, mode: 'dev', formattedPhone, msisdn: smsMsisdn };
  }

  if (!SMS_UKEY) {
    console.warn('[SMS Service Warning]: SMS_UKEY not configured.');
    console.log(`[SIMULATED OTP] SMS OTP for ${smsMsisdn}: ${otp}`);
    return { success: true, mode: 'simulated', formattedPhone, msisdn: smsMsisdn };
  }

  try {
    const apiUrl = SMS_API_URL || 'https://api.voicensms.in/SMSAPI/webresources/CreateSMSCampaignPost';
    const message = buildOtpMessage(otp);

    const payload = {
      filetype: Number(SMS_FILE_TYPE) || 2,
      msisdn: [smsMsisdn],
      language: Number(SMS_LANGUAGE) || 0,
      credittype: Number(SMS_CREDIT_TYPE) || 2,
      senderid: SMS_SENDER_ID || 'ARNGTK',
      templateid: Number(SMS_TEMPLATE_ID) || 0,
      message,
      ukey: SMS_UKEY,
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch (_) {
      const rawText = await response.text().catch(() => '');
      throw new ApiError(502, `Invalid JSON response from SMS gateway (${response.status}): ${rawText}`);
    }

    if (!response.ok || (data && data.status === 'failure')) {
      console.error('[VoiceNSMS Error Response]:', data);
      throw new ApiError(
        response.status >= 400 && response.status < 500 ? response.status : 502,
        (data && data.value) || 'Failed to send SMS OTP. Please verify your phone number and try again.'
      );
    }

    return {
      success: true,
      data,
      formattedPhone,
      msisdn: smsMsisdn,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('[VoiceNSMS Request Error]:', error.message);
    throw new ApiError(500, `Failed to dispatch SMS OTP: ${error.message}`);
  }
};

module.exports = {
  formatPhoneNumber,
  formatPhoneForSms,
  buildOtpMessage,
  sendSmsOtp,
};

