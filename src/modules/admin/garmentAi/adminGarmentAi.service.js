const path = require('path');
const fs = require('fs');
const ApiError = require('../../../utils/apiError');
const {
  PYTHON_BG_REMOVAL_URL,
  PYTHON_SERVICE_TIMEOUT_MS,
} = require('../../../config/env.config');

/**
 * Maps Arangtik Garment AI categories ('upper_clothes', 'pants', 'dress', 'skirt', etc.)
 * to standard MongoDB WardrobeItem schema categories.
 */
const mapAiCategoryToDbCategory = (aiCategory) => {
  if (!aiCategory) return 'OTHER';
  const c = String(aiCategory).toLowerCase().trim();
  if (c.includes('upper') || c.includes('shirt') || c.includes('tshirt') || c.includes('top') || c.includes('blouse') || c.includes('kurta')) {
    return 'UPPER_WEAR';
  }
  if (c.includes('pant') || c.includes('jean') || c.includes('trouser') || c.includes('short') || c.includes('skirt') || c.includes('lower')) {
    return 'LOWER_WEAR';
  }
  if (c.includes('dress') || c.includes('saree') || c.includes('sari') || c.includes('lehenga') || c.includes('gown') || c.includes('anarkali') || c.includes('one_piece')) {
    return 'ONE_PIECE';
  }
  if (c.includes('jacket') || c.includes('coat') || c.includes('blazer') || c.includes('outerwear') || c.includes('cardigan') || c.includes('sweater')) {
    return 'OUTERWEAR';
  }
  if (c.includes('shoe') || c.includes('footwear') || c.includes('sneaker') || c.includes('heel') || c.includes('sandal')) {
    return 'FOOTWEAR';
  }
  if (c.includes('access') || c.includes('belt') || c.includes('bag') || c.includes('cap') || c.includes('hat') || c.includes('watch')) {
    return 'ACCESSORIES';
  }
  return 'OTHER';
};

/**
 * Fetch health & GPU status from Arangtik Garment AI microservice
 */
const getHealthStatus = async () => {
  const healthUrl = 'https://bg.arangtik.com/health';
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timeout);

    const latencyMs = Date.now() - startTime;
    if (!res.ok) {
      return {
        online: false,
        statusCode: res.status,
        latencyMs,
        message: `Health check failed with HTTP ${res.status}`,
      };
    }
    const data = await res.json();
    return {
      online: true,
      statusCode: 200,
      latencyMs,
      data,
    };
  } catch (err) {
    return {
      online: false,
      statusCode: 503,
      latencyMs: Date.now() - startTime,
      error: err.message,
    };
  }
};

/**
 * Test a garment image with the official Arangtik Garment AI microservice
 * @param {object} file Express Multer file object
 * @param {object} options target_garment, response_format, include_base64
 */
const testGarmentImage = async (file, options = {}) => {
  if (!file) {
    throw new ApiError(400, 'Please upload a garment image file (JPG, PNG, or WEBP)');
  }

  const filePath = file.path;
  if (!fs.existsSync(filePath)) {
    throw new ApiError(400, `Uploaded file not found on disk: ${filePath}`);
  }

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = file.originalname || path.basename(filePath);
  const mimeType = file.mimetype || 'image/jpeg';
  const targetGarment = options.target_garment || options.targetGarment || 'all';
  const responseFormat = options.response_format || options.responseFormat || 'json';
  const includeBase64 = options.include_base64 === 'true' || options.includeBase64 === true;

  const bgRemovalUrl = (PYTHON_BG_REMOVAL_URL || 'https://bg.arangtik.com/api/background-removal').replace(/\/+$/, '');
  const configuredTimeout = parseInt(PYTHON_SERVICE_TIMEOUT_MS, 10);
  const timeoutMs = !isNaN(configuredTimeout) && configuredTimeout >= 60000 ? configuredTimeout : 120000;

  const formData = new FormData();
  const fileBlob = new Blob([fileBuffer], { type: mimeType });
  formData.append('file', fileBlob, fileName);
  formData.append('response_format', responseFormat);
  formData.append('target_garment', targetGarment);
  if (includeBase64) {
    formData.append('include_base64', 'true');
  }

  const startTime = Date.now();
  console.log(`[AdminGarmentAI] Testing image with Arangtik Garment AI: ${fileName} (${file.size} bytes, target: ${targetGarment})`);

  let response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    response = await fetch(bgRemovalUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new ApiError(504, `Garment AI pipeline timed out after ${timeoutMs / 1000} seconds on GPU worker.`);
    }
    throw new ApiError(502, `Failed to connect to Garment AI service: ${err.message}`);
  }
  clearTimeout(timer);

  const executionTimeMs = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new ApiError(response.status, `Garment AI returned HTTP ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(502, `Unexpected response content-type: ${contentType}. Expected JSON.`);
  }

  const rawJson = await response.json();
  const rawGarments = rawJson.garments || [];

  const formattedGarments = rawGarments.map((g, idx) => {
    const rawCategory = g.category || g.garmentType || g.type || 'upper_clothes';
    const mappedCategory = mapAiCategoryToDbCategory(rawCategory);
    const title = g.title || g.recognized_label || g.name || `Garment #${idx + 1}`;
    const rawUrl = g.output_png_url || g.url || g.imageUrl || '';
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `https://bg.arangtik.com${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

    return {
      garmentId: g.garment_id || `garment_${idx + 1}`,
      category: rawCategory,
      mappedDbCategory: mappedCategory,
      title,
      url: fullUrl,
      outputPngUrl: fullUrl,
      resolution: g.resolution || `${g.width || 1024}x${g.height || 1024}`,
      width: g.width || 1024,
      height: g.height || 1024,
      base64: g.base64 || null,
    };
  });

  return {
    success: true,
    status: rawJson.status || 'success',
    jobId: rawJson.job_id || null,
    executionTimeMs,
    processingTimeSec: rawJson.processing_time_sec || parseFloat((executionTimeMs / 1000).toFixed(2)),
    totalGarments: formattedGarments.length,
    garments: formattedGarments,
    originalImage: {
      fileName,
      size: file.size,
      mimetype: file.mimetype,
      localUrl: file.url || file.dbUrl || `/uploads/${path.basename(filePath)}`,
    },
    rawResponse: rawJson,
  };
};

module.exports = {
  getHealthStatus,
  testGarmentImage,
  mapAiCategoryToDbCategory,
};
