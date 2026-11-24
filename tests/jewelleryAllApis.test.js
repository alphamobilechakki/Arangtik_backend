const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');

const JewelleryCategory = require('../src/modules/jewellery/category/jewelleryCategory.model');
const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');
const JewellerySet = require('../src/modules/jewellery/set/jewellerySet.model');
const Jewellery = require('../src/modules/jewellery/item/jewellery.model');

test('Comprehensive Jewellery Module API Integration Tests', async (t) => {
  await connectDB();

  // Test admin and user tokens
  const testUserId = new mongoose.Types.ObjectId();
  const userToken = jwt.sign(
    { id: testUserId.toString(), role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'admin', isAdmin: true },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const userHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userToken}`,
  };

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  let createdCategoryId = null;
  let createdBox1Id = null;
  let createdBox2Id = null;
  let createdSetId = null;
  let createdItemId = null;

  t.after(async () => {
    // Cleanup created test records
    await Jewellery.deleteMany({ userId: testUserId });
    await JewellerySet.deleteMany({ userId: testUserId });
    await JewelleryBox.deleteMany({ userId: testUserId });
    if (createdCategoryId) {
      await JewelleryCategory.findByIdAndDelete(createdCategoryId);
    }
    server.close();
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 100);
  });

  // ─── 1. Admin Jewellery Categories ───────────────────────────────────────
  await t.test('1. POST /api/admin/jewellery-categories - Create Category (Admin)', async () => {
    const res = await fetch(`${baseUrl}/admin/jewellery-categories`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'API Test Tiara',
        code: 'API_TEST_TIARA',
        description: 'Crowns and tiaras',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert.equal(body.success, true);
    assert.equal(body.data.code, 'API_TEST_TIARA');
    createdCategoryId = body.data._id;
  });

  await t.test('2. GET /api/jewellery/categories - App User List Categories', async () => {
    const res = await fetch(`${baseUrl}/jewellery/categories`, {
      method: 'GET',
      headers: userHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    const catList = Array.isArray(body.data) ? body.data : (body.data && body.data.categories);
    assert.ok(Array.isArray(catList));
    const found = catList.some((c) => c._id === createdCategoryId);
    assert.equal(found, true);
  });

  // ─── 2. User Jewellery Boxes ─────────────────────────────────────────────
  await t.test('3. POST /api/jewellery/boxes - Create First Box (Auto-Default)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/boxes`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        name: 'My Master Gold Vault',
        type: 'PERSONAL',
        ownerName: 'Admin/Self',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.name, 'My Master Gold Vault');
    assert.equal(body.data.isDefault, true);
    createdBox1Id = body.data._id;
  });

  await t.test('4. POST /api/jewellery/boxes - Create Second Box', async () => {
    const res = await fetch(`${baseUrl}/jewellery/boxes`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        name: 'Bank Locker Box',
        type: 'FAMILY',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.data.isDefault, false);
    createdBox2Id = body.data._id;
  });

  await t.test('5. GET /api/jewellery/boxes - List User Boxes with Item Counts', async () => {
    const res = await fetch(`${baseUrl}/jewellery/boxes`, {
      method: 'GET',
      headers: userHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body.data.boxes));
    assert.equal(body.data.boxes.length, 2);
    assert.equal(typeof body.data.boxes[0].itemCount, 'number');
  });

  // ─── 3. Single Jewellery Item Creation & Management ──────────────────────
  await t.test('6. POST /api/jewellery - Create Single Jewellery Item', async () => {
    const res = await fetch(`${baseUrl}/jewellery`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        name: 'Diamond Solitaire Ring',
        jewelleryBoxId: createdBox1Id,
        jewelleryCategory: createdCategoryId,
        type: 'GOLD',
        status: 'IN_LOCKER',
        color: 'Rose Gold',
        gemstone: 'VVS1 Diamond',
        weight: 5.2,
        brand: 'CaratLane',
        sourceImageUrl: 'https://cdn.arangtik.com/test_ring.jpg',
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201, `Failed to create item: ${JSON.stringify(body)}`);
    assert.equal(body.data.name, 'Diamond Solitaire Ring');
    assert.equal(body.data.type, 'GOLD');
    assert.equal(body.data.status, 'IN_LOCKER');
    assert.equal(body.data.weight, 5.2);
    createdItemId = body.data._id;
  });

  // ─── 4. Jewellery Set with Multiple Items from One Photo ─────────────────
  await t.test('7. POST /api/jewellery/set-with-items - Create Set + Multi-items', async () => {
    const res = await fetch(`${baseUrl}/jewellery/set-with-items`, {
      method: 'POST',
      headers: userHeaders,
      body: JSON.stringify({
        setName: 'Royal Emerald Necklace & Earring Set',
        jewelleryBoxId: createdBox1Id,
        sourcePhotoUrl: 'https://cdn.arangtik.com/emerald_set_full.jpg',
        items: [
          {
            name: 'Emerald Choker Piece',
            jewelleryCategory: createdCategoryId,
            type: 'GOLD',
            status: 'IN_LOCKER',
            weight: 55,
          },
          {
            name: 'Emerald Jhumka Pair 1',
            jewelleryCategory: createdCategoryId,
            type: 'GOLD',
            status: 'IN_LOCKER',
            weight: 12,
          },
          {
            name: 'Emerald Jhumka Pair 2',
            jewelleryCategory: createdCategoryId,
            type: 'GOLD',
            status: 'IN_LOCKER',
            weight: 12,
          },
        ],
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 201, `Failed set creation: ${JSON.stringify(body)}`);
    assert.equal(body.data.set.name, 'Royal Emerald Necklace & Earring Set');
    assert.equal(body.data.items.length, 3);
    assert.equal(body.data.items[0].setId, body.data.set._id);
    createdSetId = body.data.set._id;
  });

  // ─── 5. Item Query & Filters ─────────────────────────────────────────────
  await t.test('8. GET /api/jewellery - Query Items with Filters', async () => {
    const res = await fetch(
      `${baseUrl}/jewellery?jewelleryBoxId=${createdBox1Id}&type=GOLD&status=IN_LOCKER`,
      {
        method: 'GET',
        headers: userHeaders,
      }
    );

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(body.data.items));
    // 1 single item + 3 set items = 4 items in box1
    assert.equal(body.data.items.length, 4);
    assert.ok(body.data.items[0].jewelleryCategory);
    assert.ok(body.data.items[0].jewelleryBoxId);
  });

  // ─── 6. Status Transitions ───────────────────────────────────────────────
  await t.test('9. PATCH /api/jewellery/:id/status - Status transitions (LEND -> CLEANING -> IN_LOCKER)', async () => {
    // 9a. LEND
    const resLend = await fetch(`${baseUrl}/jewellery/${createdItemId}/status`, {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({ status: 'LEND' }),
    });
    const bodyLend = await resLend.json();
    assert.equal(resLend.status, 200);
    assert.equal(bodyLend.data.status, 'LEND');

    // 9b. CLEANING
    const resClean = await fetch(`${baseUrl}/jewellery/${createdItemId}/status`, {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({ status: 'CLEANING' }),
    });
    const bodyClean = await resClean.json();
    assert.equal(resClean.status, 200);
    assert.equal(bodyClean.data.status, 'CLEANING');

    // 9c. Back to IN_LOCKER
    const resLocker = await fetch(`${baseUrl}/jewellery/${createdItemId}/status`, {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({ status: 'IN_LOCKER' }),
    });
    const bodyLocker = await resLocker.json();
    assert.equal(resLocker.status, 200);
    assert.equal(bodyLocker.data.status, 'IN_LOCKER');
  });

  // ─── 7. Move Item to Another Box ─────────────────────────────────────────
  await t.test('10. PATCH /api/jewellery/:id/move - Move Item to Another Box', async () => {
    const res = await fetch(`${baseUrl}/jewellery/${createdItemId}/move`, {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({ targetJewelleryBoxId: createdBox2Id }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.jewelleryBoxId.toString(), createdBox2Id.toString());
  });

  // ─── 8. Toggle Favorite ──────────────────────────────────────────────────
  await t.test('11. PATCH /api/jewellery/:id/favorite - Toggle Favorite', async () => {
    const res = await fetch(`${baseUrl}/jewellery/${createdItemId}/favorite`, {
      method: 'PATCH',
      headers: userHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.data.isFavorite, true);
  });

  // ─── 9. Soft Deletion & Cascade ──────────────────────────────────────────
  await t.test('12. DELETE /api/jewellery/:id - Soft Delete Single Item', async () => {
    const res = await fetch(`${baseUrl}/jewellery/${createdItemId}`, {
      method: 'DELETE',
      headers: userHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);

    // Verify GET returns 404
    const getRes = await fetch(`${baseUrl}/jewellery/${createdItemId}`, {
      method: 'GET',
      headers: userHeaders,
    });
    assert.equal(getRes.status, 404);
  });

  await t.test('13. DELETE /api/jewellery/boxes/:id - Soft Delete Box and Cascade to Set & Items', async () => {
    const res = await fetch(`${baseUrl}/jewellery/boxes/${createdBox1Id}`, {
      method: 'DELETE',
      headers: userHeaders,
    });

    const body = await res.json();
    assert.equal(res.status, 200);

    // Remaining items in box1 should now be 0
    const checkItems = await fetch(`${baseUrl}/jewellery?jewelleryBoxId=${createdBox1Id}`, {
      method: 'GET',
      headers: userHeaders,
    });
    const itemsBody = await checkItems.json();
    assert.equal(itemsBody.data.items.length, 0);

    // Set in box1 should also be soft-deleted
    const checkSet = await fetch(`${baseUrl}/jewellery/sets/${createdSetId}`, {
      method: 'GET',
      headers: userHeaders,
    });
    assert.equal(checkSet.status, 404);
  });
});
