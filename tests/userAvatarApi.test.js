require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { JWT_SECRET } = require('../src/config/env.config');
const User = require('../src/modules/auth/user.model');

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arangtik';

let testUserId;
let userToken;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  testUserId = new mongoose.Types.ObjectId();
  userToken = jwt.sign({ id: testUserId.toString(), role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

  await User.create({
    _id: testUserId,
    phone: '+919999888877',
    name: 'Avatar Tester',
    avatar: '',
  });
});

afterAll(async () => {
  await User.findByIdAndDelete(testUserId);
  await mongoose.disconnect();
});

describe('User Avatar API — PATCH /api/auth/avatar & GET /api/auth/avatar', () => {
  // 1. Add avatar via JSON URL
  it('1. PATCH /api/auth/avatar — should add avatar when initially empty', async () => {
    const avatarUrl = 'https://api.arangtik.com/uploads/default-3d-avatar.png';

    const res = await request(app)
      .patch('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ avatar: avatarUrl });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Avatar updated successfully');
    expect(res.body.data.avatar).toBeTruthy();
    expect(res.body.data.avatar).toContain('default-3d-avatar.png');

    const user = await User.findById(testUserId);
    expect(user.avatar).toContain('default-3d-avatar.png');
  });

  // 2. Update avatar with same PATCH
  it('2. PATCH /api/auth/avatar — should update existing avatar via same endpoint', async () => {
    const newAvatarUrl = 'https://api.arangtik.com/uploads/stylized-cartoon-avatar-v2.png';

    const res = await request(app)
      .patch('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ avatar: newAvatarUrl });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.avatar).toContain('stylized-cartoon-avatar-v2.png');

    const user = await User.findById(testUserId);
    expect(user.avatar).toContain('stylized-cartoon-avatar-v2.png');
  });

  // 3. GET current avatar
  it('3. GET /api/auth/avatar — should fetch current user avatar', async () => {
    const res = await request(app)
      .get('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.avatar).toContain('stylized-cartoon-avatar-v2.png');
  });

  // 4. Profile includes avatar
  it('4. GET /api/auth/profile — user profile should include avatar field', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.avatar).toBeTruthy();
    expect(res.body.data.avatar).toContain('stylized-cartoon-avatar-v2.png');
  });

  // 5. Multipart file upload
  it('5. PATCH /api/auth/avatar — should support file upload via multipart/form-data', async () => {
    // 1×1 transparent PNG
    const dummyImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    const res = await request(app)
      .patch('/api/auth/avatar')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('avatar', dummyImageBuffer, 'my-uploaded-avatar.png');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.avatar).toBeTruthy();
    expect(res.body.data.avatar).toContain('/uploads/');
    // aiProcessing flag should be true because a file was uploaded
    expect(res.body.data.aiProcessing).toBe(true);
  });

  // 6. Security — 401 without token
  it('6. Security — request without JWT token should return 401', async () => {
    const res = await request(app)
      .patch('/api/auth/avatar')
      .send({ avatar: 'https://example.com/avatar.png' });

    expect(res.status).toBe(401);
  });
});
