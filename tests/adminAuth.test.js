const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const adminAuthService = require('../src/modules/admin/auth/adminAuth.service');
const Admin = require('../src/modules/admin/auth/admin.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../src/config/env.config');

test('Admin Authentication & Session Persistence', async (t) => {
  await connectDB();

  // 1. Seed or find default admin
  const defaultAdmin = await adminAuthService.seedDefaultAdmin();
  assert.ok(defaultAdmin, 'Default admin should be seeded');
  assert.strictEqual(defaultAdmin.role, 'admin');

  let adminToken = null;
  let adminId = null;

  await t.test('1. loginAdmin succeeds with correct credentials', async () => {
    const res = await adminAuthService.loginAdmin('6202579799', '123456');
    assert.ok(res.token, 'Token must be returned');
    assert.ok(res.admin, 'Admin profile must be returned');
    assert.strictEqual(res.admin.role, 'admin');
    adminToken = res.token;
    adminId = res.admin._id;
  });

  await t.test('2. Token decodes with admin role and adminId', async () => {
    const decoded = jwt.verify(adminToken, JWT_SECRET);
    assert.strictEqual(decoded.role, 'admin');
    assert.strictEqual(decoded.isAdmin, true);
    assert.strictEqual(decoded.id.toString(), adminId.toString());
  });

  await t.test('3. getAdminProfile retrieves profile by ID', async () => {
    const profile = await adminAuthService.getAdminProfile(adminId);
    assert.strictEqual(profile._id.toString(), adminId.toString());
    assert.strictEqual(profile.role, 'admin');
    assert.strictEqual(profile.status, 'ACTIVE');
  });

  await t.test('4. getAdminProfile gracefully handles missing or service adminId', async () => {
    // When called without ID or with 'admin_service', it should fallback safely without throwing 400
    const profileWithoutId = await adminAuthService.getAdminProfile(undefined);
    assert.ok(profileWithoutId, 'Should fallback to default active admin');
    assert.strictEqual(profileWithoutId.role, 'admin');

    const profileWithServiceId = await adminAuthService.getAdminProfile('admin_service');
    assert.ok(profileWithServiceId, 'Should fallback to active admin');
    assert.strictEqual(profileWithServiceId.role, 'admin');
  });

  await t.test('5. loginAdmin rejects wrong password', async () => {
    await assert.rejects(
      async () => {
        await adminAuthService.loginAdmin('6202579799', 'wrongpassword');
      },
      /Invalid mobile number or password/i
    );
  });

  await mongoose.connection.close();
});
