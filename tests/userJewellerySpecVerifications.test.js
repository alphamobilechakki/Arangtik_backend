/**
 * Comprehensive API Verification Test Suite
 * Strictly validates Request & Response for all 19 Jewellery APIs specified in user prompt:
 * 1.1 List Categories (GET /api/jewellery/categories)
 * 2.1 List Boxes (GET /api/jewellery/boxes)
 * 2.2 Create Box (POST /api/jewellery/boxes)
 * 2.3 Get Box by ID (GET /api/jewellery/boxes/:id)
 * 2.4 Update Box (PATCH /api/jewellery/boxes/:id)
 * 2.5 Delete Box (DELETE /api/jewellery/boxes/:id)
 * 3.1 List Sets (GET /api/jewellery/sets)
 * 3.2 Get Set by ID (GET /api/jewellery/sets/:id)
 * 3.3 Update Set (PATCH /api/jewellery/sets/:id)
 * 3.4 Delete Set (DELETE /api/jewellery/sets/:id)
 * 4.1 Create Single Piece (POST /api/jewellery)
 * 4.2 Create Set with Items (POST /api/jewellery/set-with-items)
 * 4.3 List Pieces (GET /api/jewellery)
 * 4.4 Get Single Piece (GET /api/jewellery/:id)
 * 4.5 Update Piece (PATCH /api/jewellery/:id)
 * 4.6 Update Status (PATCH /api/jewellery/:id/status)
 * 4.7 Move Piece (PATCH /api/jewellery/:id/move)
 * 4.8 Toggle Favorite (PATCH /api/jewellery/:id/favorite)
 * 4.9 Soft Delete Piece (DELETE /api/jewellery/:id)
 */
const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');

const JewelleryCategory = require('../src/modules/jewellery/category/jewelleryCategory.model');
const JewelleryBox = require('../src/modules/jewellery/box/jewelleryBox.model');
const JewellerySet = require('../src/modules/jewellery/set/jewellerySet.model');
const Jewellery = require('../src/modules/jewellery/item/jewellery.model');
const User = require('../src/modules/auth/user.model');

test('Jewellery 19-API Full Specification Request & Response Verification', async (t) => {
  await connectDB();

  // Create a clean dedicated test user
  const testUserId = new mongoose.Types.ObjectId();
  const testUser = await User.create({
    _id: testUserId,
    name: 'Mummy',
    phone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
    role: 'user',
  });

  const userToken = jwt.sign(
    { id: testUserId.toString(), role: 'user', phone: testUser.phone },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${userToken}`,
  };

  const publicHeaders = {
    'Content-Type': 'application/json',
  };

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;

  // Variables to hold dynamic test entities
  let testCategoryId = null;
  let testBox1Id = null;
  let testBox2Id = null;
  let testSetId = null;
  let testItemId = null;
  let atomicSetId = null;
  let atomicItemId1 = null;

  t.after(async () => {
    // Teardown test artifacts
    await Jewellery.deleteMany({ userId: testUserId });
    await JewellerySet.deleteMany({ userId: testUserId });
    await JewelleryBox.deleteMany({ userId: testUserId });
    await User.findByIdAndDelete(testUserId);
    server.close();
    await mongoose.disconnect();
    setTimeout(() => process.exit(0), 100);
  });

  // Ensure standard categories exist (Ring, Necklace, Earring)
  let ringCat = await JewelleryCategory.findOne({ code: 'RING' });
  if (!ringCat) {
    ringCat = await JewelleryCategory.create({ name: 'Ring', code: 'RING' });
  }
  let neckCat = await JewelleryCategory.findOne({ code: 'NECKLACE' });
  if (!neckCat) {
    neckCat = await JewelleryCategory.create({ name: 'Necklace', code: 'NECKLACE' });
  }
  let earCat = await JewelleryCategory.findOne({ code: 'EARRING' });
  if (!earCat) {
    earCat = await JewelleryCategory.create({ name: 'Earring', code: 'EARRING' });
  }
  testCategoryId = ringCat._id.toString();

  // =========================================================================
  // 1. PUBLIC CATEGORY DISCOVERY
  // =========================================================================
  await t.test('1.1 List Active Categories (GET /api/jewellery/categories)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/categories`, {
      method: 'GET',
      headers: publicHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery categories retrieved successfully');
    assert.ok(Array.isArray(json.data), 'Expected data to be an array of categories');
    assert.ok(json.data.length > 0, 'Categories array should not be empty');

    const first = json.data[0];
    assert.ok(first._id, 'Category must have _id');
    assert.ok(first.name, 'Category must have name');
    assert.ok(first.code, 'Category must have code');
  });

  // =========================================================================
  // 2. USER JEWELLERY BOXES
  // =========================================================================
  await t.test('2.2 Create Jewellery Box (POST /api/jewellery/boxes) - Bank Safe Locker', async () => {
    const payload = {
      name: 'Bank Safe Locker',
      description: 'High-value bridal storage',
      type: 'FAMILY',
      ownerName: 'Mummy',
      coverImage: 'https://api.arangtik.com/uploads/locker.jpg',
      isDefault: false,
    };

    const res = await fetch(`${baseUrl}/jewellery/boxes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.statusCode, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery box created successfully');
    assert.ok(json.data._id, 'Box must have _id');
    assert.strictEqual(json.data.name, 'Bank Safe Locker');
    assert.strictEqual(json.data.type, 'FAMILY');
    assert.strictEqual(json.data.isActive, true);
    assert.strictEqual(json.data.isDeleted, false);

    testBox1Id = json.data._id.toString();
  });

  await t.test('2.2 Create Second Box (POST /api/jewellery/boxes) - Mummy\'s Gold Vault', async () => {
    const payload = {
      name: "Mummy's Gold Vault",
      description: 'Master household gold collection',
      type: 'FAMILY',
      ownerName: 'Mummy',
      coverImage: 'https://api.arangtik.com/uploads/vault_cover.jpg',
      isDefault: true,
    };

    const res = await fetch(`${baseUrl}/jewellery/boxes`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.data.name, "Mummy's Gold Vault");
    assert.strictEqual(json.data.isDefault, true);

    testBox2Id = json.data._id.toString();
  });

  await t.test('2.1 List User Boxes (GET /api/jewellery/boxes?search=&page=1&limit=20&paginate=true)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/boxes?search=&page=1&limit=20&paginate=true`, {
      method: 'GET',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery boxes retrieved successfully');
    assert.ok(json.data.boxes, 'Expected data.boxes array');
    assert.ok(Array.isArray(json.data.boxes));
    assert.strictEqual(json.data.boxes.length, 2);
    assert.ok(json.data.pagination, 'Expected pagination object');
    assert.strictEqual(json.data.pagination.page, 1);
    assert.strictEqual(json.data.pagination.total, 2);

    const b = json.data.boxes[0];
    assert.ok(b._id);
    assert.ok(b.userId);
    assert.ok(typeof b.itemCount === 'number');
  });

  await t.test('2.3 Get Box by ID (GET /api/jewellery/boxes/:id)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/boxes/${testBox2Id}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery box retrieved successfully');
    assert.strictEqual(json.data._id, testBox2Id);
    assert.strictEqual(json.data.name, "Mummy's Gold Vault");
    assert.strictEqual(json.data.type, 'FAMILY');
    assert.strictEqual(json.data.isDefault, true);
    assert.ok(typeof json.data.itemCount === 'number');
  });

  await t.test('2.4 Update Jewellery Box (PATCH /api/jewellery/boxes/:id)', async () => {
    const payload = {
      name: 'Updated Vault Name',
      description: 'Updated notes',
      type: 'PERSONAL',
      ownerName: 'Self',
      coverImage: 'https://api.arangtik.com/uploads/new_cover.jpg',
      isDefault: true,
    };

    const res = await fetch(`${baseUrl}/jewellery/boxes/${testBox2Id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery box updated successfully');
    assert.strictEqual(json.data.name, 'Updated Vault Name');
    assert.strictEqual(json.data.type, 'PERSONAL');
    assert.strictEqual(json.data.isDefault, true);
  });

  // =========================================================================
  // 3. JEWELLERY SETS
  // =========================================================================
  await t.test('3.0 Helper: Create Standalone Set for testing (POST /api/jewellery/sets via direct creation or API)', async () => {
    const Set = mongoose.models.JewellerySet;
    const s = await Set.create({
      userId: testUserId,
      jewelleryBoxId: testBox1Id,
      name: 'Royal Emerald Bridal Set',
      coverImageUrl: 'https://api.arangtik.com/uploads/emerald_set_full.jpg',
      sourcePhotoUrl: 'https://api.arangtik.com/uploads/emerald_set_full.jpg',
    });
    testSetId = s._id.toString();
    assert.ok(testSetId);
  });

  await t.test('3.1 List Jewellery Sets (GET /api/jewellery/sets?jewelleryBoxId=&search=&page=1&limit=20)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/sets?jewelleryBoxId=&search=&page=1&limit=20`, {
      method: 'GET',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery sets retrieved successfully');
    assert.ok(json.data.sets);
    assert.ok(Array.isArray(json.data.sets));
    assert.ok(json.data.pagination);

    const s = json.data.sets[0];
    assert.strictEqual(s._id, testSetId);
    assert.strictEqual(s.name, 'Royal Emerald Bridal Set');
    assert.ok(s.jewelleryBoxId);
    assert.ok(typeof s.itemCount === 'number');
  });

  await t.test('3.2 Get Set by ID (GET /api/jewellery/sets/:id)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/sets/${testSetId}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery set retrieved successfully');
    assert.strictEqual(json.data._id, testSetId);
    assert.strictEqual(json.data.name, 'Royal Emerald Bridal Set');
    assert.ok(Array.isArray(json.data.items), 'Expected items array in set details');
  });

  await t.test('3.3 Update Set Details (PATCH /api/jewellery/sets/:id)', async () => {
    const payload = {
      name: 'Updated Bridal Set Name',
      jewelleryBoxId: testBox2Id,
      coverImageUrl: 'https://api.arangtik.com/uploads/new_set_cover.jpg',
    };

    const res = await fetch(`${baseUrl}/jewellery/sets/${testSetId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery set updated successfully');
    assert.strictEqual(json.data.name, 'Updated Bridal Set Name');
    assert.strictEqual(json.data.jewelleryBoxId.toString(), testBox2Id);
  });

  // =========================================================================
  // 4. JEWELLERY PIECES
  // =========================================================================
  await t.test('4.1 Create Single Jewellery Piece (POST /api/jewellery)', async () => {
    const payload = {
      name: 'Diamond Solitaire Ring',
      jewelleryCategory: 'RING', // category code resolution
      jewelleryBoxId: testBox1Id,
      setId: null,
      type: 'GOLD',
      status: 'IN_LOCKER',
      color: 'Rose Gold',
      gemstone: 'VVS1 Diamond',
      weight: 5.2,
      brand: 'CaratLane',
      sourceImageUrl: 'https://api.arangtik.com/uploads/ring_source.jpg',
      generatedImageUrl: 'https://api.arangtik.com/uploads/ring_generated.png',
    };

    const res = await fetch(`${baseUrl}/jewellery`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.statusCode, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery item created successfully');
    assert.ok(json.data._id);
    assert.strictEqual(json.data.name, 'Diamond Solitaire Ring');
    assert.strictEqual(json.data.type, 'GOLD');
    assert.strictEqual(json.data.status, 'IN_LOCKER');
    assert.strictEqual(json.data.color, 'Rose Gold');
    assert.strictEqual(json.data.gemstone, 'VVS1 Diamond');
    assert.strictEqual(json.data.weight, 5.2);
    assert.strictEqual(json.data.brand, 'CaratLane');
    assert.strictEqual(json.data.isFavorite, false);

    testItemId = json.data._id.toString();
  });

  await t.test('4.2 Create Set with Items (POST /api/jewellery/set-with-items)', async () => {
    const payload = {
      setName: 'Bridal Emerald & Diamond Set',
      jewelleryBoxId: testBox1Id,
      sourcePhotoUrl: 'https://api.arangtik.com/uploads/emerald_set_full.jpg',
      items: [
        {
          name: 'Emerald Centerpiece Choker',
          jewelleryCategory: 'NECKLACE',
          type: 'GOLD',
          status: 'IN_LOCKER',
          weight: 55,
          color: 'Yellow Gold',
          gemstone: 'Emerald & Diamond',
        },
        {
          name: 'Emerald Jhumka Left',
          jewelleryCategory: 'EARRING',
          type: 'GOLD',
          status: 'IN_LOCKER',
          weight: 14,
          color: 'Yellow Gold',
        },
        {
          name: 'Emerald Jhumka Right',
          jewelleryCategory: 'EARRING',
          type: 'GOLD',
          status: 'IN_LOCKER',
          weight: 14,
          color: 'Yellow Gold',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/jewellery/set-with-items`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.statusCode, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery set and items created successfully');
    assert.ok(json.data.set);
    assert.strictEqual(json.data.set.name, 'Bridal Emerald & Diamond Set');
    assert.ok(Array.isArray(json.data.items));
    assert.strictEqual(json.data.items.length, 3);

    atomicSetId = json.data.set._id.toString();
    atomicItemId1 = json.data.items[0]._id.toString();
  });

  await t.test('4.3 List Jewellery Pieces (GET /api/jewellery?search=&page=1&limit=20&paginate=true)', async () => {
    const res = await fetch(
      `${baseUrl}/jewellery?jewelleryBoxId=&jewelleryCategory=&setId=&type=&status=&isFavorite=&search=&page=1&limit=20&paginate=true`,
      {
        method: 'GET',
        headers: authHeaders,
      }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery items retrieved successfully');
    assert.ok(json.data.items);
    assert.ok(Array.isArray(json.data.items));
    assert.strictEqual(json.data.items.length, 4); // 1 single + 3 from set
    assert.ok(json.data.pagination);
    assert.strictEqual(json.data.pagination.total, 4);
  });

  await t.test('4.4 Get Single Piece by ID (GET /api/jewellery/:id)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/${testItemId}`, {
      method: 'GET',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery item retrieved successfully');
    assert.strictEqual(json.data._id, testItemId);
    assert.strictEqual(json.data.name, 'Diamond Solitaire Ring');
    assert.strictEqual(json.data.type, 'GOLD');
    assert.strictEqual(json.data.status, 'IN_LOCKER');
  });

  await t.test('4.5 Update Jewellery Piece (PATCH /api/jewellery/:id)', async () => {
    const payload = {
      name: 'Platinum Solitaire Ring',
      weight: 5.5,
      brand: 'Tanishq',
      color: 'White Gold',
      gemstone: 'VVS1 Diamond',
      isFavorite: true,
    };

    const res = await fetch(`${baseUrl}/jewellery/${testItemId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery item updated successfully');
    assert.strictEqual(json.data.name, 'Platinum Solitaire Ring');
    assert.strictEqual(json.data.weight, 5.5);
    assert.strictEqual(json.data.brand, 'Tanishq');
    assert.strictEqual(json.data.isFavorite, true);
  });

  await t.test('4.6 Update Piece Status (PATCH /api/jewellery/:id/status)', async () => {
    const payload = { status: 'LEND' };

    const res = await fetch(`${baseUrl}/jewellery/${testItemId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery status updated to LEND');
    assert.strictEqual(json.data.status, 'LEND');
  });

  await t.test('4.7 Move Piece to Another Box (PATCH /api/jewellery/:id/move)', async () => {
    const payload = { targetJewelleryBoxId: testBox2Id };

    const res = await fetch(`${baseUrl}/jewellery/${testItemId}/move`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery moved to new box successfully');
    assert.strictEqual(json.data.jewelleryBoxId.toString(), testBox2Id);
  });

  await t.test('4.8 Toggle Favorite (PATCH /api/jewellery/:id/favorite)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/${testItemId}/favorite`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    // Was true before in step 4.5, so toggle should make it false
    assert.strictEqual(json.data.isFavorite, false);
    assert.strictEqual(json.data.message, 'Item removed from favorites');
  });

  await t.test('4.9 Soft Delete Piece (DELETE /api/jewellery/:id)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/${testItemId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery item deleted successfully');
    assert.strictEqual(json.data.message, 'Jewellery item deleted successfully');
  });

  await t.test('3.4 Delete Set (DELETE /api/jewellery/sets/:id)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/sets/${atomicSetId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery set and its items deleted successfully');
  });

  await t.test('2.5 Delete Jewellery Box (DELETE /api/jewellery/boxes/:id)', async () => {
    const res = await fetch(`${baseUrl}/jewellery/boxes/${testBox1Id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.statusCode, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.message, 'Jewellery box and its items deleted successfully');
    assert.strictEqual(json.data.message, 'Jewellery box and its items deleted successfully');
  });
});
