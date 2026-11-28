require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const { JWT_SECRET } = require('../src/config/env.config');
const EventType = require('../src/modules/event/eventType.model');
const Event = require('../src/modules/event/event.model');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arangtik';

test('Admin Event & EventType APIs - 5 Minimalist Endpoints Suite', async (t) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Admin and normal user tokens
  const adminId = new mongoose.Types.ObjectId().toString();
  const userId = new mongoose.Types.ObjectId().toString();

  const adminToken = jwt.sign({ id: adminId, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  const userToken = jwt.sign({ id: userId, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

  let testTypeId = null;
  let testEventId = null;

  t.after(async () => {
    if (testTypeId) {
      await EventType.findByIdAndDelete(testTypeId);
    }
    if (testEventId) {
      await Event.findByIdAndDelete(testEventId);
    }
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 300);
  });

  // 1. POST /api/admin/event-types - Create new category
  await t.test('1. POST /api/admin/event-types - Create category as Admin', async () => {
    const res = await request(app)
      .post('/api/admin/event-types')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Live Music Concert',
        code: `CONCERT_${Date.now()}`,
        icon: 'music',
        sortOrder: 15,
        isActive: true,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data._id);
    assert.equal(res.body.data.name, 'Live Music Concert');
    testTypeId = res.body.data._id;
  });

  // 2. PATCH /api/admin/event-types/:id - Update / Toggle category
  await t.test('2. PATCH /api/admin/event-types/:id - Toggle category active status', async () => {
    const res = await request(app)
      .patch(`/api/admin/event-types/${testTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: false,
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isActive, false);
  });

  // Create a test event for moderation & stats testing
  await t.test('Setup: Create a mock event for admin tests', async () => {
    const event = await Event.create({
      userId: new mongoose.Types.ObjectId(userId),
      title: 'Admin Test Gala Dinner',
      eventTypeId: testTypeId,
      eventTypeCode: 'CONCERT',
      eventDate: new Date(Date.now() + 86400000 * 3),
      status: 'PLANNED',
      isDeleted: false,
    });
    testEventId = event._id;
    assert.ok(testEventId);
  });

  // 3. GET /api/admin/events/stats - Overview KPIs
  await t.test('3. GET /api/admin/events/stats - Get admin dashboard KPI metrics', async () => {
    const res = await request(app)
      .get('/api/admin/events/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.totalEvents === 'number');
    assert.ok(typeof res.body.data.upcomingEvents === 'number');
    assert.ok(typeof res.body.data.completedEvents === 'number');
    assert.ok(typeof res.body.data.deletedEvents === 'number');
  });

  // 4. GET /api/admin/events - Global Events List
  await t.test('4. GET /api/admin/events - List events with search & pagination', async () => {
    const res = await request(app)
      .get('/api/admin/events?search=Gala&page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.events));
    assert.ok(res.body.data.events.some((e) => e._id === testEventId.toString()));
    assert.ok(res.body.data.pagination);
  });

  // 5. PATCH /api/admin/events/:id - Moderate status & restore
  await t.test('5. PATCH /api/admin/events/:id - Moderate status and soft-delete/restore', async () => {
    // 5a. Admin cancels event
    const cancelRes = await request(app)
      .patch(`/api/admin/events/${testEventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'CANCELLED',
      });

    assert.equal(cancelRes.status, 200);
    assert.equal(cancelRes.body.success, true);
    assert.equal(cancelRes.body.data.status, 'CANCELLED');

    // 5b. Admin soft-deletes event
    const deleteRes = await request(app)
      .patch(`/api/admin/events/${testEventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isDeleted: true,
      });

    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.data.isDeleted, true);

    // 5c. Admin restores event
    const restoreRes = await request(app)
      .patch(`/api/admin/events/${testEventId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isDeleted: false,
      });

    assert.equal(restoreRes.status, 200);
    assert.equal(restoreRes.body.data.isDeleted, false);
  });

  // Security check: non-admin blocked
  await t.test('6. Security - Non-admin user should get 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/events/stats')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 403);
  });
});
