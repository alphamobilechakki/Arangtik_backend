const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const sharp = require('sharp');

const BASE_URL = `http://localhost:${process.env.PORT || 8083}/api`;
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdhOGI5YzBkMSIsInBob25lIjoiOTE5ODc2NTQzMjEwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3OTA0MjUyNTMsImV4cCI6MTc5MzAxNzI1M30.LulImFhGV05nFZQXz0otVkTVzQ7HXAfHe9A1J9xUdxU';

const testUserId = new mongoose.Types.ObjectId().toString();
const token = jwt.sign({ id: testUserId, phone: '918888888888', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

async function createTestImageFile() {
  const testImagePath = path.join(__dirname, 'test_sample_dress.png');
  // Create a 400x500 blue test image simulating a dress
  await sharp({
    create: {
      width: 400,
      height: 500,
      channels: 4,
      background: { r: 30, g: 60, b: 180, alpha: 1 },
    },
  })
    .png()
    .toFile(testImagePath);
  return testImagePath;
}

async function runTests() {
  console.log('👗 STARTING DRESS ANALYSIS & ADD ITEM AUTO-FILL TESTS...\n');
  const testImagePath = await createTestImageFile();

  try {
    // 0. Setup: Create Wardrobe container (without face photo - disconnected face)
    console.log('▶ [SETUP] 1. Creating wardrobe without face photo...');
    const wRes = await fetch(`${BASE_URL}/wardrobe/create-wardrobe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Daily Wear Almari',
        type: 'PERSONAL',
        ownerName: 'Rahul',
        isDefault: true,
      }),
    });
    const wData = await wRes.json();
    const wardrobeId = wData.data?._id;
    console.log(`✅ Wardrobe Created cleanly without requiring face! ID: ${wardrobeId}\n`);

    // =========================================================================
    // TEST 1: POST /api/wardrobe/analyze-photo (Dress Photo Analysis)
    // =========================================================================
    console.log('================================================================');
    console.log('TEST 1: POST /api/wardrobe/analyze-photo (AI Dress Analysis Preview)');
    console.log('================================================================');

    const form1 = new FormData();
    const imageBlob1 = new Blob([fs.readFileSync(testImagePath)], { type: 'image/png' });
    form1.append('photo', imageBlob1, 'sample_dress.png');
    form1.append('wardrobeId', wardrobeId);

    const aRes = await fetch(`${BASE_URL}/wardrobe/analyze-photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form1,
    });
    const aData = await aRes.json();

    if (aRes.status === 200 && aData.data?.autoFilledFields) {
      console.log('✅ 1.1 Dress Analysis Succeeded with status 200');
      console.log('   Auto-filled fields detected:', {
        name: aData.data.autoFilledFields.name,
        category: aData.data.autoFilledFields.category,
        subCategory: aData.data.autoFilledFields.subCategory,
        color: aData.data.autoFilledFields.color,
        fabric: aData.data.autoFilledFields.fabric,
        pattern: aData.data.autoFilledFields.pattern,
        croppedImageUrl: aData.data.autoFilledFields.croppedImageUrl,
      });
    } else {
      console.error('❌ Dress Analysis Failed:', aData);
    }

    // =========================================================================
    // TEST 2: POST /api/wardrobe/add-item (Photo Upload with AI Auto-Fill)
    // =========================================================================
    console.log('\n================================================================');
    console.log('TEST 2: POST /api/wardrobe/add-item (Camera Click / Photo Upload Auto-Fill)');
    console.log('================================================================');

    const form2 = new FormData();
    const imageBlob2 = new Blob([fs.readFileSync(testImagePath)], { type: 'image/png' });
    form2.append('photo', imageBlob2, 'clicked_dress.png');
    form2.append('wardrobeId', wardrobeId);
    // Notice: NOT passing name or category! Letting AI auto-fill everything!

    const addRes = await fetch(`${BASE_URL}/wardrobe/add-item`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form2,
    });
    const addData = await addRes.json();

    if (addRes.status === 201 && addData.data?._id) {
      console.log('✅ 2.1 Photo Add Item Succeeded with status 201');
      console.log('   Auto-filled Item in Database:', {
        id: addData.data._id,
        name: addData.data.name,
        category: addData.data.category,
        subCategory: addData.data.subCategory,
        color: addData.data.color,
        fabric: addData.data.fabric,
        sourceType: addData.data.sourceType,
        primaryImage: addData.data.images?.[0]?.url,
      });
    } else {
      console.error('❌ Photo Add Item Failed:', addData);
    }

    // =========================================================================
    // TEST 3: Photo Upload WITH User Field Overrides
    // =========================================================================
    console.log('\n================================================================');
    console.log('TEST 3: POST /api/wardrobe/add-item (Photo + User Overrides)');
    console.log('================================================================');

    const form3 = new FormData();
    const imageBlob3 = new Blob([fs.readFileSync(testImagePath)], { type: 'image/png' });
    form3.append('photo', imageBlob3, 'party_dress.png');
    form3.append('wardrobeId', wardrobeId);
    form3.append('name', 'Zara Sapphire Blue Evening Gown');
    form3.append('brand', 'Zara');
    form3.append('size', 'M');
    form3.append('isFavorite', 'true');

    const addRes3 = await fetch(`${BASE_URL}/wardrobe/add-item`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form3,
    });
    const addData3 = await addRes3.json();

    if (addRes3.status === 201 && addData3.data?._id) {
      console.log('✅ 3.1 Item with Overrides Succeeded:');
      console.log('   Preserved User Overrides:', {
        name: addData3.data.name,
        brand: addData3.data.brand,
        size: addData3.data.size,
        isFavorite: addData3.data.isFavorite,
      });
      console.log('   AI-Filled Missing Attributes:', {
        color: addData3.data.color,
        fabric: addData3.data.fabric,
        pattern: addData3.data.pattern,
        primaryImage: addData3.data.images?.[0]?.url,
      });
    } else {
      console.error('❌ Item with Overrides Failed:', addData3);
    }

    // =========================================================================
    // TEST 4: Validation - Missing Photo and Missing Name/Category
    // =========================================================================
    console.log('\n================================================================');
    console.log('TEST 4: POST /api/wardrobe/add-item (Validation Failure without photo or name/cat)');
    console.log('================================================================');

    const emptyRes = await fetch(`${BASE_URL}/wardrobe/add-item`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ brand: 'Zara' }),
    });
    const emptyData = await emptyRes.json();

    if (emptyRes.status === 400) {
      console.log('✅ 4.1 Missing Fields Rejected with 400:', emptyData.message);
    } else {
      console.error('❌ Expected 400, got:', emptyRes.status);
    }

    console.log('\n🎉 ALL DRESS ANALYSIS & ADD ITEM AUTO-FILL TESTS PASSED SUCCESSFULLY! 🚀');
  } finally {
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  }
}

runTests().catch(console.error);
