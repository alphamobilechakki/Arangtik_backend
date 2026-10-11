const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { getImageBuffer, generate3DFromImage } = require('../src/services/model3D/tripo3d.service');
const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');

describe('Hugging Face TripoSR 3D Garment Generation Engine', () => {
  it('WardrobeItem schema correctly defines model3d attributes with defaults', () => {
    const item = new WardrobeItem({
      userId: '507f191e810c19729d924a11',
      name: 'Summer Silk Dress',
      category: 'DRESS',
    });

    assert.strictEqual(item.model3d.status, 'NOT_STARTED');
    assert.strictEqual(item.model3d.engine, 'TripoSR');
    assert.strictEqual(item.model3d.url, null);
    assert.strictEqual(item.model3d.error, null);
  });

  it('getImageBuffer successfully resolves local uploads images', async () => {
    // Find an existing file in uploads
    const uploadsDir = path.resolve(__dirname, '../uploads');
    const files = fs.readdirSync(uploadsDir).filter((f) => !fs.statSync(path.join(uploadsDir, f)).isDirectory());

    if (files.length > 0) {
      const sampleFile = files[0];
      const relativeUrl = `/uploads/${sampleFile}`;
      const buf = await getImageBuffer(relativeUrl);
      assert.ok(Buffer.isBuffer(buf));
      assert.ok(buf.length > 0);
    }
  });

  it('getImageBuffer rejects nonexistent paths with descriptive error', async () => {
    await assert.rejects(
      async () => {
        await getImageBuffer('/uploads/nonexistent-file-xyz-12345.png');
      },
      /Image file not found on disk or network/
    );
  });

  it('correctly validates model3d status updates (NOT_STARTED -> PROCESSING -> COMPLETED)', () => {
    const item = new WardrobeItem({
      userId: '507f191e810c19729d924a11',
      name: 'Blue Denim Jacket',
      category: 'UPPER_WEAR',
    });

    // Simulate transition to PROCESSING
    item.model3d.status = 'PROCESSING';
    assert.strictEqual(item.model3d.status, 'PROCESSING');

    // Simulate completion with GLB path
    item.model3d.status = 'COMPLETED';
    item.model3d.url = '/uploads/models/model_123456_abc.glb';
    item.model3d.filename = 'model_123456_abc.glb';
    item.model3d.generatedAt = new Date();

    assert.strictEqual(item.model3d.status, 'COMPLETED');
    assert.strictEqual(item.model3d.url, '/uploads/models/model_123456_abc.glb');
    assert.strictEqual(item.model3d.engine, 'TripoSR');
  });
});
