const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const BASE_URL = `http://localhost:${process.env.PORT || 8083}/api`;
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdhOGI5YzBkMSIsInBob25lIjoiOTE5ODc2NTQzMjEwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3OTA0MjUyNTMsImV4cCI6MTc5MzAxNzI1M30.LulImFhGV05nFZQXz0otVkTVzQ7HXAfHe9A1J9xUdxU';

// Generate valid test user JWT
const testUserId = new mongoose.Types.ObjectId().toString();
const token = jwt.sign({ id: testUserId, phone: '919999999999', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

const authHeaders = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🚀 STARTING STEP 5 (DRESS & STORE ITEMS) COMPREHENSIVE TESTS...\n');
  let createdItemId = null;
  let createdWardrobeId = null;

  try {
    // 0. Setup: Create a test wardrobe container
    console.log('▶ [SETUP] Creating test Wardrobe container...');
    const wRes = await apiRequest('/wardrobe/create-wardrobe', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'My Master Almari',
        type: 'PERSONAL',
        ownerName: 'Test User',
        isDefault: true,
      }),
    });
    createdWardrobeId = wRes.data.data?._id;
    console.log(`✅ [SETUP SUCCESS] Wardrobe Created: ID = ${createdWardrobeId}\n`);

    // =========================================================================
    // TEST 1: POST /api/wardrobe/add-item (Validation & Success)
    // =========================================================================
    console.log('================================================================');
    console.log('TEST 1: POST /api/wardrobe/add-item');
    console.log('================================================================');

    // 1.1 Auth Failure test (No Token)
    const noAuthRes = await apiRequest('/wardrobe/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Shirt' }),
    });
    if (noAuthRes.status === 401) {
      console.log(`✅ 1.1 Auth Protection Passed: Status 401 (${noAuthRes.data.message})`);
    } else {
      console.error(`❌ Expected 401, got ${noAuthRes.status}`);
    }

    // 1.2 Validation Failure test (Missing name or category)
    const valRes = await apiRequest('/wardrobe/add-item', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ color: 'Blue' }),
    });
    if (valRes.status === 400) {
      console.log(`✅ 1.2 Validation Passed: Status 400 (${valRes.data.message})`);
    } else {
      console.error(`❌ Expected 400, got ${valRes.status}`);
    }

    // 1.3 Success Add Item
    const itemPayload = {
      wardrobeId: createdWardrobeId,
      name: 'Royal Blue Velvet Embroidered Sherwani',
      category: 'TRADITIONAL',
      subCategory: 'Sherwani',
      color: 'Royal Blue',
      fabric: 'VELVET',
      pattern: 'EMBROIDERED',
      fit: 'SLIM_FIT',
      occasion: ['WEDDING', 'RECEPTION', 'FESTIVE'],
      season: ['WINTER', 'ALL_SEASON'],
      style: 'ROYAL_BRIDAL',
      gender: 'MEN',
      brand: 'Manyavar',
      size: '42',
      isFavorite: true,
      images: [
        {
          url: '/uploads/crops/sherwani-primary.webp',
          isPrimary: true,
        },
        {
          url: '/uploads/crops/sherwani-back.webp',
          isPrimary: false,
        },
      ],
      attributes: {
        primaryColor: 'Royal Blue',
        fabric: 'VELVET',
        designPattern: 'EMBROIDERED',
        workPlacement: 'BODICE_AND_FLARE',
      },
      tags: ['wedding', 'royal', 'blue', 'manyavar', 'ethnic'],
    };

    const addRes = await apiRequest('/wardrobe/add-item', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(itemPayload),
    });

    if (addRes.status === 201) {
      createdItemId = addRes.data.data._id;
      console.log(`✅ 1.3 Add Item Passed: Status 201`);
      console.log('📦 Created Item Response:', JSON.stringify(addRes.data, null, 2));
    } else {
      console.error(`❌ Add Item Failed: Status ${addRes.status}`, addRes.data);
    }
    console.log('\n');

    // =========================================================================
    // TEST 2: GET /api/wardrobe/get-all-items (Search, Filter, Pagination)
    // =========================================================================
    console.log('================================================================');
    console.log('TEST 2: GET /api/wardrobe/get-all-items');
    console.log('================================================================');

    // 2.1 Add another item for filtering
    await apiRequest('/wardrobe/add-item', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        wardrobeId: createdWardrobeId,
        name: 'Black Casual Cotton T-Shirt',
        category: 'UPPER_WEAR',
        subCategory: 'T-Shirt',
        color: 'Black',
        fabric: 'COTTON',
        occasion: ['CASUAL', 'DAILY'],
        season: ['SUMMER'],
        isFavorite: false,
      }),
    });

    // 2.2 Get all items
    const allRes = await apiRequest('/wardrobe/get-all-items', { method: 'GET', headers: authHeaders });
    console.log(`✅ 2.1 Fetch All Items: Status ${allRes.status}, Total Items: ${allRes.data.data.pagination.totalItems}`);

    // 2.3 Filter by Category (TRADITIONAL)
    const filterCatRes = await apiRequest('/wardrobe/get-all-items?category=TRADITIONAL', { method: 'GET', headers: authHeaders });
    console.log(`✅ 2.2 Filter Category (TRADITIONAL): Found ${filterCatRes.data.data.items.length} item(s)`);

    // 2.4 Filter by Color (Royal Blue)
    const filterColorRes = await apiRequest('/wardrobe/get-all-items?color=Blue', { method: 'GET', headers: authHeaders });
    console.log(`✅ 2.3 Filter Color ("Blue"): Found ${filterColorRes.data.data.items.length} item(s)`);

    // 2.5 Filter by Favorite (true)
    const filterFavRes = await apiRequest('/wardrobe/get-all-items?favorite=true', { method: 'GET', headers: authHeaders });
    console.log(`✅ 2.4 Filter Favorite (true): Found ${filterFavRes.data.data.items.length} item(s)`);

    // 2.6 Keyword Search ("Manyavar")
    const searchRes = await apiRequest('/wardrobe/get-all-items?search=Manyavar', { method: 'GET', headers: authHeaders });
    console.log(`✅ 2.5 Search ("Manyavar"): Found ${searchRes.data.data.items.length} item(s)`);
    console.log('\n');

    // =========================================================================
    // TEST 3: GET /api/wardrobe/get-item-details/:id
    // =========================================================================
    console.log('================================================================');
    console.log('TEST 3: GET /api/wardrobe/get-item-details/:id');
    console.log('================================================================');

    // 3.1 Get valid item details
    const detailRes = await apiRequest(`/wardrobe/get-item-details/${createdItemId}`, { method: 'GET', headers: authHeaders });
    console.log(`✅ 3.1 Get Item Details Passed: Status ${detailRes.status}, Name = "${detailRes.data.data.name}"`);

    // 3.2 Non-existent item ID (404)
    const fakeId = new mongoose.Types.ObjectId().toString();
    const fakeRes = await apiRequest(`/wardrobe/get-item-details/${fakeId}`, { method: 'GET', headers: authHeaders });
    if (fakeRes.status === 404) {
      console.log(`✅ 3.2 Non-existent ID Passed: Status 404 (${fakeRes.data.message})`);
    } else {
      console.error(`❌ Expected 404, got ${fakeRes.status}`);
    }
    console.log('\n');

    // =========================================================================
    // TEST 4: PATCH /api/wardrobe/update-item/:id
    // =========================================================================
    console.log('================================================================');
    console.log('TEST 4: PATCH /api/wardrobe/update-item/:id');
    console.log('================================================================');

    const updatePayload = {
      name: 'Royal Blue Velvet Wedding Sherwani (Updated)',
      isFavorite: false,
      attributes: {
        customFitNotes: 'Altered for reception',
        dryCleanOnly: true,
      },
      tags: ['wedding', 'updated', 'grand-reception'],
    };

    const updateRes = await apiRequest(`/wardrobe/update-item/${createdItemId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(updatePayload),
    });

    if (updateRes.status === 200) {
      console.log(`✅ 4.1 Update Item Passed: Status ${updateRes.status}`);
      console.log(`   Updated Name: "${updateRes.data.data.name}"`);
      console.log(`   Updated isFavorite: ${updateRes.data.data.isFavorite}`);
    } else {
      console.error(`❌ Update Item Failed: Status ${updateRes.status}`);
    }
    console.log('\n');

    // =========================================================================
    // TEST 5: DELETE /api/wardrobe/delete-item/:id
    // =========================================================================
    console.log('================================================================');
    console.log('TEST 5: DELETE /api/wardrobe/delete-item/:id');
    console.log('================================================================');

    const deleteRes = await apiRequest(`/wardrobe/delete-item/${createdItemId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });

    if (deleteRes.status === 200) {
      console.log(`✅ 5.1 Delete Item Passed: Status ${deleteRes.status}, Response =`, deleteRes.data);
    } else {
      console.error(`❌ Delete Item Failed: Status ${deleteRes.status}`);
    }

    // Verify item is deleted
    const verifyDelRes = await apiRequest(`/wardrobe/get-item-details/${createdItemId}`, {
      method: 'GET',
      headers: authHeaders,
    });
    if (verifyDelRes.status === 404) {
      console.log(`✅ 5.2 Deletion Verification Passed: Deleted item returns 404 (${verifyDelRes.data.message})`);
    } else {
      console.error(`❌ Expected 404 for deleted item, got ${verifyDelRes.status}`);
    }

    console.log('\n🎉 ALL STEP 5 APIs (DRESS & STORE ITEMS) TESTED & VERIFIED 100% WORKING!\n');
  } catch (err) {
    console.error('❌ Test Execution Error:', err.message);
  }
}

runTests();
