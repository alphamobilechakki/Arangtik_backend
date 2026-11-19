/**
 * Comprehensive HTTP API Integration Tests for Cluster-Level Collaborative Features:
 * - Admin Cluster Features APIs
 * - Frequent Connect Cluster Features & Shared Wardrobe Hub APIs
 * - Shared Wardrobe & Items Discovery APIs
 * - Attributed Collaborative Outfit Styling APIs
 * - Multi-Owner Laundry Work Order APIs
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const connectDB = require('../src/config/db.config');
const app = require('../src/app');
const { JWT_SECRET, MONGODB_URI } = require('../src/config/env.config');

const User = require('../src/modules/auth/user.model');
const ClusterFeature = require('../src/modules/admin/clusterFeature/clusterFeature.model');
const Cluster = require('../src/modules/frequentConnect/cluster/cluster.model');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
const Outfit = require('../src/modules/outfit/outfit.model');
const Order = require('../src/modules/order/order.model');
const StoreType = require('../src/modules/admin/storeType/storeType.model');
const FCAuditLog = require('../src/modules/frequentConnect/audit/fcAuditLog.model');
const Message = require('../src/modules/frequentConnect/message/message.model');

const generateToken = (user, extra = {}) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      phone: user.phone,
      role: user.role || 'user',
      ...extra,
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passed++;
  console.log(`✔ PASSED: ${message}`);
}

async function runApiTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING HTTP API INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to Database successfully.\n');

  const cleanup = {
    users: [],
    clusters: [],
    wardrobes: [],
    items: [],
    outfits: [],
    orders: [],
  };

  try {
    // ---------------------------------------------------------
    // 0. Test Users & Authentication Setup
    // ---------------------------------------------------------
    console.log('--- Setting up Test Users ---');
    const timestamp = Date.now().toString().slice(-6);

    const adminUser = await User.create({
      name: 'Admin Test User',
      phone: `919111${timestamp}`,
      email: `admin_${timestamp}@test.com`,
      role: 'admin',
    });
    cleanup.users.push(adminUser._id);
    const adminToken = generateToken(adminUser, { isAdmin: true });

    const userA = await User.create({
      name: 'Priya Sharma (Actor)',
      phone: `919222${timestamp}`,
      email: `priya_${timestamp}@test.com`,
      role: 'user',
    });
    cleanup.users.push(userA._id);
    const tokenA = generateToken(userA);

    const userB = await User.create({
      name: 'Rahul Sharma (Member)',
      phone: `919333${timestamp}`,
      email: `rahul_${timestamp}@test.com`,
      role: 'user',
    });
    cleanup.users.push(userB._id);
    const tokenB = generateToken(userB);

    const userC = await User.create({
      name: 'Stranger (Non-Member)',
      phone: `919444${timestamp}`,
      email: `stranger_${timestamp}@test.com`,
      role: 'user',
    });
    cleanup.users.push(userC._id);
    const tokenC = generateToken(userC);

    console.log('Users created with authenticated JWT tokens.\n');

    // ---------------------------------------------------------
    // 1. Cluster Features Catalog & Admin APIs
    // ---------------------------------------------------------
    console.log('--- 1. Testing Cluster Features APIs ---');

    // 1.1 POST /api/admin/cluster-features/seed
    const seedRes = await request(app)
      .post('/api/admin/cluster-features/seed')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(seedRes.status === 200, 'POST /api/admin/cluster-features/seed returns 200');
    assert(Array.isArray(seedRes.body.data) && seedRes.body.data.length >= 3, 'Seed returns default features array');

    // 1.2 GET /api/fc/features (Client Catalog)
    const featuresRes = await request(app)
      .get('/api/fc/features')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(featuresRes.status === 200, 'GET /api/fc/features returns 200');
    assert(Array.isArray(featuresRes.body.data), 'Features catalog is an array');

    const wardrobeFeature = featuresRes.body.data.find((f) => f.code === 'WARDROBE');
    const laundryFeature = featuresRes.body.data.find((f) => f.code === 'LAUNDRY');
    assert(!!wardrobeFeature, 'Feature catalog contains WARDROBE');
    assert(!!laundryFeature, 'Feature catalog contains LAUNDRY');

    // ---------------------------------------------------------
    // 2. Cluster Creation & Feature Management APIs
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Cluster Management APIs ---');

    // 2.1 POST /api/fc/clusters (Create with features)
    const createClusterRes = await request(app)
      .post('/api/fc/clusters')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Sharma Family Hub',
        features: [wardrobeFeature._id, laundryFeature._id],
        members: [
          {
            phone: userB.phone,
            name: userB.name,
            role: 'MEMBER',
          },
        ],
        color: '#6366F1',
      });
    assert(createClusterRes.status === 201, 'POST /api/fc/clusters returns 201 Created');
    const cluster = createClusterRes.body.data;
    cleanup.clusters.push(cluster._id || cluster.id);
    assert(cluster.name === 'Sharma Family Hub', 'Cluster created with correct name');
    assert(cluster.features.length >= 2, 'Cluster populated with selected features');

    const clusterId = (cluster._id || cluster.id).toString();

    // 2.2 GET /api/fc/clusters/:id
    const getClusterRes = await request(app)
      .get(`/api/fc/clusters/${clusterId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(getClusterRes.status === 200, 'GET /api/fc/clusters/:id returns 200');
    assert(getClusterRes.body.data.features.some((f) => f.code === 'WARDROBE'), 'Cluster details populate WARDROBE feature');

    // 2.3 PATCH /api/fc/clusters/:id/features (Toggle feature)
    const patchFeatureRes = await request(app)
      .patch(`/api/fc/clusters/${clusterId}/features`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        featureId: wardrobeFeature._id,
        action: 'toggle',
      });
    assert(patchFeatureRes.status === 200, 'PATCH /api/fc/clusters/:id/features (toggle) returns 200');

    // Toggle WARDROBE back on so subsequent wardrobe tests run
    await request(app)
      .patch(`/api/fc/clusters/${clusterId}/features`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        featureId: wardrobeFeature._id,
        action: 'add',
      });

    // ---------------------------------------------------------
    // 3. Cluster Wardrobe Discovery & Shared Access APIs
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing Cluster Wardrobe Sharing APIs ---');

    // Setup Wardrobe & Items for User B (Rahul)
    let storeTypeDoc = await StoreType.findOne({ code: 'WARDROBE' });
    if (!storeTypeDoc) {
      storeTypeDoc = await StoreType.create({
        name: 'Wardrobe',
        code: 'WARDROBE',
        isActive: true,
      });
      cleanup.storeTypes = [storeTypeDoc._id];
    }

    const rahulWardrobe = await Wardrobe.create({
      userId: userB._id,
      name: "Rahul's Formal Closets",
      storeTypeId: storeTypeDoc?._id || new mongoose.Types.ObjectId(),
      type: 'PERSONAL',
      isDefault: true,
      isActive: true,
    });
    cleanup.wardrobes.push(rahulWardrobe._id);

    const rahulJacket = await WardrobeItem.create({
      userId: userB._id,
      wardrobeId: rahulWardrobe._id,
      name: 'Rahul Navy Blazer',
      category: 'Blazers',
      subCategory: 'Formal',
      color: 'Navy Blue',
      status: 'ACTIVE',
    });
    cleanup.items.push(rahulJacket._id);

    const rahulTrouser = await WardrobeItem.create({
      userId: userB._id,
      wardrobeId: rahulWardrobe._id,
      name: 'Rahul Grey Trousers',
      category: 'Pants',
      subCategory: 'Trousers',
      color: 'Grey',
      status: 'ACTIVE',
    });
    cleanup.items.push(rahulTrouser._id);

    // 3.1 GET /api/fc/clusters/:id/wardrobes (Cluster Overview Hub)
    const clusterWardrobesRes = await request(app)
      .get(`/api/fc/clusters/${clusterId}/wardrobes`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(clusterWardrobesRes.status === 200, 'GET /api/fc/clusters/:id/wardrobes returns 200');
    assert(clusterWardrobesRes.body.data.featureEnabled === true, 'Hub reports featureEnabled=true');
    assert(Array.isArray(clusterWardrobesRes.body.data.members), 'Hub returns members array');

    // Non-member access test (User C)
    const strangerWardrobesRes = await request(app)
      .get(`/api/fc/clusters/${clusterId}/wardrobes`)
      .set('Authorization', `Bearer ${tokenC}`);
    assert(strangerWardrobesRes.status === 403, 'GET /api/fc/clusters/:id/wardrobes rejects non-member with 403');

    // 3.2 GET /api/wardrobe/get-wardrobes?clusterId=:clusterId
    const getSharedWardrobesRes = await request(app)
      .get(`/api/wardrobe/get-wardrobes?clusterId=${clusterId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(getSharedWardrobesRes.status === 200, 'GET /api/wardrobe/get-wardrobes?clusterId returns 200');
    assert(
      getSharedWardrobesRes.body.data.some((w) => w._id.toString() === rahulWardrobe._id.toString()),
      'Discovers Rahul wardrobe through cluster query'
    );

    // 3.3 GET /api/wardrobe/get-wardrobe/:id
    const getRahulWardrobeRes = await request(app)
      .get(`/api/wardrobe/get-wardrobe/${rahulWardrobe._id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(getRahulWardrobeRes.status === 200, 'GET /api/wardrobe/get-wardrobe/:id allows cross-member access');
    assert(getRahulWardrobeRes.body.data.name === "Rahul's Formal Closets", 'Returns correct wardrobe container data');

    // 3.4 GET /api/wardrobe/get-items?clusterId=:clusterId
    const getSharedItemsRes = await request(app)
      .get(`/api/wardrobe/get-items?clusterId=${clusterId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(getSharedItemsRes.status === 200, 'GET /api/wardrobe/get-items?clusterId returns 200');
    assert(getSharedItemsRes.body.data.items.length >= 2, 'Returns items across cluster members');

    // 3.5 GET /api/wardrobe/get-item/:id (Single Item Fetch)
    const getSingleItemRes = await request(app)
      .get(`/api/wardrobe/get-item/${rahulJacket._id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(getSingleItemRes.status === 200, 'GET /api/wardrobe/get-item/:id allows cross-member access');

    // 3.6 PATCH /api/wardrobe/edit-item/:id (Cross-Member Update)
    const editItemRes = await request(app)
      .patch(`/api/wardrobe/edit-item/${rahulJacket._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Rahul Navy Blazer (Styled Edition)',
      });
    assert(editItemRes.status === 200, 'PATCH /api/wardrobe/edit-item/:id returns 200');
    assert(editItemRes.body.data.lastModifiedBy.toString() === userA._id.toString(), 'lastModifiedBy set to User A');

    // 3.7 DELETE /api/wardrobe/delete-item/:id (Negative Test: Foreign member cannot delete item)
    const deleteItemRes = await request(app)
      .delete(`/api/wardrobe/delete-item/${rahulJacket._id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(deleteItemRes.status === 404, 'DELETE /api/wardrobe/delete-item/:id rejects non-owner with 404 (Security safeguard)');

    // ---------------------------------------------------------
    // 4. Collaborative Outfit Styling & Attribution APIs
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Collaborative Outfit Styling APIs ---');

    // 4.1 POST /api/outfit/save (User A styles for User B)
    const saveOutfitRes = await request(app)
      .post('/api/outfit/save')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        targetUserId: userB._id.toString(),
        clusterId: clusterId,
        title: 'Executive Meeting Look for Rahul 👔',
        occasion: 'OFFICE',
        season: 'ALL_SEASON',
        stylingNotes: 'Pair with formal oxfords',
        items: [
          {
            itemId: rahulJacket._id,
            slot: 'UPPER_WEAR',
            name: 'Rahul Navy Blazer',
          },
          {
            itemId: rahulTrouser._id,
            slot: 'LOWER_WEAR',
            name: 'Rahul Grey Trousers',
          },
        ],
      });
    assert(saveOutfitRes.status === 201, 'POST /api/outfit/save (Collaborative) returns 201 Created');
    const styledOutfit = saveOutfitRes.body.data;
    cleanup.outfits.push(styledOutfit._id || styledOutfit.id);

    assert(styledOutfit.status === 'SUGGESTED', 'Collaborative outfit marked with status=SUGGESTED');
    assert(styledOutfit.createdBy.toString() === userA._id.toString(), 'createdBy set to User A (Stylist)');
    assert(styledOutfit.targetUserId.toString() === userB._id.toString(), 'targetUserId set to User B (Recipient)');
    assert(styledOutfit.items[0].ownerName === userB.name, 'Item slot attributes ownerName to Rahul');

    const outfitId = styledOutfit._id || styledOutfit.id;

    // 4.2 GET /api/outfit/saved?scope=styled_for_me (User B perspective)
    const styledForMeRes = await request(app)
      .get('/api/outfit/saved?scope=styled_for_me')
      .set('Authorization', `Bearer ${tokenB}`);
    assert(styledForMeRes.status === 200, 'GET /api/outfit/saved?scope=styled_for_me returns 200');
    assert(styledForMeRes.body.data.some((o) => o._id.toString() === outfitId.toString()), 'User B finds outfit styled for them');

    // 4.3 GET /api/outfit/saved?scope=styled_by_me (User A perspective)
    const styledByMeRes = await request(app)
      .get('/api/outfit/saved?scope=styled_by_me')
      .set('Authorization', `Bearer ${tokenA}`);
    assert(styledByMeRes.status === 200, 'GET /api/outfit/saved?scope=styled_by_me returns 200');
    assert(styledByMeRes.body.data.some((o) => o._id.toString() === outfitId.toString()), 'User A finds outfit styled by them');

    // 4.4 GET /api/outfit/saved?scope=cluster&clusterId=:id
    const clusterOutfitsRes = await request(app)
      .get(`/api/outfit/saved?scope=cluster&clusterId=${clusterId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(clusterOutfitsRes.status === 200, 'GET /api/outfit/saved?scope=cluster returns 200');
    assert(clusterOutfitsRes.body.data.length >= 1, 'Cluster outfits list returned');

    // 4.5 PATCH /api/outfit/saved/:id/status (User B marks look WORN)
    const statusUpdateRes = await request(app)
      .patch(`/api/outfit/saved/${outfitId}/status`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'WORN' });
    assert(statusUpdateRes.status === 200, 'PATCH /api/outfit/saved/:id/status returns 200');
    assert(statusUpdateRes.body.data.status === 'WORN', 'Outfit status updated to WORN');
    assert(statusUpdateRes.body.data.wearCount >= 1, 'Outfit wearCount incremented');

    const freshJacket = await WardrobeItem.findById(rahulJacket._id);
    assert(freshJacket.wearCount >= 1, 'Constituent garment wearCount automatically incremented');

    // 4.6 DELETE /api/outfit/saved/:id
    const deleteOutfitRes = await request(app)
      .delete(`/api/outfit/saved/${outfitId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert(deleteOutfitRes.status === 200, 'DELETE /api/outfit/saved/:id returns 200');

    // ---------------------------------------------------------
    // 5. Multi-Owner Laundry Pipeline APIs
    // ---------------------------------------------------------
    console.log('\n--- 5. Testing Multi-Owner Laundry Pipeline APIs ---');

    // Setup an item for Priya (User A)
    const priyaKurta = await WardrobeItem.create({
      userId: userA._id,
      name: 'Priya Cotton Kurta',
      category: 'Kurtas',
      subCategory: 'Casual',
      color: 'Yellow',
      status: 'ACTIVE',
    });
    cleanup.items.push(priyaKurta._id);

    // 5.1 POST /api/laundry/orders (User A dispatches order with Priya's Kurta + Rahul's Trouser)
    const createOrderRes = await request(app)
      .post('/api/laundry/orders')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        vendorPhone: '9876543210',
        vendorName: 'Speedy Clean Laundromat',
        pickupDate: new Date().toISOString(),
        expectedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        clusterId: clusterId,
        items: [
          {
            wardrobeItemId: priyaKurta._id.toString(),
            serviceName: 'WASH_AND_IRON',
            price: 120,
          },
          {
            wardrobeItemId: rahulTrouser._id.toString(),
            serviceName: 'DRY_CLEAN',
            price: 180,
          },
        ],
      });
    assert(createOrderRes.status === 201, 'POST /api/laundry/orders returns 201 Created');
    const orderData = createOrderRes.body.data;
    cleanup.orders.push(orderData._id || orderData.id);

    assert(orderData.clusterId.toString() === clusterId, 'Order carries clusterId');
    assert(orderData.items.length === 2, 'Order has 2 items');

    const priyaCheck = await WardrobeItem.findById(priyaKurta._id);
    const rahulCheck = await WardrobeItem.findById(rahulTrouser._id);
    assert(priyaCheck.status === 'INACTIVE', "Priya's garment marked INACTIVE during laundry");
    assert(rahulCheck.status === 'INACTIVE', "Rahul's garment marked INACTIVE during laundry");

    const orderId = orderData._id || orderData.id;

    // 5.2 GET /api/laundry/orders/:id
    const getOrderRes = await request(app)
      .get(`/api/laundry/orders/${orderId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    assert(getOrderRes.status === 200, 'GET /api/laundry/orders/:id returns 200');
    assert(
      getOrderRes.body.data.items.some((i) => i.garmentOwnerName === userB.name),
      'Order item snapshots Rahul garmentOwnerName'
    );

    // 5.3 PATCH /api/laundry/orders/:id/status (Transition to DELIVERED)
    const deliverOrderRes = await request(app)
      .patch(`/api/laundry/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        status: 'DELIVERED',
      });
    assert(deliverOrderRes.status === 200, 'PATCH /api/laundry/orders/:id/status (DELIVERED) returns 200');

    const priyaPostDelivery = await WardrobeItem.findById(priyaKurta._id);
    const rahulPostDelivery = await WardrobeItem.findById(rahulTrouser._id);
    assert(priyaPostDelivery.status === 'ACTIVE', "Priya's garment restored to ACTIVE upon delivery");
    assert(rahulPostDelivery.status === 'ACTIVE', "Rahul's garment restored to ACTIVE upon delivery");

    // ---------------------------------------------------------
    // 6. Phase 5: FCAuditLog & Realtime Cluster Chat Activity Cards
    // ---------------------------------------------------------
    console.log('\n--- 6. Testing Phase 5: Audit Logs & Group Chat Broadcasts ---');
    const auditLogs = await FCAuditLog.find({ clusterId }).lean();
    console.log(`✔ Found ${auditLogs.length} audit log entries for cluster`);
    assert(auditLogs.length >= 1, 'Phase 5: FCAuditLog recorded cluster collaborative actions');

    const hasWardrobeAudit = auditLogs.some((l) => l.action === 'WARDROBE_ITEM_UPDATED');
    const hasOutfitAudit = auditLogs.some((l) => l.action === 'OUTFIT_STYLED');
    const hasLaundryAudit = auditLogs.some((l) => l.action === 'LAUNDRY_ORDER_DISPATCHED');
    assert(hasWardrobeAudit, 'Phase 5: FCAuditLog tracked cross-member wardrobe updates');
    assert(hasOutfitAudit, 'Phase 5: FCAuditLog tracked collaborative outfit creation');
    assert(hasLaundryAudit, 'Phase 5: FCAuditLog tracked multi-owner laundry dispatch');

    // Check cluster conversation activity messages
    const clusterDoc = await Cluster.findById(clusterId).lean();
    if (clusterDoc.conversationId) {
      const messages = await Message.find({ conversationId: clusterDoc.conversationId }).lean();
      console.log(`✔ Found ${messages.length} activity messages in cluster group chat`);
      assert(messages.length >= 1, 'Phase 5: Activity card messages posted to cluster group chat');
    }

    // ---------------------------------------------------------
    // SUMMARY
    // ---------------------------------------------------------
    console.log('\n======================================================');
    console.log(`🎉 ALL ${passed} API ENDPOINTS TESTED & PASSED 100%! 🎉`);
    console.log('======================================================\n');
  } finally {
    console.log('Cleaning up integration test data...');
    if (cleanup.clusters.length) {
      await FCAuditLog.deleteMany({ clusterId: { $in: cleanup.clusters } });
      const clusters = await Cluster.find({ _id: { $in: cleanup.clusters } }).select('conversationId');
      const convIds = clusters.map((c) => c.conversationId).filter(Boolean);
      if (convIds.length) await Message.deleteMany({ conversationId: { $in: convIds } });
    }
    if (cleanup.orders.length) await Order.deleteMany({ _id: { $in: cleanup.orders } });
    if (cleanup.outfits.length) await Outfit.deleteMany({ _id: { $in: cleanup.outfits } });
    if (cleanup.items.length) await WardrobeItem.deleteMany({ _id: { $in: cleanup.items } });
    if (cleanup.wardrobes.length) await Wardrobe.deleteMany({ _id: { $in: cleanup.wardrobes } });
    if (cleanup.clusters.length) await Cluster.deleteMany({ _id: { $in: cleanup.clusters } });
    if (cleanup.storeTypes?.length) await StoreType.deleteMany({ _id: { $in: cleanup.storeTypes } });
    if (cleanup.users.length) await User.deleteMany({ _id: { $in: cleanup.users } });
    console.log('Database cleanup complete.');
    await mongoose.disconnect();
  }
}

runApiTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal API test runner error:', err);
    process.exit(1);
  });
