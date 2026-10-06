const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

const app = require('../src/app');
const uploadHelper = require('../src/utils/upload.helper');
const {
  generateShortFilename,
  getImageUrl,
  saveBase64Image,
  getImageFilename,
  deleteUploadedImage,
  formatUploadedFile,
  formatUploadedFiles,
  UPLOAD_DIR,
} = uploadHelper;

test('Upload Helpers - Unit Tests', async (t) => {
  await t.test('generateShortFilename generates unique names with correct extension', () => {
    const fn1 = generateShortFilename('.jpg');
    const fn2 = generateShortFilename('png');
    assert.match(fn1, /^img_[a-z0-9]+_[a-f0-9]+\.jpg$/);
    assert.match(fn2, /^img_[a-z0-9]+_[a-f0-9]+\.png$/);
    assert.notStrictEqual(fn1, fn2);
  });

  await t.test('getImageUrl resolves static URL cleanly', () => {
    const url = getImageUrl('test_image.jpg');
    assert.strictEqual(url, '/api/uploads/test_image.jpg');

    const fullHttp = getImageUrl('https://example.com/image.jpg');
    assert.strictEqual(fullHttp, 'https://example.com/image.jpg');
  });

  await t.test('saveBase64Image saves base64 image and returns accessible URL', async () => {
    // 1x1 transparent PNG base64
    const base64Png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const savedUrl = await saveBase64Image(base64Png);
    assert.ok(savedUrl);
    assert.match(savedUrl, /\/api\/uploads\/img_/);

    const filename = getImageFilename(savedUrl);
    assert.ok(filename);
    const filePath = path.join(UPLOAD_DIR, filename);
    assert.strictEqual(fs.existsSync(filePath), true);

    // Clean up
    const deleted = await deleteUploadedImage(savedUrl);
    assert.strictEqual(deleted, true);
    assert.strictEqual(fs.existsSync(filePath), false);
  });
});

test('Upload API Endpoints - Integration Tests', async (t) => {
  let server;
  let baseUrl;

  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  t.after(() => {
    if (server) server.close();
  });

  await t.test('POST /api/upload/single (Base64)', async () => {
    const base64Png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/api/upload/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Png }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.url);

    // Verify static access
    const staticUrl = data.data.url.startsWith('http')
      ? data.data.url
      : `${baseUrl}${data.data.url}`;
    const staticRes = await fetch(staticUrl);
    assert.strictEqual(staticRes.status, 200);

    // Clean up
    const filename = getImageFilename(data.data.url);
    const delRes = await fetch(`${baseUrl}/api/upload/${filename}`, {
      method: 'DELETE',
    });
    assert.strictEqual(delRes.status, 200);
  });

  await t.test('POST /api/upload/multiple (Base64 Array)', async () => {
    const base64Png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/api/upload/multiple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: [base64Png, base64Png] }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.data.count, 2);
    assert.strictEqual(data.data.urls.length, 2);

    // Clean up
    for (const u of data.data.urls) {
      await deleteUploadedImage(u);
    }
  });

  await t.test('POST /api/upload/single (Multipart FormData)', async () => {
    const formData = new FormData();
    const dummyBlob = new Blob(['test image content'], { type: 'image/jpeg' });
    formData.append('image', dummyBlob, 'test_sample.jpg');

    const res = await fetch(`${baseUrl}/api/upload/single`, {
      method: 'POST',
      body: formData,
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.data.url);
    assert.ok(data.data.file.filename);

    // Verify both /api/uploads and /uploads paths
    const url1 = `${baseUrl}/api/uploads/${data.data.file.filename}`;
    const url2 = `${baseUrl}/uploads/${data.data.file.filename}`;

    const res1 = await fetch(url1);
    assert.strictEqual(res1.status, 200);

    const res2 = await fetch(url2);
    assert.strictEqual(res2.status, 200);

    // Clean up
    const filename = data.data.file.filename;
    const delRes = await fetch(`${baseUrl}/api/upload/${filename}`, {
      method: 'DELETE',
    });
    assert.strictEqual(delRes.status, 200);
  });
});
