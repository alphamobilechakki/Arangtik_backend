const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');
const DensityCategory = require('../src/modules/admin/densityCategory/densityCategory.model');
const Product = require('../src/modules/admin/product/product.model');

test('DensityCategory and Product Admin APIs Testing', async (t) => {
  await connectDB();

  const adminToken = jwt.sign(
    { id: new mongoose.Types.ObjectId().toString(), role: 'admin', isAdmin: true },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
  };

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const densityCatUrl = `http://localhost:${port}/api/admin/density-categories`;
  const productUrl = `http://localhost:${port}/api/admin/products`;

  let createdCategoryId = null;
  let createdProductId = null;

  t.after(async () => {
    if (createdProductId) await Product.findByIdAndDelete(createdProductId);
    if (createdCategoryId) await DensityCategory.findByIdAndDelete(createdCategoryId);
    server.close();
    await mongoose.disconnect();
  });

  // ─── Test 1: POST /api/admin/density-categories (Create) ─────────────────
  await t.test('1. POST /api/admin/density-categories - Create DensityCategory with image', async () => {
    const payload = {
      materialType: 'Test Wheat Flour ' + Date.now(),
      defaultDensity: 0.59,
      densityUnit: 'g/ml',
      image: 'https://cdn.arangtik.com/images/wheat_flour.png',
    };

    const res = await fetch(densityCatUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.defaultDensity, 0.59);
    assert.strictEqual(body.data.densityUnit, 'g/ml');
    assert.strictEqual(body.data.image, 'https://cdn.arangtik.com/images/wheat_flour.png');
    createdCategoryId = body.data._id;
  });

  // ─── Test 2: GET /api/admin/density-categories (List with Pagination) ────
  await t.test('2. GET /api/admin/density-categories - List DensityCategories with pagination', async () => {
    const res = await fetch(`${densityCatUrl}?page=1&limit=5`);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.categories));
    assert.ok(body.data.pagination);
    assert.strictEqual(body.data.pagination.page, 1);
    assert.strictEqual(body.data.pagination.limit, 5);
    assert.ok(typeof body.data.pagination.total === 'number');
    const found = body.data.categories.some((cat) => cat._id === createdCategoryId);
    assert.strictEqual(found, true, 'Created category should be in the paginated list');
  });

  // ─── Test 3: GET /api/admin/density-categories/:id (Get by ID) ───────────
  await t.test('3. GET /api/admin/density-categories/:id - Get category by ID', async () => {
    const res = await fetch(`${densityCatUrl}/${createdCategoryId}`);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data._id, createdCategoryId);
  });

  // ─── Test 4: PATCH /api/admin/density-categories/:id (Update) ────────────
  await t.test('4. PATCH /api/admin/density-categories/:id - Update default density and image', async () => {
    const res = await fetch(`${densityCatUrl}/${createdCategoryId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        defaultDensity: 0.65,
        image: 'https://cdn.arangtik.com/images/wheat_flour_v2.png',
      }),
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.defaultDensity, 0.65);
    assert.strictEqual(body.data.image, 'https://cdn.arangtik.com/images/wheat_flour_v2.png');
  });

  // ─── Test 5: POST /api/admin/products (Create Product with Aliases) ─────
  await t.test('5. POST /api/admin/products - Create Product linked to category with aliases', async () => {
    const payload = {
      name: 'Ashirvaad Shudh Chakki Atta',
      aliases: ['Chakki Atta', 'Wheat Flour'],
      densityCategoryId: createdCategoryId,
      densityOverride: null,
    };

    const res = await fetch(productUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert.strictEqual(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, 'Ashirvaad Shudh Chakki Atta');
    assert.deepStrictEqual(body.data.aliases, ['Chakki Atta', 'Wheat Flour']);
    assert.strictEqual(body.data.densityCategoryId._id, createdCategoryId);
    // Effective density should fall back to category's 0.65
    assert.strictEqual(body.data.effectiveDensity, 0.65);
    createdProductId = body.data._id;
  });

  // ─── Test 5b: POST /api/admin/products/bulk (Bulk Create Products) ────────
  await t.test('5b. POST /api/admin/products/bulk - Bulk create products with aliases', async () => {
    const payload = {
      densityCategoryId: createdCategoryId,
      products: [
        { name: 'Bulk Product Alpha', aliases: ['Alpha 1', 'Alpha 2'] },
        { name: 'Bulk Product Beta', aliases: ['Beta 1'], densityOverride: 0.9 },
      ],
    };

    const res = await fetch(`${productUrl}/bulk`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    assert.strictEqual(res.status, 201, `Expected 201, got ${res.status}`);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.count, 2);
    assert.strictEqual(body.data.products.length, 2);
    // Cleanup the bulk products
    await Product.deleteMany({ _id: { $in: body.data.products.map((p) => p._id) } });
  });

  // ─── Test 6: GET /api/admin/products (Search by Alias) ───────────────────
  await t.test('6. GET /api/admin/products - Search products by alias', async () => {
    const res = await fetch(`${productUrl}?search=Chakki`);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data.products));
    const found = body.data.products.some((p) => p._id === createdProductId);
    assert.strictEqual(found, true, 'Product should be found via alias search');
  });

  // ─── Test 7: GET /api/admin/products/:id (Get Product by ID) ─────────────
  await t.test('7. GET /api/admin/products/:id - Get single product', async () => {
    const res = await fetch(`${productUrl}/${createdProductId}`);
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data._id, createdProductId);
    assert.strictEqual(body.data.effectiveDensity, 0.65);
  });

  // ─── Test 8: PATCH /api/admin/products/:id (Update density override) ─────
  await t.test('8. PATCH /api/admin/products/:id - Set densityOverride', async () => {
    const res = await fetch(`${productUrl}/${createdProductId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ densityOverride: 0.72 }),
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.densityOverride, 0.72);
    assert.strictEqual(body.data.effectiveDensity, 0.72);
  });

  // ─── Test 9: DELETE category fails when product is using it ──────────────
  await t.test('9. DELETE /api/admin/density-categories/:id - Blocked when product exists', async () => {
    const res = await fetch(`${densityCatUrl}/${createdCategoryId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const body = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes('Cannot delete'));
  });

  // ─── Test 10: DELETE /api/admin/products/:id ─────────────────────────────
  await t.test('10. DELETE /api/admin/products/:id - Delete product', async () => {
    const res = await fetch(`${productUrl}/${createdProductId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    createdProductId = null;
  });

  // ─── Test 11: DELETE /api/admin/density-categories/:id (Soft Deletion) ──
  await t.test('11. DELETE /api/admin/density-categories/:id - Successfully soft delete category', async () => {
    const res = await fetch(`${densityCatUrl}/${createdCategoryId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const body = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);

    // Verify it is excluded from regular queries
    const findNormal = await DensityCategory.findById(createdCategoryId);
    assert.strictEqual(findNormal, null, 'Soft-deleted item should not be found by normal findById');

    // Verify it exists with isDeleted: true in withDeleted query
    const findDeleted = await DensityCategory.findById(createdCategoryId).withDeleted();
    assert.ok(findDeleted, 'Soft-deleted item should exist with withDeleted');
    assert.strictEqual(findDeleted.isDeleted, true);
    assert.ok(findDeleted.deletedAt instanceof Date);

    // Clean up from database
    await DensityCategory.findByIdAndDelete(createdCategoryId);
    createdCategoryId = null;
  });
});

