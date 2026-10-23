const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const adminVendorService = require('../src/modules/admin/vendor/adminVendor.service');
const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');
const UnregisteredVendor = require('../src/modules/vendor/unregisteredVendor.model');

test('Admin Vendor Management Service & Workflows', async (t) => {
  await connectDB();

  const testPhone1 = '919876500001';
  const testPhone2 = '919876500002';

  // Cleanup before tests
  await RegisteredVendor.deleteMany({ phone: { $in: [testPhone1, testPhone2] } });
  await UnregisteredVendor.deleteMany({ phone: { $in: [testPhone1, testPhone2] } });

  let registeredVendorId = null;
  let unregisteredVendorId = null;

  await t.test('1. getVendorStats returns valid metrics structure', async () => {
    const stats = await adminVendorService.getVendorStats();
    assert.ok(stats.registered, 'Should contain registered stats');
    assert.strictEqual(typeof stats.registered.total, 'number');
    assert.strictEqual(typeof stats.registered.active, 'number');
    assert.ok(stats.unregistered, 'Should contain unregistered stats');
    assert.strictEqual(typeof stats.unregistered.total, 'number');
    assert.strictEqual(typeof stats.totalOrdersProcessed, 'number');
    assert.ok(Array.isArray(stats.categoryDistribution), 'categoryDistribution must be an array');
  });

  await t.test('2. createRegisteredVendor successfully onboards a new registered vendor', async () => {
    const vendor = await adminVendorService.createRegisteredVendor({
      name: 'Super Express Laundry',
      phone: testPhone1,
      category: 'Dhobi',
      businessName: 'Super Express Wash Services',
      status: 'ACTIVE',
      address: {
        street: 'MG Road 12',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      rating: 4.8,
      isVerified: true,
    });

    assert.ok(vendor._id, 'Vendor ID must exist');
    assert.strictEqual(vendor.name, 'Super Express Laundry');
    assert.strictEqual(vendor.phone, testPhone1);
    assert.strictEqual(vendor.status, 'ACTIVE');
    assert.strictEqual(vendor.address.city, 'Jaipur');
    assert.ok(vendor.vendorId.startsWith('VND-'), 'vendorId should be auto-generated');
    registeredVendorId = vendor._id;
  });

  await t.test('3. getRegisteredVendors finds the created vendor with search and pagination', async () => {
    const res = await adminVendorService.getRegisteredVendors({
      search: 'Super Express',
      page: 1,
      limit: 10,
    });

    assert.ok(Array.isArray(res.vendors), 'vendors must be an array');
    assert.ok(res.vendors.length >= 1, 'Should find at least 1 vendor');
    const found = res.vendors.find((v) => v.phone === testPhone1);
    assert.ok(found, 'Should find the created test vendor');
    assert.strictEqual(res.pagination.currentPage, 1);
  });

  await t.test('4. updateRegisteredVendor updates businessName and address', async () => {
    const updated = await adminVendorService.updateRegisteredVendor(registeredVendorId, {
      businessName: 'Super Express Premium Dry Clean',
      address: {
        city: 'Udaipur',
      },
    });

    assert.strictEqual(updated.businessName, 'Super Express Premium Dry Clean');
    assert.strictEqual(updated.address.city, 'Udaipur');
    assert.strictEqual(updated.address.state, 'Rajasthan'); // Preserved
  });

  await t.test('5. updateRegisteredVendorStatus changes status to SUSPENDED', async () => {
    const updated = await adminVendorService.updateRegisteredVendorStatus(registeredVendorId, 'SUSPENDED');
    assert.strictEqual(updated.status, 'SUSPENDED');

    // Restore to ACTIVE
    const restored = await adminVendorService.updateRegisteredVendorStatus(registeredVendorId, 'ACTIVE');
    assert.strictEqual(restored.status, 'ACTIVE');
  });

  await t.test('6. Unregistered vendor creation and listing', async () => {
    const unreg = await UnregisteredVendor.create({
      phone: testPhone2,
      name: 'Local Raju Dhobi',
      totalOrders: 3,
      isConvertedToRegistered: false,
    });
    unregisteredVendorId = unreg._id;

    const res = await adminVendorService.getUnregisteredVendors({
      search: 'Local Raju',
      isConverted: 'false',
    });

    assert.ok(res.vendors.length >= 1, 'Should find unregistered vendor');
    const found = res.vendors.find((v) => v.phone === testPhone2);
    assert.ok(found, 'Should find test unregistered vendor');
    assert.strictEqual(found.isConvertedToRegistered, false);
  });

  await t.test('7. convertUnregisteredVendor successfully converts lead to official registered vendor', async () => {
    const result = await adminVendorService.convertUnregisteredVendor(unregisteredVendorId, {
      name: 'Raju Dhobi & Sons',
      category: 'Dhobi',
      businessName: 'Raju Modern Laundry',
    });

    assert.ok(result.vendor, 'Official vendor must be created/linked');
    assert.strictEqual(result.vendor.isRegistered, true);
    assert.strictEqual(result.vendor.name, 'Raju Dhobi & Sons');
    assert.strictEqual(result.vendor.phone, testPhone2);
    assert.strictEqual(result.unregisteredVendor.isConvertedToRegistered, true);
    assert.ok(result.unregisteredVendor.convertedVendorId, 'convertedVendorId must be set');
  });

  // Cleanup
  await RegisteredVendor.deleteMany({ phone: { $in: [testPhone1, testPhone2] } });
  await UnregisteredVendor.deleteMany({ phone: { $in: [testPhone1, testPhone2] } });
  await mongoose.connection.close();
});
