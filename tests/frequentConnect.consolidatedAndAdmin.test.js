const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { JWT_SECRET } = require('../src/config/env.config');

const User = require('../src/modules/auth/user.model');
const Cluster = require('../src/modules/frequentConnect/cluster/cluster.model');
const Conversation = require('../src/modules/frequentConnect/conversation/conversation.model');
const Message = require('../src/modules/frequentConnect/message/message.model');

let userA, userB, adminUser;
let tokenA, tokenB, adminToken;
let cluster, conversation, message;
let passed = 0;

function check(condition, desc) {
  if (!condition) {
    console.error(`❌ FAILED: ${desc}`);
    throw new Error(desc);
  }
  passed++;
  console.log(`✅ PASSED: ${desc}`);
}

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), phone: user.phone, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const connectDB = require('../src/config/db.config');

async function testConsolidatedAndAdmin() {
  await connectDB();
  console.log('====================================================');
  console.log('🧪 Testing Consolidated & Admin Telemetry APIs');
  console.log('====================================================');

  const rand = Math.floor(Math.random() * 100000);
  userA = await User.create({
    name: `User Alpha ${rand}`,
    phone: `+919876${rand}`.slice(0, 13),
    role: 'user',
  });
  userB = await User.create({
    name: `User Beta ${rand}`,
    phone: `+919875${rand}`.slice(0, 13),
    role: 'user',
  });
  adminUser = await User.create({
    name: `Admin Master ${rand}`,
    phone: `+919874${rand}`.slice(0, 13),
    role: 'admin',
  });

  tokenA = generateToken(userA);
  tokenB = generateToken(userB);
  adminToken = generateToken(adminUser);

  // 1. Create Cluster with user A
  const createClusterRes = await request(app)
    .post('/api/fc/clusters')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: 'Consolidated Test Circle', type: 'FAMILY' });
  check(createClusterRes.status === 201, 'POST /api/fc/clusters returns 201');
  cluster = createClusterRes.body.data;

  // 2. Add an invite with invite code
  const addMemberRes = await request(app)
    .post(`/api/fc/clusters/${cluster._id}/members`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ members: [{ phone: userB.phone, displayName: 'Beta Member' }] });
  check(addMemberRes.status === 200, 'POST /api/fc/clusters/:id/members adds member');

  // 3. Create conversation and message
  const convRes = await request(app)
    .post('/api/fc/conversations/direct')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ participantId: userB._id });
  check(convRes.status === 200, 'POST /api/fc/conversations/direct returns 200');
  conversation = convRes.body.data;

  const msgRes = await request(app)
    .post(`/api/fc/conversations/${conversation._id}/messages`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ content: 'Testing consolidated bookmarking' });
  check(msgRes.status === 201, 'POST /api/fc/conversations/:id/messages returns 201');
  message = msgRes.body.data;

  // 4. Test Bookmark API: POST /api/fc/messages/:id/bookmark
  const bookmarkRes = await request(app)
    .post(`/api/fc/messages/${message._id}/bookmark`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ note: 'Urgent task bookmark' });
  check(bookmarkRes.status === 200, 'POST /api/fc/messages/:id/bookmark saves note');

  // 5. Test Saved Messages Listing: GET /api/fc/messages/saved
  const getSavedRes = await request(app)
    .get('/api/fc/messages/saved')
    .set('Authorization', `Bearer ${tokenB}`);
  check(getSavedRes.status === 200, 'GET /api/fc/messages/saved returns 200');
  check(getSavedRes.body.data.savedMessages.length >= 1, 'Saved messages array populated from FCMessage.savedBy');

  // 6. Test Unbookmark API: DELETE /api/fc/messages/:id/bookmark
  const unbookmarkRes = await request(app)
    .delete(`/api/fc/messages/${message._id}/bookmark`)
    .set('Authorization', `Bearer ${tokenB}`);
  check(unbookmarkRes.status === 200, 'DELETE /api/fc/messages/:id/bookmark removes note');

  // 7. Test Admin Overview: GET /api/admin/fc/overview
  const adminOverviewRes = await request(app)
    .get('/api/admin/fc/overview')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminOverviewRes.status === 200, 'GET /api/admin/fc/overview returns 200');
  check((adminOverviewRes.body.data.clusters?.total || 0) >= 1, 'Admin overview reflects clusters count');

  // 8. Test Admin Clusters: GET /api/admin/fc/clusters
  const adminClustersRes = await request(app)
    .get('/api/admin/fc/clusters')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminClustersRes.status === 200, 'GET /api/admin/fc/clusters returns 200');

  // 9. Test Admin Cluster Details: GET /api/admin/fc/clusters/:id
  const adminClusterDetailRes = await request(app)
    .get(`/api/admin/fc/clusters/${cluster._id}`)
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminClusterDetailRes.status === 200, 'GET /api/admin/fc/clusters/:id returns 200');
  check(adminClusterDetailRes.body.data.members.length >= 1, 'Admin cluster detail returns embedded members');

  // 10. Test Admin Members: GET /api/admin/fc/members
  const adminMembersRes = await request(app)
    .get('/api/admin/fc/members')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminMembersRes.status === 200, 'GET /api/admin/fc/members returns 200');

  // 11. Test Admin Conversations: GET /api/admin/fc/conversations
  const adminConvsRes = await request(app)
    .get('/api/admin/fc/conversations')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminConvsRes.status === 200, 'GET /api/admin/fc/conversations returns 200');

  // 12. Test Admin Messages: GET /api/admin/fc/messages
  const adminMsgsRes = await request(app)
    .get('/api/admin/fc/messages')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminMsgsRes.status === 200, 'GET /api/admin/fc/messages returns 200');

  // 13. Test Admin Saved Messages: GET /api/admin/fc/saved-messages
  const adminSavedRes = await request(app)
    .get('/api/admin/fc/saved-messages')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminSavedRes.status === 200, 'GET /api/admin/fc/saved-messages returns 200');

  // 14. Test Admin Auto Delete Logs: GET /api/admin/fc/auto-delete/logs
  const adminAutoDeleteRes = await request(app)
    .get('/api/admin/fc/auto-delete/logs')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminAutoDeleteRes.status === 200, 'GET /api/admin/fc/auto-delete/logs returns 200');

  // 15. Test Admin Invitations: GET /api/admin/fc/invitations
  const adminInvitesRes = await request(app)
    .get('/api/admin/fc/invitations')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminInvitesRes.status === 200, 'GET /api/admin/fc/invitations returns 200');

  // 16. Test Admin Walkie History: GET /api/admin/fc/walkie/history
  const adminWalkieHistRes = await request(app)
    .get('/api/admin/fc/walkie/history')
    .set('Authorization', `Bearer ${adminToken}`);
  check(adminWalkieHistRes.status === 200, 'GET /api/admin/fc/walkie/history returns 200');

  // Cleanup
  await User.deleteMany({ _id: { $in: [userA._id, userB._id, adminUser._id] } });
  await Cluster.deleteMany({ _id: cluster._id });
  await Conversation.deleteMany({ _id: conversation._id });
  await Message.deleteMany({ _id: message._id });

  console.log(`\n🎉 ALL ${passed} CONSOLIDATED & ADMIN TESTS PASSED!`);
  await mongoose.connection.close();
  process.exit(0);
}

testConsolidatedAndAdmin().catch(async (err) => {
  console.error('\n❌ TEST FAILURE:', err);
  await mongoose.connection.close();
  process.exit(1);
});
