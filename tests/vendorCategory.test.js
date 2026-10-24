const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const vendorCategoryService = require('../src/modules/admin/vendorCategory/vendorCategory.service');
const VendorCategory = require('../src/modules/admin/vendorCategory/vendorCategory.model');

test('Vendor Category Image Support & Management Tests', async (t) => {
  await connectDB();

  const testCatName = 'Test Service Category For Image';
  await VendorCategory.deleteMany({ name: testCatName });

  let testCatId = null;

  await t.test('1. getAllCategories returns category list successfully', async () => {
    const categories = await vendorCategoryService.getAllCategories({ includeInactive: true });
    assert.ok(Array.isArray(categories), 'Categories must be an array');
  });

  await t.test('2. createCategory with relative image path formats to full URL and syncs image/imageUrl', async () => {
    const created = await vendorCategoryService.createCategory({
      name: testCatName,
      icon: '🚗',
      image: '/uploads/categories/car_care.png',
      description: 'Vehicle cleaning and detailing services',
      sortOrder: 15,
    });

    assert.ok(created._id, 'Category ID must exist');
    assert.strictEqual(created.name, testCatName);
    assert.strictEqual(created.icon, '🚗');
    assert.ok(created.image.includes('/uploads/categories/car_care.png'), 'image should contain uploaded path');
    assert.ok(created.imageUrl.includes('/uploads/categories/car_care.png'), 'imageUrl should contain uploaded path');
    assert.strictEqual(created.image, created.imageUrl, 'image and imageUrl must be identical');
    assert.ok(
      created.image.startsWith('http://') || created.image.startsWith('https://'),
      'image URL must be absolute'
    );
    testCatId = created._id;
  });

  await t.test('3. updateCategory via PATCH updates image and keeps image/imageUrl in sync', async () => {
    const updated = await vendorCategoryService.updateCategory(testCatId, {
      imageUrl: '/uploads/categories/car_care_v2.webp',
      description: 'Updated vehicle cleaning description',
    });

    assert.ok(updated.image.includes('car_care_v2.webp'), 'image should reflect updated URL');
    assert.ok(updated.imageUrl.includes('car_care_v2.webp'), 'imageUrl should reflect updated URL');
    assert.strictEqual(updated.image, updated.imageUrl, 'image and imageUrl must stay synced on update');
    assert.strictEqual(updated.description, 'Updated vehicle cleaning description');
  });

  await t.test('4. updateCategory with uploaded file object (multer) updates imageUrl', async () => {
    const mockFile = {
      filename: 'cat_img_abc123.jpg',
      url: 'http://localhost:8083/uploads/cat_img_abc123.jpg',
    };

    const updated = await vendorCategoryService.updateCategory(testCatId, {}, mockFile);
    assert.strictEqual(updated.imageUrl, 'http://localhost:8083/uploads/cat_img_abc123.jpg');
    assert.strictEqual(updated.image, 'http://localhost:8083/uploads/cat_img_abc123.jpg');
  });

  await t.test('5. getAllCategories returns categories with both image and icon available', async () => {
    const all = await vendorCategoryService.getAllCategories({ includeInactive: true });
    const found = all.find((c) => c._id.toString() === testCatId.toString());
    assert.ok(found, 'Created test category must be in list');
    assert.strictEqual(found.imageUrl, 'http://localhost:8083/uploads/cat_img_abc123.jpg');
    assert.strictEqual(found.icon, '🚗');
  });

  await t.test('6. deleteCategory permanently cleans up test category', async () => {
    const result = await vendorCategoryService.deleteCategory(testCatId, true);
    assert.ok(result.message.includes('permanently deleted'));
    const verify = await VendorCategory.findById(testCatId);
    assert.strictEqual(verify, null, 'Category should be removed from database');
  });
});
