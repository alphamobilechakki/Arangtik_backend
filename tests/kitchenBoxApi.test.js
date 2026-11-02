const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');
const Hub = require('../src/modules/hardware/hub/hub.model');
const KitchenBox = require('../src/modules/hardware/kitchenBox/kitchenBox.model');

test('KitchenBox Hardware Module API Testing (Activate, Get-MyBoxes, Deactivate)', async (t) => {
  await connectDB();

  // Create test user token
  const testUserId = new mongoose.Types.ObjectId();
  const token = jwt.sign(
    { id: testUserId.toString(), role: 'user', phone: '919888888888' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const testHubMacId = '24:0A:C4:00:11:22';
  const testBoxMacId = '24:0A:C4:AA:BB:CC';

  // Seed hub and kitchen box
  await Hub.deleteOne({ mac_id: testHubMacId });
  await KitchenBox.deleteOne({ mac_id: testBoxMacId });

  await Hub.create({
    mac_id: testHubMacId,
    name: 'Parent Gateway Hub',
    status: 'activated',
    userId: testUserId,
  });

  await KitchenBox.create({
    mac_id: testBoxMacId,
    status: 'provisioned',
  });

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/hardware/boxes`;

  t.after(async () => {
    await Hub.deleteOne({ mac_id: testHubMacId });
    await KitchenBox.deleteOne({ mac_id: testBoxMacId });
    server.close();
    await mongoose.disconnect();
  });

  // ─── Test 1: Activate KitchenBox (PATCH /activate) ──────────────────────────
  await t.test('1. PATCH /api/hardware/boxes/activate - Activate box after QR scan', async () => {
    const payload = {
      mac_id: testBoxMacId,
      name: 'Spice Container Box 1',
      hub_mac_id: testHubMacId,
      item_name: 'Turmeric Powder',
      dimensions: '150x100x80',
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
    console.log('\n--- 1. BOX ACTIVATE RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 200, 'Status code must be 200');
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.mac_id, testBoxMacId);
    assert.strictEqual(resJson.data.name, 'Spice Container Box 1');
    assert.strictEqual(resJson.data.hub_mac_id, testHubMacId);
    assert.strictEqual(resJson.data.item_name, 'Turmeric Powder');
    assert.strictEqual(resJson.data.status, 'activated');
    assert.strictEqual(resJson.data.userId.toString(), testUserId.toString());
  });

  // ─── Test 2: Get My Boxes (GET /get-myboxes) ─────────────────────────────────
  await t.test('2. GET /api/hardware/boxes/get-myboxes - Retrieve user kitchen boxes', async () => {
    const response = await fetch(`${baseUrl}/get-myboxes`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const resJson = await response.json();
    console.log('\n--- 2. GET-MYBOXES RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 200, 'Status code must be 200');
    assert.strictEqual(resJson.success, true);
    assert.ok(Array.isArray(resJson.data), 'Data should be an array of boxes');
    assert.ok(resJson.data.length >= 1, 'Array must contain at least one box');
    assert.strictEqual(resJson.data[0].mac_id, testBoxMacId);
    assert.strictEqual(resJson.data[0].status, 'activated');
  });

  // ─── Test 3: Deactivate KitchenBox (PATCH /deactivate) ──────────────────────
  await t.test('3. PATCH /api/hardware/boxes/deactivate - Deactivate kitchen box', async () => {
    const payload = {
      mac_id: testBoxMacId,
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
    console.log('\n--- 3. BOX DEACTIVATE RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 200, 'Status code must be 200');
    assert.strictEqual(resJson.success, true);
    assert.strictEqual(resJson.data.mac_id, testBoxMacId);
    assert.strictEqual(resJson.data.status, 'deactivated');
  });

  // ─── Test 4: Negative Case - Activating non-existent Box ─────────────────────
  await t.test('4. PATCH /api/hardware/boxes/activate - 404 for non-existent MAC ID', async () => {
    const response = await fetch(`${baseUrl}/activate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mac_id: '99:88:77:66:55:44',
        name: 'Ghost Box',
      }),
    });

    const resJson = await response.json();
    console.log('\n--- 4. BOX NOT FOUND RESPONSE ---');
    console.log(JSON.stringify(resJson, null, 2));

    assert.strictEqual(response.status, 404, 'Status code must be 404');
    assert.strictEqual(resJson.success, false);
    assert.strictEqual(resJson.message, 'KitchenBox not found with this MAC ID');
  });
});

