const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL || 'https://api.arangtik.com',
  MONGODB_URI: (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arangtik').replace(
    /^(mongodb(?:\+srv)?:\/\/[^\/]+)\/\/+/i,
    '$1/'
  ),
  JWT_SECRET: process.env.JWT_SECRET || 'arangtik_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  ADMIN_SYNC_API_KEY: process.env.ADMIN_SYNC_API_KEY || '',

  // OTP Configuration
  OTP_EXPIRY: parseInt(process.env.OTP_EXPIRY, 10) || 10, // minutes
  OTP_DEV_MODE: process.env.OTP_DEV_MODE === 'true',
  OTP_LENGTH: parseInt(process.env.OTP_LENGTH, 10) || 4,
  TEST_PHONE: process.env.TEST_PHONE || '918949056321',
  TEST_OTP: process.env.TEST_OTP || '1234',

  // VoiceNSMS SMS OTP Gateway Configuration
  SMS_API_URL:
    process.env.SMS_API_URL || 'https://api.voicensms.in/SMSAPI/webresources/CreateSMSCampaignPost',
  SMS_UKEY: process.env.SMS_UKEY || 'wAyyRoOjRX5nhTpHCFdDTz3vb',
  SMS_SENDER_ID: process.env.SMS_SENDER_ID || 'ARNGTK',
  SMS_FILE_TYPE: parseInt(process.env.SMS_FILE_TYPE, 10) || 2,
  SMS_LANGUAGE: parseInt(process.env.SMS_LANGUAGE, 10) || 0,
  SMS_CREDIT_TYPE: parseInt(process.env.SMS_CREDIT_TYPE, 10) || 2,
  SMS_TEMPLATE_ID: parseInt(process.env.SMS_TEMPLATE_ID, 10) || 0,
  SMS_MESSAGE_TEMPLATE:
    process.env.SMS_MESSAGE_TEMPLATE ||
    'Welcome to Arangtik! Use OTP {#otp#} to verify your Arangtik app account. Do not share this code with anyone.',

  // API24 WhatsApp Gateway Configuration (Used for Laundry Orders & Legacy WhatsApp Notifications)
  API24_BASE_URL: process.env.API24_BASE_URL || 'https://api24.in/api/v1',
  API24_API_KEY: process.env.API24_API_KEY || '',
  API24_API_SECRET: process.env.API24_API_SECRET || '',
  API24_CHANNEL_ID: process.env.API24_CHANNEL_ID || '',
  API24_TEMPLATE: process.env.API24_TEMPLATE || 'otp_verify_code',
  API24_LAUNDRY_TEMPLATE: process.env.API24_LAUNDRY_TEMPLATE || 'vendors_order_registereds',
  API24_LAUNDRY_TEMPLATE_REG: process.env.API24_LAUNDRY_TEMPLATE_REG || 'vendors_order_registereds',
  API24_LAUNDRY_TEMPLATE_UNREG: process.env.API24_LAUNDRY_TEMPLATE_UNREG || 'vendors_order_unregistereds',
  API24_LANGUAGE: process.env.API24_LANGUAGE || 'en_US',
  API24_PHONE_NUMBER: process.env.API24_PHONE_NUMBER || '',

  // AI Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Python Garment AI Service (Person Parsing, Garment Splitting, Inpainting, Background Removal)
  PYTHON_BG_REMOVAL_URL: process.env.PYTHON_BG_REMOVAL_URL || 'https://bg.arangtik.com/api/background-removal',
  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || process.env.PYTHON_PARSING_SERVICE_URL || 'http://localhost:8000',
  PYTHON_SERVICE_TIMEOUT_MS: parseInt(process.env.PYTHON_SERVICE_TIMEOUT_MS, 10) || 30000,

  
  // Firebase Cloud Messaging (FCM) Configuration
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',
  FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
  FIREBASE_SERVICE_ACCOUNT_BASE64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '',
  FCM_DEV_MODE: process.env.FCM_DEV_MODE === 'true',

  // Razorpay Gateway Configuration
  RAZORPAY_KEY_ID: (process.env.RAZORPAY_KEY_ID || '').trim(),
  RAZORPAY_KEY_SECRET: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
  RAZORPAY_WEBHOOK_SECRET: (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(),
};
