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
 * Send OTP using API24 WhatsApp Template API
 * Template: otp_verify_code (Authentication Template with Body + Copy Code Button)
 */
const sendWhatsAppOtp = async (phone, otp) => {
  const formattedPhone = formatPhoneNumber(phone);

  if (!formattedPhone || formattedPhone.length < 10) {
    throw new ApiError(400, 'Invalid phone number format');
  }

  // If in Dev Mode, log to console and return
  if (OTP_DEV_MODE) {
    console.log(`[DEV MODE] WhatsApp OTP for ${formattedPhone}: ${otp}`);
    return { success: true, mode: 'dev', formattedPhone };
  }

  if (!API24_API_KEY || !API24_API_SECRET || !API24_CHANNEL_ID) {
    console.warn('[WhatsApp Service Warning]: API24 credentials not configured.');
    console.log(`[SIMULATED OTP] WhatsApp OTP for ${formattedPhone}: ${otp}`);
    return { success: true, mode: 'simulated', formattedPhone };
  }

  try {
    const baseUrl = API24_BASE_URL.replace(/\/+$/, '');
    const url = `${baseUrl}/messages/template`;

    // For AUTHENTICATION OTP templates with Copy Code button, Meta requires both Body and Button components
    const payload = {
      to: formattedPhone,
      templateName: API24_TEMPLATE,
      language: API24_LANGUAGE,
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: String(otp),
            },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [
            {
              type: 'text',
              text: String(otp),
            },
          ],
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-Key': API24_API_KEY,
        'X-API-Secret': API24_API_SECRET,
        'X-Channel-Id': API24_CHANNEL_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      console.error('[API24 WhatsApp Error Response]:', data);
      throw new ApiError(
        response.status >= 400 && response.status < 500 ? response.status : 502,
        data.error || 'Failed to send WhatsApp OTP. Please verify your phone number and try again.'
      );
    }

    return { success: true, data: data.data, formattedPhone };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('[API24 WhatsApp Request Error]:', error.message);
    throw new ApiError(500, `Failed to dispatch WhatsApp OTP: ${error.message}`);
  }
};

module.exports = {
  formatPhoneNumber,
  sendWhatsAppOtp,
};
