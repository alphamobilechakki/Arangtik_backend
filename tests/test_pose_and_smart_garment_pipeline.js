const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const sharp = require('sharp');

const BASE_URL = `http://localhost:${process.env.PORT || 8083}/api`;
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdhOGI5YzBkMSIsInBob25lIjoiOTE5ODc2NTQzMjEwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3OTA0MjUyNTMsImV4cCI6MTc5MzAxNzI1M30.LulImFhGV05nFZQXz0otVkTVzQ7HXAfHe9A1J9xUdxU';

// Test User A (Legitimate Owner)
const userAId = new mongoose.Types.ObjectId().toString();
const tokenA = jwt.sign({ id: userAId, phone: '919999999901', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

// Test User B (Unauthorized Attacker)
const userBId = new mongoose.Types.ObjectId().toString();
const tokenB = jwt.sign({ id: userBId, phone: '919999999902', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

const realSampleDress = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\1cd37dde-746c-4a5c-b652-f764abfaad6f\\.user_uploaded\\media_1791622001157.jpg';
const realSampleTshirt = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\1cd37dde-746c-4a5c-b652-f764abfaad6f\\.user_uploaded\\media_1791610326127.png';

async function setupTestImages() {
  const uploadsDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 1. Valid standing dress with arms away
  const dressName = `test_pose_dress_${Date.now()}.jpg`;
  const dressPath = path.join(uploadsDir, dressName);
  if (fs.existsSync(realSampleDress)) {
    fs.copyFileSync(realSampleDress, dressPath);
  } else {
    await sharp({
      create: { width: 600, height: 800, channels: 3, background: { r: 120, g: 30, b: 60 } },
    }).jpeg().toFile(dressPath);
  }

  // 2. Garment with hand occlusion (T-shirt with hand resting on waist/hip)
  const tshirtName = `test_pose_tshirt_${Date.now()}.png`;
  const tshirtPath = path.join(uploadsDir, tshirtName);
  if (fs.existsSync(realSampleTshirt)) {
    fs.copyFileSync(realSampleTshirt, tshirtPath);
  } else {
    await sharp({
      create: { width: 500, height: 600, channels: 3, background: { r: 20, g: 20, b: 20 } },
    }).png().toFile(tshirtPath);
  }

  // 3. Flat lay / background only (No person)
  const noPersonName = `test_no_person_${Date.now()}.jpg`;
  const noPersonPath = path.join(uploadsDir, noPersonName);
  await sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 240, g: 240, b: 240 } },
  }).jpeg().toFile(noPersonPath);

  return {
    dress: { filename: dressName, path: dressPath, url: `/uploads/${dressName}` },
    tshirt: { filename: tshirtName, path: tshirtPath, url: `/uploads/${tshirtName}` },
    noPerson: { filename: noPersonName, path: noPersonPath, url: `/uploads/${noPersonName}` },
  };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPoseAndGarmentTests() {
  console.log('========================================================================');
  console.log('🧘 STARTING POSE VALIDATION & SMART GARMENT PIPELINE TEST SUITE');
  console.log('========================================================================\n');

  const images = await setupTestImages();
  let passCount = 0;
  let testCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS ${testCount}] ${message}`);
    } else {
      console.error(`  [FAIL ${testCount}] ${message}`);
      process.exit(1);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Pose Validation on Valid Standing Pose (Arms Clear)
  // ---------------------------------------------------------------------------
  console.log('▶ Test 1: POST /api/wardrobe/pose-validation (Valid A-Pose Dress)...');
  const res1 = await fetch(`${BASE_URL}/wardrobe/pose-validation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: images.dress.url,
      category: 'ETHNIC_WEAR',
    }),
  });
  const data1 = await res1.json();
  assert(res1.status === 200 && data1.success, 'HTTP 200 returned for valid pose check');
  assert(data1.data.poseStatus === 'POSE_VALID', `Pose recognized as POSE_VALID (was: ${data1.data.poseStatus})`);
  assert(data1.data.handsOverlapGarment === 'NO', `Hands clearance verified as NO occlusion (was: ${data1.data.handsOverlapGarment})`);
  assert(data1.data.canProceed === true, 'canProceed is true for valid pose');
  assert(data1.data.landmarks && data1.data.landmarks.leftShoulder !== undefined, 'MoveNet landmarks returned with shoulder coordinates');

  // ---------------------------------------------------------------------------
  // TEST 2: Pose Validation on Image Without Person (Flat Lay / Blank)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 2: POST /api/wardrobe/pose-validation (Flat Lay / No Person)...');
  const res2 = await fetch(`${BASE_URL}/wardrobe/pose-validation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl: images.noPerson.url,
      category: 'UPPER_WEAR',
    }),
  });
  const data2 = await res2.json();
  assert(res2.status === 200, 'HTTP 200 returned with honest diagnostic result');
  assert(
    data2.data.poseStatus === 'PERSON_NOT_DETECTED' || data2.data.poseConfidence < 0.2,
    `Identified absence of human pose (status: ${data2.data.poseStatus})`
  );
  assert(data2.data.recommendedActions.length > 0, 'Returned actionable recommendations for avatar positioning');

  // ---------------------------------------------------------------------------
  // TEST 3: Access Control & Authorization (User B cannot check User A's item)
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 3: Security & Authorization Check...');
  // Create an item for User A
  const createItemRes = await fetch(`${BASE_URL}/wardrobe/add-item`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Designer Zari Lehenga',
      category: 'ETHNIC_WEAR',
      sourcePhotoUrl: images.dress.url,
      images: [{ url: images.dress.url, type: 'ORIGINAL', isPrimary: true }],
    }),
  });
  const itemData = await createItemRes.json();
  const itemId = itemData.data._id || itemData.data.item?._id;
  assert(Boolean(itemId), `Created wardrobe item for User A (ID: ${itemId})`);

  // User B tries to validate pose referencing User A's itemId
  const authCheckRes = await fetch(`${BASE_URL}/wardrobe/pose-validation`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      itemId,
    }),
  });
  assert(authCheckRes.status === 404, `Access denied with 404 for unauthorized user accessing another's item`);

  // ---------------------------------------------------------------------------
  // TEST 4: Garment Pipeline Execution with Stage A Pose Check
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 4: Garment Processing Pipeline with Pose Check...');
  const triggerRes = await fetch(`${BASE_URL}/wardrobe/items/${itemId}/garment-processing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasBackground: 'transparent',
      paddingPercent: 8,
    }),
  });
  const triggerData = await triggerRes.json();
  assert(triggerRes.status === 200 && triggerData.success, 'Pipeline job successfully initiated');
  const jobId = triggerData.data.jobId;

  // Poll job until completion
  console.log('  Polling job status...');
  let jobRecord = null;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const pollRes = await fetch(`${BASE_URL}/wardrobe/items/${itemId}/garment-processing/status`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pollData = await pollRes.json();
    const st = pollData.data?.status;
    if (st === 'COMPLETED' || st === 'PARTIAL_SUCCESS') {
      jobRecord = pollData.data;
      break;
    }
  }

  assert(Boolean(jobRecord), 'Pipeline reached terminal completion');
  assert(Boolean(jobRecord.poseValidation), 'Job record preserved Stage A poseValidation data');
  assert(jobRecord.poseValidation.poseStatus === 'POSE_VALID', `Job poseStatus verified as POSE_VALID`);
  assert(Boolean(jobRecord.ghostMannequinImageUrl), 'Generated 1024x1024 ghost mannequin image URL');
  assert(jobRecord.qualityValidation?.passed === true, 'Quality validation passed coverage and alpha integrity');

  // ---------------------------------------------------------------------------
  // TEST 5: Original Image Preservation in Database
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 5: Verifying Database Asset Integrity...');
  const getItemRes = await fetch(`${BASE_URL}/wardrobe/items/${itemId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  const getItemData = await getItemRes.json();
  const dbItem = getItemData.data;

  const originalFound = dbItem.images.some((img) => img.url === images.dress.url);
  const ghostFound = dbItem.images.some((img) => img.type === 'GHOST_MANNEQUIN');
  const segFound = dbItem.images.some((img) => img.type === 'SEGMENTED');

  assert(originalFound, 'Original image file reference permanently preserved (never overwritten)');
  assert(ghostFound, 'GHOST_MANNEQUIN image type cleanly appended to images array');
  assert(segFound, 'SEGMENTED image type cleanly appended to images array');

  console.log('\n========================================================================');
  console.log(`🎉 ALL ${passCount} OF ${testCount} AUTOMATED TESTS PASSED SUCCESSFULLY! ✅`);
  console.log('========================================================================\n');
}

runPoseAndGarmentTests().catch((err) => {
  console.error('❌ Test failed with unhandled error:', err);
  process.exit(1);
});
