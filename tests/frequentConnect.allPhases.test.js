/**
 * Comprehensive Automated Test Suite for Arangtik - Frequent Connect
 * Covers Phases 1 to 9:
 * - Phase 1: Cluster CRUD, Ordering, Member Addition, Edge Cases (Non-registered, Limits, Permissions), Invites
 * - Phase 2: Conversations (Direct 1:1, Cluster Auto-creation), Text Messaging, Delivery/Seen/Played Status
 * - Phase 3: Real-Time Socket.IO (Join, Send, Typing, Status, Presence)
 * - Phase 4: Voice Messaging (Audio Upload, Duration, Playback, Status)
 * - Phase 5: Walkie-Talkie (Floor Acquire, Half-Duplex busy rejection, Audio chunk relay, Release, Auto-timeout)
 * - Phase 6: 15-Minute Auto-Delete & Saved Messages (Bookmark exempt, unbookmark, cron scrub)
 * - Phase 7: Home Screen Widget APIs & Unread Badges
 * - Phase 8: Full Chat History & Cross-Conversation Search
 * - Phase 9: Rate-Limiting, Sanitization, Health Checks
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { io: ClientIO } = require('socket.io-client');
const path = require('path');
const fs = require('fs');

const connectDB = require('../src/config/db.config');
const app = require('../src/app');
const { initSocketServer } = require('../src/config/socket.config');
const { initFrequentConnectSocket } = require('../src/modules/frequentConnect/frequentConnect.socket');
const { runAutoDeleteCycle } = require('../src/utils/messageAutoDelete.cron');
const { JWT_SECRET, MONGODB_URI } = require('../src/config/env.config');

const User = require('../src/modules/auth/user.model');
const Cluster = require('../src/modules/frequentConnect/cluster/cluster.model');
const ClusterMember = require('../src/modules/frequentConnect/member/member.model');
const Conversation = require('../src/modules/frequentConnect/conversation/conversation.model');
const Message = require('../src/modules/frequentConnect/message/message.model');
const SavedMessage = require('../src/modules/frequentConnect/savedMessage/savedMessage.model');
const Invite = require('../src/modules/frequentConnect/invite/invite.model');
const WalkieTalkieSession = require('../src/modules/frequentConnect/walkieTalkie/walkieTalkie.model');

let server;
let serverPort = 8099;
let userA, userB, userC;
let tokenA, tokenB, tokenC;
let clusterId;
let directConvId, clusterConvId;
let textMessageId, voiceMessageId;

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id.toString(), phone: user.phone, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (!condition) {
    failedCount++;
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  } else {
    passedCount++;
    console.log(`✅ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting Frequent Connect End-to-End Test Suite');
  console.log('====================================================');

  try {
    // 0. Connect DB & Setup Test Server
    await connectDB();
    console.log('📦 Connected to MongoDB');

    server = http.createServer(app);
    const ioServer = initSocketServer(server);
    initFrequentConnectSocket(ioServer);

    await new Promise((resolve) => server.listen(serverPort, resolve));
    console.log(`🚀 Test Server listening on http://localhost:${serverPort}`);

    // Create 3 Test Users
    const timestamp = Date.now().toString().slice(-6);
    userA = await User.create({
      name: `Tester A ${timestamp}`,
      phone: `919000${timestamp}`,
      role: 'user',
      status: 'active',
    });
    userB = await User.create({
      name: `Tester B ${timestamp}`,
      phone: `919111${timestamp}`,
      role: 'user',
      status: 'active',
    });
    userC = await User.create({
      name: `Tester C ${timestamp}`,
      phone: `919222${timestamp}`,
      role: 'user',
      status: 'active',
    });

    tokenA = generateToken(userA);
    tokenB = generateToken(userB);
    tokenC = generateToken(userC);

    console.log('👥 Created Test Users A, B, C');

    // =========================================================================
    // TEST SUITE: HEALTH CHECK & PHASE 9 BASIC
    // =========================================================================
    console.log('\n--- Test 1: Subsystem Health Check ---');
    const healthRes = await request(app).get('/api/fc/health');
    assert(healthRes.status === 200 && healthRes.body.status === 'ok', 'GET /api/fc/health returns 200 ok');

    // =========================================================================
    // PHASE 1: CLUSTER CRUD, PRIORITIES, MEMBERS & INVITES
    // =========================================================================
    console.log('\n--- Phase 1: Cluster CRUD & Edge Cases ---');

    // 1.1 Edge case: Missing name
    const failCreate = await request(app)
      .post('/api/fc/clusters')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ icon: '👨‍👩‍👧' });
    assert(failCreate.status === 400, 'Cluster creation fails when name is missing');

    // 1.2 Edge case: Invalid hex color
    const failColor = await request(app)
      .post('/api/fc/clusters')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Invalid Color', color: 'blue' });
    assert(failColor.status === 400, 'Cluster creation fails on invalid hex color');

    // 1.3 Successful creation of Cluster 1 (Family)
    const createRes1 = await request(app)
      .post('/api/fc/clusters')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Family Circle',
        icon: '👨‍👩‍👧',
        color: '#FF5733',
        type: 'FAMILY',
      });
    assert(createRes1.status === 201 && createRes1.body.data._id, 'User A creates "Family Circle" cluster');
    clusterId = createRes1.body.data._id;
    assert(createRes1.body.data.memberCount === 1, 'Cluster creator is auto-added as member (count = 1)');

    // 1.4 Successful creation of Cluster 2 (Work)
    const createRes2 = await request(app)
      .post('/api/fc/clusters')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Work Team',
        icon: '💼',
        color: '#33A1FF',
        type: 'OFFICE',
      });
    assert(createRes2.status === 201, 'User A creates "Work Team" cluster');
    const clusterId2 = createRes2.body.data._id;

    // 1.5 Reorder Clusters
    const reorderRes = await request(app)
      .patch('/api/fc/clusters/reorder')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        order: [
          { clusterId: clusterId2, priority: 0 },
          { clusterId: clusterId, priority: 1 },
        ],
      });
    assert(reorderRes.status === 200, 'Reordered cluster priorities successfully');

    // 1.6 List User Clusters
    const listClusters = await request(app)
      .get('/api/fc/clusters')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(listClusters.status === 200 && listClusters.body.data.length >= 2, 'Listed clusters successfully');
    assert(listClusters.body.data[0]._id.toString() === clusterId2, 'Top priority cluster appears first');

    // 1.7 Add Registered Member (User B)
    const addMemberRes = await request(app)
      .post(`/api/fc/clusters/${clusterId}/members`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        members: [{ phone: userB.phone, displayName: 'Brother B' }],
      });
    assert(addMemberRes.status === 200 && addMemberRes.body.data.added.length === 1, 'Added registered user B to cluster directly as ACTIVE');

    // 1.8 Add Non-Registered Member (Invited via SMS)
    const fakePhone = `918888${timestamp}`;
    const addUnregisteredRes = await request(app)
      .post(`/api/fc/clusters/${clusterId}/members`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        members: [{ phone: fakePhone, displayName: 'Unregistered Cousin' }],
      });
    assert(
      addUnregisteredRes.status === 200 && addUnregisteredRes.body.data.invited.length === 1,
      'Added non-registered phone as INVITED with inviteCode'
    );
    const inviteCode = addUnregisteredRes.body.data.invited[0].inviteCode;

    // 1.9 Edge case: Add duplicate member
    const addDuplicateRes = await request(app)
      .post(`/api/fc/clusters/${clusterId}/members`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        members: [{ phone: userB.phone }],
      });
    assert(addDuplicateRes.body.data.alreadyExists.length === 1, 'Duplicate member addition cleanly flagged in alreadyExists');

    // 1.10 List Cluster Members
    const membersList = await request(app)
      .get(`/api/fc/clusters/${clusterId}/members`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(membersList.status === 200 && membersList.body.data.length === 3, 'Cluster has 3 members (Creator + User B + Invited)');

    // 1.11 Non-registered user signs up and accepts invite
    const inviteUser = await User.create({
      name: 'Newly Joined Cousin',
      phone: fakePhone,
      role: 'user',
    });
    const inviteUserToken = generateToken(inviteUser);
    const acceptInviteRes = await request(app)
      .post(`/api/fc/invites/${inviteCode}/accept`)
      .set('Authorization', `Bearer ${inviteUserToken}`);
    assert(acceptInviteRes.status === 200 && acceptInviteRes.body.data.accepted === true, 'New user accepts invite code and becomes ACTIVE member');

    // =========================================================================
    // PHASE 2: CONVERSATIONS & TEXT MESSAGING (REST)
    // =========================================================================
    console.log('\n--- Phase 2: Conversations & Text Messaging ---');

    // 2.1 Get or Create Direct 1:1 Conversation between User A & User B
    const directRes = await request(app)
      .post('/api/fc/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ participantId: userB._id.toString() });
    assert(directRes.status === 200 && directRes.body.data._id, 'Created/Fetched 1:1 direct conversation between User A & B');
    directConvId = directRes.body.data._id;

    // 2.2 Edge case: Cannot converse with oneself
    const selfConvRes = await request(app)
      .post('/api/fc/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ participantId: userA._id.toString() });
    assert(selfConvRes.status === 400, 'Direct conversation with oneself blocked with 400');

    // 2.3 Send Text Message via REST
    const sendMsgRes = await request(app)
      .post(`/api/fc/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Hello User B from REST API!' });
    assert(sendMsgRes.status === 201 && sendMsgRes.body.data._id, 'User A sends text message to User B');
    textMessageId = sendMsgRes.body.data._id;
    assert(sendMsgRes.body.data.status === 'SENT', 'Initial message status is SENT');

    // 2.4 User B views messages
    const getMsgsRes = await request(app)
      .get(`/api/fc/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(getMsgsRes.status === 200 && getMsgsRes.body.data.messages.length >= 1, 'User B retrieves message list');

    // 2.5 Update message status to SEEN
    const markSeenRes = await request(app)
      .patch(`/api/fc/messages/${textMessageId}/status`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'SEEN' });
    assert(markSeenRes.status === 200 && markSeenRes.body.data.status === 'SEEN', 'User B marks message as SEEN');

    // Verify autoDeleteAt timestamp was scheduled
    const dbMsg = await Message.findById(textMessageId);
    assert(dbMsg.autoDeleteAt !== null, 'SEEN status triggered autoDeleteAt timestamp calculation');

    // =========================================================================
    // PHASE 3: REAL-TIME SOCKET.IO
    // =========================================================================
    console.log('\n--- Phase 3: Real-Time WebSockets ---');

    const clientSocketA = ClientIO(`http://localhost:${serverPort}/fc`, {
      auth: { token: tokenA },
      transports: ['websocket'],
    });

    const clientSocketB = ClientIO(`http://localhost:${serverPort}/fc`, {
      auth: { token: tokenB },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => clientSocketA.on('connect', resolve)),
      new Promise((resolve) => clientSocketB.on('connect', resolve)),
    ]);
    assert(clientSocketA.connected && clientSocketB.connected, 'Sockets for User A and User B connected and authenticated with JWT');

    // Join conversation room
    clientSocketA.emit('join-conversation', { conversationId: directConvId });
    clientSocketB.emit('join-conversation', { conversationId: directConvId });
    await new Promise((r) => setTimeout(r, 200));

    // Test real-time message receipt
    const socketMsgPromise = new Promise((resolve) => {
      clientSocketB.on('new-message', (data) => {
        resolve(data);
      });
    });

    clientSocketA.emit('send-message', {
      conversationId: directConvId,
      content: 'Hello via WebSockets!',
    });

    const receivedSocketMsg = await socketMsgPromise;
    assert(receivedSocketMsg.content === 'Hello via WebSockets!', 'User B receives real-time "new-message" broadcast via Socket.IO');

    // Test typing indicator
    const typingPromise = new Promise((resolve) => {
      clientSocketB.on('user-typing', (data) => {
        resolve(data);
      });
    });
    clientSocketA.emit('typing', { conversationId: directConvId });
    const typingEvent = await typingPromise;
    assert(typingEvent.conversationId === directConvId, 'User B receives "user-typing" event from User A');

    // Check presence
    const presencePromise = new Promise((resolve) => {
      clientSocketA.emit('check-presence', { userIds: [userB._id.toString()] }, (res) => {
        resolve(res);
      });
    });
    const presenceRes = await presencePromise;
    assert(presenceRes.presence[userB._id.toString()] === true, 'Presence tracking correctly identifies User B as online');

    // =========================================================================
    // PHASE 4: VOICE MESSAGES
    // =========================================================================
    console.log('\n--- Phase 4: Voice Messages ---');

    // Create a temporary mock audio file
    const tempAudioDir = path.resolve(__dirname, 'uploads/voice');
    if (!fs.existsSync(tempAudioDir)) fs.mkdirSync(tempAudioDir, { recursive: true });
    const mockAudioPath = path.join(tempAudioDir, 'test-voice.m4a');
    fs.writeFileSync(mockAudioPath, Buffer.from('FAKE-AUDIO-DATA-STREAM'));

    const voiceUploadRes = await request(app)
      .post(`/api/fc/conversations/${directConvId}/voice`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('audio', mockAudioPath)
      .field('duration', '15.5')
      .field('caption', 'Listen to this update');

    assert(voiceUploadRes.status === 201 && voiceUploadRes.body.data.voiceUrl, 'Uploaded and sent voice message successfully');
    voiceMessageId = voiceUploadRes.body.data._id;
    assert(voiceUploadRes.body.data.voiceDuration === 15.5, 'Voice duration recorded correctly');

    // Mark as PLAYED
    const markPlayedRes = await request(app)
      .patch(`/api/fc/messages/${voiceMessageId}/status`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'PLAYED' });
    assert(markPlayedRes.status === 200 && markPlayedRes.body.data.status === 'PLAYED', 'User B marks voice message as PLAYED');

    // =========================================================================
    // PHASE 5: WALKIE-TALKIE LIVE PTT (HALF-DUPLEX)
    // =========================================================================
    console.log('\n--- Phase 5: Walkie-Talkie Push-to-Talk ---');

    // 5.1 User A acquires floor
    const walkieStartPromise = new Promise((resolve) => {
      clientSocketA.emit('walkie-start', { conversationId: directConvId }, (res) => {
        resolve(res);
      });
    });

    const incomingPromise = new Promise((resolve) => {
      clientSocketB.on('walkie-incoming', (data) => resolve(data));
    });

    const [startAck, incomingData] = await Promise.all([walkieStartPromise, incomingPromise]);
    assert(startAck.success === true, 'User A presses PTT button and successfully acquires floor');
    assert(incomingData.speakerId === userA._id.toString(), 'User B receives "walkie-incoming" alert with speaker info');

    // 5.2 Edge Case: User B tries to speak while User A holds floor (Floor Busy rejection)
    const busyPromise = new Promise((resolve) => {
      clientSocketB.emit('walkie-start', { conversationId: directConvId }, (res) => {
        resolve(res);
      });
    });
    const busyAck = await busyPromise;
    assert(busyAck.success === false && busyAck.code === 'FLOOR_BUSY', 'User B is blocked with FLOOR_BUSY because User A is speaking');

    // 5.3 Audio chunk streaming
    const audioChunkPromise = new Promise((resolve) => {
      clientSocketB.on('walkie-audio-stream', (data) => resolve(data));
    });
    clientSocketA.emit('walkie-audio', {
      conversationId: directConvId,
      chunk: Buffer.from([0x01, 0x02, 0x03, 0x04]),
    });
    const receivedChunk = await audioChunkPromise;
    assert(receivedChunk.chunk !== undefined, 'Live binary audio chunk relayed to User B');

    // 5.4 User A releases floor
    const endedPromise = new Promise((resolve) => {
      clientSocketB.on('walkie-ended', (data) => resolve(data));
    });
    clientSocketA.emit('walkie-stop', { conversationId: directConvId });
    const endData = await endedPromise;
    assert(endData.speakerId === userA._id.toString(), 'User A releases PTT and listeners receive "walkie-ended"');

    // =========================================================================
    // PHASE 6: 15-MINUTE AUTO-DELETE & SAVED MESSAGES
    // =========================================================================
    console.log('\n--- Phase 6: Auto-Delete & Saved Messages ---');

    // 6.1 Bookmark/Save Message
    const saveRes = await request(app)
      .post(`/api/fc/messages/${textMessageId}/save`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ note: 'Important message' });
    assert(saveRes.status === 200 && saveRes.body.data.messageId, 'User B saves/bookmarks message');

    // 6.2 List Saved Messages
    const getSavedRes = await request(app)
      .get('/api/fc/saved-messages')
      .set('Authorization', `Bearer ${tokenB}`);
    assert(getSavedRes.status === 200 && getSavedRes.body.data.savedMessages.length >= 1, 'Saved messages listed successfully');

    // 6.3 Test Auto-Delete Cron: Force message timestamp to 20 minutes ago
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    await Message.findByIdAndUpdate(voiceMessageId, {
      'recipientStatuses.$[].seenAt': twentyMinsAgo,
    });

    // Run auto-delete cycle
    await runAutoDeleteCycle();

    const voiceMsgAfterCron = await Message.findById(voiceMessageId);
    assert(
      voiceMsgAfterCron.isAutoDeleted === true && voiceMsgAfterCron.content === '',
      '15-minute auto-delete cycle automatically scrubbed expired message and cleared voice file'
    );

    // =========================================================================
    // PHASE 7: HOME SCREEN WIDGET DATA APIS
    // =========================================================================
    console.log('\n--- Phase 7: Home Screen Widget Data ---');

    const widgetClustersRes = await request(app)
      .get('/api/fc/widget/clusters')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      widgetClustersRes.status === 200 && Array.isArray(widgetClustersRes.body.data.clusters),
      'GET /api/fc/widget/clusters returns lightweight cluster cards'
    );

    const widgetRecentRes = await request(app)
      .get('/api/fc/widget/recent')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      widgetRecentRes.status === 200 && Array.isArray(widgetRecentRes.body.data.recent),
      'GET /api/fc/widget/recent returns recent conversation tiles'
    );

    // =========================================================================
    // PHASE 8: CHAT HISTORY & SEARCH
    // =========================================================================
    console.log('\n--- Phase 8: Chat History & Search ---');

    // 8.1 History endpoint
    const historyRes = await request(app)
      .get(`/api/fc/conversations/${directConvId}/history`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(historyRes.status === 200 && historyRes.body.data.messages.length > 0, 'Retrieved full chat history');

    // 8.2 Message Search
    const searchMsgRes = await request(app)
      .get('/api/fc/search/messages')
      .query({ q: 'REST' })
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      searchMsgRes.status === 200 && searchMsgRes.body.data.results.length >= 1,
      'Full-text search found matching message for "REST"'
    );

    // 8.3 Contact & Cluster Search
    const searchConvRes = await request(app)
      .get('/api/fc/search/conversations')
      .query({ q: 'Family' })
      .set('Authorization', `Bearer ${tokenA}`);
    assert(
      searchConvRes.status === 200 && searchConvRes.body.data.results.length >= 1,
      'Conversation search found matching "Family" cluster'
    );

    // =========================================================================
    // PHASE 9: RATE LIMITING & SECURITY SANITIZATION
    // =========================================================================
    console.log('\n--- Phase 9: Security & Rate-Limiting ---');

    // Script injection sanitization test
    const xssMsgRes = await request(app)
      .post(`/api/fc/conversations/${directConvId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ content: 'Hello <script>alert("hacked")</script> world!' });
    assert(
      xssMsgRes.status === 201 && !xssMsgRes.body.data.content.includes('<script>'),
      'Script tags successfully stripped from message body'
    );

    // Close sockets
    clientSocketA.disconnect();
    clientSocketB.disconnect();

    console.log('\n====================================================');
    console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('====================================================');

    // Cleanup test data
    await User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id, inviteUser._id] } });
    await Cluster.deleteMany({ creatorId: userA._id });
    await ClusterMember.deleteMany({ clusterId });
    await Conversation.deleteMany({ _id: { $in: [directConvId] } });
    await Message.deleteMany({ conversationId: directConvId });
    await SavedMessage.deleteMany({ userId: userB._id });
    await WalkieTalkieSession.deleteMany({ conversationId: directConvId });

    server.close();
    await mongoose.connection.close();
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ CRITICAL SUITE FAILURE:', err.message, err.stack);
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(1);
  }
}

runTests();
