const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const vendorAuthService = require('../src/modules/vendor/vendorAuth.service');
const RegisteredVendor = require('../src/modules/vendor/registeredVendor.model');
const Otp = require('../src/modules/auth/otp.model');

test('Vendor WhatsApp OTP Authentication & Passwordless Flow', async (t) => {
  await connectDB();

  const testPhone = '919999888801';
  const dummyOtp = '9876';

  // Cleanup before test
  await RegisteredVendor.deleteMany({ phone: testPhone });
  await Otp.deleteMany({ phone: testPhone });

  await t.test('1. sendOtp for new vendor detects isExistingVendor: false', async () => {
    const res = await vendorAuthService.sendOtp(testPhone);
    assert.strictEqual(res.phone, testPhone);
    assert.strictEqual(res.isExistingVendor, false);
    assert.strictEqual(typeof res.expiresInMinutes, 'number');

    const otpDoc = await Otp.findOne({ phone: testPhone });
    assert.ok(otpDoc, 'OTP record should be created in DB');
    assert.strictEqual(typeof otpDoc.otp, 'string');
  });

  await t.test('2. verifyOtp fails with invalid OTP', async () => {
    await assert.rejects(
      async () => {
        await vendorAuthService.verifyOtp(testPhone, '0000', {
          name: 'Ramesh Laundry',
          category: 'Dhobi',
        });
      },
      /Invalid or expired OTP/i
    );
  });

  await t.test('3. verifyOtp requires name & category when registering new vendor', async () => {
    // Manually set an OTP to test verification
    await Otp.deleteMany({ phone: testPhone });
    await Otp.create({
      phone: testPhone,
      otp: dummyOtp,
      expiresAt: new Date(Date.now() + 60000),
    });

    await assert.rejects(
      async () => {
        await vendorAuthService.verifyOtp(testPhone, dummyOtp, {});
      },
      /Vendor name is required/i
    );
  });

  await t.test('4. verifyOtp successfully registers new vendor and auto-logs in with JWT token', async () => {
    // Re-create OTP for this step
    await Otp.deleteMany({ phone: testPhone });
    await Otp.create({
      phone: testPhone,
      otp: dummyOtp,
      expiresAt: new Date(Date.now() + 60000),
    });

    const res = await vendorAuthService.verifyOtp(testPhone, dummyOtp, {
      name: 'Ramesh Laundry',
      category: 'Dhobi',
      businessName: 'Ramesh Dry Cleaners',
    });

    assert.ok(res.token, 'JWT Token must be returned');
    assert.strictEqual(res.isNewVendor, true);
    assert.strictEqual(res.vendor.name, 'Ramesh Laundry');
    assert.strictEqual(res.vendor.category, 'Dhobi');
    assert.strictEqual(res.vendor.isRegistered, true);
    assert.ok(res.vendor.vendorId.startsWith('VND-'), 'Auto-generated VND- ID should be present');

    // Verify OTP was cleaned up
    const remainingOtp = await Otp.findOne({ phone: testPhone });
    assert.strictEqual(remainingOtp, null, 'OTP record should be deleted after successful verification');
  });

  await t.test('5. sendOtp for now-registered vendor detects isExistingVendor: true', async () => {
    const res = await vendorAuthService.sendOtp(testPhone);
    assert.strictEqual(res.isExistingVendor, true, 'Registered vendor should be recognized');
  });

  await t.test('6. verifyOtp for existing vendor logs in directly with just phone & OTP', async () => {
    // Create new OTP
    await Otp.deleteMany({ phone: testPhone });
    await Otp.create({
      phone: testPhone,
      otp: dummyOtp,
      expiresAt: new Date(Date.now() + 60000),
    });

    // Login with only phone and OTP (no name or category needed!)
    const res = await vendorAuthService.verifyOtp(testPhone, dummyOtp);
    assert.ok(res.token, 'JWT Token must be returned for login');
    assert.strictEqual(res.isNewVendor, false, 'isNewVendor must be false for existing vendor');
    assert.strictEqual(res.vendor.phone, testPhone);
    assert.strictEqual(res.vendor.name, 'Ramesh Laundry');
  });

  await t.test('7. Play Store Review / Test Account (phone ending with 8949056321) works with 1234 bypass OTP', async () => {
    const testReviewPhone = '918949056321';
    
    // Ensure test account exists
    let testVendor = await RegisteredVendor.findOne({ phone: testReviewPhone });
    if (!testVendor) {
      testVendor = await RegisteredVendor.create({
        name: 'Reviewer Test Dhobi',
        phone: testReviewPhone,
        category: 'Dhobi',
        isRegistered: true,
        status: 'ACTIVE',
      });
    }

    const res = await vendorAuthService.verifyOtp(testReviewPhone, '1234');
    assert.ok(res.token, 'Test account must login successfully with 1234');
    assert.strictEqual(res.vendor.phone, testReviewPhone);
  });

  // Final cleanup
  await RegisteredVendor.deleteMany({ phone: testPhone });
  await Otp.deleteMany({ phone: testPhone });
  await mongoose.connection.close();
});
