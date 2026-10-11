const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Ensure models directory exists inside uploads
const uploadsDir = path.resolve(__dirname, '../../../uploads');
const modelsDir = path.join(uploadsDir, 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

/**
 * Resolves local file path or buffer from an image path / URL
 * @param {string} imagePathOrUrl
 * @returns {Buffer}
 */
const getImageBuffer = async (imagePathOrUrl) => {
  if (!imagePathOrUrl) {
    throw new Error('Image path or URL is required for 3D model generation');
  }

  // If already absolute and exists
  if (path.isAbsolute(imagePathOrUrl) && fs.existsSync(imagePathOrUrl)) {
    return fs.readFileSync(imagePathOrUrl);
  }

  // If starts with /uploads or uploads
  const cleanPath = imagePathOrUrl.replace(/^\/?(api\/)?uploads\//, '');
  const possiblePaths = [
    path.join(uploadsDir, cleanPath),
    path.join(process.cwd(), 'uploads', cleanPath),
    path.resolve(__dirname, '../../../uploads', cleanPath),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }

  // If http / https url
  if (/^https?:\/\//i.test(imagePathOrUrl)) {
    const res = await fetch(imagePathOrUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch image from URL: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new Error(`Image file not found on disk or network: ${imagePathOrUrl}`);
};

/**
 * Generate a 3D model (.glb) from a 2D clothing image using Hugging Face TripoSR
 * @param {string|Buffer} imageInput - Local file path, URL, or image Buffer
 * @param {Object} [options]
 * @param {number} [options.resolution=128] - Marching cubes resolution (32-320)
 * @param {number} [options.foregroundRatio=0.85] - Foreground bounding ratio (0.5-1.0)
 * @returns {Promise<{ url: string, filename: string, size: number, engine: string }>}
 */
const generate3DFromImage = async (imageInput, options = {}) => {
  const { resolution = 128, foregroundRatio = 0.85 } = options;

  let imageBuffer;
  if (Buffer.isBuffer(imageInput)) {
    imageBuffer = imageInput;
  } else {
    imageBuffer = await getImageBuffer(imageInput);
  }

  // Gradio client dynamic import (ESM in CommonJS)
  const { Client } = await import('@gradio/client');

  const spacesToTry = ['Jose16062007/TripoSR', 'stabilityai/TripoSR'];
  let lastError = null;

  for (const spaceId of spacesToTry) {
    try {
      console.log(`[TripoSR] Connecting to Hugging Face space: ${spaceId}...`);
      const client = await Client.connect(spaceId);

      const blob = new Blob([imageBuffer], { type: 'image/png' });

      console.log(`[TripoSR] Invoking 3D reconstruction for clothing item...`);
      const result = await client.predict('/professor', [
        blob,
        Number(resolution),
        Number(foregroundRatio),
      ]);

      const glbData = result?.data?.[0];
      if (!glbData || !glbData.url) {
        throw new Error(`Invalid response structure from ${spaceId}: No GLB url returned`);
      }

      console.log(`[TripoSR] Downloading generated GLB from ${glbData.url}...`);
      const glbRes = await fetch(glbData.url);
      if (!glbRes.ok) {
        throw new Error(`Failed to download GLB model: ${glbRes.status} ${glbRes.statusText}`);
      }

      const glbArrayBuffer = await glbRes.arrayBuffer();
      const glbBuffer = Buffer.from(glbArrayBuffer);

      // Verify glTF / GLB binary header
      const header = glbBuffer.toString('ascii', 0, 4);
      if (header !== 'glTF') {
        console.warn(`[TripoSR] Warning: downloaded file header is "${header}", expected "glTF"`);
      }

      // Save GLB model to uploads/models
      const uniqueId = crypto.randomBytes(6).toString('hex');
      const filename = `model_${Date.now()}_${uniqueId}.glb`;
      const savePath = path.join(modelsDir, filename);

      fs.writeFileSync(savePath, glbBuffer);
      console.log(`[TripoSR] 3D model successfully saved to: ${savePath} (${glbBuffer.length} bytes)`);

      return {
        url: `/uploads/models/${filename}`,
        filename,
        size: glbBuffer.length,
        engine: 'TripoSR',
      };
    } catch (err) {
      console.warn(`[TripoSR] Attempt with ${spaceId} failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`Failed to generate 3D model via Hugging Face TripoSR: ${lastError?.message || 'All spaces unreachable'}`);
};

module.exports = {
  generate3DFromImage,
  getImageBuffer,
  modelsDir,
};
