/**
 * Token Generator for Load Testing
 * Automatically generates valid JWT tokens for load tests using Backend JWT_SECRET
 * and looks up existing database users for authentic integration testing.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_tests';
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const outputFile = path.join(__dirname, '../config/tokens.json');

async function generate() {
  let userId = '65f1a2b3c4d5e6f7a8b9c0d1';
  let phone = '919876543210';
  let email = 'loadtest.user@arangtik.test';

  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI);
      const User = require('../../../src/modules/auth/user.model');
      const realUser = await User.findOne({ phone: '919876543210' }) || await User.findOne({});
      if (realUser) {
        userId = realUser._id.toString();
        phone = realUser.phone || phone;
        email = realUser.email || email;
      }
      await mongoose.disconnect();
    } catch (err) {
      console.warn('[LoadTesting] Could not connect to DB for user lookup, using fallback ID');
    }
  }

  const userToken = jwt.sign(
    {
      id: userId,
      role: 'user',
      phone,
      email,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const adminToken = jwt.sign(
    {
      id: new mongoose.Types.ObjectId().toString(),
      role: 'admin',
      isAdmin: true,
      email: 'loadtest.admin@arangtik.test',
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  const tokenData = {
    generatedAt: new Date().toISOString(),
    userId,
    userToken,
    adminToken,
  };

  fs.writeFileSync(outputFile, JSON.stringify(tokenData, null, 2), 'utf8');
  console.log(`[LoadTesting] Generated fresh load-test tokens for user ${userId} (${phone}) at: ${outputFile}`);
}

generate().catch(console.error);

