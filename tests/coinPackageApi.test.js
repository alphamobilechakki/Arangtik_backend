const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');
const CoinPackage = require('../src/modules/subscription/coins/coinPackage.model');

test('Coin Package Admin APIs Integration Testing', async (t) => {
  await connectDB();

  const adminToken = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'admin', isAdmin: true },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const nonAdminToken = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'user', isAdmin: false },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  const userHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${nonAdminToken}`,
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/admin/coin-packages`;

  const createdIds = [];
  const testSuffix = Date.now();

  t.after(async () => {
    if (createdIds.length > 0) {
      await CoinPackage.deleteMany({ _id: { $in: createdIds } });
    }
    server.close();
    await mongoose.disconnect();
  });

  // ─── 1. Authentication Checks ─────────────────────────────────────────────
  await t.test('1. Auth - Reject request without token (401)', async () => {
    const res = await fetch(baseUrl, { method: 'GET' });
    const body = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(body.success, false);
  });

  await t.test('2. Auth - Reject request with non-admin token (403)', async () => {
    const res = await fetch(baseUrl, {
      method: 'GET',
      headers: userHeaders,
    });
    const body = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(body.success, false);
  });

  await t.test('3. Auth - Accept request with x-api-key', async () => {
    const res = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'x-api-key': 'arangtik_admin_secret_2026',
      },
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
  });

  // ─── 2. Validation Errors on POST ─────────────────────────────────────────
  await t.test('4. POST - Fail on missing package name (400)', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        coins: 5000,
        price: 10,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(body.message, /Package name is required/i);
  });

  await t.test('5. POST - Fail on invalid coins amount (400)', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Invalid Coins ${testSuffix}`,
        coins: 0,
        price: 10,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(body.message, /positive integer/i);
  });

  await t.test('6. POST - Fail on negative bonus coins (400)', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Invalid Bonus ${testSuffix}`,
        coins: 5000,
        bonusCoins: -50,
        price: 10,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(body.message, /non-negative/i);
  });

  await t.test('7. POST - Fail on price <= 0 (400)', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: `Invalid Price ${testSuffix}`,
        coins: 5000,
        price: 0,
      }),
    });
    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(body.message, /greater than zero/i);
  });

  // ─── 3. Create Packages (POST) ────────────────────────────────────────────
  let packageAId = null;
  const packageAName = `Starter Pack ${testSuffix}`;

  await t.test('8. POST - Successfully create Package A', async () => {
    const payload = {
      name: packageAName,
      coins: 5000,
      bonusCoins: 500,
      price: 10,
      currency: 'INR',
      description: 'Starter coin package for testing',
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, packageAName);
    assert.strictEqual(body.data.coins, 5000);
    assert.strictEqual(body.data.bonusCoins, 500);
    assert.strictEqual(body.data.price, 10);
    assert.strictEqual(body.data.currency, 'INR');
    assert.strictEqual(body.data.isActive, true);

    packageAId = body.data._id;
    createdIds.push(packageAId);
  });

  await t.test('9. POST - Reject duplicate package name (409)', async () => {
    const payload = {
      name: packageAName.toLowerCase(), // case-insensitive check
      coins: 10000,
      price: 20,
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/i);
  });

  let packageBId = null;
  const packageBName = `Pro Pack ${testSuffix}`;
  await t.test('10. POST - Create Package B (for search and filtering)', async () => {
    const payload = {
      name: packageBName,
      coins: 30000,
      bonusCoins: 3000,
      price: 50,
      description: 'Pro testing package',
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    packageBId = body.data._id;
    createdIds.push(packageBId);
  });

  // ─── 4. List Packages (GET) ───────────────────────────────────────────────
  await t.test('11. GET - List packages with pagination metadata', async () => {
    const res = await fetch(`${baseUrl}?page=1&limit=10`, {
      headers: authHeaders,
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.coinPackages));
    assert.ok(body.data.pagination);
    assert.strictEqual(body.data.pagination.page, 1);
    assert.strictEqual(body.data.pagination.limit, 10);
    assert.ok(body.data.pagination.total >= 2);
  });

  await t.test('12. GET - Search package by name', async () => {
    const res = await fetch(`${baseUrl}?search=${encodeURIComponent(packageBName)}`, {
      headers: authHeaders,
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.coinPackages.length, 1);
    assert.strictEqual(body.data.coinPackages[0]._id, packageBId);
  });

  // ─── 5. Get Single Package (GET /:id) ─────────────────────────────────────
  await t.test('13. GET /:id - 400 on malformed ObjectId', async () => {
    const res = await fetch(`${baseUrl}/not-an-id`, {
      headers: authHeaders,
    });
    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(body.message, /invalid/i);
  });

  await t.test('14. GET /:id - 404 on non-existent package', async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const res = await fetch(`${baseUrl}/${nonExistentId}`, {
      headers: authHeaders,
    });
    const body = await res.json();
    assert.strictEqual(res.status, 404);
    assert.match(body.message, /not found/i);
  });

  await t.test('15. GET /:id - 200 get package details', async () => {
    const res = await fetch(`${baseUrl}/${packageAId}`, {
      headers: authHeaders,
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data._id, packageAId);
    assert.strictEqual(body.data.name, packageAName);
    assert.strictEqual(body.data.coins, 5000);
  });

  // ─── 6. Update Package (PATCH /:id) ───────────────────────────────────────
  await t.test('16. PATCH /:id - Update price, bonusCoins, and description', async () => {
    const updatePayload = {
      price: 15,
      bonusCoins: 750,
      description: 'Updated starter pack description',
    };

    const res = await fetch(`${baseUrl}/${packageAId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(updatePayload),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.price, 15);
    assert.strictEqual(body.data.bonusCoins, 750);
    assert.strictEqual(body.data.description, 'Updated starter pack description');
    assert.strictEqual(body.data.coins, 5000); // untouched field remains unchanged
  });

  await t.test('17. PATCH /:id - Duplicate name check when renaming', async () => {
    const res = await fetch(`${baseUrl}/${packageAId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ name: packageBName }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 409);
    assert.match(body.message, /already exists/i);
  });

  // ─── 7. Status Toggle (PATCH /:id/status) ──────────────────────────────────
  await t.test('18. PATCH /:id/status - Reject non-boolean isActive', async () => {
    const res = await fetch(`${baseUrl}/${packageAId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isActive: 'false' }), // string instead of boolean
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(body.message, /boolean/i);
  });

  await t.test('19. PATCH /:id/status - Deactivate package (isActive: false)', async () => {
    const res = await fetch(`${baseUrl}/${packageAId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isActive: false }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.isActive, false);
    assert.match(body.message, /deactivated successfully/i);
  });

  await t.test('20. GET - Filter by isActive status', async () => {
    // Inactive filter
    const resInactive = await fetch(`${baseUrl}?isActive=false&search=${encodeURIComponent(packageAName)}`, {
      headers: authHeaders,
    });
    const bodyInactive = await resInactive.json();
    assert.strictEqual(resInactive.status, 200);
    assert.strictEqual(bodyInactive.data.coinPackages.length, 1);
    assert.strictEqual(bodyInactive.data.coinPackages[0].isActive, false);

    // Active filter
    const resActive = await fetch(`${baseUrl}?isActive=true&search=${encodeURIComponent(packageAName)}`, {
      headers: authHeaders,
    });
    const bodyActive = await resActive.json();
    assert.strictEqual(resActive.status, 200);
    assert.strictEqual(bodyActive.data.coinPackages.length, 0);
  });

  await t.test('21. PATCH /:id/status - Reactivate package (isActive: true)', async () => {
    const res = await fetch(`${baseUrl}/${packageAId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ isActive: true }),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.isActive, true);
    assert.match(body.message, /activated successfully/i);
  });
});

