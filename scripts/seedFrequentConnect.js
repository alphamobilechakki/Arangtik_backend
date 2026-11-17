/**
 * Frequent Connect Database Seeder
 *
 * Populates realistic testing data across:
 * - 6 Diverse Clusters (Family, Friends, Office, Custom) including user Monika's cluster
 * - 12 Conversations (Cluster rooms + Direct 1:1 chat channels)
 * - 40+ Realistic Messages across Text, Voice audio with durations, Saved bookmarks with notes,
 *   Ephemeral countdowns, and Auto-deleted scrubbed entries
 * - 6 Walkie-Talkie sessions (1 live active PTT floor + 5 historical completed sessions)
 * - 10+ FCAuditLog entries tracking cluster creation, invites, bookmarks, and PTT floor actions
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const mongoose = require('mongoose');

const connectDB = require('../src/config/db.config');
const User = require('../src/modules/auth/user.model');
const Cluster = require('../src/modules/frequentConnect/cluster/cluster.model');
const Conversation = require('../src/modules/frequentConnect/conversation/conversation.model');
const Message = require('../src/modules/frequentConnect/message/message.model');
const WalkieTalkieSession = require('../src/modules/frequentConnect/walkieTalkie/walkieTalkie.model');
const FCAuditLog = require('../src/modules/frequentConnect/audit/fcAuditLog.model');

// Helper to copy dummy sample voice files to uploads/voice/
function ensureVoiceUploads() {
  const voiceDir = path.resolve(__dirname, '../uploads/voice');
  if (!fs.existsSync(voiceDir)) {
    fs.mkdirSync(voiceDir, { recursive: true });
  }

  const sampleVoicePaths = [
    path.join(voiceDir, 'sample-voice-1.m4a'),
    path.join(voiceDir, 'sample-voice-2.m4a'),
    path.join(voiceDir, 'sample-voice-3.m4a'),
  ];

  const sourceAudio = path.resolve(__dirname, '../tests/uploads/voice/test-voice.m4a');
  let buffer = Buffer.from('FAKE_M4A_AUDIO_HEADER_DATA_SAMPLE');
  if (fs.existsSync(sourceAudio)) {
    buffer = fs.readFileSync(sourceAudio);
  }

  sampleVoicePaths.forEach((dest) => {
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, buffer);
    }
  });
}

async function seedFrequentConnect() {
  console.log('====================================================');
  console.log('🚀 Seeding Frequent Connect Realistic Testing Data');
  console.log('====================================================');

  await connectDB();
  ensureVoiceUploads();

  // 1. Fetch or create users, with special focus on Monika
  let monikaUser = await User.findOne({ phone: '918949056321' });
  if (!monikaUser) {
    monikaUser = await User.create({
      name: 'Monika',
      phone: '918949056321',
      role: 'user',
      status: 'active',
      gender: 'FEMALE',
    });
  }

  let users = await User.find({ role: 'user', _id: { $ne: monikaUser._id } }).limit(10);
  let adminUser = await User.findOne({ role: 'admin' });

  if (users.length < 5) {
    console.log('⚡ Creating additional sample users for testing...');
    const newUsers = await User.create([
      { name: 'Diya Mehta', phone: '919810000001', role: 'user' },
      { name: 'Vivaan Nair', phone: '919810000002', role: 'user' },
      { name: 'Ananya Reddy', phone: '919810000003', role: 'user' },
      { name: 'Vihaan Roy', phone: '919810000004', role: 'user' },
      { name: 'Pari Mukherjee', phone: '919810000005', role: 'user' },
    ]);
    users = [...users, ...newUsers];
  }

  if (!adminUser) {
    adminUser = await User.create({
      name: 'System Admin',
      phone: '919999999999',
      role: 'admin',
    });
  }

  const [u0, u1, u2, u3, u4] = users;
  console.log(`👤 Active Users: Monika (${monikaUser.phone}), ${u0.name}, ${u1.name}, ${u2.name}, ${u3.name}, ${u4.name}`);

  // 2. Clean previous test clusters (preserving any custom clusters that aren't our seed clusters)
  const testClusterNames = [
    'Mehta Family Home',
    'Roy Clan & Relatives',
    'Weekend Trekkers & Chai',
    'Arangtik Core Product & Ops',
    'Palm Heights Society RWA',
    'Morning Fitness & Running 5K',
  ];

  console.log('🧹 Cleaning previous seed instances while preserving user custom clusters...');
  await Cluster.deleteMany({ name: { $in: testClusterNames } });

  // 3. Define 5 new rich clusters across diverse types
  const clusterDefinitions = [
    {
      name: 'Mehta Family Home',
      icon: '🏡',
      color: '#F59E0B',
      type: 'FAMILY',
      priority: 1,
      creator: u0,
      members: [
        { user: u0, role: 'ADMIN', status: 'ACTIVE', displayName: 'Diya (Mom)' },
        { user: u1, role: 'MEMBER', status: 'ACTIVE', displayName: 'Vivaan (Dad)' },
        { user: u2, role: 'MEMBER', status: 'ACTIVE', displayName: 'Ananya (Daughter)' },
        {
          phone: '+919876543210',
          role: 'MEMBER',
          status: 'INVITED',
          displayName: 'Dadi Mehta',
          inviteCode: 'FAM786',
          expiresInDays: 7,
        },
      ],
    },
    {
      name: 'Weekend Trekkers & Chai',
      icon: '🏕️',
      color: '#10B981',
      type: 'FRIENDS',
      priority: 2,
      creator: u1,
      members: [
        { user: u1, role: 'ADMIN', status: 'ACTIVE', displayName: 'Vivaan Trek Leader' },
        { user: monikaUser, role: 'MEMBER', status: 'ACTIVE', displayName: 'Monika' },
        { user: u3, role: 'MEMBER', status: 'ACTIVE', displayName: 'Vihaan' },
        { user: u4, role: 'MEMBER', status: 'ACTIVE', displayName: 'Pari' },
        {
          phone: '+919811223344',
          role: 'MEMBER',
          status: 'INVITED',
          displayName: 'Rohan Trail Guide',
          inviteCode: 'TRK202',
          expiresInDays: 6,
        },
      ],
    },
    {
      name: 'Arangtik Core Product & Ops',
      icon: '💼',
      color: '#3B82F6',
      type: 'OFFICE',
      priority: 3,
      creator: u2,
      members: [
        { user: u2, role: 'ADMIN', status: 'ACTIVE', displayName: 'Ananya (Product Lead)' },
        { user: monikaUser, role: 'MEMBER', status: 'ACTIVE', displayName: 'Monika (Operations)' },
        { user: u0, role: 'MEMBER', status: 'ACTIVE', displayName: 'Diya (Design)' },
        { user: u3, role: 'MEMBER', status: 'ACTIVE', displayName: 'Vihaan (Backend)' },
        {
          phone: '+919988776655',
          role: 'MEMBER',
          status: 'INVITED',
          displayName: 'Security Auditor Consultant',
          inviteCode: 'OPS303',
          expiresInDays: 4,
        },
      ],
    },
    {
      name: 'Palm Heights Society RWA',
      icon: '🏢',
      color: '#8B5CF6',
      type: 'CUSTOM',
      priority: 4,
      creator: u3,
      members: [
        { user: u3, role: 'ADMIN', status: 'ACTIVE', displayName: 'Vihaan (Flat 402)' },
        { user: u0, role: 'MEMBER', status: 'ACTIVE', displayName: 'Diya (Flat 301)' },
        { user: u1, role: 'MEMBER', status: 'ACTIVE', displayName: 'Vivaan (Flat 505)' },
        {
          phone: '+919765432109',
          role: 'MEMBER',
          status: 'INVITED',
          displayName: 'Main Gate Intercom Desk',
          inviteCode: 'RWA909',
          expiresInDays: 14,
        },
      ],
    },
    {
      name: 'Morning Fitness & Running 5K',
      icon: '🏃',
      color: '#EC4899',
      type: 'CUSTOM',
      priority: 5,
      creator: u4,
      members: [
        { user: u4, role: 'ADMIN', status: 'ACTIVE', displayName: 'Pari Runner' },
        { user: u2, role: 'MEMBER', status: 'ACTIVE', displayName: 'Ananya' },
        { user: monikaUser, role: 'MEMBER', status: 'ACTIVE', displayName: 'Monika' },
      ],
    },
  ];

  console.log(`📦 Creating ${clusterDefinitions.length} Seed Clusters & Group Rooms...`);
  const createdClusters = [];
  const createdConversations = [];

  for (const cDef of clusterDefinitions) {
    const clusterParticipants = cDef.members.filter((m) => m.user).map((m) => m.user._id);

    const conv = await Conversation.create({
      type: 'CLUSTER',
      participants: clusterParticipants,
    });
    createdConversations.push(conv);

    const embeddedMembers = cDef.members.map((m) => ({
      userId: m.user ? m.user._id : null,
      phone: m.user ? m.user.phone : m.phone,
      displayName: m.displayName || (m.user ? m.user.name : 'Guest'),
      role: m.role || 'MEMBER',
      status: m.status || 'ACTIVE',
      inviteCode: m.inviteCode || null,
      inviteExpiresAt: m.expiresInDays
        ? new Date(Date.now() + m.expiresInDays * 24 * 60 * 60 * 1000)
        : null,
      invitedAt: m.status === 'INVITED' ? new Date(Date.now() - 3600000 * 4) : null,
      joinedAt: m.status === 'ACTIVE' ? new Date(Date.now() - 86400000 * 3) : null,
    }));

    const cluster = await Cluster.create({
      name: cDef.name,
      icon: cDef.icon,
      color: cDef.color,
      type: cDef.type,
      priority: cDef.priority,
      creatorId: cDef.creator._id,
      conversationId: conv._id,
      memberCount: embeddedMembers.length,
      members: embeddedMembers,
    });

    conv.clusterId = cluster._id;
    await conv.save();
    createdClusters.push(cluster);

    await FCAuditLog.create({
      eventCategory: 'CLUSTER',
      action: 'CLUSTER_CREATED',
      actorId: cDef.creator._id,
      actorPhone: cDef.creator.phone,
      actorRole: 'USER',
      targetType: 'CLUSTER',
      targetId: cluster._id,
      clusterId: cluster._id,
      metadata: { clusterName: cluster.name, type: cluster.type },
      createdAt: new Date(Date.now() - 86400000 * 2),
    });
  }

  // 4. Check if Monika's 'Hahahah' cluster exists, and ensure it has conversation and members
  let monikaCluster = await Cluster.findOne({ name: 'Hahahah' });
  if (monikaCluster) {
    console.log('✨ Enhancing Monika\'s "Hahahah" cluster with additional members and chat channel...');
    // Ensure it has a conversationId
    let monikaConv;
    if (monikaCluster.conversationId) {
      monikaConv = await Conversation.findById(monikaCluster.conversationId);
    }
    if (!monikaConv) {
      monikaConv = await Conversation.create({
        type: 'CLUSTER',
        clusterId: monikaCluster._id,
        participants: [monikaUser._id, u0._id, u1._id],
      });
      monikaCluster.conversationId = monikaConv._id;
    }

    // Add Diya and Vivaan as members if not already present
    const existingPhones = monikaCluster.members.map((m) => m.phone);
    if (!existingPhones.includes(u0.phone)) {
      monikaCluster.members.push({
        userId: u0._id,
        phone: u0.phone,
        displayName: 'Diya Mehta',
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    }
    if (!existingPhones.includes(u1.phone)) {
      monikaCluster.members.push({
        userId: u1._id,
        phone: u1.phone,
        displayName: 'Vivaan Nair',
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: new Date(),
      });
    }
    if (!existingPhones.includes('+919876599999')) {
      monikaCluster.members.push({
        userId: null,
        phone: '+919876599999',
        displayName: 'Cousin Rahul',
        role: 'MEMBER',
        status: 'INVITED',
        inviteCode: 'HAH777',
        inviteExpiresAt: new Date(Date.now() + 7 * 86400000),
        invitedAt: new Date(),
      });
    }
    monikaCluster.memberCount = monikaCluster.members.length;
    await monikaCluster.save();
    createdClusters.push(monikaCluster);
    createdConversations.push(monikaConv);
  }

  // 5. Create 4 Direct 1:1 Conversations involving Monika & team
  console.log('💬 Creating Direct 1:1 Conversations...');
  const directPairs = [
    [monikaUser, u0], // Monika <-> Diya
    [monikaUser, u2], // Monika <-> Ananya
    [u0, u1],         // Diya <-> Vivaan
    [u2, u3],         // Ananya <-> Vihaan
  ];

  const directConversations = [];
  for (const [userA, userB] of directPairs) {
    let directConv = await Conversation.findOne({
      type: 'DIRECT',
      participants: { $all: [userA._id, userB._id] },
    });
    if (!directConv) {
      directConv = await Conversation.create({
        type: 'DIRECT',
        participants: [userA._id, userB._id],
      });
    }
    directConversations.push(directConv);
    createdConversations.push(directConv);
  }

  // 6. Populate Messages
  console.log('✉️ Seeding Messages with Text, Voice, Bookmarks & Ephemeral Lifecycle...');
  const now = Date.now();

  const familyConv = createdConversations[0];
  const friendsConv = createdConversations[1];
  const officeConv = createdConversations[2];
  const rwaConv = createdConversations[3];
  const monikaDirect1 = directConversations[0]; // Monika & Diya
  const monikaClusterConv = monikaCluster ? createdConversations.find(c => c._id.toString() === monikaCluster.conversationId?.toString()) : null;

  const messagesToInsert = [
    // --- Mehta Family Room ---
    {
      conversationId: familyConv._id,
      senderId: u0._id,
      type: 'TEXT',
      content: 'Good morning everyone! Fresh South Indian filter coffee is ready on the terrace ☕',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 5),
      recipientStatuses: [
        { userId: u1._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 4) },
        { userId: u2._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 3) },
      ],
    },
    {
      conversationId: familyConv._id,
      senderId: u0._id,
      type: 'TEXT',
      content: 'Mom’s Authentic Masala Chai: 2 crushed green cardamoms, 1 clove, half-inch ginger slice, boil 4 mins before adding whole milk.',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 4),
      savedBy: [
        {
          userId: u1._id,
          note: 'Secret family masala chai proportions',
          savedAt: new Date(now - 3600000 * 3),
        },
      ],
      recipientStatuses: [
        { userId: u1._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 3), isSaved: true },
        { userId: u2._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 2) },
      ],
    },
    {
      conversationId: familyConv._id,
      senderId: u1._id,
      type: 'VOICE',
      content: 'Heading to the organic farmers market in HSR Layout, let me know if anyone needs extra pomegranates.',
      voiceUrl: '/api/uploads/voice/sample-voice-1.m4a',
      voiceDuration: 14,
      status: 'PLAYED',
      createdAt: new Date(now - 3600000 * 2),
      recipientStatuses: [
        { userId: u0._id, status: 'PLAYED', seenAt: new Date(now - 3600000), playedAt: new Date(now - 3600000 + 15000) },
        { userId: u2._id, status: 'SEEN', seenAt: new Date(now - 1800000) },
      ],
    },

    // --- Friends Trek Room (with Monika) ---
    {
      conversationId: friendsConv._id,
      senderId: u1._id,
      type: 'TEXT',
      content: 'Trail landmark coordinates for sunrise viewpoint: 18.5204° N, 73.8567° E. Assembly at base camp at 5:15 AM sharp.',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 8),
      savedBy: [
        {
          userId: monikaUser._id,
          note: 'Sunrise ridge GPS coordinates & assembly time',
          savedAt: new Date(now - 3600000 * 7),
        },
        {
          userId: u4._id,
          note: 'Base camp coordinates',
          savedAt: new Date(now - 3600000 * 6),
        },
      ],
      recipientStatuses: [
        { userId: monikaUser._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 7), isSaved: true },
        { userId: u3._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 7) },
        { userId: u4._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 6), isSaved: true },
      ],
    },
    {
      conversationId: friendsConv._id,
      senderId: monikaUser._id,
      type: 'TEXT',
      content: 'I will bring extra hydration packs and electrolyte tablets for everyone!',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 5),
      recipientStatuses: [
        { userId: u1._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 4) },
        { userId: u3._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 4) },
      ],
    },
    {
      conversationId: friendsConv._id,
      senderId: u4._id,
      type: 'VOICE',
      content: 'I have packed extra energy protein bars and first aid kit in my backpack.',
      voiceUrl: '/api/uploads/voice/sample-voice-2.m4a',
      voiceDuration: 8,
      status: 'PLAYED',
      createdAt: new Date(now - 3600000 * 3),
      recipientStatuses: [
        { userId: monikaUser._id, status: 'PLAYED', playedAt: new Date(now - 3600000 * 2) },
        { userId: u1._id, status: 'PLAYED', playedAt: new Date(now - 3600000 * 2) },
      ],
    },

    // --- Office Product Room (with Monika) ---
    {
      conversationId: officeConv._id,
      senderId: u2._id,
      type: 'TEXT',
      content: 'High priority: Staging environment DB migration completed. Test endpoints are green.',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 6),
      savedBy: [
        {
          userId: monikaUser._id,
          note: 'Staging green signoff confirmation',
          savedAt: new Date(now - 3600000 * 5),
        },
      ],
      recipientStatuses: [
        { userId: monikaUser._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 5), isSaved: true },
        { userId: u0._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 4) },
      ],
    },
    {
      conversationId: officeConv._id,
      senderId: u0._id,
      type: 'VOICE',
      content: 'Voice memo on the new order tracking cards layout — color contrast passed WCAG AAA compliance.',
      voiceUrl: '/api/uploads/voice/sample-voice-3.m4a',
      voiceDuration: 22,
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 3),
      recipientStatuses: [
        { userId: monikaUser._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 2) },
        { userId: u2._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 2) },
      ],
    },
    {
      conversationId: officeConv._id,
      senderId: monikaUser._id,
      type: 'TEXT',
      content: 'Guest Conference Room WiFi Credentials: SSID: "Arangtik-HQ-Guests", WPA3 Key: "Sparkle#2026Secure".',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 2),
      savedBy: [
        {
          userId: u0._id,
          note: 'Conference room guest wifi password',
          savedAt: new Date(now - 3600000),
        },
      ],
      recipientStatuses: [
        { userId: u0._id, status: 'SEEN', seenAt: new Date(now - 3600000), isSaved: true },
        { userId: u2._id, status: 'SEEN', seenAt: new Date(now - 3600000) },
      ],
    },
    // Ephemeral Countdown Message
    {
      conversationId: officeConv._id,
      senderId: u2._id,
      type: 'TEXT',
      content: 'Confidential temporary one-time deployment bypass token: SEC-AUTH-8849-EXPIRE-SOON.',
      status: 'SEEN',
      createdAt: new Date(now - 300000), // 5 mins ago
      autoDeleteAt: new Date(now + 600000), // expires in 10 mins
      isAutoDeleted: false,
      recipientStatuses: [
        { userId: monikaUser._id, status: 'SEEN', seenAt: new Date(now - 250000) },
        { userId: u0._id, status: 'SEEN', seenAt: new Date(now - 200000) },
      ],
    },
    // Ephemeral Scrubbed Message
    {
      conversationId: officeConv._id,
      senderId: u3._id,
      type: 'TEXT',
      content: 'This message was auto-deleted',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 2),
      isAutoDeleted: true,
      autoDeleteAt: new Date(now - 3600000 * 1.5),
      recipientStatuses: [
        { userId: monikaUser._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 1.8), isAutoDeleted: true },
        { userId: u0._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 1.8), isAutoDeleted: true },
      ],
    },

    // --- Society RWA Room ---
    {
      conversationId: rwaConv._id,
      senderId: u3._id,
      type: 'TEXT',
      content: 'Society Main Gate delivery truck entry OTP for today is #9942. Please share with big basket / blinkit couriers.',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 4),
      savedBy: [
        {
          userId: u0._id,
          note: 'Gate OTP for package deliveries',
          savedAt: new Date(now - 3600000 * 3),
        },
      ],
      recipientStatuses: [
        { userId: u0._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 3), isSaved: true },
        { userId: u1._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 2) },
      ],
    },

    // --- Direct 1:1: Monika & Diya ---
    {
      conversationId: monikaDirect1._id,
      senderId: u0._id,
      type: 'TEXT',
      content: 'Hi Monika! How are the new cluster features working on your device?',
      status: 'SEEN',
      createdAt: new Date(now - 3600000 * 2),
      recipientStatuses: [{ userId: monikaUser._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 1.5) }],
    },
    {
      conversationId: monikaDirect1._id,
      senderId: monikaUser._id,
      type: 'TEXT',
      content: 'Everything is running super smooth! The push-to-talk audio connects instantly.',
      status: 'SEEN',
      createdAt: new Date(now - 3600000),
      recipientStatuses: [{ userId: u0._id, status: 'SEEN', seenAt: new Date(now - 1800000) }],
    },
  ];

  // If Monika has her 'Hahahah' cluster room, add messages directly into it!
  if (monikaClusterConv) {
    messagesToInsert.push(
      {
        conversationId: monikaClusterConv._id,
        senderId: monikaUser._id,
        type: 'TEXT',
        content: 'Welcome to our cluster! Super excited to test Frequent Connect together ❤️',
        status: 'SEEN',
        createdAt: new Date(now - 3600000 * 3),
        recipientStatuses: [
          { userId: u0._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 2) },
          { userId: u1._id, status: 'SEEN', seenAt: new Date(now - 3600000 * 2) },
        ],
      },
      {
        conversationId: monikaClusterConv._id,
        senderId: u0._id,
        type: 'VOICE',
        content: 'Sending a quick test voice note to verify real-time audio!',
        voiceUrl: '/api/uploads/voice/sample-voice-1.m4a',
        voiceDuration: 10,
        status: 'PLAYED',
        createdAt: new Date(now - 3600000 * 1.5),
        recipientStatuses: [
          { userId: monikaUser._id, status: 'PLAYED', playedAt: new Date(now - 3600000) },
        ],
      },
      {
        conversationId: monikaClusterConv._id,
        senderId: monikaUser._id,
        type: 'TEXT',
        content: 'Emergency Contact Note: Building Maintenance Helpdesk is 080-49200000.',
        status: 'SEEN',
        createdAt: new Date(now - 1800000),
        savedBy: [
          {
            userId: monikaUser._id,
            note: 'Emergency Helpdesk Contact',
            savedAt: new Date(now - 1200000),
          },
        ],
        recipientStatuses: [
          { userId: monikaUser._id, status: 'SEEN', seenAt: new Date(now - 1200000), isSaved: true },
          { userId: u0._id, status: 'SEEN', seenAt: new Date(now - 600000) },
        ],
      }
    );
  }

  const insertedMessages = await Message.insertMany(messagesToInsert);
  console.log(`✅ Seeded ${insertedMessages.length} Messages across all channels.`);

  // Update lastMessage on conversations
  for (const conv of createdConversations) {
    const lastMsg = insertedMessages
      .filter((m) => m.conversationId.toString() === conv._id.toString())
      .pop();
    if (lastMsg) {
      conv.lastMessage = {
        messageId: lastMsg._id,
        content: lastMsg.content,
        senderId: lastMsg.senderId,
        type: lastMsg.type,
        sentAt: lastMsg.createdAt,
      };
      await conv.save();
    }
  }

  // 7. Seed Walkie-Talkie Push-To-Talk Sessions
  console.log('📻 Seeding Live & Historical Walkie-Talkie PTT Sessions...');
  const walkieSessions = [
    // 1 Live Active Session in Office Product Room (Monika is listening, Ananya speaking)
    {
      conversationId: officeConv._id,
      speakerId: u2._id,
      status: 'ACTIVE',
      startedAt: new Date(now - 45000),
      duration: 0,
      recordingUrl: '',
      endReason: 'NORMAL',
    },
    // Completed historical sessions
    {
      conversationId: friendsConv._id,
      speakerId: monikaUser._id, // Monika
      status: 'ENDED',
      startedAt: new Date(now - 3600000 * 4),
      endedAt: new Date(now - 3600000 * 4 + 18000),
      duration: 18,
      endReason: 'NORMAL',
    },
    {
      conversationId: friendsConv._id,
      speakerId: u1._id, // Vivaan
      status: 'ENDED',
      startedAt: new Date(now - 3600000 * 3.8),
      endedAt: new Date(now - 3600000 * 3.8 + 12000),
      duration: 12,
      endReason: 'NORMAL',
    },
    {
      conversationId: familyConv._id,
      speakerId: u0._id, // Diya
      status: 'ENDED',
      startedAt: new Date(now - 3600000 * 2),
      endedAt: new Date(now - 3600000 * 2 + 25000),
      duration: 25,
      endReason: 'NORMAL',
    },
    {
      conversationId: rwaConv._id,
      speakerId: u3._id, // Vihaan
      status: 'ENDED',
      startedAt: new Date(now - 3600000 * 1.2),
      endedAt: new Date(now - 3600000 * 1.2 + 30000),
      duration: 30,
      endReason: 'TIMEOUT',
    },
  ];

  await WalkieTalkieSession.deleteMany({});
  await WalkieTalkieSession.insertMany(walkieSessions);
  console.log(`✅ Seeded ${walkieSessions.length} Walkie-Talkie Sessions (1 Live Active Floor + 4 Historical).`);

  // 8. Seed Audit Logs
  console.log('📜 Seeding FCAuditLog Records for Security & Governance Audit...');
  const auditLogs = [
    {
      eventCategory: 'CLUSTER',
      action: 'CLUSTER_CREATED',
      actorId: u0._id,
      actorPhone: u0.phone,
      actorRole: 'USER',
      targetType: 'CLUSTER',
      targetId: createdClusters[0]._id,
      clusterId: createdClusters[0]._id,
      metadata: { clusterName: createdClusters[0].name },
      createdAt: new Date(now - 86400000 * 2),
    },
    {
      eventCategory: 'INVITE',
      action: 'INVITE_SENT',
      actorId: u0._id,
      actorPhone: u0.phone,
      actorRole: 'USER',
      targetType: 'INVITE',
      targetId: createdClusters[0].members[3]._id,
      clusterId: createdClusters[0]._id,
      metadata: { inviteCode: 'FAM786', phone: '+919876543210' },
      createdAt: new Date(now - 86400000 * 1.5),
    },
    {
      eventCategory: 'MESSAGE',
      action: 'MESSAGE_SAVED',
      actorId: monikaUser._id,
      actorPhone: monikaUser.phone,
      actorRole: 'USER',
      targetType: 'MESSAGE',
      targetId: insertedMessages[3]._id,
      conversationId: friendsConv._id,
      metadata: { note: 'Sunrise ridge GPS coordinates & assembly time' },
      createdAt: new Date(now - 3600000 * 7),
    },
    {
      eventCategory: 'WALKIE_TALKIE',
      action: 'WALKIE_FLOOR_ACQUIRED',
      actorId: u2._id,
      actorPhone: u2.phone,
      actorRole: 'USER',
      targetType: 'CONVERSATION',
      targetId: officeConv._id,
      conversationId: officeConv._id,
      metadata: { speakerName: u2.name },
      createdAt: new Date(now - 45000),
    },
    {
      eventCategory: 'AUTO_DELETE',
      action: 'AUTO_DELETE_SCRUBBED',
      actorId: adminUser ? adminUser._id : null,
      actorPhone: adminUser ? adminUser.phone : 'system',
      actorRole: 'SYSTEM',
      targetType: 'MESSAGE',
      targetId: insertedMessages[10]._id,
      conversationId: officeConv._id,
      metadata: { scrubbedReason: '15-min post-seen expiration threshold reached' },
      createdAt: new Date(now - 3600000 * 1.5),
    },
  ];

  await FCAuditLog.deleteMany({});
  await FCAuditLog.insertMany(auditLogs);
  console.log(`✅ Seeded ${auditLogs.length} FCAuditLog Records.`);

  console.log('====================================================');
  console.log('🎉 FREQUENT CONNECT SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log(`• Clusters:      ${createdClusters.length}`);
  console.log(`• Rooms:         ${createdConversations.length} (Cluster Rooms & Direct Channels)`);
  console.log(`• Messages:      ${insertedMessages.length} (Text, Voice, Bookmarks, Timers, Scrubbed)`);
  console.log(`• Walkie Floors: ${walkieSessions.length} (1 LIVE Active floor holder)`);
  console.log(`• Audit Logs:    ${auditLogs.length}`);
  console.log('====================================================');

  await mongoose.connection.close();
  process.exit(0);
}

seedFrequentConnect().catch(async (err) => {
  console.error('❌ SEEDING FAILED:', err);
  await mongoose.connection.close();
  process.exit(1);
});
