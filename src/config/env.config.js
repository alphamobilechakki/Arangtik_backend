const dotenv = require('dotenv');
dotenv.config();

// Helper to sanitize MongoDB URIs (remove accidental double slashes after host)
const cleanMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.trim().replace(/^(mongodb(?:\+srv)?:\/\/[^\/]+)\/\/+/i, '$1/');
};

const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
const isProd = nodeEnv === 'production';

// Production URIs (supports MONGODB_URI_PRODUCTION, MONGODB_PROD_URI)
const prodMongoUri = cleanMongoUri(process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_PROD_URI);

// Development URIs (supports MONGODB_URI_DEVELOPMENT, MONGODB_DEV_URI)
const devMongoUri = cleanMongoUri(process.env.MONGODB_URI_DEVELOPMENT || process.env.MONGODB_DEV_URI);

// Fallback / legacy URI
const fallbackMongoUri = cleanMongoUri(process.env.MONGODB_URI);

// Select active URI based on NODE_ENV
const activeMongoUri = isProd
  ? (prodMongoUri || fallbackMongoUri)
  : (devMongoUri || fallbackMongoUri || 'mongodb://127.0.0.1:27017/arangtik');

// Keep process.env.MONGODB_URI synced with the active environment's URI
process.env.MONGODB_URI = activeMongoUri;

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: isProd,
  BASE_URL: process.env.BASE_URL || 'https://api.arangtik.com',
  MONGODB_URI: activeMongoUri,
  MONGODB_URI_DEVELOPMENT: devMongoUri,
  MONGODB_URI_PRODUCTION: prodMongoUri,
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
  PYTHON_SERVICE_URL: process.env.PYTHON_SERVICE_URL || process.env.PYTHON_PARSING_SERVICE_URL || 'https://bg.arangtik.com',
  PYTHON_SERVICE_TIMEOUT_MS: parseInt(process.env.PYTHON_SERVICE_TIMEOUT_MS, 10) || 120000,

  
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

  // Redis & BullMQ Job Queue Configuration
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_TLS: process.env.REDIS_TLS === 'true',
  GARMENT_AI_CONCURRENCY: parseInt(process.env.GARMENT_AI_CONCURRENCY, 10) || 2,

  // Python Avatar AI Service (Stylized Avatar Generation)
  AVATAR_AI_SERVICE_URL: process.env.AVATAR_AI_SERVICE_URL || 'http://127.0.0.1:8000',
  AVATAR_AI_TIMEOUT_MS: parseInt(process.env.AVATAR_AI_TIMEOUT_MS, 10) || 180000,
  AVATAR_AI_CONCURRENCY: parseInt(process.env.AVATAR_AI_CONCURRENCY, 10) || 2,

  // Python Virtual Try-On Service (AI Stylist)
  PYTHON_TRYON_URL: process.env.PYTHON_TRYON_URL || 'http://127.0.0.1:8000',
  PYTHON_TRYON_TIMEOUT_MS: parseInt(process.env.PYTHON_TRYON_TIMEOUT_MS, 10) || 300000,
  AI_STYLIST_CONCURRENCY: parseInt(process.env.AI_STYLIST_CONCURRENCY, 10) || 2,
};
