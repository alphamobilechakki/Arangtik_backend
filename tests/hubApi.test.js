const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');
const Hub = require('../src/modules/hardware/hub/hub.model');
const User = require('../src/modules/auth/user.model');

test('Hardware Hub Module API Testing (Activate, Get-MyHubs, Deactivate)', async (t) => {
  await connectDB();

  // Create or get a test user
  const testUserId = new mongoose.Types.ObjectId();
  const token = jwt.sign(
    { id: testUserId.toString(), role: 'user', phone: '919999999999' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const testMacId = 'AA:BB:CC:11:22:33';

  // Pre-seed an existing configured hub in DB
  await Hub.deleteOne({ mac_id: testMacId });
  const preExistingHub = await Hub.create({
    mac_id: testMacId,
    status: 'configured',
  });

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/hardware/hubs`;

  t.after(async () => {
    await Hub.deleteOne({ mac_id: testMacId });
    server.close();
    await mongoose.disconnect();
  });

  // ─── Test 1: Activate Hub (PATCH /activate) ──────────────────────────────────
  await t.test('1. PATCH /api/hardware/hubs/activate - Activate existing hub with WiFi & Name', async () => {
    const payload = {
      mac_id: testMacId,
      name: 'Smart Kitchen Hub Alpha',
      wifi: {
        ssid: 'Home_WiFi_5G',
        password: 'SecretWifiPassword99',
      },
      status: 'activated',
    };

    const response = await fetch(`${baseUrl}/activate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json();
    console.log('\n--- 1. ACTIVATE RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 200, 'Status code must be 200');
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.mac_id, testMacId);
    assert.strictEqual(resJson.data.name, 'Smart Kitchen Hub Alpha');
    assert.strictEqual(resJson.data.status, 'activated');
    assert.strictEqual(resJson.data.userId.toString(), testUserId.toString());
    assert.strictEqual(resJson.data.wifi.ssid, 'Home_WiFi_5G');
  });

  // ─── Test 2: Get My Hubs (GET /get-myhubs) ────────────────────────────────────
  await t.test('2. GET /api/hardware/hubs/get-myhubs - Retrieve user assigned hubs', async () => {
    const response = await fetch(`${baseUrl}/get-myhubs`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const resJson = await response.json();
    console.log('\n--- 2. GET-MYHUBS RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 200, 'Status code must be 200');
    assert.strictEqual(resJson.success, true);
    assert.ok(Array.isArray(resJson.data), 'Data should be an array of hubs');
    assert.ok(resJson.data.length >= 1, 'Array must contain at least one hub');
    assert.strictEqual(resJson.data[0].mac_id, testMacId);
    assert.strictEqual(resJson.data[0].status, 'activated');
  });

  // ─── Test 3: Deactivate Hub (PATCH /deactivate) ──────────────────────────────
  await t.test('3. PATCH /api/hardware/hubs/deactivate - Deactivate hub', async () => {
    const payload = {
      mac_id: testMacId,
    };

    const response = await fetch(`${baseUrl}/deactivate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json();
    console.log('\n--- 3. DEACTIVATE RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 200, 'Status code must be 200');
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.mac_id, testMacId);
    assert.strictEqual(resJson.data.status, 'deactivated');
  });

  // ─── Test 4: Negative Case - Activating non-existent hub ─────────────────────
  await t.test('4. PATCH /api/hardware/hubs/activate - 404 for non-existent MAC ID', async () => {
    const response = await fetch(`${baseUrl}/activate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mac_id: '99:99:99:99:99:99',
        name: 'Ghost Hub',
      }),
    });

    const resJson = await response.json();
    console.log('\n--- 4. NOT FOUND RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 404, 'Status code must be 404');
    assert.strictEqual(resJson.success, false);
    assert.strictEqual(resJson.message, 'Hub not found with this MAC ID');
  });
});
