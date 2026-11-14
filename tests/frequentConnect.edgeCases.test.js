const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { JWT_SECRET, MONGODB_URI } = require('../src/config/env.config');

const User = require('../src/modules/auth/user.model');
const Cluster = require('../src/modules/frequentConnect/cluster/cluster.model');
const ClusterMember = require('../src/modules/frequentConnect/member/member.model');
const Conversation = require('../src/modules/frequentConnect/conversation/conversation.model');
const Message = require('../src/modules/frequentConnect/message/message.model');

let userA, userB, userUnauthorized;
let tokenA, tokenB, tokenUnauth;
let testCluster;
let passed = 0;

function check(cond, desc) {
  if (!cond) {
    console.error(`❌ FAILED EDGE CASE: ${desc}`);
    throw new Error(desc);
  }
  passed++;
  console.log(`✅ PASSED: ${desc}`);
}

async function testEdgeCases() {
  console.log('====================================================');
  console.log('🛡️ Testing Deep Edge Cases & Permission Boundaries');
  console.log('====================================================');

  await mongoose.connect(MONGODB_URI);

  const stamp = Date.now().toString().slice(-6);
  userA = await User.create({ name: 'Admin ' + stamp, phone: '918001' + stamp, role: 'user' });
  userB = await User.create({ name: 'Member ' + stamp, phone: '918002' + stamp, role: 'user' });
  userUnauthorized = await User.create({ name: 'Outsider ' + stamp, phone: '918003' + stamp, role: 'user' });

  tokenA = jwt.sign({ id: userA._id.toString(), phone: userA.phone, role: 'user' }, JWT_SECRET);
  tokenB = jwt.sign({ id: userB._id.toString(), phone: userB.phone, role: 'user' }, JWT_SECRET);
  tokenUnauth = jwt.sign({ id: userUnauthorized._id.toString(), phone: userUnauthorized.phone, role: 'user' }, JWT_SECRET);

  // 1. Unauthenticated Request
  const unauthRes = await request(app).get('/api/fc/clusters');
  check(unauthRes.status === 401, 'Accessing clusters without token rejected with 401');

  // 2. Cluster Creation with max character name limit
  const longName = 'A'.repeat(51);
  const nameLimitRes = await request(app)
    .post('/api/fc/clusters')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: longName });
  check(nameLimitRes.status === 400, 'Cluster name > 50 characters rejected with 400');

  // 3. Create Valid Cluster
  const cRes = await request(app)
    .post('/api/fc/clusters')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ name: 'Alpha Cluster' });
  testCluster = cRes.body.data;

  // Add User B as member
  await request(app)
    .post(`/api/fc/clusters/${testCluster._id}/members`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ members: [{ phone: userB.phone }] });

  // 4. Unauthorized User cannot view cluster details
  const outsiderGet = await request(app)
    .get(`/api/fc/clusters/${testCluster._id}`)
    .set('Authorization', `Bearer ${tokenUnauth}`);
  check(outsiderGet.status === 403, 'Non-member accessing cluster details rejected with 403');

  // 5. Non-admin member cannot delete cluster
  const memberDelete = await request(app)
    .delete(`/api/fc/clusters/${testCluster._id}`)
    .set('Authorization', `Bearer ${tokenB}`);
  check(memberDelete.status === 403, 'Non-creator member attempting to delete cluster rejected with 403');

  // 6. Cluster creator cannot be removed from their own cluster
  const members = await ClusterMember.find({ clusterId: testCluster._id });
  const creatorMember = members.find((m) => m.userId.toString() === userA._id.toString());
  const removeCreatorRes = await request(app)
    .delete(`/api/fc/clusters/${testCluster._id}/members/${creatorMember._id}`)
    .set('Authorization', `Bearer ${tokenA}`);
  check(removeCreatorRes.status === 400, 'Attempting to remove cluster creator rejected with 400');

  // 7. Cluster creator cannot "leave" their cluster
  const creatorLeaveRes = await request(app)
    .post(`/api/fc/clusters/${testCluster._id}/members/leave`)
    .set('Authorization', `Bearer ${tokenA}`);
  check(creatorLeaveRes.status === 400, 'Cluster creator calling /leave rejected with 400');

  // 8. Normal member CAN leave
  const memberLeaveRes = await request(app)
    .post(`/api/fc/clusters/${testCluster._id}/members/leave`)
    .set('Authorization', `Bearer ${tokenB}`);
  check(memberLeaveRes.status === 200, 'Normal member can leave cluster cleanly');

  // 9. Reorder with malformed body
  const malformedReorder = await request(app)
    .patch('/api/fc/clusters/reorder')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ order: 'not-an-array' });
  check(malformedReorder.status === 400, 'Malformed order payload rejected with 400');

  // 10. Message text exceeding character limit (5000 chars)
  const convRes = await request(app)
    .post('/api/fc/conversations')
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ participantId: userB._id.toString() });
  const convId = convRes.body.data._id;

  const hugeText = 'X'.repeat(5001);
  const hugeTextRes = await request(app)
    .post(`/api/fc/conversations/${convId}/messages`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ content: hugeText });
  check(hugeTextRes.status === 400, 'Message > 5000 chars rejected with 400');

  // 11. Empty message content
  const emptyTextRes = await request(app)
    .post(`/api/fc/conversations/${convId}/messages`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ content: '   ' });
  check(emptyTextRes.status === 400, 'Empty whitespace message rejected with 400');

  // 12. Non-participant cannot send message to conversation
  const intruderMsg = await request(app)
    .post(`/api/fc/conversations/${convId}/messages`)
    .set('Authorization', `Bearer ${tokenUnauth}`)
    .send({ content: 'I am intruder' });
  check(intruderMsg.status === 403, 'Intruder sending message to private conversation rejected with 403');

  // 13. Invalid status string update
  const validMsg = await request(app)
    .post(`/api/fc/conversations/${convId}/messages`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ content: 'Valid message' });

  const invalidStatus = await request(app)
    .patch(`/api/fc/messages/${validMsg.body.data._id}/status`)
    .set('Authorization', `Bearer ${tokenB}`)
    .send({ status: 'INVALID_STATUS' });
  check(invalidStatus.status === 400, 'Unknown status string rejected with 400');

  // 14. Voice upload without file
  const emptyVoice = await request(app)
    .post(`/api/fc/conversations/${convId}/voice`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ duration: 5 });
  check(emptyVoice.status === 400, 'Voice upload without audio attachment rejected with 400');

  // 15. Search without search query
  const emptySearch = await request(app)
    .get('/api/fc/search/messages')
    .set('Authorization', `Bearer ${tokenA}`);
  check(emptySearch.status === 400, 'Search query missing rejected with 400');

  console.log(`\n🎉 ALL ${passed} DEEP EDGE CASE CHECKS PASSED!`);

  // Cleanup
  await User.deleteMany({ _id: { $in: [userA._id, userB._id, userUnauthorized._id] } });
  await Cluster.deleteMany({ _id: testCluster._id });
  await ClusterMember.deleteMany({ clusterId: testCluster._id });
  await Conversation.deleteMany({ _id: convId });
  await Message.deleteMany({ conversationId: convId });

  await mongoose.connection.close();
  process.exit(0);
}

testEdgeCases().catch(async (e) => {
  console.error(e);
  await mongoose.connection.close();
  process.exit(1);
});
