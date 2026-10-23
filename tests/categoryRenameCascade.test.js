const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
require('dotenv').config();

const VendorCategory = require('../src/modules/admin/vendorCategory/vendorCategory.model');
const vendorCategoryService = require('../src/modules/admin/vendorCategory/vendorCategory.service');
const Order = require('../src/modules/order/order.model');
const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');

test('Category Rename Cascading Tests', async (t) => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/arangtik');

  let testCat;
  let testVendor;
  let testOrder;
  const initialName = `TestCat_${Date.now()}`;
  const updatedName = `RenamedCat_${Date.now()}`;

  await t.test('1. Setup category, vendor, and order with initial name', async () => {
    testCat = await vendorCategoryService.createCategory({
      name: initialName,
      icon: '✨',
      description: 'Initial Category Description',
    });
    assert.strictEqual(testCat.name, initialName);

    testVendor = await RegisteredVendor.create({
      name: 'Cascade Vendor Test',
      phone: `9199${Math.floor(10000000 + Math.random() * 90000000)}`,
      category: initialName,
      primaryCategory: initialName,
      categories: [initialName],
      vendorId: `VTEST-${Date.now()}`,
    });
    assert.strictEqual(testVendor.category, initialName);

    testOrder = await Order.create({
      userId: new mongoose.Types.ObjectId(),
      userName: 'Test Customer',
      userPhone: '919876543210',
      orderCategory: initialName,
      orderType: 'LAUNDRY_WORK_ORDER',
      vendorId: testVendor._id,
      vendorPhone: testVendor.phone,
      vendorName: testVendor.name,
      items: [{ name: 'Shirt', clothType: 'Shirt', serviceType: 'WASH', quantity: 1 }],
      totalItems: 1,
    });
    assert.strictEqual(testOrder.orderCategory, initialName);
  });

  await t.test('2. Admin updates category name via PATCH updateCategory', async () => {
    const updated = await vendorCategoryService.updateCategory(testCat._id, {
      name: updatedName,
    });
    assert.strictEqual(updated.name, updatedName);
  });

  await t.test('3. Verify cascading rename in Orders and RegisteredVendors', async () => {
    const foundOrder = await Order.findById(testOrder._id);
    assert.strictEqual(foundOrder.orderCategory, updatedName, 'Order orderCategory must be dynamically updated');

    const foundVendor = await RegisteredVendor.findById(testVendor._id);
    assert.strictEqual(foundVendor.category, updatedName, 'Vendor category must be dynamically updated');
    assert.strictEqual(foundVendor.primaryCategory, updatedName, 'Vendor primaryCategory must be dynamically updated');
    assert.ok(foundVendor.categories.includes(updatedName), 'Vendor categories array must include updated category name');
  });

  await t.test('4. Cleanup test data', async () => {
    await VendorCategory.findByIdAndDelete(testCat._id);
    await RegisteredVendor.findByIdAndDelete(testVendor._id);
    await Order.findByIdAndDelete(testOrder._id);
  });

  await mongoose.disconnect();
});
