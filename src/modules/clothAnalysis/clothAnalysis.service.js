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
const analyzePhoto = async (userId, file) => {
  if (!file) {
    throw new ApiError(400, 'Please upload an image to analyze');
  }

  const originalImageUrl = `/uploads/${file.filename}`;
  const sourceImageHash = calculateSourceImageHash(file.path);

  // LEVEL 1: Exact Source Image Duplicate Check (User-Scoped)
  if (sourceImageHash) {
    const existingExactItems = await WardrobeItem.find({
      userId,
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

    if (existingExactItems.length > 0) {
      console.log(`[ClothAnalysis] [DUPLICATE_CHECK] Exact source image match found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing wardrobe item(s).`);
      return {
        originalImageUrl,
        sourceImageHash,
        isExactDuplicateImage: true,
        detectedItemsCount: existingExactItems.length,
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
            message: `Exact duplicate photo detected. Reusing existing wardrobe item "${ex.name}".`,
            existingItem: ex,
          },
        })),
      };
    }
  }

  let userFaceBoxes = [];
  try {
    const faceRecognitionService = require('../faceRecognition/faceRecognition.service');
    const scanResult = await faceRecognitionService.scanGalleryImage(userId, file.path, { filename: file.filename });
    if (scanResult.matched && scanResult.matchedFaces?.length > 0) {
      userFaceBoxes = scanResult.matchedFaces.map((f) => f.boundingBox);
    }
  } catch (err) {
    // Optional face scan error ignored
  }

  // 1. Detect garments and extract attributes using AI (filtering for matched user if available)
  const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path, userFaceBoxes);

  // 2. Crop detected clothing pieces from the original image
  const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections);

  // 3. Fetch existing wardrobe items for this user to check for duplicates/matches
  const existingItems = await WardrobeItem.find({ userId });

  // 4. Perform hybrid matching (Exact match, Ambiguous match, New item)
  const matchedDetections = aiVisionService.matchAgainstWardrobe(croppedDetections, existingItems);

  return {
    originalImageUrl,
    sourceImageHash,
    detectedItemsCount: matchedDetections.length,
    analysis: matchedDetections,
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

  console.log(`[ClothAnalysis] Scan initiated for user: ${userId}, file: ${file.filename}, hash: ${sourceImageHash ? sourceImageHash.slice(0, 12) : 'null'}`);

  // LEVEL 1: Exact Source Image Duplicate Check (User-Scoped)
  if (sourceImageHash) {
    const existingExactItems = await WardrobeItem.find({
      userId,
      storeType: 'WARDROBE',
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

    if (existingExactItems.length > 0) {
      console.log(`[ClothAnalysis] [DUPLICATE_CHECK] Exact source image match found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing wardrobe item(s).`);

      const processedItems = [];
      for (const ex of existingExactItems) {
        let persistedGarment = ex;
        if (autoPersist) {
          try {
            persistedGarment = await WardrobeItem.findByIdAndUpdate(
              ex._id,
              {
                $inc: { 'usageStats.wearCount': 1, 'usageStats.useCount': 1 },
                $set: { 'usageStats.lastWornDate': new Date() },
              },
              { new: true }
            );
          } catch (updateErr) {
            console.warn(`[ClothAnalysis] Failed to update usageStats for exact match item ${ex._id}:`, updateErr.message);
          }
        }

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
            message: `Exact duplicate photo detected. Reusing existing wardrobe item "${ex.name}".`,
            existingItem: persistedGarment,
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

  // 4. Duplicate / Similarity matching against user's existing wardrobe items
  const existingItems = await WardrobeItem.find({ userId, storeType: 'WARDROBE' });
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
      console.log(`[ClothAnalysis] Garment "${itemMatch.name}": EXACT_MATCH with "${existingMatchedItem.name}" (ID: ${wardrobeItemId}, score: ${confidenceScore}). Reusing item.`);

      if (autoPersist) {
        try {
          const updated = await WardrobeItem.findByIdAndUpdate(
            existingMatchedItem._id,
            {
              $inc: { 'usageStats.wearCount': 1, 'usageStats.useCount': 1 },
              $set: { 'usageStats.lastWornDate': new Date() },
            },
            { new: true }
          );
          persistedGarment = updated;
        } catch (updateErr) {
          console.warn(`[ClothAnalysis] Failed to update usageStats for exact match item ${wardrobeItemId}:`, updateErr.message);
        }
      }
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

  const results = {
    totalPhotosReceived: files.length,
    totalGarmentsExtracted: 0,
    newItemsCreated: [],
    existingMatches: [],
    details: [],
  };

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const sourceImageHash = calculateSourceImageHash(file.path);

    // LEVEL 1: Exact Source Image Duplicate Check (User-Scoped)
    if (sourceImageHash) {
      const existingExactItems = await WardrobeItem.find({
        userId,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

      if (existingExactItems.length > 0) {
        console.log(`[ClothAnalysis] [bulkAddDressPhotos] [DUPLICATE_CHECK] Exact duplicate image found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing items.`);
        for (const ex of existingExactItems) {
          await WardrobeItem.findByIdAndUpdate(ex._id, {
            $inc: { 'usageStats.wearCount': 1, 'usageStats.useCount': 1 },
            $set: { 'usageStats.lastWornDate': new Date() },
          });
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

      // 2. Fetch up-to-date closet items to prevent duplicate additions across the batch
      const existingItems = await WardrobeItem.find({ userId });
      const matchedDetections = aiVisionService.matchAgainstWardrobe(croppedDetections, existingItems);

      const fileCreatedItems = [];
      const fileMatchedItems = [];

      for (let itemIdx = 0; itemIdx < matchedDetections.length; itemIdx++) {
        const item = matchedDetections[itemIdx];
        if (item.matchResult?.status === 'EXACT_MATCH' && item.matchResult?.existingItem) {
          // Increment wear count on existing item
          await WardrobeItem.findByIdAndUpdate(item.matchResult.existingItem._id, {
            $inc: { 'usageStats.wearCount': 1, 'usageStats.useCount': 1 },
            $set: { 'usageStats.lastWornDate': new Date() },
          });
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

  const results = {
    totalImagesReceived: files.length,
    matchedUserImagesCount: 0,
    unmatchedImagesCount: 0,
    newWardrobeItemsCreated: [],
    details: [],
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileMeta = {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    };

    const sourceImageHash = calculateSourceImageHash(file.path);

    // Level 1: Exact Source Image Duplicate Check (User-Scoped)
    if (sourceImageHash) {
      const existingExactItems = await WardrobeItem.find({
        userId,
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

      if (existingExactItems.length > 0) {
        console.log(`[ClothAnalysis] [GalleryIngest] [DUPLICATE_CHECK] Exact duplicate image found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing items.`);
        results.matchedUserImagesCount++;
        for (const ex of existingExactItems) {
          await WardrobeItem.findByIdAndUpdate(ex._id, {
            $inc: { 'usageStats.wearCount': 1, 'usageStats.useCount': 1 },
            $set: { 'usageStats.lastWornDate': new Date() },
          });
        }

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
            matchResult: {
              status: 'EXACT_MATCH',
              matchType: 'IMAGE_HASH',
              confidenceScore: 1.0,
              message: 'Exact duplicate photo detected. Reusing existing wardrobe item.',
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
        options.wardrobeId || null
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

      // 3. Match against existing wardrobe
      const existingItems = await WardrobeItem.find({ userId });
      const inFlightItems = [...existingItems];

      const imageNewItems = [];
      const imageMatchedItemIds = [];
      const matchedDetections = [];

      for (let gIdx = 0; gIdx < croppedDetections.length; gIdx++) {
        const rawDetection = croppedDetections[gIdx];
        const matchRes = aiVisionService.matchAgainstWardrobe([rawDetection], inFlightItems);
        const item = matchRes[0];
        matchedDetections.push(item);

        const matchedItem = item.matchResult?.existingItem || item.matchedItem;

        if (item.matchResult?.status === 'EXACT_MATCH' && matchedItem) {
          imageMatchedItemIds.push(matchedItem._id);
        } else if (autoCreateNewItems && item.matchResult?.status !== 'EXACT_MATCH' && item.matchResult?.status !== 'AMBIGUOUS_MATCH') {
          // Ingest new WardrobeItem
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

          inFlightItems.push(newItem);
          imageNewItems.push(newItem);
          results.newWardrobeItemsCreated.push(newItem);
        }
      }

      results.details.push({
        filename: file.filename,
        originalImageUrl: `/uploads/${file.filename}`,
        isUserFound: true,
        userFaceScore: scanResult.matchedFaces?.[0]?.similarityScore || 1.0,
        garmentsDetected: croppedDetections.length,
        newItemsAdded: imageNewItems.length,
        existingItemsMatched: imageMatchedItemIds.length,
        items: matchedDetections,
      });
    } catch (err) {
      console.error(`[ClothAnalysis] [GalleryIngest] Error processing file ${file.filename}:`, err);
      results.details.push({
        filename: file.filename,
        error: err.message,
      });
    }
  }

  return results;
};

module.exports = {
  calculateSourceImageHash,
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddDressPhotos,
  ingestGalleryPhotos,
};
