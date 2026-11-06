const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../src/app');
const { MONGODB_URI, JWT_SECRET, ADMIN_SYNC_API_KEY, RAZORPAY_KEY_SECRET } = require('../src/config/env.config');
const SubscriptionPlan = require('../src/modules/subscription/plan.model');
const UserSubscription = require('../src/modules/subscription/userSubscription.model');
const User = require('../src/modules/auth/user.model');
const Wardrobe = require('../src/modules/wardrobe/wardrobe.model');

// Mock Razorpay client in razorpay.config so network calls don't fail without live keys
const razorpayConfig = require('../src/config/razorpay.config');
razorpayConfig.getRazorpayInstance = () => ({
  orders: {
    create: async ({ amount, currency, receipt, notes }) => ({
      id: `order_test_${Date.now()}`,
      amount,
      currency,
      receipt,
      notes,
      status: 'created',
    }),
  },
});

let server;
let baseUrl;

function httpRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const reqOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

const results = [];
function recordTest(testName, passed, detail = '') {
  results.push({ testName, passed, detail });
  const symbol = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${symbol}: ${testName} ${detail ? `(${detail})` : ''}`);
}

async function runSubscriptionTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE SUBSCRIPTION & QUOTA TEST SUITE');
  console.log('======================================================\n');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // Start ephemeral HTTP server on random port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Prepare Test User
    let testUser = await User.findOne({ phone: '919999988888' });
    if (!testUser) {
      testUser = await User.create({
        phone: '919999988888',
        name: 'Subscription Test User',
        role: 'user',
      });
    }

    const userToken = jwt.sign(
      { id: testUser._id, phone: testUser.phone, role: testUser.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const authHeader = { Authorization: `Bearer ${userToken}` };
    const adminHeader = { 'x-api-key': ADMIN_SYNC_API_KEY || 'arangtik_admin_secret_2026' };

    // Reset user state
    await UserSubscription.deleteMany({ userId: testUser._id });
    await Wardrobe.deleteMany({ userId: testUser._id });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 1: Public Plans Retrieval
    // ──────────────────────────────────────────────────────────────────────────
    const res1 = await httpRequest('GET', '/api/subscription/plans');
    const plans1 = res1.body?.data || [];
    const has3Plans = plans1.length >= 3 && plans1.some((p) => p.code === 'basic');
    recordTest('TEST 1: GET /api/subscription/plans (Public Catalog)', res1.status === 200 && has3Plans, `Count: ${plans1.length}`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 2: Admin Plan Management (List, Edit Pricing & Limits)
    // ──────────────────────────────────────────────────────────────────────────
    const res2AdminGet = await httpRequest('GET', '/api/admin/subscription/plans', adminHeader);
    recordTest('TEST 2A: Admin GET /api/admin/subscription/plans', res2AdminGet.status === 200);

    const basicPlan = plans1.find((p) => p.code === 'basic');
    const res2AdminUpdate = await httpRequest(
      'PUT',
      `/api/admin/subscription/plans/${basicPlan._id}`,
      adminHeader,
      {
        description: 'Updated test description for Basic plan',
        limits: { wardrobes: 3 },
      }
    );
    recordTest(
      'TEST 2B: Admin PUT /api/admin/subscription/plans/:id (Update limits)',
      res2AdminUpdate.status === 200 && res2AdminUpdate.body?.data?.limits?.wardrobes === 3,
      `Wardrobe Limit: ${res2AdminUpdate.body?.data?.limits?.wardrobes}`
    );

    // Revert Basic plan wardrobe limit back to 2
    await SubscriptionPlan.findByIdAndUpdate(basicPlan._id, { 'limits.wardrobes': 2 });

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 3: User Initial Subscription Status (Free Tier Fallback)
    // ──────────────────────────────────────────────────────────────────────────
    const res3MySub = await httpRequest('GET', '/api/subscription/my', authHeader);
    recordTest(
      'TEST 3: User GET /api/subscription/my (No active subscription)',
      res3MySub.status === 200 && res3MySub.body?.data?.hasActiveSubscription === false
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 4: Create Razorpay Subscription Order
    // ──────────────────────────────────────────────────────────────────────────
    const res4Order = await httpRequest('POST', '/api/subscription/create-order', authHeader, {
      planCode: 'plus',
      durationMonths: 1,
      includesJewellery: false,
    });

    const orderData = res4Order.body?.data;
    const isOrderValid =
      res4Order.status === 200 &&
      orderData?.orderId &&
      orderData?.amount === 19900 && // 199 INR in paise
      orderData?.currency === 'INR';
    recordTest('TEST 4: POST /api/subscription/create-order (Plus 1 Month = ₹199)', isOrderValid, `OrderId: ${orderData?.orderId}`);

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 5: Verify Payment & Activate Subscription
    // ──────────────────────────────────────────────────────────────────────────
    const fakePaymentId = `pay_test_${Date.now()}`;
    const validSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${orderData?.orderId}|${fakePaymentId}`)
      .digest('hex');

    // 5A. Tampered signature should fail
    const res5Fail = await httpRequest('POST', '/api/subscription/verify', authHeader, {
      razorpayOrderId: orderData?.orderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: 'invalid_signature_hex_1234567890',
    });
    recordTest(
      'TEST 5A: POST /api/subscription/verify with forged signature (Should Reject)',
      res5Fail.status === 400
    );

    // 5B. Genuine signature should succeed & activate
    const res5Success = await httpRequest('POST', '/api/subscription/verify', authHeader, {
      razorpayOrderId: orderData?.orderId,
      razorpayPaymentId: fakePaymentId,
      razorpaySignature: validSignature,
    });

    const activeSub = res5Success.body?.data?.subscription;
    recordTest(
      'TEST 5B: POST /api/subscription/verify with valid signature (Activate Plus Plan)',
      res5Success.status === 200 && activeSub?.status === 'active' && activeSub?.planCode === 'plus',
      `Expires: ${activeSub?.expiresAt}`
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 6: User GET /api/subscription/my Reflects Active Plan
    // ──────────────────────────────────────────────────────────────────────────
    const res6Check = await httpRequest('GET', '/api/subscription/my', authHeader);
    recordTest(
      'TEST 6: GET /api/subscription/my returns active status and limits snapshot',
      res6Check.status === 200 &&
        res6Check.body?.data?.hasActiveSubscription === true &&
        res6Check.body?.data?.subscription?.limitsSnapshot?.wardrobes === 5
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 7: Quota Enforcement Middleware Tests
    // ──────────────────────────────────────────────────────────────────────────
    // 7A: Plus plan allows 5 wardrobes. Insert 5 wardrobes directly.
    for (let i = 1; i <= 5; i++) {
      await Wardrobe.create({
        userId: testUser._id,
        name: `Wardrobe #${i}`,
        type: 'PERSONAL',
      });
    }

    // Attempting to create the 6th wardrobe must be rejected with 403
    const res7WardrobeBlock = await httpRequest(
      'POST',
      '/api/wardrobe/create-wardrobe',
      authHeader,
      { name: 'Wardrobe #6 Over Limit' }
    );

    recordTest(
      'TEST 7A: Quota Middleware Blocks 6th Wardrobe on Plus Plan (Limit: 5)',
      res7WardrobeBlock.status === 403,
      `Status: ${res7WardrobeBlock.status}`
    );

    // 7B: Monthly Credit Quota (AI Outfit Suggestions)
    // Plus plan limit: 15 per month. Simulate reached limit = 15
    await UserSubscription.updateOne(
      { userId: testUser._id, status: 'active' },
      { 'monthlyUsage.aiOutfitSuggestions': 15 }
    );

    const res7AiBlock = await httpRequest('POST', '/api/outfit/suggest', authHeader, {
      occasion: 'CASUAL',
    });

    recordTest(
      'TEST 7B: Quota Middleware Blocks AI Outfits when Monthly Limit Reached (Limit: 15)',
      res7AiBlock.status === 403,
      `Status: ${res7AiBlock.status}`
    );

    // Reset usage for cleanup
    await UserSubscription.updateOne(
      { userId: testUser._id, status: 'active' },
      { 'monthlyUsage.aiOutfitSuggestions': 0 }
    );

    // ──────────────────────────────────────────────────────────────────────────
    // TEST 8: Admin Subscription Stats & Analytics
    // ──────────────────────────────────────────────────────────────────────────
    const res8Stats = await httpRequest('GET', '/api/admin/subscription/stats', adminHeader);
    recordTest(
      'TEST 8: Admin GET /api/admin/subscription/stats (Total Revenue >= ₹199)',
      res8Stats.status === 200 && res8Stats.body?.data?.totalRevenue >= 199,
      `Revenue: ₹${res8Stats.body?.data?.totalRevenue}`
    );

    // Cleanup
    await Wardrobe.deleteMany({ userId: testUser._id });
    await UserSubscription.deleteMany({ userId: testUser._id });

    console.log('\n======================================================');
    const passedCount = results.filter((r) => r.passed).length;
    console.log(`🏁 TEST SUITE COMPLETED: ${passedCount}/${results.length} PASSED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Test suite execution failed:', err);
  } finally {
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(results.every((r) => r.passed) ? 0 : 1);
  }
}

runSubscriptionTestSuite();
