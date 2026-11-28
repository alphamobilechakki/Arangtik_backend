const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { createWorker } = require('../core/base.worker');
const { AI_STYLIST_QUEUE_NAME } = require('./aiStylist.queue');
const AiLook = require('../../modules/aiStylist/aiLook.model');
const { formatUploadUrl } = require('../../utils/url.util');
const { getIO } = require('../../config/socket.config');
const env = require('../../config/env.config');

const PYTHON_TRYON_URL = (process.env.PYTHON_TRYON_URL).replace(/\/+$/, '');
const PYTHON_TRYON_TIMEOUT_MS = parseInt(process.env.PYTHON_TRYON_TIMEOUT_MS, 10) || 300_000;
const AI_STYLIST_CONCURRENCY = parseInt(process.env.AI_STYLIST_CONCURRENCY, 10) || 2;

let aiStylistWorker = null;

/**
 * Emit real-time status update via Socket.IO if initialized
 */
const emitLookStatus = (userId, payload) => {
  try {
    const io = getIO();
    io.to(String(userId)).emit('ai-stylist:status', payload);
  } catch {
    // Socket.IO not initialized (e.g., standalone worker or tests)
  }
};

/**
 * Resolve an upload URL to local disk path if available, otherwise fetch via HTTP
 */
const appendImageToForm = async (form, fieldName, imageUrl, fallbackName) => {
  const uploadsMarker = '/uploads/';
  const idx = imageUrl.indexOf(uploadsMarker);

  let fetchUrl = imageUrl;
  if (idx !== -1) {
    const relativeUploadPath = imageUrl.slice(idx + 1); // "uploads/..."
    const localPath = path.resolve(process.cwd(), relativeUploadPath);
    if (fs.existsSync(localPath)) {
      form.append(fieldName, fs.createReadStream(localPath), {
        filename: path.basename(localPath),
      });
      return;
    }
    if (fetchUrl.startsWith('http://localhost:') || fetchUrl.startsWith('http://127.0.0.1:')) {
      const deployedBase = (env.BASE_URL || 'https://api.arangtik.com').replace(/\/+$/, '');
      fetchUrl = `${deployedBase}/${relativeUploadPath}`;
    }
  }

  const response = await axios.get(fetchUrl, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });

  form.append(fieldName, Buffer.from(response.data), {
    filename: fallbackName,
    contentType: response.headers['content-type'] || 'image/jpeg',
  });
};

/**
 * BullMQ processor: calls Python /api/virtual-tryon, saves result image, updates AiLook
 */
const processAiStylistJob = async (job) => {
  const { lookId, userId, avatarUrl, garmentUrls, occasion, maxCombinations } = job.data;

  await AiLook.findByIdAndUpdate(lookId, { status: 'PROCESSING' });
  emitLookStatus(userId, { lookId, status: 'PROCESSING' });
  await job.updateProgress(15);

  try {
    const form = new FormData();

    // 1. Append avatar
    await appendImageToForm(form, 'avatar', avatarUrl, 'avatar.jpg');

    // 2. Append all garments + jewellery under 'garments'
    for (let i = 0; i < garmentUrls.length; i += 1) {
      await appendImageToForm(form, 'garments', garmentUrls[i], `garment_${i}.jpg`);
    }

    // 3. Optional fields
    form.append('occasion', occasion || 'smart_casual');
    form.append('max_combinations', String(maxCombinations || 1));

    await job.updateProgress(35);

    const tryonResponse = await axios.post(`${PYTHON_TRYON_URL}/api/virtual-tryon`, form, {
      headers: form.getHeaders(),
      timeout: PYTHON_TRYON_TIMEOUT_MS,
    });

    const data = tryonResponse.data;
    if (!data?.success || !data?.image_url) {
      throw new Error(data?.message || 'Python Virtual Try-On returned no image_url');
    }

    await job.updateProgress(75);

    // 4. Download generated image and persist locally
    const pythonImageUrl = data.image_url.startsWith('http')
      ? data.image_url
      : `${PYTHON_TRYON_URL}${data.image_url.startsWith('/') ? '' : '/'}${data.image_url}`;

    const imgRes = await axios.get(pythonImageUrl, {
      responseType: 'arraybuffer',
      timeout: 60_000,
    });

    const outDir = path.resolve(process.cwd(), 'uploads', 'ai-stylist');
    fs.mkdirSync(outDir, { recursive: true });

    const filename = `look_${lookId}_${Date.now()}.png`;
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(imgRes.data));

    const savedUrl = formatUploadUrl(`/uploads/ai-stylist/${filename}`);
    const styleNotes = data.combinations?.[0]?.style_reason || '';

    await AiLook.findByIdAndUpdate(lookId, {
      status: 'COMPLETED',
      pythonJobId: data.job_id || '',
      generatedImageUrl: savedUrl,
      styleNotes,
      errorMessage: '',
    });

    await job.updateProgress(100);
    emitLookStatus(userId, { lookId, status: 'COMPLETED', generatedImageUrl: savedUrl });

    return { success: true, lookId, generatedImageUrl: savedUrl };
  } catch (err) {
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts?.attempts || 1);
    if (isLastAttempt) {
      await AiLook.findByIdAndUpdate(lookId, {
        status: 'FAILED',
        errorMessage: err.message || 'Virtual try-on generation failed',
      });
      emitLookStatus(userId, {
        lookId,
        status: 'FAILED',
        errorMessage: err.message || 'Virtual try-on generation failed',
      });
    }
    throw err;
  }
};

const initAiStylistWorker = () => {
  if (!aiStylistWorker) {
    aiStylistWorker = createWorker(AI_STYLIST_QUEUE_NAME, processAiStylistJob, {
      concurrency: AI_STYLIST_CONCURRENCY,
      lockDuration: PYTHON_TRYON_TIMEOUT_MS,
    });
  }
  return aiStylistWorker;
};

module.exports = {
  initAiStylistWorker,
  processAiStylistJob,
};
