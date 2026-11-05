const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const sharp = require('sharp');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');

test('Real Integration: POST /api/wardrobe/add-item with Python AI Service', async (t) => {
  await connectDB();

  const testUserId = new mongoose.Types.ObjectId().toString();
  const userToken = jwt.sign(
    { id: testUserId, role: 'user' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const addItemUrl = `http://localhost:${port}/api/wardrobe/add-item`;

  let createdItemId = null;

  t.after(async () => {
    if (createdItemId) {
      await WardrobeItem.findByIdAndDelete(createdItemId);
      console.log(`[Test Cleanup] Deleted test item ${createdItemId}`);
    }
    server.close();
    await mongoose.disconnect();
  });

  await t.test('Upload cloth with mode=without_person, hits live Python service and completes analysis', async () => {
    console.log('[Test] 1. Generating real sample cloth image (Blue Polo Shirt simulation)...');
    
    // Create an image buffer with sharp
    const clothImageBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 30, g: 144, b: 255, alpha: 1 } // Dodger blue
      }
    }).png().toBuffer();

    const formData = new FormData();
    const blob = new Blob([clothImageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'sample_blue_shirt.png');
    formData.append('mode', 'without_person');

    console.log('[Test] 2. Sending POST request to /api/wardrobe/add-item...');
    const startTime = Date.now();
    const res = await fetch(addItemUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
      body: formData,
    });
    const immediateDuration = Date.now() - startTime;
    console.log(`[Test] 3. Received immediate response in ${immediateDuration}ms with status: ${res.status}`);

    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    const body = await res.json();

    assert.strictEqual(body.success, true);
    assert.ok(body.data._id, 'Response should contain item _id');
    assert.strictEqual(body.data.processingStatus, 'PROCESSING', 'Status should be PROCESSING immediately');
    createdItemId = body.data._id;

    console.log(`[Test] 4. Item created with ID: ${createdItemId}. Waiting for background worker to process with Python and Gemini...`);

    // Poll MongoDB for background worker completion (timeout after 30 seconds)
    const maxWaitMs = 30000;
    const pollIntervalMs = 1500;
    const pollStart = Date.now();
    let completedItem = null;

    while (Date.now() - pollStart < maxWaitMs) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const doc = await WardrobeItem.findById(createdItemId).lean();
      console.log(`[Test Polling] Current status: ${doc?.processingStatus}, category: ${doc?.category}`);
      if (doc && (doc.processingStatus === 'COMPLETED' || doc.processingStatus === 'FAILED')) {
        completedItem = doc;
        break;
      }
    }

    assert.ok(completedItem, 'Item should exist in database');
    console.log('[Test] 5. Final Item in DB:', JSON.stringify({
      id: completedItem._id,
      name: completedItem.name,
      category: completedItem.category,
      color: completedItem.color,
      processingStatus: completedItem.processingStatus,
      images: completedItem.images,
    }, null, 2));

    assert.strictEqual(completedItem.processingStatus, 'COMPLETED', 'Background pipeline must set status to COMPLETED');
    assert.ok(completedItem.images && completedItem.images.length > 0, 'Should have at least 1 image');
    assert.ok(completedItem.category, 'Should have category populated by AI');
  });
});

