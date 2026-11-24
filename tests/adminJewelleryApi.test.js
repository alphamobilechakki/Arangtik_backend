const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');

const Jewellery = require('../src/modules/jewellery/item/jewellery.model');
const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');
const JewellerySet = require('../src/modules/jewellery/set/jewellerySet.model');
const JewelleryCategory = require('../src/modules/jewellery/category/jewelleryCategory.model');
const User = require('../src/modules/auth/user.model');

test('Admin Jewellery Operations API Integration Tests', async (t) => {
  await connectDB();

  // Create a real test user in DB to test two-phase phone search
  const testPhone = '919999888877';
  let testUser = await User.findOne({ phone: testPhone });
  if (!testUser) {
    testUser = await User.create({
      name: 'Rohan Royal',
      phone: testPhone,
      role: 'user',
    });
  }

  const testAdminId = new mongoose.Types.ObjectId();
  const adminToken = jwt.sign(
    { id: testAdminId.toString(), role: 'admin', isAdmin: true },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const regularUserToken = jwt.sign(
    { id: testUser._id.toString(), role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const userHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${regularUserToken}`,
  };

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/admin/jewellery`;

  let testBox;
  let testCategory;
  let testItem1;
  let testItem2;

  // Setup test data
  testCategory = await JewelleryCategory.findOne({ code: 'NECKLACE' });
  if (!testCategory) {
    testCategory = await JewelleryCategory.create({
      name: 'Necklace',
      code: 'NECKLACE',
    });
  }

  testBox = await JewelleryBox.create({
    userId: testUser._id,
    name: 'TEST_ADMIN_Mummy Trunk',
    type: 'FAMILY',
    isDefault: true,
  });

  // Create test item 1: on CLEANING
  testItem1 = await Jewellery.create({
    userId: testUser._id,
    jewelleryBoxId: testBox._id,
    jewelleryCategory: testCategory._id,
    name: 'TEST_ADMIN_Antique Gold Haar',
    type: 'GOLD',
    status: 'CLEANING',
    weight: 75.5,
    brand: 'Kalyan',
    sourceImage: { url: 'https://cdn.arangtik.com/haar.jpg' },
  });

  // Create test item 2: on LEND
  testItem2 = await Jewellery.create({
    userId: testUser._id,
    jewelleryBoxId: testBox._id,
    jewelleryCategory: testCategory._id,
    name: 'TEST_ADMIN_Silver Payal',
    type: 'SILVER',
    status: 'LEND',
    weight: 30,
    sourceImage: { url: 'https://cdn.arangtik.com/payal.jpg' },
  });

  t.after(async () => {
    await Jewellery.deleteMany({ userId: testUser._id });
    await JewelleryBox.deleteMany({ userId: testUser._id });
    await User.findByIdAndDelete(testUser._id);
    server.close();
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 100);
  });

  // ─── Test 1: Security - Unauthorized user access ──────────────────────────
  await t.test('1. Security: Non-admin user cannot access admin jewellery endpoints', async () => {
    const res = await fetch(`${baseUrl}/stats`, {
      method: 'GET',
      headers: userHeaders,
    });
    assert.equal(res.status, 403);
  });

  // ─── Test 2: GET /stats - High-level KPIs & SLA Alerts ───────────────────
  await t.test('2. GET /api/admin/jewellery/stats - Aggregated KPIs & SLA Alerts', async () => {
    const res = await fetch(`${baseUrl}/stats`, {
      method: 'GET',
      headers: adminHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.ok(body.data.overview.totalPieces >= 2);
    assert.ok(body.data.statusDistribution.CLEANING >= 1);
    assert.ok(body.data.statusDistribution.LEND >= 1);
    assert.ok(body.data.typeDistribution.GOLD >= 1);
    assert.ok(typeof body.data.operationalAlerts.totalAlerts === 'number');
    assert.ok(Array.isArray(body.data.topCategories));
  });

  // ─── Test 3: GET /items - Global Table with Search, Aging, and Tab Badges ─
  await t.test('3. GET /api/admin/jewellery/items - Global operations table with tab counts', async () => {
    const res = await fetch(`${baseUrl}/items?status=CLEANING`, {
      method: 'GET',
      headers: adminHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.data.tabCounts);
    assert.ok(typeof body.data.tabCounts.all === 'number');
    assert.ok(typeof body.data.tabCounts.cleaning === 'number');
    assert.ok(Array.isArray(body.data.items));

    // Verify SLA aging property is attached
    const found = body.data.items.find((i) => i._id === testItem1._id.toString());
    assert.ok(found);
    assert.ok(typeof found.daysInStatus === 'number');
    assert.ok(typeof found.isAlert === 'boolean');
    assert.equal(found.user.phone, testPhone);
  });

  // ─── Test 4: Two-Phase Search by User Phone ──────────────────────────────
  await t.test('4. Two-Phase Search: Search items by User Phone', async () => {
    const res = await fetch(`${baseUrl}/items?search=${testPhone}`, {
      method: 'GET',
      headers: adminHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(body.data.items.length >= 2);
    assert.equal(body.data.items[0].user.phone, testPhone);
  });

  // ─── Test 5: GET /items/:id - Single Piece Inspection ────────────────────
  await t.test('5. GET /api/admin/jewellery/items/:id - Inspect single piece', async () => {
    const res = await fetch(`${baseUrl}/items/${testItem1._id}`, {
      method: 'GET',
      headers: adminHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data._id, testItem1._id.toString());
    assert.equal(body.data.user.name, 'Rohan Royal');
    assert.equal(body.data.jewelleryBoxId.name, 'TEST_ADMIN_Mummy Trunk');
  });

  // ─── Test 6: Support Status Override (with Audit Reason) ─────────────────
  await t.test('6. PATCH /api/admin/jewellery/items/:id/status-override - Override status', async () => {
    // 6a. Should reject without reason
    const failRes = await fetch(`${baseUrl}/items/${testItem1._id}/status-override`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'IN_LOCKER' }),
    });
    assert.equal(failRes.status, 400);

    // 6b. Should succeed with reason
    const okRes = await fetch(`${baseUrl}/items/${testItem1._id}/status-override`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'IN_LOCKER',
        reason: 'Customer called support: received back from cleaning vendor',
      }),
    });

    const body = await okRes.json();
    assert.equal(okRes.status, 200);
    assert.equal(body.data.status, 'IN_LOCKER');
    assert.equal(body.data.previousStatus, 'CLEANING');
    assert.equal(body.data.reason, 'Customer called support: received back from cleaning vendor');
  });

  // ─── Test 7: Soft-Delete & Accidental Deletion Recovery (Restore) ─────────
  await t.test('7. PATCH /api/admin/jewellery/items/:id/restore - Restore soft-deleted item', async () => {
    // Soft-delete item2 first
    testItem2.isDeleted = true;
    testItem2.deletedAt = new Date();
    await testItem2.save();

    // Now restore via Admin endpoint
    const restoreRes = await fetch(`${baseUrl}/items/${testItem2._id}/restore`, {
      method: 'PATCH',
      headers: adminHeaders,
    });

    const body = await restoreRes.json();
    assert.equal(restoreRes.status, 200);
    assert.equal(body.data.item.isDeleted, false);
    assert.equal(body.data.item.deletedAt, null);
  });

  // ─── Test 8: User Customer Support Drill-down ────────────────────────────
  await t.test('8. GET /api/admin/jewellery/users/:userId - User support drill-down', async () => {
    const res = await fetch(`${baseUrl}/users/${testUser._id}`, {
      method: 'GET',
      headers: adminHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.user.phone, testPhone);
    assert.equal(body.data.totalPieces, 2);
    assert.ok(Array.isArray(body.data.boxes));
    assert.ok(Array.isArray(body.data.items));
  });
});
