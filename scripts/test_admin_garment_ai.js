const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const sharp = require('sharp');
const app = require('../src/app');
const connectDB = require('../src/config/db.config');
const { JWT_SECRET } = require('../src/config/env.config');

async function testAdminGarmentAi() {
  await connectDB();
  const adminId = new mongoose.Types.ObjectId().toString();
  const adminToken = jwt.sign(
    { id: adminId, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  try {
    // 1. Health check
    console.log('Testing GET /api/admin/garment-ai/health ...');
    const healthRes = await fetch(`http://localhost:${port}/api/admin/garment-ai/health`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log('Health status:', healthRes.status);
    const healthJson = await healthRes.json();
    console.log('Health data online:', healthJson.data?.online);
    console.log('GPU:', healthJson.data?.data?.hardware?.gpu_name);

    // 2. Test endpoint
    console.log('Testing POST /api/admin/garment-ai/test ...');
    const dummyImage = await sharp({
      create: { width: 200, height: 200, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
    }).jpeg().toBuffer();

    const formData = new FormData();
    formData.append('file', new Blob([dummyImage], { type: 'image/jpeg' }), 'red_sample.jpg');
    formData.append('target_garment', 'all');

    const testRes = await fetch(`http://localhost:${port}/api/admin/garment-ai/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: formData,
    });
    console.log('Test status:', testRes.status);
    const testJson = await testRes.json();
    console.log('Test result success:', testJson.success);
    console.log('Test total garments:', testJson.data?.totalGarments);
    if (testJson.data?.garments?.[0]) {
      console.log('First garment:', testJson.data.garments[0].title, testJson.data.garments[0].url);
    }
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

testAdminGarmentAi();
