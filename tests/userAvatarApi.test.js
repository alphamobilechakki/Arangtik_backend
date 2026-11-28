require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { JWT_SECRET } = require('../src/config/env.config');
const User = require('../src/modules/auth/user.model');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arangtik';

test('User Avatar Module - Add and Update via same PATCH API Suite', async (t) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const testUserId = new mongoose.Types.ObjectId();
  const userToken = jwt.sign({ id: testUserId.toString(), role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

  // Setup test user
  await User.create({
    _id: testUserId,
    phone: '+919999888877',
    name: 'Avatar Tester',
    avatar: '',
  });

  t.after(async () => {
    await User.findByIdAndDelete(testUserId);
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 300);
  });

  // 1. PATCH /api/auth/avatar - Add Avatar via JSON
  await t.test('1. PATCH /api/auth/avatar - Should add avatar when initially empty', async () => {
    const avatarUrl = 'https://api.arangtik.com/uploads/default-3d-avatar.png';

    const res = await request(app)
      .patch('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ avatar: avatarUrl });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Avatar updated successfully');
    assert.ok(res.body.data.avatar);
    assert.ok(res.body.data.avatar.includes('default-3d-avatar.png'));

    // Verify in database
    const user = await User.findById(testUserId);
    assert.ok(user.avatar.includes('default-3d-avatar.png'));
  });

  // 2. PATCH /api/auth/avatar - Update Avatar via same API
  await t.test('2. PATCH /api/auth/avatar - Should update existing avatar with same endpoint', async () => {
    const newAvatarUrl = 'https://api.arangtik.com/uploads/stylized-cartoon-avatar-v2.png';

    const res = await request(app)
      .patch('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ avatar: newAvatarUrl });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.avatar.includes('stylized-cartoon-avatar-v2.png'));

    // Verify in database
    const user = await User.findById(testUserId);
    assert.ok(user.avatar.includes('stylized-cartoon-avatar-v2.png'));
  });

  // 3. GET /api/auth/avatar - Fetch current avatar
  await t.test('3. GET /api/auth/avatar - Should fetch current user avatar', async () => {
    const res = await request(app)
      .get('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.avatar.includes('stylized-cartoon-avatar-v2.png'));
  });

  // 4. GET /api/auth/me - Verify avatar exists on profile object
  await t.test('4. GET /api/auth/me - User profile should include avatar field', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.avatar);
    assert.ok(res.body.data.avatar.includes('stylized-cartoon-avatar-v2.png'));
  });

  // 5. PATCH /api/auth/avatar - Multipart Form Data File Upload
  await t.test('5. PATCH /api/auth/avatar - Should support file upload via multipart/form-data', async () => {
    // 1x1 transparent PNG buffer
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .patch('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', dummyImageBuffer, 'my-uploaded-avatar.png');

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.avatar);
    assert.ok(res.body.data.avatar.includes('/uploads/'));
  });

  // 6. Security - Unauthorized access blocked
  await t.test('6. Security - Request without JWT token should return 401', async () => {
    const res = await request(app)
      .patch('/api/auth/avatar')
      .send({ avatar: 'https://example.com/avatar.png' });

    assert.equal(res.status, 401);
  });
});
