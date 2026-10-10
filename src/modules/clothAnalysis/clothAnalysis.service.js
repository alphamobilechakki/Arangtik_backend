const fs = require('fs');
const crypto = require('crypto');
const Wardrobe = require('../wardrobe/wardrobe.model');
const WardrobeItem = require('../wardrobe/wardrobeItem.model');
const ApiError = require('../../utils/apiError');
const aiVisionService = require('./aiVision.service');

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
const analyzePhoto = async (userId, file, options = {}) => {
  if (!file) {
    throw new ApiError(400, 'Please upload an image to analyze');
  }

  const originalImageUrl = `/uploads/${file.filename}`;
  const sourceImageHash = calculateSourceImageHash(file.path);

  let targetWardrobeId = options.wardrobeId || null;
  if (!targetWardrobeId) {
    const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
    if (defaultW) targetWardrobeId = defaultW._id;
  }

  const wardrobeFilter = { userId, storeType: 'WARDROBE' };
  if (targetWardrobeId) {
    wardrobeFilter.wardrobeId = targetWardrobeId;
  }

  // LEVEL 1: Exact Source Image Duplicate Check (Scoped to target Almari)
  if (sourceImageHash) {
    const existingExactItems = await WardrobeItem.find({
      ...wardrobeFilter,
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

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

  // Support either pre-detected faceBoxes (from Step 1) or on-demand face verification
  let userFaceBoxes = options.faceBoxes || [];
  if (typeof userFaceBoxes === 'string') {
    try {
      userFaceBoxes = JSON.parse(userFaceBoxes);
    } catch (e) {
      userFaceBoxes = [];
    }
  }
  if (userFaceBoxes.length === 0 && (options.verifyFace === true || options.verifyFace === 'true')) {
    try {
      const faceRecognitionService = require('../faceRecognition/faceRecognition.service');
      const scanResult = await faceRecognitionService.scanGalleryImage(userId, file.path, { filename: file.filename }, null, targetWardrobeId);
      if (scanResult.matched && scanResult.matchedFaces?.length > 0) {
        userFaceBoxes = scanResult.matchedFaces.map((f) => f.boundingBox);
      }
    } catch (err) {
      // Optional face scan error ignored
    }
  }

  // 1. Detect garments and extract attributes using AI (filtering for matched user if available)
  const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path, userFaceBoxes);

  // 2. Crop detected clothing pieces from the original image
  const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections);

  // 3. Fetch existing wardrobe items for THIS specific Almari to check for duplicates/matches
  const existingItems = await WardrobeItem.find(wardrobeFilter);

  // 4. Perform hybrid matching (Exact match, Ambiguous match, New item)
  const matchedDetections = aiVisionService.matchAgainstWardrobe(croppedDetections, existingItems);

  // Enrich each detected garment with its own structured autoFilledFields for multi-item selection in UI
  const formattedDetections = matchedDetections.map((item, idx) => {
    const itemAttrs = item.attributes || {};
    return {
      ...item,
      detectionIndex: idx,
      selected: true,
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

  const wardrobeFilter = { userId, storeType: 'WARDROBE' };
  if (targetWardrobeId) {
    wardrobeFilter.wardrobeId = targetWardrobeId;
  }

  console.log(`[ClothAnalysis] Scan initiated for user: ${userId}, wardrobe: ${targetWardrobeId}, file: ${file.filename}, hash: ${sourceImageHash ? sourceImageHash.slice(0, 12) : 'null'}`);

  // LEVEL 1: Exact Source Image Duplicate Check (Scoped to target Almari)
  if (sourceImageHash) {
    const existingExactItems = await WardrobeItem.find({
      ...wardrobeFilter,
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

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
          croppedImageUrl: ex.images?.[0]?.url || `/uploads/${file.filename}`,
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
        originalImageUrl: `/uploads/${file.filename}`,
        detectedItemsCount: processedItems.length,
        items: processedItems,
      };
    }
  }

  const faceRecognitionService = require('../faceRecognition/faceRecognition.service');
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
      originalImageUrl: `/uploads/${file.filename}`,
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
  const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections);
  console.log(`[ClothAnalysis] Detected & segmented ${croppedDetections.length} garments for user ${userId}`);

  // 4. Duplicate / Similarity matching against target Almari's existing items
  const existingItems = await WardrobeItem.find(wardrobeFilter);
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
            sourcePhotoUrl: `/uploads/${file.filename}`,
            sourceImageHash: sourceImageHash || null,
            sourceImageIndex: i,
            images: [
              {
                url: rawDetection.croppedImageUrl || `/uploads/${file.filename}`,
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
    originalImageUrl: `/uploads/${file.filename}`,
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

  const wardrobeFilter = { userId, storeType: 'WARDROBE' };
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

    // LEVEL 1: Exact Source Image Duplicate Check (Scoped to target Almari)
    if (sourceImageHash) {
      const existingExactItems = await WardrobeItem.find({
        ...wardrobeFilter,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

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
      const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections);

      // 2. Fetch up-to-date closet items for this target Almari to prevent duplicate additions
      const existingItems = await WardrobeItem.find(wardrobeFilter);
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
            sourcePhotoUrl: `/uploads/${file.filename}`,
            sourceImageHash: sourceImageHash || null,
            sourceImageIndex: itemIdx,
            images: [
              {
                url: item.croppedImageUrl || `/uploads/${file.filename}`,
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
        originalImageUrl: `/uploads/${file.filename}`,
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

  return results;
};

/**
 * Gallery Batch Ingestion Pipeline (Iterate over photos, Face Match -> Garment Segment -> Wardrobe Store)
 */
const ingestGalleryPhotos = async (userId, files = [], options = {}) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'Please provide at least one photo from the gallery to ingest');
  }

  const faceRecognitionService = require('../faceRecognition/faceRecognition.service');
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

  const wardrobeFilter = { userId, storeType: 'WARDROBE' };
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

    // Level 1: Exact Source Image Duplicate Check (Scoped to target Almari)
    if (sourceImageHash) {
      const existingExactItems = await WardrobeItem.find({
        ...wardrobeFilter,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

      if (existingExactItems.length > 0) {
        console.log(`[ClothAnalysis] [GalleryIngest] [DUPLICATE_CHECK] Exact duplicate image found for user: ${userId}, wardrobe: ${targetWardrobeId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing items (skipped duplicate addition).`);
        results.matchedUserImagesCount++;

        results.details.push({
          filename: file.filename,
          originalImageUrl: `/uploads/${file.filename}`,
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
            croppedImageUrl: ex.images?.[0]?.url || `/uploads/${file.filename}`,
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
          originalImageUrl: `/uploads/${file.filename}`,
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
      const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections);

      // 3. Match against target Almari's existing wardrobe items
      const existingItems = await WardrobeItem.find(wardrobeFilter);
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
            sourcePhotoUrl: `/uploads/${file.filename}`,
            sourceImageHash: sourceImageHash || null,
            sourceImageIndex: gIdx,
            images: [
              {
                url: item.croppedImageUrl || `/uploads/${file.filename}`,
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
        originalImageUrl: `/uploads/${file.filename}`,
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
          croppedImageUrl: m.croppedImageUrl || `/uploads/${file.filename}`,
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

  return results;
};

module.exports = {
  calculateSourceImageHash,
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddDressPhotos,
  ingestGalleryPhotos,
};
