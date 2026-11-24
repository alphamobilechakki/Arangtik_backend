require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }
});

test.after(async () => {
  const JewelleryCategory = require('../src/modules/jewellery/category/jewelleryCategory.model');
  await JewelleryCategory.deleteMany({ code: { $regex: /^TEST_/ } });
});

test('JewelleryCategory - Model, Service, and Lifecycle tests', async (t) => {
  const jewelleryCategoryService = require('../src/modules/jewellery/category/jewelleryCategory.service');
  const JewelleryCategory = require('../src/modules/jewellery/category/jewelleryCategory.model');

  await t.test('1. Should create a new category and auto-generate code', async () => {
    const cat = await jewelleryCategoryService.createCategory({
      name: 'Test Necklace Deluxe',
      description: 'Handcrafted necklaces',
    });

    assert.ok(cat._id);
    assert.equal(cat.name, 'Test Necklace Deluxe');
    assert.equal(cat.code, 'TEST_NECKLACE_DELUXE');
    assert.equal(cat.isActive, true);
    assert.equal(cat.isDeleted, false);
  });

  await t.test('2. Should reject duplicate category name or code', async () => {
    await assert.rejects(
      async () => {
        await jewelleryCategoryService.createCategory({
          name: 'test necklace deluxe',
        });
      },
      (err) => {
        assert.equal(err.statusCode, 409);
        return true;
      }
    );
  });

  await t.test('3. Should fetch categories with search filter and pagination', async () => {
    await jewelleryCategoryService.createCategory({
      name: 'Test Earring Special',
      description: 'Diamond and gold earrings',
    });

    const result = await jewelleryCategoryService.getAllCategories({
      search: 'Test Earring',
      page: 1,
      limit: 10,
    });

    assert.ok(Array.isArray(result.categories));
    assert.ok(result.categories.length >= 1);
    assert.equal(result.categories[0].name, 'Test Earring Special');
    assert.equal(result.pagination.total >= 1, true);
  });

  await t.test('4. Should update category name and description', async () => {
    const found = await JewelleryCategory.findOne({ code: 'TEST_NECKLACE_DELUXE' });
    assert.ok(found);

    const updated = await jewelleryCategoryService.updateCategory(found._id, {
      name: 'Test Necklace Royal',
      description: 'Royal bridal necklace',
    });

    assert.equal(updated.name, 'Test Necklace Royal');
    assert.equal(updated.description, 'Royal bridal necklace');
  });

  await t.test('5. Should soft delete category and exclude from standard queries', async () => {
    const found = await JewelleryCategory.findOne({ code: 'TEST_NECKLACE_DELUXE' });
    assert.ok(found);

    const deleteRes = await jewelleryCategoryService.deleteCategory(found._id);
    assert.equal(deleteRes.message, 'Jewellery category deleted successfully');

    // Standard find should not return it
    const afterDelete = await JewelleryCategory.findById(found._id);
    assert.equal(afterDelete, null);

    // withDeleted should return it
    const withDel = await JewelleryCategory.findById(found._id).withDeleted();
    assert.ok(withDel);
    assert.equal(withDel.isDeleted, true);
    assert.ok(withDel.deletedAt);
  });

  await t.test('6. Re-creating same category should revive soft-deleted document', async () => {
    const revived = await jewelleryCategoryService.createCategory({
      name: 'Test Necklace Royal',
      description: 'Revived bridal necklace',
    });

    assert.equal(revived.name, 'Test Necklace Royal');
    assert.equal(revived.isDeleted, false);
    assert.equal(revived.deletedAt, null);
  });
});
