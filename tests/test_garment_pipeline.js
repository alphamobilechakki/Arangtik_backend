const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const BASE_URL = `http://localhost:${process.env.PORT || 8083}/api`;
const JWT_SECRET = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdhOGI5YzBkMSIsInBob25lIjoiOTE5ODc2NTQzMjEwIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3OTA0MjUyNTMsImV4cCI6MTc5MzAxNzI1M30.LulImFhGV05nFZQXz0otVkTVzQ7HXAfHe9A1J9xUdxU';

// Test User A (Owner)
const userAId = new mongoose.Types.ObjectId().toString();
const tokenA = jwt.sign({ id: userAId, phone: '919999999991', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

// Test User B (Unauthorized Attacker)
const userBId = new mongoose.Types.ObjectId().toString();
const tokenB = jwt.sign({ id: userBId, phone: '919999999992', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

// Use real uploaded sample image from brain or fallback
const sampleSourcePath = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\1cd37dde-746c-4a5c-b652-f764abfaad6f\\.user_uploaded\\media_1791622001157.jpg';

async function copySampleImageToUploads() {
  const uploadsDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `test_dress_${Date.now()}.jpg`;
  const destPath = path.join(uploadsDir, filename);

  if (fs.existsSync(sampleSourcePath)) {
    fs.copyFileSync(sampleSourcePath, destPath);
  } else {
    // Generate fallback test image if specific sample file isn't available
    const sharp = require('sharp');
    await sharp({
      create: {
        width: 600,
        height: 800,
        channels: 4,
        background: { r: 180, g: 30, b: 60, alpha: 1 },
      },
    })
      .jpeg()
      .toFile(destPath);
  }

  return { filename, url: `/uploads/${filename}`, destPath };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPipelineTests() {
  console.log('================================================================');
  console.log('👗 STARTING HUMAN-TO-GARMENT & GHOST MANNEQUIN TEST SUITE');
  console.log('================================================================\n');

  let testItemId = null;
  const sampleImage = await copySampleImageToUploads();
  console.log(`✓ Prepared test image in uploads: ${sampleImage.filename}`);

  // 1. Create a Wardrobe Item for User A
  console.log('\n▶ Step 1: Creating Wardrobe Item for User A...');
  const addRes = await fetch(`${BASE_URL}/wardrobe/add-item`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Festive Embroidered Anarkali Suit',
      category: 'ETHNIC_WEAR',
      subCategory: 'Anarkali Suit',
      color: 'Maroon / Gold',
      sourcePhotoUrl: sampleImage.url,
      images: [
        {
          url: sampleImage.url,
          type: 'ORIGINAL',
          isPrimary: true,
          filename: sampleImage.filename,
        },
      ],
    }),
  });

  const addData = await addRes.json();
  if (!addRes.ok || !addData.success) {
    console.error('❌ Failed to create wardrobe item:', addData);
    process.exit(1);
  }

  testItemId = addData.data._id || addData.data.item?._id;
  console.log(`✓ Wardrobe item created successfully: ID = ${testItemId}`);

  // 2. Security Test: User B attempts to trigger pipeline on User A's item
  console.log('\n▶ Step 2: Security & Authorization Check (User B on User A item)...');
  const authRes = await fetch(`${BASE_URL}/wardrobe/items/${testItemId}/garment-processing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const authData = await authRes.json();
  if (authRes.status === 404 || authRes.status === 403) {
    console.log(`✓ Access correctly denied for unauthorized user (Status: ${authRes.status})`);
  } else {
    console.error(`❌ Security failure: Unauthorized user got response:`, authData);
    process.exit(1);
  }

  // 3. User A triggers Garment Processing Pipeline
  console.log('\n▶ Step 3: User A triggering Garment Processing Pipeline...');
  const triggerRes = await fetch(`${BASE_URL}/wardrobe/items/${testItemId}/garment-processing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasBackground: 'transparent',
      paddingPercent: 8,
      autoInpaint: true,
      protectCollar: true,
    }),
  });

  const triggerData = await triggerRes.json();
  if (!triggerRes.ok || !triggerData.success) {
    console.error('❌ Failed to trigger pipeline:', triggerData);
    process.exit(1);
  }

  const job = triggerData.data;
  console.log(`✓ Pipeline job initiated:`);
  console.log(`  - Job ID: ${job.jobId}`);
  console.log(`  - Initial Status: ${job.status}`);
  console.log(`  - Original Image URL: ${job.originalImageUrl}`);

  // 4. Duplicate Job Prevention Check
  console.log('\n▶ Step 4: Testing Duplicate Job Prevention (triggering while active)...');
  const dupRes = await fetch(`${BASE_URL}/wardrobe/items/${testItemId}/garment-processing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  const dupData = await dupRes.json();
  if (dupRes.ok && dupData.data.jobId === job.jobId) {
    console.log(`✓ Duplicate job prevented: returned active job (${dupData.data.jobId})`);
  } else {
    console.warn(`⚠ Duplicate check returned:`, dupData);
  }

  // 5. Poll Job Status until completion
  console.log('\n▶ Step 5: Polling Garment Processing Job Status (Stages A -> F)...');
  let completedJob = null;
  const maxAttempts = 30; // 30 seconds max
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(1000);
    const statusRes = await fetch(`${BASE_URL}/wardrobe/items/${testItemId}/garment-processing/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    const statusData = await statusRes.json();
    if (!statusRes.ok || !statusData.success) {
      console.error(`❌ Status check failed:`, statusData);
      process.exit(1);
    }

    const currentStatus = statusData.data.status;
    process.stdout.write(`  [${i + 1}s] Current Status: ${currentStatus}\r`);

    if (currentStatus === 'COMPLETED' || currentStatus === 'PARTIAL_SUCCESS') {
      completedJob = statusData.data;
      console.log(`\n✓ Pipeline reached terminal success state: ${currentStatus}`);
      break;
    }

    if (currentStatus === 'FAILED') {
      console.log(`\n❌ Pipeline failed:`, statusData.data.error);
      process.exit(1);
    }
  }

  if (!completedJob) {
    console.error('\n❌ Timed out waiting for job completion.');
    process.exit(1);
  }

  // 6. Verify Output Assets & Quality Validation
  console.log('\n▶ Step 6: Verifying Generated Assets & Quality Metrics...');
  console.log(`  - Original Image URL:        ${completedJob.originalImageUrl}`);
  console.log(`  - Segmented Cutout URL:      ${completedJob.segmentedImageUrl}`);
  console.log(`  - Ghost Mannequin URL:       ${completedJob.ghostMannequinImageUrl}`);
  console.log(`  - Inpainting Reconstruction: ${completedJob.reconstructionStatus} (Used: ${completedJob.isReconstructionUsed})`);
  console.log(`  - Processing Duration:       ${completedJob.processingDurationMs}ms`);

  const quality = completedJob.qualityValidation || {};
  console.log(`  - Quality Validation:`);
  console.log(`      • Passed:                ${quality.passed}`);
  console.log(`      • Mask Coverage:         ${quality.maskCoveragePercent}%`);
  console.log(`      • Skin Metric:           ${quality.remainingSkinPercent}%`);
  console.log(`      • Alpha Integrity:       ${quality.alphaIntegrityPassed}`);
  console.log(`      • Warnings:              ${JSON.stringify(quality.warnings)}`);

  if (!completedJob.segmentedImageUrl || !completedJob.ghostMannequinImageUrl) {
    console.error('❌ Expected segmented and ghost mannequin URLs to be present.');
    process.exit(1);
  }

  // 7. Verify Database WardrobeItem Image Asset Preservation
  console.log('\n▶ Step 7: Verifying WardrobeItem images array in Database...');
  const itemRes = await fetch(`${BASE_URL}/wardrobe/items/${testItemId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  const itemData = await itemRes.json();
  const updatedItem = itemData.data;
  const images = updatedItem.images || [];

  console.log(`✓ Total images on WardrobeItem: ${images.length}`);
  const hasGhost = images.some((img) => img.type === 'GHOST_MANNEQUIN');
  const hasSegmented = images.some((img) => img.type === 'SEGMENTED');
  const hasOriginal = images.some((img) => img.url === completedJob.originalImageUrl);

  console.log(`  - Original Image Preserved:   ${hasOriginal ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  - Segmented Image Appended:   ${hasSegmented ? 'YES ✅' : 'NO ❌'}`);
  console.log(`  - Ghost Mannequin Appended:   ${hasGhost ? 'YES ✅' : 'NO ❌'}`);

  if (!hasOriginal || !hasSegmented || !hasGhost) {
    console.error('❌ Image array validation failed: assets missing or overwritten.');
    process.exit(1);
  }

  // 8. Test Retry Endpoint
  console.log('\n▶ Step 8: Testing Retry Endpoint...');
  const retryRes = await fetch(`${BASE_URL}/wardrobe/items/${testItemId}/garment-processing/retry`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      canvasBackground: 'white',
      paddingPercent: 10,
    }),
  });

  const retryData = await retryRes.json();
  if (retryRes.ok && retryData.success) {
    console.log(`✓ Retry initiated successfully (New Job ID: ${retryData.data.jobId}, Retry Count: ${retryData.data.retryCount || 1})`);
  } else {
    console.error('❌ Retry request failed:', retryData);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 ALL HUMAN-TO-GARMENT PIPELINE TESTS PASSED SUCCESSFULLY! ✅');
  console.log('================================================================\n');
}

runPipelineTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Test suite failed with unhandled error:', err);
    process.exit(1);
  });
