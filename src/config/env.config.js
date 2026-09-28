const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/arangtik',
  JWT_SECRET: process.env.JWT_SECRET || 'arangtik_super_secret_jwt_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',

  // OTP Configuration
  OTP_EXPIRY: parseInt(process.env.OTP_EXPIRY, 10) || 10, // minutes
  OTP_DEV_MODE: process.env.OTP_DEV_MODE === 'true',

  // API24 WhatsApp Gateway Configuration
  API24_BASE_URL: process.env.API24_BASE_URL || 'https://api24.in/api/v1',
  API24_API_KEY: process.env.API24_API_KEY || '',
  API24_API_SECRET: process.env.API24_API_SECRET || '',
  API24_CHANNEL_ID: process.env.API24_CHANNEL_ID || '',
  API24_TEMPLATE: process.env.API24_TEMPLATE || 'otp_verify_code',
  API24_LANGUAGE: process.env.API24_LANGUAGE || 'en_US',
  API24_PHONE_NUMBER: process.env.API24_PHONE_NUMBER || '',

  // AI Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
};
