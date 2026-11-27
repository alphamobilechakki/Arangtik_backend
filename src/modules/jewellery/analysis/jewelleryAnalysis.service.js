const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const Jewellery = require('../item/jewellery.model');
const JewelleryBox = require('../box/jewelleryBox.model');
const JewelleryCategory = require('../category/jewelleryCategory.model');
const { callPythonGarmentService, calculateSourceImageHash } = require('../../clothAnalysis/clothAnalysis.service');
const { enqueueJewelleryJob } = require('../../../queues');
const { isRedisAvailable } = require('../../../config/redis.config');
const { formatUploadUrl } = require('../../../utils/url.util');
const { GEMINI_API_KEY } = require('../../../config/env.config');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve or auto-create the user's jewellery box.
 * Falls back to the jewellery.service resolveBox logic without duplicating it.
 */
const resolveBox = async (userId, boxId) => {
  if (boxId) {
    const box = await JewelleryBox.findOne({ _id: boxId, userId });
    if (!box) throw Object.assign(new Error('Jewellery box not found or unauthorized'), { statusCode: 404 });
    return box._id;
  }
  let box = await JewelleryBox.findOne({ userId, isDefault: true }) || await JewelleryBox.findOne({ userId });
  if (!box) box = await JewelleryBox.create({ userId, name: 'My Jewellery Box', isDefault: true });
  return box._id;
};

// ---------------------------------------------------------------------------
// Gemini Vision — Jewellery-specific prompt
// ---------------------------------------------------------------------------

const JEWELLERY_FALLBACK = {
  name: 'Jewellery Item', type: 'GOLD', categoryCode: 'OTHER',
  gemstone: '', color: '', style: 'TRADITIONAL', occasion: ['CASUAL'],
  tags: ['jewellery'], confidence: 0,
};

const JEWELLERY_VISION_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash-latest',
];

/**
 * Sends a bg-removed jewellery image to Gemini and returns structured attributes.
 * Lives here (not in aiVision.service.js) because it is jewellery-specific.
 */
const analyzeJewelleryWithGemini = async (imagePath) => {
  if (!GEMINI_API_KEY || !imagePath || !fs.existsSync(imagePath)) return JEWELLERY_FALLBACK;

  const prompt = `You are an expert Jewellery Vision AI specialising in Indian gold, silver, and fashion jewellery.
Analyse this jewellery image and return ONLY a valid JSON object — no markdown, no explanation.

Required keys:
{
  "name":         "Short descriptive name (e.g. 'Gold Kundan Necklace', 'Diamond Stud Earrings')",
  "type":         "GOLD | SILVER | ARTIFICIAL | CUSTOM",
  "categoryCode": "NECKLACE | EARRING | RING | BRACELET | BANGLE | ANKLET | MAANGTIKA | NOSERING | CHAIN | PENDANT | SET | OTHER",
  "gemstone":     "Primary gemstone visible (e.g. 'Diamond', 'Ruby', 'Kundan', 'Pearl') or empty string",
  "color":        "Primary color (e.g. 'Yellow Gold', 'Rose Gold', 'Silver', 'Multi-Color')",
  "subType":      "Specific style (e.g. 'Jhumka', 'Stud', 'Hoop', 'Choker', 'Kada', 'Layered')",
  "style":        "TRADITIONAL | MODERN | FUSION | BRIDAL | MINIMALIST",
  "occasion":     ["WEDDING","FESTIVE","PARTY","CASUAL","DAILY_WEAR"],
  "tags":         ["descriptive","keyword","tags"],
  "confidence":   0.0
}

Type guide: GOLD=yellow/rose/white gold look · SILVER=silver/rhodium/platinum · ARTIFICIAL=fashion/imitation/oxidised · CUSTOM=mixed/unique`;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const imageBuffer = fs.readFileSync(imagePath);
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    for (const modelName of JEWELLERY_VISION_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          prompt,
          { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
        ]);

        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[JewelleryAI] Gemini (${modelName}) analysed: "${parsed.name}" (${parsed.categoryCode}, confidence: ${parsed.confidence})`);
        return { ...JEWELLERY_FALLBACK, ...parsed, _model: modelName };
      } catch (mErr) {
        console.warn(`[JewelleryAI] Model ${modelName} failed (${mErr.message.slice(0, 100)}), trying next fallback...`);
      }
    }
    return JEWELLERY_FALLBACK;
  } catch (err) {
    console.warn('[JewelleryAI] Gemini analysis failed:', err.message);
    return JEWELLERY_FALLBACK;
  }
};

// ---------------------------------------------------------------------------
// Public: processAndSaveJewelleryItem
// ---------------------------------------------------------------------------

/**
 * Called by the controller for each uploaded photo.
 * 1. Duplicate-checks by SHA-256 hash of the raw file.
 * 2. Creates an instant DB record (processingStatus: PROCESSING).
 * 3. Dispatches background AI job via BullMQ (or setImmediate fallback).
 * 4. Returns immediately — UI shows loader.
 */
const processAndSaveJewelleryItem = async (userId, file, options = {}) => {
  if (!file) throw Object.assign(new Error('Please upload a jewellery photo'), { statusCode: 400 });

  const sourceImageHash = calculateSourceImageHash(file.path);
  const originalImageUrl = formatUploadUrl(`/uploads/${file.filename}`);

  // ── Duplicate check ──────────────────────────────────────────────────────
  if (sourceImageHash) {
    const existing = await Jewellery.findOne({ userId, sourceImageHash });
    if (existing) {
      return { success: true, isDuplicate: true, item: existing.toObject ? existing.toObject() : existing };
    }
  }

  // ── Resolve target box ───────────────────────────────────────────────────
  const jewelleryBoxId = await resolveBox(userId, options.jewelleryBoxId || null);

  // ── Instant DB record ────────────────────────────────────────────────────
  const initialItem = await Jewellery.create({
    userId,
    jewelleryBoxId,
    name:             'Analysing Jewellery...',
    status:           'IN_LOCKER',
    processingStatus: 'PROCESSING',
    sourceImage:      { url: originalImageUrl, filename: file.filename },
    sourcePhotoUrl:   originalImageUrl,
    sourceImageHash,
    lastModifiedBy:   userId,
  });

  // ── Dispatch to background ───────────────────────────────────────────────
  const jobPayload = { itemId: initialItem._id, userId, file };

  if (isRedisAvailable()) {
    console.log(`[JewelleryPipeline] 🟢 BullMQ — queuing item ${initialItem._id}`);
    enqueueJewelleryJob(jobPayload).catch((qErr) => {
      console.warn('[JewelleryPipeline] ⚠️ BullMQ enqueue failed — falling back to setImmediate:', qErr.message);
      setImmediate(() => runBackgroundJewelleryPipeline(initialItem._id, userId, file)
        .catch(err => console.error('[JewelleryPipeline] setImmediate error:', err.message)));
    });
  } else {
    console.warn(`[JewelleryPipeline] 🔴 Redis offline — running item ${initialItem._id} via setImmediate`);
    setImmediate(() => runBackgroundJewelleryPipeline(initialItem._id, userId, file)
      .catch(err => console.error('[JewelleryPipeline] setImmediate error:', err.message)));
  }

  return { success: true, isProcessing: true, queueEngine: isRedisAvailable() ? 'BULLMQ_REDIS' : 'IN_MEMORY_FALLBACK', item: initialItem };
};

// ---------------------------------------------------------------------------
// Public: runBackgroundJewelleryPipeline
// ---------------------------------------------------------------------------

/**
 * Called by the BullMQ worker (or setImmediate fallback).
 * 1. Python removes the background from the original photo.
 * 2. Gemini analyses the clean image → fills all jewellery attributes.
 * 3. Updates the DB record to COMPLETED with all AI data.
 */
const runBackgroundJewelleryPipeline = async (itemId, userId, file) => {
  console.log(`[JewelleryPipeline] Starting background pipeline for item: ${itemId}`);

  try {
    // Step 1 — Python bg removal (same function as wardrobe, 'without_person' for flat-lays)
    const processedGarments = await callPythonGarmentService(file.path, 'without_person');
    const primaryImage = processedGarments[0] || {
      localPath: file.path,
      url:       formatUploadUrl(`/uploads/${file.filename}`),
      filename:  file.filename,
      isFallback: true,
    };

    // Step 2 — Gemini analyses the clean bg-removed image
    const ai = await analyzeJewelleryWithGemini(primaryImage.localPath || file.path);

    // Step 3 — Resolve DB category from Gemini's categoryCode
    const categoryDoc = ai.categoryCode
      ? await JewelleryCategory.findOne({ code: ai.categoryCode.toUpperCase() })
      : null;

    // Step 4 — Write final data to DB
    await Jewellery.findByIdAndUpdate(itemId, {
      name:              ai.name         || 'Jewellery Item',
      type:              ai.type         || 'GOLD',
      jewelleryCategory: categoryDoc?._id ?? null,
      gemstone:          ai.gemstone     || '',
      color:             ai.color        || '',
      generatedImage: {
        url:         primaryImage.url,
        filename:    primaryImage.filename || file.filename,
        generatedAt: primaryImage.isFallback ? null : new Date(),
      },
      aiAnalysis: {
        model:       'gemini-1.5-flash',
        confidence:  ai.confidence ?? 0,
        analyzedAt:  new Date(),
      },
      processingStatus: 'COMPLETED',
      lastModifiedBy:   userId,
    });

    console.log(`✅ [JewelleryPipeline] Completed item ${itemId}: "${ai.name}" (${ai.categoryCode})`);
  } catch (err) {
    console.error(`❌ [JewelleryPipeline] Failed item ${itemId}:`, err.message);
    await Jewellery.findByIdAndUpdate(itemId, {
      processingStatus:        'FAILED',
      processingFailureReason: err.message,
    }).catch(() => {});
  }
};

// ---------------------------------------------------------------------------

module.exports = { processAndSaveJewelleryItem, runBackgroundJewelleryPipeline };
