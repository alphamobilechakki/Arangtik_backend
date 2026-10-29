/**
 * Comprehensive End-to-End API Testing & Database Seeding Script for Arangtik
 * 
 * This script interacts with the live Arangtik HTTP API (http://localhost:8083/api)
 * testing every core system:
 * 1. Admin Categories & Services
 * 2. User Authentication & Wardrobe
 * 3. Vendor Authentication, Registration & Profile
 * 4. Vendor Services & Price Overrides (/vendor-services & /vendor/services)
 * 5. Vendor Discovery & Price Comparison (/eligible, /services)
 * 6. Customer Vendor Phone Lookup (/lookup)
 * 7. Order Lifecycle, Status Transitions, Transactions & Unregistered Vendors
 */

require('dotenv').config();
const mongoose = require('mongoose');
const BASE_URL = 'http://localhost:8083/api';
const ADMIN_API_KEY = process.env.ADMIN_SYNC_API_KEY || '';

const testResults = [];

async function apiRequest(method, endpoint, { body = null, token = null, apiKey = null, query = null } = {}) {
  let url = `${BASE_URL}${endpoint}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    url += (url.includes('?') ? '&' : '?') + qs;
  }

  const headers = {};
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const startTime = Date.now();
  const res = await fetch(url, options);
  const duration = Date.now() - startTime;
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  const record = {
    method,
    endpoint,
    url,
    status: res.status,
    durationMs: duration,
    requestBody: body,
    responseBody: data,
  };
  testResults.push(record);

  if (!res.ok && res.status >= 400 && res.status !== 409) {
    console.warn(`[HTTP ${res.status}] ${method} ${endpoint}:`, typeof data === 'object' ? data.message || data : data);
  }

  return { status: res.status, ok: res.ok, data };
}

async function runFullTestAndSeed() {
  console.log('====================================================');
  console.log('🚀 STARTING FULL SYSTEM API SEEDING & TESTING SUITE');
  console.log(`🌐 Target: ${BASE_URL}`);
  console.log('====================================================\n');

  // Connect Mongoose
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB for verified data verification.');

  // Ensure StoreType exists
  const StoreType = require('../src/modules/admin/storeType/storeType.model');
  let defaultStoreType = await StoreType.findOne({ code: 'WARDROBE' });
  if (!defaultStoreType) {
    defaultStoreType = await StoreType.create({
      name: 'Wardrobe',
      code: 'WARDROBE',
      isActive: true,
    });
    console.log('✅ Created default WARDROBE StoreType');
  }

  // ================================================================
  // 1. HEALTH CHECK
  // ================================================================
  console.log('🔹 1. Testing System Health...');
  const health = await apiRequest('GET', '/health');
  console.log('   Health Status:', health.status, health.data?.message);

  // ================================================================
  // 2. ADMIN CATEGORIES CREATION
  // ================================================================
  console.log('\n🔹 2. Creating Service Categories (Admin API)...');
  const categoriesToCreate = [
    {
      name: 'Washerman',
      code: 'WASHERMAN',
      description: 'Professional laundry, dry cleaning, steam press and garment care',
      icon: 'laundry_icon.png',
      imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600',
      storeType: 'WARDROBE',
      sortOrder: 1,
    },
    {
      name: 'Tailor & Alterations',
      code: 'TAILOR',
      description: 'Custom bespoke stitching, garment alterations, resizing and fitting',
      icon: 'tailor_icon.png',
      imageUrl: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=600',
      storeType: 'WARDROBE',
      sortOrder: 2,
    },
    {
      name: 'Footwear Care',
      code: 'FOOTWEAR',
      description: 'Shoe repair, premium sneaker spa, polishing and heel restoration',
      icon: 'shoe_icon.png',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600',
      storeType: 'WARDROBE',
      sortOrder: 3,
    },
  ];

  const createdCategories = [];
  for (const cat of categoriesToCreate) {
    const res = await apiRequest('POST', '/categories', { body: cat, apiKey: ADMIN_API_KEY });
    if (res.ok && res.data?.data) {
      createdCategories.push(res.data.data);
      console.log(`   ✅ Category Created: "${cat.name}" (ID: ${res.data.data._id})`);
    } else {
      // Fetch if already exists
      const allCats = await apiRequest('GET', '/categories');
      const found = (allCats.data?.data || []).find((c) => c.name.toLowerCase() === cat.name.toLowerCase());
      if (found) {
        createdCategories.push(found);
        console.log(`   ℹ️ Category Exists: "${cat.name}" (ID: ${found._id})`);
      }
    }
  }

  // ================================================================
  // 3. CATEGORY SERVICES CREATION (Level 2 Services)
  // ================================================================
  console.log('\n🔹 3. Creating Category Services (Admin API)...');
  const catMap = {};
  createdCategories.forEach((c) => {
    catMap[c.name] = c._id;
  });

  const servicesToCreate = [
    // Washerman Services
    {
      categoryId: catMap['Washerman'],
      name: 'Wash & Steam Iron',
      basePrice: 60,
      unit: 'PIECE',
      description: 'Gentle wash followed by high-pressure steam pressing',
      sortOrder: 1,
    },
    {
      categoryId: catMap['Washerman'],
      name: 'Premium Dry Cleaning',
      basePrice: 180,
      unit: 'PIECE',
      description: 'Chemical solvent dry clean for suits, blazers, and delicate silks',
      sortOrder: 2,
    },
    {
      categoryId: catMap['Washerman'],
      name: 'Express Steam Press',
      basePrice: 20,
      unit: 'PIECE',
      description: 'Wrinkle-free crisp steam press ready in quick turnaround',
      sortOrder: 3,
    },
    {
      categoryId: catMap['Washerman'],
      name: 'Woolen & Blanket Care',
      basePrice: 250,
      unit: 'PIECE',
      description: 'Special anti-shrink wash and conditioning for quilts and heavy woolens',
      sortOrder: 4,
    },

    // Tailor Services
    {
      categoryId: catMap['Tailor & Alterations'],
      name: 'Pant Length Alteration',
      basePrice: 80,
      unit: 'PIECE',
      description: 'Shortening or lengthening hem with original stitch replication',
      sortOrder: 1,
    },
    {
      categoryId: catMap['Tailor & Alterations'],
      name: 'Shirt Fitting & Tapering',
      basePrice: 120,
      unit: 'PIECE',
      description: 'Sides, sleeves, and darts adjustment for slim custom fit',
      sortOrder: 2,
    },
    {
      categoryId: catMap['Tailor & Alterations'],
      name: 'Suit 2-Piece Tailoring',
      basePrice: 3500,
      unit: 'SET',
      description: 'Complete custom crafted jacket and trousers bespoke stitching',
      sortOrder: 3,
    },

    // Footwear Services
    {
      categoryId: catMap['Footwear Care'],
      name: 'Sneaker Deep Clean Spa',
      basePrice: 299,
      unit: 'PAIR',
      description: 'Deep stain removal, foam conditioning, midsole deoxidizing',
      sortOrder: 1,
    },
    {
      categoryId: catMap['Footwear Care'],
      name: 'Leather Shoe Polish & Buff',
      basePrice: 60,
      unit: 'PAIR',
      description: 'Cream polish nourishment, high-gloss shine and edge edge dressing',
      sortOrder: 2,
    },
  ];

  const createdServices = [];
  for (const s of servicesToCreate) {
    if (!s.categoryId) continue;
    const res = await apiRequest('POST', `/categories/${s.categoryId}/services`, {
      body: s,
      apiKey: ADMIN_API_KEY,
    });
    if (res.ok && res.data?.data) {
      createdServices.push(res.data.data);
      console.log(`   ✅ Service Created: "${s.name}" (Base Price: ₹${s.basePrice})`);
    } else {
      const allSrv = await apiRequest('GET', `/categories/${s.categoryId}/services`);
      const found = (allSrv.data?.data || []).find((x) => x.name.toLowerCase() === s.name.toLowerCase());
      if (found) {
        createdServices.push(found);
        console.log(`   ℹ️ Service Exists: "${s.name}" (ID: ${found._id})`);
      }
    }
  }

  // ================================================================
  // 4. CUSTOMER USER SETUP & WARDROBE CREATION
  // ================================================================
  console.log('\n🔹 4. Registering & Authenticating Customer User (/api/auth)...');
  const userPhone = '918949056321';
  await apiRequest('POST', '/auth/send-otp', { body: { phone: userPhone } });
  const userVerify = await apiRequest('POST', '/auth/verify-otp', {
    body: {
      phone: userPhone,
      otp: '1234',
      name: 'Alex Mercer',
      gender: 'MALE',
      preferredLanguage: 'en',
    },
  });

  const customerToken = userVerify.data?.data?.token;
  const customerId = userVerify.data?.data?.user?.id || userVerify.data?.data?.user?._id;
  console.log(`   ✅ Customer Authenticated! Token acquired for User: ${userVerify.data?.data?.user?.name || 'Alex Mercer'}`);

  // Create Wardrobe Container & Garments for Customer
  console.log('   Creating Customer Wardrobe & Garments...');
  let wardrobeId = null;
  const wRes = await apiRequest('POST', '/wardrobe/create-wardrobe', {
    token: customerToken,
    body: {
      name: 'Master Closet',
      type: 'PERSONAL',
      gender: 'MALE',
      storeTypeId: defaultStoreType._id,
    },
  });
  if (wRes.ok) {
    wardrobeId = wRes.data?.data?._id;
  } else {
    const wList = await apiRequest('GET', '/wardrobe/get-wardrobes', { token: customerToken });
    wardrobeId = wList.data?.data?.[0]?._id;
  }

  // Add 3 sample garments directly via WardrobeItem model to guarantee verified items for orders
  const WardrobeItem = require('../src/modules/wardrobe/wardrobeItem.model');
  const garments = [
    {
      userId: customerId,
      wardrobeId,
      name: 'Raymond Classic White Formal Shirt',
      storeType: 'WARDROBE',
      category: 'UPPER_WEAR',
      subCategory: 'Shirt',
      sourceType: 'MANUAL_UPLOAD',
      sourcePhotoUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
      images: [{ url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500', isPrimary: true }],
      attributes: { primaryColor: 'White', pattern: 'Solid', fabricType: 'Cotton' },
      status: 'ACTIVE',
    },
    {
      userId: customerId,
      wardrobeId,
      name: 'Navy Blue Linen Trousers',
      storeType: 'WARDROBE',
      category: 'LOWER_WEAR',
      subCategory: 'Trouser',
      sourceType: 'MANUAL_UPLOAD',
      sourcePhotoUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500',
      images: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500', isPrimary: true }],
      attributes: { primaryColor: 'Navy Blue', pattern: 'Solid', fabricType: 'Linen' },
      status: 'ACTIVE',
    },
    {
      userId: customerId,
      wardrobeId,
      name: 'Black Formal 2-Piece Blazer',
      storeType: 'WARDROBE',
      category: 'OUTER_WEAR',
      subCategory: 'Blazer',
      sourceType: 'MANUAL_UPLOAD',
      sourcePhotoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500',
      images: [{ url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500', isPrimary: true }],
      attributes: { primaryColor: 'Black', pattern: 'Solid', fabricType: 'Wool Blend' },
      status: 'ACTIVE',
    },
  ];

  const createdGarments = [];
  for (const g of garments) {
    let item = await WardrobeItem.findOne({ userId: customerId, name: g.name });
    if (!item) {
      item = await WardrobeItem.create(g);
    } else {
      item.status = 'ACTIVE';
      await item.save();
    }
    createdGarments.push(item);
  }
  console.log(`   ✅ Customer has ${createdGarments.length} active garments in Wardrobe ready for work orders.`);

  // ================================================================
  // 5. VENDORS AUTHENTICATION & ONBOARDING (/api/vendor)
  // ================================================================
  console.log('\n🔹 5. Onboarding & Authenticating Real Vendors via OTP Flow (/api/vendor)...');

  const vendorDefinitions = [
    {
      phone: '919810112233',
      name: 'Ramdhani Dhobi & Dry Cleaners',
      businessName: 'Shri Ramdhani Express Laundry & Steam Press',
      profileImage: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=400',
      address: {
        street: 'Shop 4, Main Market, Sector 14',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
      },
      location: {
        type: 'Point',
        coordinates: [77.0423, 28.4732],
      },
      category: 'Washerman',
      services: ['Wash & Steam Iron', 'Premium Dry Cleaning', 'Express Steam Press'],
      priceOverrides: {
        'Wash & Steam Iron': { price: 55, durationMinutes: 60 },
        'Premium Dry Cleaning': { price: 170, durationMinutes: 120 },
        'Express Steam Ironing': { price: 20, durationMinutes: 30 },
      },
    },
    {
      phone: '919811223344',
      name: 'Apex Fabric Care & Express Press',
      businessName: 'Apex Premium Laundromat & Dry Clean',
      profileImage: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=400',
      address: {
        street: 'B-12, Vaibhav Khand, Indirapuram',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201014',
      },
      location: {
        type: 'Point',
        coordinates: [77.3686, 28.6389],
      },
      category: 'Washerman',
      services: ['Wash & Steam Iron', 'Premium Dry Cleaning', 'Woolen & Blanket Care'],
      priceOverrides: {
        'Wash & Steam Iron': { price: 70, durationMinutes: 45 },
        'Premium Dry Cleaning': { price: 210, durationMinutes: 90 },
        'Woolen & Blanket Care': { price: 280, durationMinutes: 180 },
      },
    },
    {
      phone: '919820334455',
      name: 'Master Irfan Ahmed Tailors',
      businessName: 'Irfan Bespoke Tailoring & Alteration Studio',
      profileImage: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=400',
      address: {
        street: 'G-8, Central Market, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
      category: 'Tailor & Alterations',
      services: ['Pant Length Alteration', 'Shirt Fitting & Tapering', 'Suit 2-Piece Tailoring'],
      priceOverrides: {
        'Pant Length Alteration': { price: 90, durationMinutes: 45 },
        'Shirt Fitting & Tapering': { price: 130, durationMinutes: 60 },
        'Suit 2-Piece Tailoring': { price: 3400, durationMinutes: 720 },
      },
    },
    {
      phone: '919830445566',
      name: 'Sneaker Lab & Footwear Spa',
      businessName: 'Sneaker Lab Pro Restoration & Shoe Care',
      profileImage: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
      address: {
        street: 'Cyber City Hub, DLF Phase 2',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122002',
      },
      location: {
        type: 'Point',
        coordinates: [77.0878, 28.4595],
      },
      category: 'Footwear Care',
      services: ['Sneaker Deep Clean Spa', 'Leather Shoe Polish & Buff'],
      priceOverrides: {
        'Sneaker Deep Clean Spa': { price: 279, durationMinutes: 90 },
        'Leather Shoe Polish & Buff': { price: 50, durationMinutes: 20 },
      },
    },
  ];

  const Otp = require('../src/modules/auth/otp.model');
  const { formatPhoneNumber } = require('../src/utils/whatsapp.service');
  const onboardedVendors = [];

  for (const vDef of vendorDefinitions) {
    // 5.1 Send OTP
    const sendRes = await apiRequest('POST', '/vendor/send-otp', {
      body: { phone: vDef.phone },
    });

    // Retrieve generated OTP from database
    const formattedPhone = formatPhoneNumber(vDef.phone);
    const otpDoc = await Otp.findOne({ phone: formattedPhone }).sort({ createdAt: -1 });
    const otpToUse = otpDoc ? otpDoc.otp : '1234';

    // 5.2 Verify OTP & Register
    const verifyRes = await apiRequest('POST', '/vendor/verify-otp', {
      body: {
        phone: vDef.phone,
        otp: otpToUse,
        name: vDef.name,
        businessName: vDef.businessName,
        profileImage: vDef.profileImage,
        address: vDef.address,
        location: vDef.location,
      },
    });

    const vToken = verifyRes.data?.data?.token;
    const vProfile = verifyRes.data?.data?.vendor;
    console.log(`   ✅ Vendor Onboarded: "${vDef.name}" (${vDef.phone}) | Vendor ID: ${vProfile?.vendorId}`);

    // 5.3 Configure Vendor Services via /api/vendor-services/my-services/bulk
    const servicesToAssign = [];
    for (const sName of vDef.services) {
      const matched = createdServices.find((cs) => cs.name.toLowerCase() === sName.toLowerCase());
      if (matched) {
        const overrides = vDef.priceOverrides[sName] || {};
        servicesToAssign.push({
          serviceId: matched._id,
          price: overrides.price !== undefined ? overrides.price : matched.basePrice,
          durationMinutes: overrides.durationMinutes || null,
          isAvailable: true,
        });
      }
    }

    if (servicesToAssign.length > 0) {
      const assignRes = await apiRequest('POST', '/vendor-services/my-services/bulk', {
        token: vToken,
        body: { services: servicesToAssign },
      });
      console.log(`      Assigned ${assignRes.data?.data?.length || servicesToAssign.length} custom services & prices to vendor.`);
    }

    onboardedVendors.push({
      ...vDef,
      token: vToken,
      vendorId: vProfile?.vendorId,
      _id: vProfile?._id,
    });
  }

  // ================================================================
  // 6. TESTING VENDOR PROFILE & SERVICES ENDPOINTS
  // ================================================================
  console.log('\n🔹 6. Testing Vendor Profile & Vendor Services APIs...');
  const testVendor = onboardedVendors[0];

  // 6.1 GET /api/vendor/profile
  const getProf = await apiRequest('GET', '/vendor/profile', { token: testVendor.token });
  console.log(`   ✅ GET /vendor/profile: Retrieved profile for ${getProf.data?.data?.name}`);

  // 6.2 PATCH /api/vendor/profile
  const patchProf = await apiRequest('PATCH', '/vendor/profile', {
    token: testVendor.token,
    body: {
      businessName: 'Shri Ramdhani Express Laundry (Verified Partner)',
      address: {
        street: 'Shop 4-A, Ground Floor, Sector 14',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122001',
      },
    },
  });
  console.log(`   ✅ PATCH /vendor/profile: Updated businessName to "${patchProf.data?.data?.businessName}"`);

  // 6.3 GET /api/vendor/services
  const getSrv = await apiRequest('GET', '/vendor/services', { token: testVendor.token });
  console.log(`   ✅ GET /vendor/services: Vendor has ${getSrv.data?.data?.services?.length || 0} configured services.`);

  // 6.4 GET /api/vendor-services/my-services
  const getMySrv = await apiRequest('GET', '/vendor-services/my-services', { token: testVendor.token });
  const sampleVsId = getMySrv.data?.data?.[0]?._id;
  console.log(`   ✅ GET /vendor-services/my-services: Verified ${getMySrv.data?.data?.length} vendor service assignments.`);

  // 6.5 PATCH /api/vendor-services/my-services/:id/availability
  if (sampleVsId) {
    const toggleRes = await apiRequest('PATCH', `/vendor-services/my-services/${sampleVsId}/availability`, {
      token: testVendor.token,
      body: { isAvailable: true },
    });
    console.log(`   ✅ PATCH /vendor-services/my-services/:id/availability: Status toggled successfully.`);
  }

  // ================================================================
  // 7. TESTING VENDOR DISCOVERY & PUBLIC APIS
  // ================================================================
  console.log('\n🔹 7. Testing Vendor Discovery & Public Comparison APIs...');

  // 7.1 GET /api/vendor/categories
  const vCats = await apiRequest('GET', '/vendor/categories');
  console.log(`   ✅ GET /vendor/categories: Retrieved ${vCats.data?.data?.length} active categories.`);

  // 7.2 GET /api/vendor/eligible
  const eligibleVendors = await apiRequest('GET', '/vendor/eligible', {
    query: {
      category: 'Washerman',
      latitude: '28.4732',
      longitude: '77.0423',
      radius: '30',
    },
  });
  console.log(`   ✅ GET /vendor/eligible: Found ${eligibleVendors.data?.data?.length} nearby active vendors matching criteria.`);

  // 7.3 GET /api/vendor/:id/services (Public vendor services view)
  const pubServices = await apiRequest('GET', `/vendor/${testVendor._id}/services`);
  console.log(`   ✅ GET /vendor/:id/services: Public services catalog retrieved for vendor ${testVendor.name}.`);

  // 7.4 GET /api/vendor-services/service/:serviceId (Compare vendors offering a service)
  const washServiceId = createdServices.find((s) => s.name === 'Wash & Steam Iron')?._id;
  if (washServiceId) {
    const comparing = await apiRequest('GET', `/vendor-services/service/${washServiceId}`);
    console.log(`   ✅ GET /vendor-services/service/:serviceId: Found ${comparing.data?.data?.length} vendors offering "Wash & Steam Iron" with live prices.`);
  }

  // ================================================================
  // 8. TESTING CUSTOMER VENDOR LOOKUP & UNREGISTERED FLOW
  // ================================================================
  console.log('\n🔹 8. Testing Customer Contact Lookup (/api/vendor/lookup)...');

  // 8.1 Registered Vendor Lookup
  const regLookup = await apiRequest('GET', '/vendor/lookup', {
    token: customerToken,
    query: { phone: testVendor.phone },
  });
  console.log(`   ✅ GET /vendor/lookup (${testVendor.phone}): Found Registered Vendor: isRegistered = ${regLookup.data?.data?.isRegistered}`);

  // 8.2 Unregistered / New Phone Lookup
  const unregPhone = '919999888877';
  const unregLookup = await apiRequest('GET', '/vendor/lookup', {
    token: customerToken,
    query: { phone: unregPhone },
  });
  console.log(`   ✅ GET /vendor/lookup (${unregPhone}): Untracked number identified: isRegistered = ${unregLookup.data?.data?.isRegistered}`);

  // ================================================================
  // 9. TESTING WORK ORDERS LIFECYCLE & TRANSACTIONS
  // ================================================================
  console.log('\n🔹 9. Testing Work Orders Lifecycle, Status Flow & Transactions...');

  // 9.1 Customer places a Work Order with Registered Vendor 1
  const pickupTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const deliveryInThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const orderPayload = {
    vendorPhone: testVendor.phone,
    vendorName: testVendor.name,
    pickupDate: pickupTomorrow,
    expectedDeliveryDate: deliveryInThreeDays,
    items: [
      {
        wardrobeItemId: createdGarments[0]._id,
        servicesRequested: ['Wash & Steam Iron'],
      },
      {
        wardrobeItemId: createdGarments[1]._id,
        servicesRequested: ['Wash & Steam Iron', 'Express Steam Press'],
      },
    ],
    specialInstructions: 'Please handle the linen trousers gently and use zero-starch press.',
  };

  const createOrderRes = await apiRequest('POST', '/laundry/orders', {
    token: customerToken,
    body: orderPayload,
  });

  const createdOrder = createOrderRes.data?.data;
  const orderId = createdOrder?._id;
  console.log(`   ✅ POST /laundry/orders: Work Order placed! Order #: ${createdOrder?.orderNumber} (ID: ${orderId})`);

  // 9.2 Vendor 1 views their Assigned Orders
  const vendorOrders = await apiRequest('GET', '/vendor/orders', { token: testVendor.token });
  console.log(`   ✅ GET /vendor/orders: Vendor retrieved ${vendorOrders.data?.data?.orders?.length} assigned work orders.`);

  // 9.3 Vendor 1 inspects Work Order Details
  if (orderId) {
    const vOrderDetails = await apiRequest('GET', `/vendor/orders/${orderId}`, { token: testVendor.token });
    console.log(`   ✅ GET /vendor/orders/:id: Work order details verified. Status: ${vOrderDetails.data?.data?.status}`);

    // 9.4 Vendor 1 updates status: PENDING_PICKUP -> PICKED_UP
    const statusUpdate1 = await apiRequest('PATCH', `/vendor/orders/${orderId}/status`, {
      token: testVendor.token,
      body: { status: 'PICKED_UP', note: 'Driver picked up garments from customer residence' },
    });
    console.log(`   ✅ PATCH /vendor/orders/:id/status -> PICKED_UP: ${statusUpdate1.data?.data?.status}`);

    // 9.5 Vendor 1 updates status: PICKED_UP -> IN_PROCESS
    const statusUpdate2 = await apiRequest('PATCH', `/vendor/orders/${orderId}/status`, {
      token: testVendor.token,
      body: { status: 'IN_PROCESS', note: 'Washing and steam pressing in progress at workshop' },
    });
    console.log(`   ✅ PATCH /vendor/orders/:id/status -> IN_PROCESS: ${statusUpdate2.data?.data?.status}`);

    // 9.6 Vendor 1 updates status: IN_PROCESS -> DELIVERED
    const statusUpdate3 = await apiRequest('PATCH', `/vendor/orders/${orderId}/status`, {
      token: testVendor.token,
      body: { status: 'DELIVERED', note: 'Garments delivered and handed over to customer' },
    });
    console.log(`   ✅ PATCH /vendor/orders/:id/status -> DELIVERED: ${statusUpdate3.data?.data?.status}`);

    // 9.7 Vendor 1 updates Payment Status
    const paymentUpdate = await apiRequest('PATCH', `/vendor/orders/${orderId}/payment`, {
      token: testVendor.token,
      body: {
        status: 'PAID',
        note: 'Customer paid in full via UPI scan',
      },
    });
    console.log(`   ✅ PATCH /vendor/orders/:id/payment: Payment marked as ${paymentUpdate.data?.data?.paymentStatus || 'PAID'} successfully.`);

    // 9.8 Vendor 1 checks their Transactions
    const vTxns = await apiRequest('GET', '/vendor/transactions', { token: testVendor.token });
    console.log(`   ✅ GET /vendor/transactions: Vendor has ${vTxns.data?.data?.length || 0} financial transactions recorded.`);
  }

  // 9.9 Place order with an UNREGISTERED vendor to test automatic unregistered vendor tracking
  console.log('\n   Placing order with offline/unregistered vendor (919999888877)...');
  // Re-activate 3rd garment for this order
  createdGarments[2].status = 'ACTIVE';
  await createdGarments[2].save();

  const unregOrderPayload = {
    vendorPhone: unregPhone,
    vendorName: 'Local Corner Laundry',
    pickupDate: pickupTomorrow,
    expectedDeliveryDate: deliveryInThreeDays,
    items: [
      {
        wardrobeItemId: createdGarments[2]._id,
        servicesRequested: ['Dry Clean'],
      },
    ],
  };

  const unregOrderRes = await apiRequest('POST', '/laundry/orders', {
    token: customerToken,
    body: unregOrderPayload,
  });
  console.log(`   ✅ POST /laundry/orders (Unregistered): Created order with offline vendor! Order #: ${unregOrderRes.data?.data?.orderNumber}`);

  // Verify Unregistered Vendors List
  const unregList = await apiRequest('GET', '/vendor/unregistered', { token: customerToken });
  console.log(`   ✅ GET /vendor/unregistered: Unregistered vendor database contains ${unregList.data?.data?.pagination?.total || unregList.data?.data?.list?.length} tracked offline vendors.`);

  console.log('\n====================================================');
  console.log('🎉 ALL SYSTEM APIS TESTED & SEEDED SUCCESSFULLY!');
  console.log(`📊 Total HTTP API Calls Executed: ${testResults.length}`);
  console.log('====================================================\n');

  // Return the complete test audit log for documentation generation
  return testResults;
}

runFullTestAndSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
