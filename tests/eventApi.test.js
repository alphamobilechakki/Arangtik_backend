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
const FCCluster = require('../src/modules/frequentConnect/cluster/cluster.model');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/arangtik';

test('Event & EventType APIs - Complete End-to-End Suite', async (t) => {
  // Connect to MongoDB
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // Setup test users & tokens
  const testUserId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  const userToken = jwt.sign({ id: testUserId.toString(), role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
  const otherUserToken = jwt.sign({ id: otherUserId.toString(), role: 'user' }, JWT_SECRET, { expiresIn: '1h' });

  let eventTypesList = [];
  let minimalEventId = null;
  let groupEventId = null;
  let testClusterId = null;

  // Cleanup after all tests
  t.after(async () => {
    await Event.deleteMany({ userId: { $in: [testUserId, otherUserId] } });
    if (testClusterId) {
      await FCCluster.findByIdAndDelete(testClusterId);
    }
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 300);
  });

  // 1. GET /api/events/types
  await t.test('1. GET /api/events/types - should return active event categories & auto-seed presets', async () => {
    const res = await request(app)
      .get('/api/events/types')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length > 0);

    eventTypesList = res.body.data;
    const weddingType = eventTypesList.find((et) => et.code === 'WEDDING');
    assert.ok(weddingType, 'Wedding event type should exist');
    assert.ok(weddingType._id);
  });

  // 2. POST /api/events (Minimal 2-click creation)
  await t.test('2. POST /api/events - Minimal creation with only eventTypeId and eventDate', async () => {
    const type = eventTypesList[0];
    const targetDate = new Date(Date.now() + 86400000 * 5).toISOString(); // 5 days in future

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventTypeId: type._id,
        eventDate: targetDate,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data._id);
    assert.equal(res.body.data.title, `${type.name} Event`); // Auto-generated fallback title
    assert.equal(res.body.data.eventTypeCode, type.code); // Auto snapshot
    assert.equal(res.body.data.status, 'PLANNED');
    assert.equal(res.body.data.isDeleted, false);

    minimalEventId = res.body.data._id;
  });

  // 3. POST /api/events (With group/cluster and optional fields)
  await t.test('3. POST /api/events - Full creation with group/cluster sharing', async () => {
    // Create a mock cluster with testUserId as active member
    const cluster = await FCCluster.create({
      creatorId: testUserId,
      name: 'Test Family Squad',
      type: 'FAMILY',
      members: [
        {
          userId: testUserId,
          phone: '+919876543210',
          displayName: 'Test User',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      ],
    });
    testClusterId = cluster._id;

    const partyType = eventTypesList.find((et) => et.code === 'PARTY') || eventTypesList[0];
    const targetDate = new Date(Date.now() + 86400000 * 10).toISOString();

    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        eventTypeId: partyType._id,
        title: "Aman's Cocktail Party",
        eventDate: targetDate,
        eventTime: '20:00',
        clusterIds: [testClusterId.toString()],
        address: 'Taj Lands End, Bandra, Mumbai',
        location: {
          type: 'Point',
          coordinates: [72.8213, 19.0435], // [longitude, latitude] GeoJSON Point
        },
        imageUrl: 'https://example.com/invitation-cover.jpg',
        attachments: [
          {
            url: 'https://example.com/wedding-card.pdf',
            name: 'Wedding Invitation PDF',
            type: 'DOCUMENT',
          },
          {
            url: 'https://example.com/venue-map.png',
            name: 'Venue Map Image',
            type: 'IMAGE',
          },
        ],
        dressCode: 'Indo-Western Black',
        note: 'Cocktail evening with close friends',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, "Aman's Cocktail Party");
    assert.equal(res.body.data.eventTime, '20:00');
    assert.equal(res.body.data.address, 'Taj Lands End, Bandra, Mumbai');
    assert.equal(res.body.data.location.type, 'Point');
    assert.equal(res.body.data.location.coordinates[0], 72.8213);
    assert.equal(res.body.data.location.coordinates[1], 19.0435);
    assert.equal(res.body.data.imageUrl, 'https://example.com/invitation-cover.jpg');
    assert.equal(res.body.data.attachments.length, 2);
    assert.equal(res.body.data.attachments[0].type, 'DOCUMENT');
    assert.equal(res.body.data.attachments[1].type, 'IMAGE');
    assert.equal(res.body.data.dressCode, 'Indo-Western Black');
    assert.ok(Array.isArray(res.body.data.clusterIds));
    assert.equal(res.body.data.clusterIds.length, 1);

    groupEventId = res.body.data._id;
  });

  // 4. GET /api/events - User upcoming events
  await t.test('4. GET /api/events - Fetch user upcoming events', async () => {
    const res = await request(app)
      .get('/api/events?filter=upcoming')
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.events));
    assert.ok(res.body.data.events.length >= 2);
    assert.ok(res.body.data.pagination);
  });

  // 5. GET /api/events/cluster/:clusterId - Group events lookup
  await t.test('5. GET /api/events/cluster/:clusterId - Fetch events inside cluster', async () => {
    const res = await request(app)
      .get(`/api/events/cluster/${testClusterId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.cluster.name, 'Test Family Squad');
    assert.ok(Array.isArray(res.body.data.events));
    assert.equal(res.body.data.events.length, 1);
    assert.equal(res.body.data.events[0]._id, groupEventId);
  });

  // 6. GET /api/events/cluster/:clusterId - Unauthorized cluster member access check
  await t.test('6. GET /api/events/cluster/:clusterId - Unauthorized non-member should be blocked (403)', async () => {
    const res = await request(app)
      .get(`/api/events/cluster/${testClusterId}`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  // 7. GET /api/events/:id - Get single event
  await t.test('7. GET /api/events/:id - Get event details by ID', async () => {
    const res = await request(app)
      .get(`/api/events/${minimalEventId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data._id, minimalEventId);
    assert.ok(res.body.data.eventTypeId);
  });

  // 8. PATCH /api/events/:id - Update event details
  await t.test('8. PATCH /api/events/:id - Update title, status, and dressCode', async () => {
    const res = await request(app)
      .patch(`/api/events/${minimalEventId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Updated Grand Wedding Function',
        dressCode: 'Royal Sherwani',
        status: 'COMPLETED',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.title, 'Updated Grand Wedding Function');
    assert.equal(res.body.data.dressCode, 'Royal Sherwani');
    assert.equal(res.body.data.status, 'COMPLETED');
  });

  // 9. DELETE /api/events/:id - Soft delete
  await t.test('9. DELETE /api/events/:id - Soft delete event (verify isDeleted: true)', async () => {
    const res = await request(app)
      .delete(`/api/events/${minimalEventId}`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isDeleted, true);

    // Verify it is excluded from upcoming events list
    const listRes = await request(app)
      .get('/api/events?filter=all')
      .set('Authorization', `Bearer ${userToken}`);

    const found = listRes.body.data.events.some((e) => e._id === minimalEventId);
    assert.equal(found, false, 'Soft deleted event should not appear in active events list');
  });

  // 10. POST /api/events/:id/restore - Restore soft-deleted event
  await t.test('10. POST /api/events/:id/restore - Restore soft-deleted event', async () => {
    const res = await request(app)
      .post(`/api/events/${minimalEventId}/restore`)
      .set('Authorization', `Bearer ${userToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isDeleted, false);
    assert.equal(res.body.data.deletedAt, null);

    // Verify it reappears in active events list
    const listRes = await request(app)
      .get('/api/events?filter=all')
      .set('Authorization', `Bearer ${userToken}`);

    const found = listRes.body.data.events.some((e) => e._id === minimalEventId);
    assert.equal(found, true, 'Restored event should reappear in active events list');
  });
});
