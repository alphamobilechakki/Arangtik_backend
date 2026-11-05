const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const Wardrobe = require('../wardrobe/wardrobe.model');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');
const ApiError = require('../../utils/apiError');
const aiVisionService = require('./aiVision.service');
const { formatUploadUrl } = require('../../utils/url.util');
const { PYTHON_SERVICE_URL, PYTHON_BG_REMOVAL_URL, PYTHON_SERVICE_TIMEOUT_MS } = require('../../config/env.config');

/**
 * Deterministic SHA-256 canonical hash of original source image
 */
const calculateSourceImageHash = (filePathOrBuffer) => {
  if (!filePathOrBuffer) return null;
  try {
    const buffer = Buffer.isBuffer(filePathOrBuffer)
      ? filePathOrBuffer
      : fs.readFileSync(filePathOrBuffer);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  } catch (e) {
    return null;
  }
};

/**
 * Analyze an uploaded photo from gallery or camera to detect garments, crop them, and match with wardrobe
 */

/**
 * Calls Python AI Microservice for Person Parsing, Garment Splitting, and Inpainting
 * @param {string} imagePath Local path to original image file
 * @param {string} mode 'with_person' | 'without_person'
 * @returns {Promise<Array<{ localPath: string, url: string, filename: string, garmentType?: string, isFallback?: boolean }>>}
 */
const callPythonGarmentService = async (imagePath, mode = 'with_person') => {
  if (!fs.existsSync(imagePath)) {
    throw new ApiError(400, `Image file not found: ${imagePath}`);
  }

  const normalizedMode = String(mode).toLowerCase().includes('without') ? 'without_person' : 'with_person';
  const baseServiceUrl = (PYTHON_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const bgRemovalUrl = (PYTHON_BG_REMOVAL_URL || 'https://bg.arangtik.com/api/background-removal').replace(/\/+$/, '');
  const fileName = path.basename(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const fileBuffer = fs.readFileSync(imagePath);

  // Determine endpoints based on mode:
  // - without_person: Live Background Removal endpoint (https://bg.arangtik.com/api/background-removal)
  // - with_person: Person Parsing & Garment Splitting endpoint
  let candidateEndpoints = [];
  if (normalizedMode === 'without_person') {
    candidateEndpoints = [
      bgRemovalUrl,
      bgRemovalUrl.replace(/^https:/i, 'http:'),
      'https://bg.arangtik.com/api/background-removal',
      'http://bg.arangtik.com/api/background-removal',
      `${baseServiceUrl.replace(/\/api\/background-removal$/i, '')}/api/background-removal`,
      `${baseServiceUrl.replace(/\/api\/background-removal$/i, '')}/background-removal`,
    ];
  } else {
    candidateEndpoints = [
      process.env.PYTHON_PARSING_SERVICE_URL || `${baseServiceUrl}/process`,
      `${baseServiceUrl}/parse-garments`,
      baseServiceUrl,
      baseServiceUrl.replace(/^https:/i, 'http:'),
    ];
  }
  candidateEndpoints = candidateEndpoints.filter(Boolean).filter((u, idx, arr) => arr.indexOf(u) === idx);

  console.log(`[PythonGarmentAI] Calling Python microservice (mode: ${normalizedMode}, endpoints: ${candidateEndpoints[0]}, file: ${fileName})`);

  let response = null;
  let lastError = null;

  for (const endpoint of candidateEndpoints) {
    try {
      const formData = new FormData();
      const fileBlob = new Blob([fileBuffer], { type: mimeType });
      formData.append('image', fileBlob, fileName);
      formData.append('file', fileBlob, fileName);
      formData.append('mode', normalizedMode);
      formData.append('type', normalizedMode);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), PYTHON_SERVICE_TIMEOUT_MS || 30000);

      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        response = res;
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Graceful fallback if Python service is offline / unreachable during development
  if (!response) {
    console.warn(`[PythonGarmentAI] Python service unreachable at ${baseServiceUrl} (${lastError?.message || 'Check connection'}). Fallback to original image.`);
    return [
      {
        localPath: imagePath,
        url: formatUploadUrl(`/uploads/${fileName}`),
        filename: fileName,
        isFallback: true,
      },
    ];
  }

  const cropsDir = path.join(__dirname, '../../../uploads/crops');
  if (!fs.existsSync(cropsDir)) {
    fs.mkdirSync(cropsDir, { recursive: true });
  }

  const contentType = response.headers.get('content-type') || '';

  // Case A: Binary image stream returned directly
  if (contentType.startsWith('image/')) {
    const arrayBuffer = await response.arrayBuffer();
    const outFilename = `garment_${Date.now()}_0.webp`;
    const outPath = path.join(cropsDir, outFilename);
    await sharp(Buffer.from(arrayBuffer)).webp({ quality: 90 }).toFile(outPath);

    return [
      {
        localPath: outPath,
        url: formatUploadUrl(`/uploads/crops/${outFilename}`),
        filename: outFilename,
      },
    ];
  }

  // Case B: JSON Response
  try {
    const jsonResult = await response.json();
    const items = jsonResult.garments || jsonResult.items || jsonResult.images || jsonResult.results || [];
    const processedList = [];

    if (Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const base64Data = it.image || it.imageBase64 || it.data || (typeof it === 'string' ? it : null);
        const garmentType = it.garmentType || it.type || it.label || null;

        if (base64Data && typeof base64Data === 'string' && (base64Data.startsWith('data:') || base64Data.length > 200)) {
          const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
          const buf = Buffer.from(cleanBase64, 'base64');
          const outName = `garment_${Date.now()}_${i}.webp`;
          const outPath = path.join(cropsDir, outName);
          await sharp(buf).webp({ quality: 90 }).toFile(outPath);

          processedList.push({
            localPath: outPath,
            url: formatUploadUrl(`/uploads/crops/${outName}`),
            filename: outName,
            garmentType,
          });
        } else if (it.url || it.imageUrl) {
          processedList.push({
            localPath: null,
            url: it.url || it.imageUrl,
            filename: path.basename(it.url || it.imageUrl),
            garmentType,
          });
        }
      }
    } else if (jsonResult.image || jsonResult.imageUrl || jsonResult.imageBase64 || jsonResult.output_image || jsonResult.processed_image || jsonResult.result) {
      const singleData = jsonResult.image || jsonResult.imageBase64 || jsonResult.output_image || jsonResult.processed_image || (typeof jsonResult.result === 'string' ? jsonResult.result : null);
      if (singleData && typeof singleData === 'string' && (singleData.startsWith('data:') || singleData.length > 200)) {
        const cleanBase64 = singleData.replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(cleanBase64, 'base64');
        const outName = `garment_${Date.now()}_0.webp`;
        const outPath = path.join(cropsDir, outName);
        await sharp(buf).webp({ quality: 90 }).toFile(outPath);

        processedList.push({
          localPath: outPath,
          url: formatUploadUrl(`/uploads/crops/${outName}`),
          filename: outName,
        });
      } else if (jsonResult.imageUrl) {
        processedList.push({
          localPath: null,
          url: jsonResult.imageUrl,
          filename: path.basename(jsonResult.imageUrl),
        });
      }
    }

    if (processedList.length > 0) {
      return processedList;
    }
  } catch (parseErr) {
    console.warn('[PythonGarmentAI] Error parsing Python JSON response:', parseErr.message);
  }

  return [
    {
      localPath: imagePath,
      url: formatUploadUrl(`/uploads/${fileName}`),
      filename: fileName,
      isFallback: true,
    },
  ];
};

/**
 * Universal Wardrobe Item Processing & Persistence Pipeline:
 * 1. Takes uploaded image + mode ('with_person' | 'without_person')
 * 2. If 'with_person', Python handles person parsing, garment splitting & inpainting
 * 3. Node.js analyzes clean garment images with Gemini Vision for fashion taxonomy & attributes
 * 4. Checks duplicate & saves WardrobeItem to MongoDB
 */
/**
 * Asynchronously processes garment with Python & Gemini in the background
 * without blocking user response.
 */
const runBackgroundClothingPipeline = async (itemId, userId, file, options = {}) => {
  const mode = options.mode || options.personMode || options.type || (options.withPerson === 'true' || options.withPerson === true ? 'with_person' : 'without_person');
  const targetWardrobeId = options.wardrobeId || null;
  const originalImageUrl = formatUploadUrl(`/uploads/${file.filename}`);

  console.log(`[BackgroundWorker] Starting clothing processing for itemId: ${itemId}, mode: ${mode}`);

  try {
    // 1. Send image to Python for parsing, splitting & inpainting
    const processedGarments = await callPythonGarmentService(file.path, mode);
    const primaryGarment = processedGarments[0] || {
      localPath: file.path,
      url: originalImageUrl,
      filename: file.filename,
      isFallback: true,
    };

    // 2. Analyze primary clean garment with Gemini Vision (Node.js)
    let aiAttributes = {};
    try {
      aiAttributes = await aiVisionService.analyzeSingleClothWithGemini(primaryGarment.localPath || file.path);
    } catch (gErr) {
      console.warn(`[BackgroundWorker] Gemini analysis warning for item ${itemId}: ${gErr.message}`);
      aiAttributes = {
        name: options.name || 'Dress Item',
        category: options.category || (primaryGarment.garmentType === 'lower_wear' ? 'LOWER_WEAR' : 'UPPER_WEAR'),
        subCategory: options.subCategory || 'Other',
        color: options.color || 'Multi-Color',
        attributes: {},
        tags: ['Cloth'],
      };
    }

    const finalName = options.name || aiAttributes.name || 'Dress Item';
    const finalCategory = options.category || aiAttributes.category || 'UPPER_WEAR';
    const finalSubCategory = options.subCategory || aiAttributes.subCategory || '';
    const finalColor = options.color || aiAttributes.color || aiAttributes.attributes?.primaryColor || '';
    const primaryImgUrl = primaryGarment.url || originalImageUrl;

    // 3. Update initial WardrobeItem to COMPLETED
    await WardrobeItem.findByIdAndUpdate(itemId, {
      name: finalName,
      category: finalCategory,
      subCategory: finalSubCategory,
      color: finalColor,
      pattern: options.pattern || aiAttributes.attributes?.pattern || 'SOLID',
      fabric: options.fabric || aiAttributes.attributes?.fabric || 'COTTON',
      fit: options.fit || aiAttributes.attributes?.fit || 'REGULAR_FIT',
      neckline: options.neckline || aiAttributes.attributes?.neckline || 'Round Neck',
      sleeveLength: options.sleeveLength || aiAttributes.attributes?.sleeveLength || 'HALF_SLEEVE',
      sleeveStyle: options.sleeveStyle || aiAttributes.attributes?.sleeveStyle || 'HALF_SLEEVE',
      occasion: options.occasion || aiAttributes.attributes?.occasions || ['CASUAL'],
      season: options.season || aiAttributes.attributes?.seasons || ['ALL_SEASON'],
      style: options.style || aiAttributes.attributes?.styleAesthetic || 'CASUAL',
      tags: options.tags || aiAttributes.tags || [],
      attributes: aiAttributes.attributes || {},
      images: [
        {
          url: primaryImgUrl,
          type: primaryGarment.isFallback ? 'ORIGINAL' : 'SEGMENTED',
          isPrimary: true,
          filename: primaryGarment.filename || file.filename,
        },
        {
          url: originalImageUrl,
          type: 'ORIGINAL',
          isPrimary: false,
          filename: file.filename,
        },
      ],
      processingStatus: 'COMPLETED',
    });

    console.log(`✅ [BackgroundWorker] Completed processing item ${itemId}: "${finalName}" (${finalCategory})`);

    // 4. If Python split multiple garments (e.g. Upper wear + Lower wear separated from 1 photo)
    if (processedGarments.length > 1) {
      for (let idx = 1; idx < processedGarments.length; idx++) {
        const extraGarment = processedGarments[idx];
        try {
          const extraAi = await aiVisionService.analyzeSingleClothWithGemini(extraGarment.localPath || file.path);
          await WardrobeItem.create({
            userId,
            wardrobeId: targetWardrobeId,
            name: extraAi.name || 'Dress Item',
            category: extraAi.category || (extraGarment.garmentType === 'lower_wear' ? 'LOWER_WEAR' : 'UPPER_WEAR'),
            subCategory: extraAi.subCategory || '',
            color: extraAi.color || '',
            pattern: extraAi.attributes?.pattern || 'SOLID',
            fabric: extraAi.attributes?.fabric || 'COTTON',
            fit: extraAi.attributes?.fit || 'REGULAR_FIT',
            neckline: extraAi.attributes?.neckline || 'Round Neck',
            sleeveLength: extraAi.attributes?.sleeveLength || 'HALF_SLEEVE',
            sleeveStyle: extraAi.attributes?.sleeveStyle || 'HALF_SLEEVE',
            occasion: extraAi.attributes?.occasions || ['CASUAL'],
            season: extraAi.attributes?.seasons || ['ALL_SEASON'],
            style: extraAi.attributes?.styleAesthetic || 'CASUAL',
            tags: extraAi.tags || [],
            attributes: extraAi.attributes || {},
            images: [
              {
                url: extraGarment.url || originalImageUrl,
                type: 'SEGMENTED',
                isPrimary: true,
                filename: extraGarment.filename || file.filename,
              },
            ],
            sourceType: options.sourceType || 'CAMERA_CAPTURE',
            sourcePhotoUrl: originalImageUrl,
            sourceImageIndex: idx,
            processingStatus: 'COMPLETED',
            isActive: true,
          });
          console.log(`✅ [BackgroundWorker] Extra split garment created from photo: "${extraAi.name}"`);
        } catch (extraErr) {
          console.warn('[BackgroundWorker] Extra garment creation warning:', extraErr.message);
        }
      }
    }
  } catch (err) {
    console.error(`❌ [BackgroundWorker] Failed to process item ${itemId}: ${err.message}`);
    await WardrobeItem.findByIdAndUpdate(itemId, {
      processingStatus: 'FAILED',
      name: options.name || 'Dress Item',
      category: options.category || 'UPPER_WEAR',
    });
  }
};

/**
 * Universal Wardrobe Item Processing & Persistence Pipeline:
 * 1. Takes uploaded image + mode ('with_person' | 'without_person')
 * 2. Immediately saves item with status='PROCESSING' and returns to UI in <200ms
 * 3. Asynchronously triggers Python parsing, garment split, and Gemini cloth analysis
 */
const processAndSaveWardrobeItem = async (userId, file, options = {}) => {
  if (!file) {
    throw new ApiError(400, 'Please upload an image');
  }

  const mode = options.mode || options.personMode || options.type || (options.withPerson === 'true' || options.withPerson === true ? 'with_person' : 'without_person');
  let targetWardrobeId = options.wardrobeId || null;
  if (!targetWardrobeId) {
    const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
    if (defaultW) targetWardrobeId = defaultW._id;
  }

  const sourceImageHash = calculateSourceImageHash(file.path);
  const originalImageUrl = formatUploadUrl(`/uploads/${file.filename}`);

  // Duplicate check
  const isOverride = options.allowDuplicate === true || options.allowDuplicate === 'true' || options.forceAdd === true || options.forceAdd === 'true';
  if (sourceImageHash && !isOverride) {
    const existing = await WardrobeItem.findOne({
      userId,
      ...(targetWardrobeId ? { wardrobeId: targetWardrobeId } : {}),
      sourceImageHash,
    });

    if (existing) {
      const doc = existing.toObject ? existing.toObject() : existing;
      doc.isDuplicate = true;
      doc.isExistingItem = true;
      return {
        success: true,
        isDuplicate: true,
        item: doc,
        items: [],
        duplicates: [doc],
      };
    }
  }

  // Create immediate item with PROCESSING status
  const initialItem = await WardrobeItem.create({
    userId,
    wardrobeId: targetWardrobeId,
    name: options.name || 'Analyzing Outfit...',
    category: options.category || 'PENDING',
    subCategory: options.subCategory || '',
    color: options.color || '',
    processingStatus: 'PROCESSING',
    images: [
      {
        url: originalImageUrl,
        type: 'ORIGINAL',
        isPrimary: true,
        filename: file.filename,
      },
    ],
    sourceType: options.sourceType || 'CAMERA_CAPTURE',
    sourcePhotoUrl: originalImageUrl,
    sourceImageHash,
    isActive: true,
  });

  // Launch async processing in the background (fire-and-forget, non-blocking)
  setImmediate(() => {
    runBackgroundClothingPipeline(initialItem._id, userId, file, { ...options, mode, wardrobeId: targetWardrobeId })
      .catch((err) => console.error('[BackgroundWorker] Uncaught async error:', err.message));
  });

  return {
    success: true,
    isProcessing: true,
    mode,
    item: initialItem,
    items: [initialItem],
    duplicates: [],
  };
};

const analyzePhoto = async (userId, file, options = {}) => {
  if (!file) {
    throw new ApiError(400, 'Please upload an image to analyze');
  }

  const originalImageUrl = formatUploadUrl(`/uploads/${file.filename}`);
  const sourceImageHash = calculateSourceImageHash(file.path);

  let targetWardrobeId = options.wardrobeId || null;
  if (!targetWardrobeId) {
    const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
    if (defaultW) targetWardrobeId = defaultW._id;
  }

  const wardrobeFilter = { userId };
  if (targetWardrobeId) {
    wardrobeFilter.wardrobeId = targetWardrobeId;
  }

  // LEVEL 1: Exact Source Image Duplicate Check (Scoped to target Almari, then full wardrobe)
  if (sourceImageHash) {
    let existingExactItems = await WardrobeItem.find({
      ...wardrobeFilter,
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

    if (existingExactItems.length === 0 && targetWardrobeId) {
      existingExactItems = await WardrobeItem.find({
        userId,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });
    }

    if (existingExactItems.length > 0) {
      console.log(`[ClothAnalysis] [DUPLICATE_CHECK] Exact source image match found for user: ${userId}, wardrobe: ${targetWardrobeId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing wardrobe item(s).`);
      const primaryEx = existingExactItems[0];
      const exAttrs = primaryEx.attributes ? (typeof primaryEx.attributes.toJSON === 'function' ? primaryEx.attributes.toJSON() : primaryEx.attributes) : {};
      const autoFilledFields = {
        name: primaryEx.name || '',
        category: primaryEx.category || '',
        subCategory: primaryEx.subCategory || '',
        color: primaryEx.color || exAttrs.primaryColor || '',
        fabric: primaryEx.fabric || exAttrs.fabric || '',
        pattern: primaryEx.pattern || exAttrs.pattern || '',
        fit: primaryEx.fit || exAttrs.fit || '',
        neckline: primaryEx.neckline || exAttrs.neckline || '',
        sleeveLength: primaryEx.sleeveLength || exAttrs.sleeveLength || '',
        occasion: primaryEx.occasion || exAttrs.occasions || [],
        season: primaryEx.season || exAttrs.seasons || [],
        style: primaryEx.style || exAttrs.styleAesthetic || '',
        croppedImageUrl: primaryEx.images?.[0]?.url || originalImageUrl,
        originalImageUrl,
        attributes: exAttrs,
        tags: primaryEx.tags || [],
      };
      return {
        originalImageUrl,
        sourceImageHash,
        isExactDuplicateImage: true,
        detectedItemsCount: existingExactItems.length,
        autoFilledFields,
        analysis: existingExactItems.map((ex) => ({
          tempDetectionId: `det_exact_${ex._id}`,
          name: ex.name,
          category: ex.category,
          subCategory: ex.subCategory,
          croppedImageUrl: ex.images?.[0]?.url || originalImageUrl,
          attributes: ex.attributes ? (typeof ex.attributes.toJSON === 'function' ? ex.attributes.toJSON() : ex.attributes) : {},
          matchType: 'EXISTING_ITEM',
          matchedItem: ex,
          matchResult: {
            status: 'EXACT_MATCH',
            matchType: 'IMAGE_HASH',
            confidenceScore: 1.0,
            message: `Exact duplicate photo detected in this Almari. Reusing existing wardrobe item "${ex.name}".`,
            existingItem: ex,
          },
        })),
      };
    }
  }

  // 1. Detect garments and extract attributes
  const userFaceBoxes = [];
  const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path, userFaceBoxes);

  // 2. Crop detected clothing pieces from the original image
  const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections, options);

  // 3. Fetch existing wardrobe items for THIS specific Almari to check for duplicates/matches
  let existingItems = await WardrobeItem.find(wardrobeFilter);
  if (existingItems.length === 0 && targetWardrobeId) {
    existingItems = await WardrobeItem.find({ userId });
  }

  // 4. Perform hybrid matching (Exact match, Ambiguous match, New item)
  const matchedDetections = aiVisionService.matchAgainstWardrobe(croppedDetections, existingItems);

  // Enrich each detected garment with its own structured autoFilledFields for multi-item selection in UI
  const formattedDetections = matchedDetections.map((item, idx) => {
    const itemAttrs = item.attributes || {};
    const isExactDuplicate = item.matchResult?.status === 'EXACT_MATCH';
    const isAmbiguous = item.matchResult?.status === 'AMBIGUOUS_MATCH';
    return {
      ...item,
      detectionIndex: idx,
      selected: !isExactDuplicate, // Exact duplicates auto-deselected by default to prevent duplicate adds
      isDuplicate: isExactDuplicate,
      isAmbiguous: isAmbiguous,
      autoFilledFields: {
        name: item.name || '',
        category: item.category || '',
        subCategory: item.subCategory || '',
        color: itemAttrs.primaryColor || '',
        fabric: itemAttrs.fabric || '',
        pattern: itemAttrs.pattern || itemAttrs.designPattern || '',
        fit: itemAttrs.fit || '',
        neckline: itemAttrs.neckline || '',
        sleeveLength: itemAttrs.sleeveLength || itemAttrs.sleeveStyle || '',
        sleeveStyle: itemAttrs.sleeveStyle || '',
        occasion: itemAttrs.occasions || itemAttrs.occasion || [],
        season: itemAttrs.seasons || itemAttrs.season || [],
        style: itemAttrs.styleAesthetic || itemAttrs.style || '',
        croppedImageUrl: item.croppedImageUrl || originalImageUrl,
        originalImageUrl,
        attributes: itemAttrs,
        tags: [
          itemAttrs.primaryColor,
          item.subCategory,
          item.category,
          ...(itemAttrs.occasions || []),
        ].filter(Boolean),
      },
    };
  });

  // Extract clean, structured autoFilledFields from the primary detected garment for backward compatibility
  const primaryItem = formattedDetections[0] || {};
  const attrs = primaryItem.attributes || {};
  const autoFilledFields = primaryItem.autoFilledFields || {
    name: primaryItem.name || '',
    category: primaryItem.category || '',
    subCategory: primaryItem.subCategory || '',
    color: attrs.primaryColor || '',
    fabric: attrs.fabric || '',
    pattern: attrs.pattern || attrs.designPattern || '',
    fit: attrs.fit || '',
    neckline: attrs.neckline || '',
    sleeveLength: attrs.sleeveLength || attrs.sleeveStyle || '',
    sleeveStyle: attrs.sleeveStyle || '',
    occasion: attrs.occasions || attrs.occasion || [],
    season: attrs.seasons || attrs.season || [],
    style: attrs.styleAesthetic || attrs.style || '',
    croppedImageUrl: primaryItem.croppedImageUrl || originalImageUrl,
    originalImageUrl,
    attributes: attrs,
    tags: [
      attrs.primaryColor,
      primaryItem.subCategory,
      primaryItem.category,
      ...(attrs.occasions || []),
    ].filter(Boolean),
  };

  return {
    originalImageUrl,
    sourceImageHash,
    detectedItemsCount: formattedDetections.length,
    autoFilledFields,
    analysis: formattedDetections,
    items: formattedDetections,
    matchResult: primaryItem.matchResult || null,
    matchedItem: primaryItem.matchedItem || null,
    isDuplicate: !!primaryItem.isDuplicate,
    isAmbiguous: !!primaryItem.isAmbiguous,
  };
};

/**
 * Scan a single user gallery photo, verify authenticated user presence using reference face,
 * and extract user-specific clothing with segmentation, duplicate prevention, and intelligent wardrobe persistence.
 */
const scanGalleryPhoto = async (userId, file, options = {}) => {
  if (!file) {
    throw new ApiError(400, 'Please upload a gallery photo to scan');
  }

  const sourceImageHash = calculateSourceImageHash(file.path);
  const autoPersist = options.autoPersist !== false;

  let targetWardrobeId = options.wardrobeId || null;
  if (!targetWardrobeId) {
    const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
    if (defaultW) targetWardrobeId = defaultW._id;
  }

  const wardrobeFilter = { userId };
  if (targetWardrobeId) {
    wardrobeFilter.wardrobeId = targetWardrobeId;
  }

  console.log(`[ClothAnalysis] Scan initiated for user: ${userId}, wardrobe: ${targetWardrobeId}, file: ${file.filename}, hash: ${sourceImageHash ? sourceImageHash.slice(0, 12) : 'null'}`);

  // LEVEL 1: Exact Source Image Duplicate Check (Scoped to target Almari, then full wardrobe)
  if (sourceImageHash) {
    let existingExactItems = await WardrobeItem.find({
      ...wardrobeFilter,
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

    if (existingExactItems.length === 0 && targetWardrobeId) {
      existingExactItems = await WardrobeItem.find({
        userId,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });
    }

    if (existingExactItems.length > 0) {
      console.log(`[ClothAnalysis] [DUPLICATE_CHECK] Exact source image match found for user: ${userId}, wardrobe: ${targetWardrobeId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing wardrobe item(s).`);

      const processedItems = [];
      for (const ex of existingExactItems) {
        const persistedGarment = ex;

        processedItems.push({
          tempDetectionId: `det_exact_${ex._id}`,
          name: ex.name,
          category: ex.category,
          subCategory: ex.subCategory,
          croppedImageUrl: ex.images?.[0]?.url || formatUploadUrl(`/uploads/${file.filename}`),
          attributes: ex.attributes ? (typeof ex.attributes.toJSON === 'function' ? ex.attributes.toJSON() : ex.attributes) : {},
          matchType: 'EXISTING_ITEM',
          matchedItem: persistedGarment,
          status: 'EXACT_MATCH',
          wardrobeItemId: ex._id,
          similarity: 1.0,
          garment: persistedGarment,
          matchResult: {
            status: 'EXACT_MATCH',
            matchType: 'IMAGE_HASH',
            confidenceScore: 1.0,
            message: `Exact duplicate photo detected in this Almari. Reusing existing wardrobe item "${ex.name}".`,
            existingItem: ex,
          },
        });
      }

      return {
        matched: true,
        isExactDuplicateImage: true,
        sourceImageHash,
        matchedFace: {
          confidence: 1.0,
          similarity: 1.0,
        },
        facesDetected: 1,
        originalImageUrl: formatUploadUrl(`/uploads/${file.filename}`),
        detectedItemsCount: processedItems.length,
        items: processedItems,
      };
    }
  }

    const fileMeta = {
    filename: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    path: file.path,
  };

  // 1. Detect all faces in photo and compare against authenticated user's reference face
  const scanResult = await faceRecognitionService.scanGalleryImage(
    userId,
    file.path,
    fileMeta,
    options.threshold || null,
    options.wardrobeId || null
  );

  // If user is not present in the photo
  if (!scanResult.matched || !scanResult.matchedFaces || scanResult.matchedFaces.length === 0) {
    console.log(`[ClothAnalysis] Target person for wardrobe ${options.wardrobeId || 'default'} NOT detected in ${file.filename}. Skipped clothing extraction.`);
    return {
      matched: false,
      reason: 'USER_NOT_FOUND',
      facesDetected: scanResult.facesDetected || 0,
      originalImageUrl: formatUploadUrl(`/uploads/${file.filename}`),
      items: [],
    };
  }

  // Authenticated user IS present!
  const primaryMatchedFace = scanResult.matchedFaces[0];
  const userFaceBoxes = scanResult.matchedFaces.map((f) => f.boundingBox);
  console.log(`[ClothAnalysis] Target person verified (Faces detected: ${scanResult.facesDetected}, confidence: ${primaryMatchedFace.confidence || primaryMatchedFace.similarity})`);

  // 2. Gemini Clothing Detection (targeted specifically to authenticated user face coordinates)
  const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path, userFaceBoxes);

  // 3. Sharp Crop + Segmentation (ISNet/U2Net via @imgly/background-removal-node -> transparent WebP)
  const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections, options);
  console.log(`[ClothAnalysis] Detected & segmented ${croppedDetections.length} garments for user ${userId}`);

  // 4. Duplicate / Similarity matching against target Almari's existing items
  let existingItems = await WardrobeItem.find(wardrobeFilter);
  if (existingItems.length === 0 && targetWardrobeId) {
    existingItems = await WardrobeItem.find({ userId });
  }
  const inFlightItems = [...existingItems];

  const processedItems = [];

  for (let i = 0; i < croppedDetections.length; i++) {
    const rawDetection = croppedDetections[i];
    // Match against existing database items AND any items newly persisted in this same request
    const matchResults = aiVisionService.matchAgainstWardrobe([rawDetection], inFlightItems);
    const itemMatch = matchResults[0];

    const matchStatus = itemMatch.matchResult?.status || 'NEW_ITEM';
    const confidenceScore = itemMatch.matchResult?.confidenceScore || 0;
    const existingMatchedItem = itemMatch.matchResult?.existingItem || itemMatch.matchedItem;

    let finalStatus = 'NEW_ITEM';
    let wardrobeItemId = null;
    let persistedGarment = null;

    if (matchStatus === 'EXACT_MATCH' && existingMatchedItem) {
      finalStatus = 'EXACT_MATCH';
      wardrobeItemId = existingMatchedItem._id;
      persistedGarment = existingMatchedItem;
      console.log(`[ClothAnalysis] Garment "${itemMatch.name}": EXACT_MATCH with "${existingMatchedItem.name}" (ID: ${wardrobeItemId}, score: ${confidenceScore}). Duplicate skipped.`);
    } else if (matchStatus === 'AMBIGUOUS_MATCH') {
      finalStatus = 'AMBIGUOUS_MATCH';
      console.log(`[ClothAnalysis] Garment "${itemMatch.name}": AMBIGUOUS_MATCH (score: ${confidenceScore}). Preserving ambiguity for user confirmation.`);
    } else {
      // NEW_ITEM -> Persist new wardrobe record
      finalStatus = 'CREATED';
      console.log(`[ClothAnalysis] Garment "${itemMatch.name}": NEW_ITEM detected. Creating wardrobe record.`);

      if (autoPersist) {
        const primaryColor = rawDetection.attributes?.primaryColor || '';
        const subCat = rawDetection.subCategory || rawDetection.category || 'Garment';
        const defaultName = primaryColor ? `${primaryColor} ${subCat}` : `${rawDetection.category || 'Garment'} Item`;

        let finalWardrobeId = options.wardrobeId || null;
        if (!finalWardrobeId) {
          const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
          if (defaultW) finalWardrobeId = defaultW._id;
        }

        try {
          const newItem = await WardrobeItem.create({
            userId,
            wardrobeId: finalWardrobeId || null,
            name: rawDetection.name || defaultName,
            category: rawDetection.category || 'OTHER',
            subCategory: rawDetection.subCategory || 'Other',
            color: primaryColor,
            pattern: rawDetection.attributes?.pattern || rawDetection.attributes?.designPattern || '',
            fabric: rawDetection.attributes?.fabric || '',
            occasion: rawDetection.attributes?.occasions || rawDetection.occasion || [],
            season: rawDetection.attributes?.seasons || rawDetection.season || [],
            style: rawDetection.attributes?.styleAesthetic || rawDetection.style || '',
            sourceType: 'GALLERY_SCAN',
            sourcePhotoUrl: formatUploadUrl(`/uploads/${file.filename}`),
            sourceImageHash: sourceImageHash || null,
            sourceImageIndex: i,
            images: [
              {
                url: formatUploadUrl(rawDetection.croppedImageUrl || `/uploads/${file.filename}`),
                filename: rawDetection.croppedFilename || file.filename,
                isPrimary: true,
              },
            ],
            attributes: rawDetection.attributes || {},
            tags: ['Auto-Extracted', 'Gallery-Scan', primaryColor, rawDetection.category].filter(Boolean),
          });

          wardrobeItemId = newItem._id;
          persistedGarment = newItem;
          inFlightItems.push(newItem);
          console.log(`[ClothAnalysis] Created new wardrobe record "${newItem.name}" (ID: ${newItem._id})`);
        } catch (createErr) {
          console.error(`[ClothAnalysis] Error creating wardrobe item for "${rawDetection.name}":`, createErr);
          finalStatus = 'FAILED';
        }
      }
    }

    processedItems.push({
      ...itemMatch,
      status: finalStatus,
      wardrobeItemId: wardrobeItemId,
      similarity: confidenceScore,
      garment: persistedGarment,
    });
  }

  return {
    matched: true,
    matchedFace: {
      confidence: primaryMatchedFace.confidence || primaryMatchedFace.detectionConfidence,
      similarity: primaryMatchedFace.similarity,
      distance: primaryMatchedFace.distance,
      boundingBox: primaryMatchedFace.boundingBox,
    },
    facesDetected: scanResult.facesDetected,
    originalImageUrl: formatUploadUrl(`/uploads/${file.filename}`),
    detectedItemsCount: processedItems.length,
    items: processedItems,
  };
};

/**
 * Bulk add standalone dress photos (1 to 100 photos)
 * Automatically detects garments, crops clean cards, checks duplicates, and saves directly into wardrobe.
 */
const bulkAddDressPhotos = async (userId, files = [], options = {}) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'Please upload at least one clothing photo to digitize');
  }

  let targetWardrobeId = options.wardrobeId || null;
  let targetWardrobeName = '';
  if (targetWardrobeId) {
    try {
      const targetWardrobe = await Wardrobe.findOne({ _id: targetWardrobeId, userId });
      if (targetWardrobe) {
        targetWardrobeName = targetWardrobe.name;
      }
    } catch (wErr) {
      console.warn(`[ClothAnalysis] Failed to fetch wardrobe for id ${targetWardrobeId}:`, wErr.message);
    }
  }
  if (!targetWardrobeId) {
    const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
    if (defaultW) {
      targetWardrobeId = defaultW._id;
      targetWardrobeName = defaultW.name;
    }
  }

  const wardrobeFilter = { userId };
  if (targetWardrobeId) {
    wardrobeFilter.wardrobeId = targetWardrobeId;
  }

  const results = {
    totalPhotosReceived: files.length,
    totalGarmentsExtracted: 0,
    targetWardrobeName: targetWardrobeName || null,
    newItemsCreated: [],
    existingMatches: [],
    details: [],
  };

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const sourceImageHash = calculateSourceImageHash(file.path);

    // LEVEL 1: Exact Source Image Duplicate Check (Scoped to target Almari, then full wardrobe)
    if (sourceImageHash) {
      let existingExactItems = await WardrobeItem.find({
        ...wardrobeFilter,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

      if (existingExactItems.length === 0 && targetWardrobeId) {
        existingExactItems = await WardrobeItem.find({
          userId,
          sourceImageHash,
        }).sort({ sourceImageIndex: 1, createdAt: 1 });
      }

      if (existingExactItems.length > 0) {
        console.log(`[ClothAnalysis] [bulkAddDressPhotos] [DUPLICATE_CHECK] Exact duplicate image found for user: ${userId}, wardrobe: ${targetWardrobeId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing items (skipped duplicate addition).`);
        for (const ex of existingExactItems) {
          results.existingMatches.push(ex);
        }
        results.totalGarmentsExtracted += existingExactItems.length;
        results.details.push({
          filename: file.filename,
          originalImageUrl: `/uploads/${file.filename}`,
          garmentsFound: existingExactItems.length,
          createdItems: 0,
          matchedItems: existingExactItems.length,
          isExactDuplicateImage: true,
        });
        continue;
      }
    }

    try {
      // 1. Detect garments in this photo (standalone clothing item or flat lay)
      const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path);
      const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections, options);

      // 2. Fetch up-to-date closet items for this target Almari to prevent duplicate additions
      let existingItems = await WardrobeItem.find(wardrobeFilter);
      if (existingItems.length === 0 && targetWardrobeId) {
        existingItems = await WardrobeItem.find({ userId });
      }
      const inFlightItems = [...existingItems, ...results.newItemsCreated];
      const matchedDetections = aiVisionService.matchAgainstWardrobe(croppedDetections, inFlightItems);

      const fileCreatedItems = [];
      const fileMatchedItems = [];

      for (let itemIdx = 0; itemIdx < matchedDetections.length; itemIdx++) {
        const item = matchedDetections[itemIdx];
        if (item.matchResult?.status === 'EXACT_MATCH' && item.matchResult?.existingItem) {
          fileMatchedItems.push(item.matchResult.existingItem);
          results.existingMatches.push(item.matchResult.existingItem);
        } else {
          // Create new wardrobe item
          const primaryColor = item.attributes?.primaryColor || '';
          const subCat = item.subCategory || item.category || 'Dress';
          const defaultName = primaryColor ? `${primaryColor} ${subCat}` : `${item.category || 'Garment'} Item`;

          let finalWardrobeId = options.wardrobeId || null;
          if (!finalWardrobeId) {
            const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
            if (defaultW) finalWardrobeId = defaultW._id;
          }

          const newItem = await WardrobeItem.create({
            userId,
            wardrobeId: finalWardrobeId || null,
            name: item.name || defaultName,
            category: item.category || 'OTHER',
            subCategory: item.subCategory || 'Other',
            color: primaryColor,
            pattern: item.attributes?.pattern || item.attributes?.designPattern || '',
            fabric: item.attributes?.fabric || '',
            occasion: item.attributes?.occasions || item.occasion || [],
            season: item.attributes?.seasons || item.season || [],
            style: item.attributes?.styleAesthetic || item.style || '',
            sourceType: 'MANUAL_UPLOAD',
            sourcePhotoUrl: formatUploadUrl(`/uploads/${file.filename}`),
            sourceImageHash: sourceImageHash || null,
            sourceImageIndex: itemIdx,
            images: [
              {
                url: formatUploadUrl(item.croppedImageUrl || `/uploads/${file.filename}`),
                filename: item.croppedFilename || file.filename,
                isPrimary: true,
              },
            ],
            attributes: item.attributes || {},
            tags: ['Bulk-Digitized', primaryColor, item.category].filter(Boolean),
          });

          fileCreatedItems.push(newItem);
          results.newItemsCreated.push(newItem);
          inFlightItems.push(newItem);
        }
      }

      results.totalGarmentsExtracted += croppedDetections.length;
      results.details.push({
        filename: file.filename,
        originalImageUrl: formatUploadUrl(`/uploads/${file.filename}`),
        garmentsFound: croppedDetections.length,
        createdItems: fileCreatedItems,
        matchedItems: fileMatchedItems,
      });
    } catch (err) {
      console.error(`[ClothAnalysis] [bulkAddDressPhotos] Error on file ${file.filename}:`, err);
      results.details.push({
        filename: file.filename,
        error: err.message,
      });
    }
  }

  let summaryMessage = '';
  const almariLabel = targetWardrobeName ? `"${targetWardrobeName}"` : 'Almari';
  if (results.totalPhotosReceived === 0) {
    summaryMessage = 'No photos were uploaded to process.';
  } else if (results.totalGarmentsExtracted === 0) {
    summaryMessage = 'No garments could be detected from the uploaded photo(s).';
  } else if (results.newItemsCreated.length > 0 && results.existingMatches.length > 0) {
    summaryMessage = `Extracted ${results.totalGarmentsExtracted} garment(s): ${results.newItemsCreated.length} added to ${almariLabel}, ${results.existingMatches.length} duplicate(s) already exist (skipped duplicate additions).`;
  } else if (results.newItemsCreated.length > 0) {
    summaryMessage = `Successfully extracted and added ${results.newItemsCreated.length} garment(s) to ${almariLabel}.`;
  } else {
    summaryMessage = `Extracted ${results.totalGarmentsExtracted} garment(s), but all ${results.existingMatches.length} already exist in ${almariLabel} (skipped duplicate additions).`;
  }
  results.summaryMessage = summaryMessage;

  // Dispatch FCM Push Notification if items were added
  if (results.newItemsCreated && results.newItemsCreated.length > 0) {
    try {
      const notificationService = require('../notification/notification.service');
      notificationService
        .sendToUser(userId, {
          title: 'Wardrobe Digitization Complete ',
          body: `Successfully extracted and added ${results.newItemsCreated.length} garment(s) to ${almariLabel}.`,
          data: {
            type: 'WARDROBE_DIGITIZED',
            count: String(results.newItemsCreated.length),
            wardrobeId: String(targetWardrobeId || ''),
          },
          type: 'WARDROBE_DIGITIZED',
        })
        .catch((err) => console.warn('[FCM Digitization Notification Warning]:', err.message));
    } catch (fcmErr) {
      console.warn('[FCM Digitization Notification Warning]:', fcmErr.message);
    }
  }

  return results;
};

/**
 * Gallery Batch Ingestion Pipeline (Iterate over photos, Face Match -> Garment Segment -> Wardrobe Store)
 */
const ingestGalleryPhotos = async (userId, files = [], options = {}) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'Please provide at least one photo from the gallery to ingest');
  }

    const autoCreateNewItems = options.autoCreateNewItems !== false;
  const threshold = options.threshold || null;

  let targetOwnerName = '';
  let targetWardrobeName = '';
  if (options.wardrobeId) {
    try {
      const targetWardrobe = await Wardrobe.findOne({ _id: options.wardrobeId, userId });
      if (targetWardrobe) {
        targetWardrobeName = targetWardrobe.name;
        targetOwnerName = targetWardrobe.ownerName || targetWardrobe.name;
      }
    } catch (wErr) {
      console.warn(`[ClothAnalysis] Failed to fetch wardrobe for id ${options.wardrobeId}:`, wErr.message);
    }
  }

  const results = {
    totalImagesReceived: files.length,
    matchedUserImagesCount: 0,
    unmatchedImagesCount: 0,
    targetOwnerName: targetOwnerName || null,
    targetWardrobeName: targetWardrobeName || null,
    newWardrobeItemsCreated: [],
    details: [],
  };

  let targetWardrobeId = options.wardrobeId || null;
  if (!targetWardrobeId) {
    const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
    if (defaultW) targetWardrobeId = defaultW._id;
  }

  const wardrobeFilter = { userId };
  if (targetWardrobeId) {
    wardrobeFilter.wardrobeId = targetWardrobeId;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileMeta = {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    };

    const sourceImageHash = calculateSourceImageHash(file.path);

    // Level 1: Exact Source Image Duplicate Check (Scoped to target Almari, then full wardrobe)
    if (sourceImageHash) {
      let existingExactItems = await WardrobeItem.find({
        ...wardrobeFilter,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

      if (existingExactItems.length === 0 && targetWardrobeId) {
        existingExactItems = await WardrobeItem.find({
          userId,
          sourceImageHash,
        }).sort({ sourceImageIndex: 1, createdAt: 1 });
      }

      if (existingExactItems.length > 0) {
        console.log(`[ClothAnalysis] [GalleryIngest] [DUPLICATE_CHECK] Exact duplicate image found for user: ${userId}, wardrobe: ${targetWardrobeId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing items (skipped duplicate addition).`);
        results.matchedUserImagesCount++;

        results.details.push({
          filename: file.filename,
          originalImageUrl: formatUploadUrl(`/uploads/${file.filename}`),
          isUserFound: true,
          isExactDuplicateImage: true,
          userFaceScore: 1.0,
          garmentsDetected: existingExactItems.length,
          newItemsAdded: 0,
          existingItemsMatched: existingExactItems.length,
          items: existingExactItems.map((ex) => ({
            name: ex.name,
            category: ex.category,
            subCategory: ex.subCategory,
            croppedImageUrl: ex.images?.[0]?.url || formatUploadUrl(`/uploads/${file.filename}`),
            matchType: 'EXISTING_ITEM',
            matchedItem: ex,
            status: 'EXACT_MATCH',
            matchResult: {
              status: 'EXACT_MATCH',
              matchType: 'IMAGE_HASH',
              confidenceScore: 1.0,
              message: 'Exact duplicate photo detected in this Almari (skipped duplicate addition).',
              existingItem: ex,
            },
          })),
        });

        continue;
      }
    }

    try {
      // 1. Face Recognition: Is the user in this photo?
      const scanResult = await faceRecognitionService.scanGalleryImage(
        userId,
        file.path,
        fileMeta,
        threshold,
        targetWardrobeId
      );

      if (!scanResult.matched) {
        results.unmatchedImagesCount++;
        results.details.push({
          filename: file.filename,
          originalImageUrl: formatUploadUrl(`/uploads/${file.filename}`),
          isUserFound: false,
          facesDetected: scanResult.facesDetected,
          message: 'User face not detected in this photo. Skipped wardrobe extraction.',
        });
        continue;
      }

      // User IS found in this photo!
      results.matchedUserImagesCount++;

      // 2. Vision AI: Extract clothing items specifically for the matched user in this photo
      const userFaceBoxes = (scanResult.matchedFaces || []).map((f) => f.boundingBox);
      const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path, userFaceBoxes);
      const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections, options);

      // 3. Match against target Almari's existing wardrobe items
      let existingItems = await WardrobeItem.find(wardrobeFilter);
      if (existingItems.length === 0 && targetWardrobeId) {
        existingItems = await WardrobeItem.find({ userId });
      }
      const inFlightItems = [...existingItems];

      const imageNewItems = [];
      const imageMatchedItemIds = [];
      const matchedDetections = [];

      for (let gIdx = 0; gIdx < croppedDetections.length; gIdx++) {
        const rawDetection = croppedDetections[gIdx];
        const matchRes = aiVisionService.matchAgainstWardrobe([rawDetection], inFlightItems);
        const item = matchRes[0];

        const matchedItem = item.matchResult?.existingItem || item.matchedItem;

        if (item.matchResult?.status === 'EXACT_MATCH' && matchedItem) {
          imageMatchedItemIds.push(matchedItem._id);
          item.status = 'EXACT_MATCH';
          item.garment = matchedItem;
          matchedDetections.push(item);
        } else if (autoCreateNewItems) {
          // Ingest new WardrobeItem
          const primaryColor = item.attributes?.primaryColor || rawDetection.color || '';
          const subCat = item.subCategory || item.category || 'Dress';
          const defaultName = primaryColor ? `${primaryColor} ${subCat}` : `${item.category || 'Garment'} Item`;

          let finalWardrobeId = options.wardrobeId || null;
          if (!finalWardrobeId) {
            const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
            if (defaultW) finalWardrobeId = defaultW._id;
          }

          const newItem = await WardrobeItem.create({
            userId,
            wardrobeId: finalWardrobeId || null,
            name: item.name || defaultName,
            category: item.category || 'OTHER',
            subCategory: item.subCategory || 'Other',
            color: primaryColor,
            pattern: item.attributes?.pattern || item.attributes?.designPattern || '',
            fabric: item.attributes?.fabric || '',
            occasion: item.attributes?.occasions || item.occasion || [],
            season: item.attributes?.seasons || item.season || [],
            style: item.attributes?.styleAesthetic || item.style || '',
            sourceType: 'GALLERY_SCAN',
            sourcePhotoUrl: formatUploadUrl(`/uploads/${file.filename}`),
            sourceImageHash: sourceImageHash || null,
            sourceImageIndex: gIdx,
            images: [
              {
                url: formatUploadUrl(item.croppedImageUrl || `/uploads/${file.filename}`),
                filename: item.croppedFilename || file.filename,
                isPrimary: true,
              },
            ],
            attributes: item.attributes || {},
            tags: ['Auto-Extracted', 'Gallery-Scan', primaryColor, item.category].filter(Boolean),
          });

          item.status = 'CREATED';
          item.garment = newItem;
          matchedDetections.push(item);

          inFlightItems.push(newItem);
          imageNewItems.push(newItem);
          results.newWardrobeItemsCreated.push(newItem);
        } else {
          matchedDetections.push(item);
        }
      }

      results.details.push({
        filename: file.filename,
        originalImageUrl: formatUploadUrl(`/uploads/${file.filename}`),
        isUserFound: true,
        userFaceScore: scanResult.matchedFaces?.[0]?.similarityScore || scanResult.matchedFaces?.[0]?.confidence || 1.0,
        garmentsDetected: croppedDetections.length,
        newItemsAdded: imageNewItems.length,
        existingItemsMatched: imageMatchedItemIds.length,
        items: matchedDetections.map((m) => ({
          name: m.name,
          category: m.category,
          subCategory: m.subCategory,
          color: m.attributes?.primaryColor || m.color || '',
          fabric: m.attributes?.fabric || m.fabric || '',
          croppedImageUrl: formatUploadUrl(m.croppedImageUrl || `/uploads/${file.filename}`),
          status: m.status || 'CREATED',
          matchStatus: m.matchResult?.status || 'NEW_ITEM',
        })),
      });
    } catch (err) {
      console.error(`[ClothAnalysis] [GalleryIngest] Error processing file ${file.filename}:`, err);
      results.details.push({
        filename: file.filename,
        error: err.message,
      });
    }
  }

  let summaryMessage = '';
  const personLabel = targetOwnerName
    ? (targetWardrobeName ? `${targetOwnerName} (${targetWardrobeName})` : targetOwnerName)
    : 'your face';
  const almariLabel = targetWardrobeName ? `"${targetWardrobeName}"` : 'wardrobe';

  const totalGarmentsDetected = results.details.reduce((acc, d) => acc + (d.garmentsDetected || 0), 0);
  const totalDuplicatesSkipped = results.details.reduce((acc, d) => acc + (d.existingItemsMatched || 0), 0);

  if (results.totalImagesReceived === 0) {
    summaryMessage = 'No gallery photos were uploaded to scan.';
  } else if (results.matchedUserImagesCount === 0) {
    summaryMessage = targetOwnerName
      ? `Gallery scan completed: 0 out of ${results.totalImagesReceived} photo(s) matched ${personLabel}.`
      : `Gallery scan completed: Your face was not detected in any of the ${results.totalImagesReceived} photo(s).`;
  } else if (results.newWardrobeItemsCreated.length > 0 && totalDuplicatesSkipped > 0) {
    summaryMessage = `Gallery scan completed: ${results.matchedUserImagesCount} photo(s) matched ${personLabel}. Extracted ${totalGarmentsDetected} garment(s): ${results.newWardrobeItemsCreated.length} added to ${almariLabel}, ${totalDuplicatesSkipped} duplicate(s) already exist (skipped duplicate additions).`;
  } else if (results.newWardrobeItemsCreated.length > 0) {
    summaryMessage = `Gallery scan completed: ${results.matchedUserImagesCount} photo(s) matched ${personLabel}. Extracted and added ${results.newWardrobeItemsCreated.length} new garment(s) to ${almariLabel}.`;
  } else {
    summaryMessage = `Gallery scan completed: ${results.matchedUserImagesCount} photo(s) matched ${personLabel}. Extracted ${totalGarmentsDetected || totalDuplicatesSkipped} garment(s), but all already exist in ${almariLabel} (skipped duplicate additions).`;
  }

  results.summaryMessage = summaryMessage;

  // Dispatch FCM Push Notification if items were added
  if (results.newWardrobeItemsCreated && results.newWardrobeItemsCreated.length > 0) {
    try {
      const notificationService = require('../notification/notification.service');
      notificationService
        .sendToUser(userId, {
          title: 'Gallery Ingestion Complete 📸',
          body: `Digitized and added ${results.newWardrobeItemsCreated.length} garment(s) to ${almariLabel}.`,
          data: {
            type: 'WARDROBE_DIGITIZED',
            count: String(results.newWardrobeItemsCreated.length),
            wardrobeId: String(targetWardrobeId || ''),
          },
          type: 'WARDROBE_DIGITIZED',
        })
        .catch((err) => console.warn('[FCM Ingest Notification Warning]:', err.message));
    } catch (fcmErr) {
      console.warn('[FCM Ingest Notification Warning]:', fcmErr.message);
    }
  }

  return results;
};

module.exports = {
  runBackgroundClothingPipeline,
  callPythonGarmentService,
  processAndSaveWardrobeItem,
  calculateSourceImageHash,
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddDressPhotos,
  ingestGalleryPhotos,
};
