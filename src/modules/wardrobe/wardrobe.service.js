const fs = require('fs');
const crypto = require('crypto');
const Wardrobe = require('./wardrobe.model');
const Collection = require('./collection.model');
const WardrobeItem = require('./wardrobeItem.model');
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
      storeType: 'WARDROBE',
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

    if (existingExactItems.length > 0) {
      console.log(`[WardrobeAnalyze] [DUPLICATE_CHECK] Exact source image match found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing wardrobe item(s).`);
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
    // Optional check
  }

  // 1. Detect garments and extract attributes using AI (filtering for matched user if available)
  const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path, userFaceBoxes);

  // 2. Crop detected clothing pieces from the original image
  const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections);

  // 3. Fetch existing wardrobe items for this user to check for duplicates/matches
  const existingItems = await WardrobeItem.find({ userId, storeType: 'WARDROBE' });

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
 * Add a new item to the user's Wardrobe / Store
 */
const addItem = async (userId, itemData) => {
  const {
    wardrobeId = null,
    collectionId = null,
    name,
    storeType = 'WARDROBE',
    category,
    subCategory,
    type,
    color,
    pattern,
    fabric,
    texture,
    silhouette,
    fit,
    neckline,
    sleeveStyle,
    sleeveLength,
    length,
    occasion,
    season,
    style,
    gender,
    brand,
    size,
    isFavorite,
    wearCount,
    lastWornAt,
    aiAnalysis,
    sourceType = 'MANUAL_UPLOAD',
    sourcePhotoUrl,
    sourceImageHash,
    sourceImageIndex = 0,
    images = [],
    attributes = {},
    currentStatus = 'AVAILABLE',
    storageLocation,
    laundryCare,
    tags = [],
  } = itemData;

  if (!name || !category) {
    throw new ApiError(400, 'Item name and category are required');
  }

  // Ensure primary image flag is set if images exist
  let processedImages = images;
  if (Array.isArray(images) && images.length > 0) {
    const hasPrimary = images.some((img) => img.isPrimary);
    processedImages = images.map((img, idx) => ({
      ...img,
      isPrimary: hasPrimary ? !!img.isPrimary : idx === 0,
    }));
  }

  const newItem = await WardrobeItem.create({
    userId,
    wardrobeId: wardrobeId || null,
    collectionId: collectionId || null,
    name,
    storeType,
    category,
    subCategory,
    type,
    color: color || attributes.primaryColor || '',
    pattern: pattern || attributes.pattern || '',
    fabric: fabric || attributes.fabric || '',
    texture,
    silhouette,
    fit: fit || attributes.fit || '',
    neckline: neckline || attributes.neckline || '',
    sleeveStyle,
    sleeveLength: sleeveLength || attributes.sleeveLength || '',
    length,
    occasion: occasion || attributes.occasions || [],
    season: season || attributes.seasons || [],
    style,
    gender: gender || attributes.gender || '',
    brand: brand || attributes.brand || '',
    size: size || attributes.size || '',
    isFavorite: isFavorite !== undefined ? isFavorite : false,
    wearCount: wearCount || 0,
    lastWornAt: lastWornAt || null,
    aiAnalysis: aiAnalysis || null,
    sourceType,
    sourcePhotoUrl: sourcePhotoUrl || '',
    sourceImageHash: sourceImageHash || null,
    sourceImageIndex: sourceImageIndex || 0,
    images: processedImages,
    attributes,
    currentStatus,
    currentLocation: storageLocation || { storagePlace: 'Main Closet' },
    laundryCare: laundryCare || {
      washTypePreferred: 'MACHINE_WASH',
      ironPreferred: true,
    },
    tags,
  });

  return newItem;
};

/**
 * Get all items from wardrobe store with search, filters, and pagination
 */
const getAllItems = async (userId, queryParams = {}) => {
  const {
    wardrobeId,
    collectionId,
    storeType = 'WARDROBE',
    category,
    subCategory,
    status,
    color,
    occasion,
    season,
    favorite,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = queryParams;

  const filter = {
    userId,
    storeType,
  };

  if (wardrobeId) filter.wardrobeId = wardrobeId;
  if (collectionId) filter.collectionId = collectionId;
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = new RegExp(`^${subCategory}$`, 'i');
  if (status) filter.currentStatus = status;
  if (favorite !== undefined) {
    const isFav = favorite === 'true' || favorite === true;
    filter.$or = [{ isFavorite: isFav }, { 'usageStats.isFavorite': isFav }];
  }

  // Filter inside dynamic attributes or top-level fields
  if (color) {
    filter.$or = [
      { color: new RegExp(color, 'i') },
      { 'attributes.primaryColor': new RegExp(color, 'i') },
    ];
  }
  if (occasion) {
    filter.$or = [
      { occasion: { $in: [new RegExp(occasion, 'i')] } },
      { 'attributes.occasions': { $in: [new RegExp(occasion, 'i')] } },
    ];
  }
  if (season) {
    filter.$or = [
      { season: { $in: [new RegExp(season, 'i')] } },
      { 'attributes.seasons': { $in: [new RegExp(season, 'i')] } },
    ];
  }

  // Keyword search
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subCategory: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
      { 'attributes.brand': { $regex: search, $options: 'i' } },
    ];
  }

  // Sorting
  let sortOption = { createdAt: -1 };
  if (sort === 'mostWorn') sortOption = { 'usageStats.wearCount': -1 };
  else if (sort === 'lastWorn') sortOption = { 'usageStats.lastWornDate': -1 };
  else if (sort === 'newest') sortOption = { createdAt: -1 };
  else if (sort === 'oldest') sortOption = { createdAt: 1 };
  else if (typeof sort === 'string') sortOption = sort;

  const pageNumber = Math.max(1, parseInt(page, 10));
  const limitNumber = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const skip = (pageNumber - 1) * limitNumber;

  const [items, totalItems] = await Promise.all([
    WardrobeItem.find(filter).sort(sortOption).skip(skip).limit(limitNumber),
    WardrobeItem.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      totalItems,
      totalPages: Math.ceil(totalItems / limitNumber),
      currentPage: pageNumber,
      limit: limitNumber,
      hasNextPage: pageNumber * limitNumber < totalItems,
      hasPrevPage: pageNumber > 1,
    },
  };
};

/**
 * Get item details by ID
 */
const getItemById = async (userId, itemId) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  return item;
};

/**
 * Update an existing wardrobe item (PATCH)
 */
const updateItem = async (userId, itemId, updateData) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  // Prevent updating non-editable core fields directly
  const allowedFields = [
    'name',
    'category',
    'subCategory',
    'images',
    'attributes',
    'currentStatus',
    'storageLocation',
    'laundryCare',
    'tags',
    'usageStats',
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'attributes' && typeof updateData.attributes === 'object') {
        // Merge or update attributes Map
        for (const [attrKey, attrVal] of Object.entries(updateData.attributes)) {
          item.attributes.set(attrKey, attrVal);
        }
      } else if (field === 'storageLocation') {
        item.currentLocation = {
          ...item.currentLocation.toObject(),
          ...updateData.storageLocation,
        };
      } else if (field === 'laundryCare') {
        item.laundryCare = {
          ...item.laundryCare.toObject(),
          ...updateData.laundryCare,
        };
      } else {
        item[field] = updateData[field];
      }
    }
  }

  await item.save();
  return item;
};

/**
 * Quick update item operational status (PATCH)
 */
const updateItemStatus = async (userId, itemId, status) => {
  const validStatuses = [
    'AVAILABLE',
    'IN_USE',
    'DIRTY',
    'IN_LAUNDRY',
    'LENT_OUT',
    'IN_REPAIR',
    'ARCHIVED',
  ];

  if (!status || !validStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  item.currentStatus = status;
  await item.save();

  return item;
};

/**
 * Delete / Archive item from wardrobe store
 */
const deleteItem = async (userId, itemId, permanent = false) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  if (permanent === true || permanent === 'true') {
    await WardrobeItem.deleteOne({ _id: itemId, userId });
    return { deleted: true, permanent: true };
  } else {
    item.currentStatus = 'ARCHIVED';
    await item.save();
    return { deleted: true, archived: true, item };
  }
};

/**
 * Ingest clothing from Gallery Photos:
 * 1. Takes array of uploaded gallery image files.
 * 2. Filters only the photos where the authenticated user's face is found (Face Recognition).
 * 3. Extracts clothing/garments from user's matched photos using AI Fashion Vision.
 * 4. Checks against user's existing wardrobe:
 *    - If garment is already in wardrobe -> Reuses existing wardrobe item.
 *    - If garment is new -> Ingests & creates a new WardrobeItem with cropped image thumbnail & AI metadata.
 * 5. Returns comprehensive summary with created items.
 */
const ingestGalleryPhotos = async (userId, files = [], options = {}) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'Please provide at least one gallery image to process');
  }

  const {
    autoCreateNewItems = true,
    threshold = null,
  } = options;

  const results = {
    totalImagesReceived: files.length,
    matchedUserImagesCount: 0,
    unmatchedImagesCount: 0,
    newWardrobeItemsCreated: [],
    details: [],
  };

  const faceRecognitionService = require('../faceRecognition/faceRecognition.service');

  for (const file of files) {
    const fileMeta = {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    };

    const sourceImageHash = calculateSourceImageHash(file.path);

    // LEVEL 1: Exact Source Image Duplicate Check (User-Scoped)
    if (sourceImageHash) {
      const existingExactItems = await WardrobeItem.find({
        userId,
        storeType: 'WARDROBE',
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

      if (existingExactItems.length > 0) {
        console.log(`[WardrobeIngest] [DUPLICATE_CHECK] Exact duplicate image found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing items.`);
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
      const existingItems = await WardrobeItem.find({ userId, storeType: 'WARDROBE' });
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

          const newItem = await WardrobeItem.create({
            userId,
            wardrobeId: options.wardrobeId || null,
            collectionId: options.collectionId || null,
            name: item.name || defaultName,
            storeType: 'WARDROBE',
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
            currentStatus: 'AVAILABLE',
            currentLocation: { storagePlace: 'Main Closet' },
            laundryCare: { washTypePreferred: 'MACHINE_WASH', ironPreferred: true },
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
      console.error(`[WardrobeIngest] Error processing file ${file.filename}:`, err);
      results.details.push({
        filename: file.filename,
        error: err.message,
      });
    }
  }

  return results;
};

/**
 * Bulk add standalone dress photos (1 to 100 photos)
 * Automatically detects garments, crops clean cards, checks duplicates, and saves directly into wardrobe.
 */
const bulkAddDressPhotos = async (userId, files = [], options = {}) => {
  if (!files || files.length === 0) {
    throw new ApiError(400, 'Please upload at least one clothing photo to digitize');
  }

  const { storagePlace = 'Main Closet' } = options;

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
        storeType: 'WARDROBE',
        sourceImageHash,
      }).sort({ sourceImageIndex: 1, createdAt: 1 });

      if (existingExactItems.length > 0) {
        console.log(`[bulkAddDressPhotos] [DUPLICATE_CHECK] Exact duplicate image found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing items.`);
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
      const existingItems = await WardrobeItem.find({ userId, storeType: 'WARDROBE' });
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

          const newItem = await WardrobeItem.create({
            userId,
            wardrobeId: options.wardrobeId || null,
            collectionId: options.collectionId || null,
            name: item.name || defaultName,
            storeType: 'WARDROBE',
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
            currentStatus: 'AVAILABLE',
            currentLocation: { storagePlace: storagePlace || 'Main Closet' },
            laundryCare: { washTypePreferred: 'MACHINE_WASH', ironPreferred: true },
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
      console.error(`[bulkAddDressPhotos] Error on file ${file.filename}:`, err);
      results.details.push({
        filename: file.filename,
        error: err.message,
      });
    }
  }

  return results;
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

  console.log(`[GalleryWardrobe] Scan initiated for user: ${userId}, file: ${file.filename}, hash: ${sourceImageHash ? sourceImageHash.slice(0, 12) : 'null'}`);

  // LEVEL 1: Exact Source Image Duplicate Check (User-Scoped)
  if (sourceImageHash) {
    const existingExactItems = await WardrobeItem.find({
      userId,
      storeType: 'WARDROBE',
      sourceImageHash,
    }).sort({ sourceImageIndex: 1, createdAt: 1 });

    if (existingExactItems.length > 0) {
      console.log(`[GalleryWardrobe] [DUPLICATE_CHECK] Exact source image match found for user: ${userId}, hash: ${sourceImageHash.slice(0, 12)}... Reusing ${existingExactItems.length} existing wardrobe item(s).`);

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
            console.warn(`[GalleryWardrobe] Failed to update usageStats for exact match item ${ex._id}:`, updateErr.message);
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
    console.log(`[GalleryWardrobe] Target person for wardrobe ${options.wardrobeId || 'default'} NOT detected in ${file.filename}. Skipped clothing extraction.`);
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
  console.log(`[GalleryWardrobe] Target person verified (Faces detected: ${scanResult.facesDetected}, confidence: ${primaryMatchedFace.confidence || primaryMatchedFace.similarity})`);

  // 2. Gemini Clothing Detection (targeted specifically to authenticated user face coordinates)
  const rawDetections = await aiVisionService.analyzeImageWithGemini(file.path, userFaceBoxes);

  // 3. Sharp Crop + Segmentation (ISNet/U2Net via @imgly/background-removal-node -> transparent WebP)
  const croppedDetections = await aiVisionService.cropDetectedItems(file.path, rawDetections);
  console.log(`[GalleryWardrobe] Detected & segmented ${croppedDetections.length} garments for user ${userId}`);

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
      console.log(`[GalleryWardrobe] Garment "${itemMatch.name}": EXACT_MATCH with "${existingMatchedItem.name}" (ID: ${wardrobeItemId}, score: ${confidenceScore}). Reusing item.`);

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
          console.warn(`[GalleryWardrobe] Failed to update usageStats for exact match item ${wardrobeItemId}:`, updateErr.message);
        }
      }
    } else if (matchStatus === 'AMBIGUOUS_MATCH') {
      finalStatus = 'AMBIGUOUS_MATCH';
      console.log(`[GalleryWardrobe] Garment "${itemMatch.name}": AMBIGUOUS_MATCH (score: ${confidenceScore}). Preserving ambiguity for user confirmation.`);
    } else {
      // NEW_ITEM -> Persist new wardrobe record
      finalStatus = 'CREATED';
      console.log(`[GalleryWardrobe] Garment "${itemMatch.name}": NEW_ITEM detected. Creating wardrobe record.`);

      if (autoPersist) {
        const primaryColor = rawDetection.attributes?.primaryColor || '';
        const subCat = rawDetection.subCategory || rawDetection.category || 'Garment';
        const defaultName = primaryColor ? `${primaryColor} ${subCat}` : `${rawDetection.category || 'Garment'} Item`;

        try {
          const newItem = await WardrobeItem.create({
            userId,
            wardrobeId: options.wardrobeId || null,
            collectionId: options.collectionId || null,
            name: rawDetection.name || defaultName,
            storeType: 'WARDROBE',
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
            currentStatus: 'AVAILABLE',
            currentLocation: { storagePlace: 'Main Closet' },
            laundryCare: { washTypePreferred: 'MACHINE_WASH', ironPreferred: true },
            tags: ['Auto-Extracted', 'Gallery-Scan', primaryColor, rawDetection.category].filter(Boolean),
          });

          wardrobeItemId = newItem._id;
          persistedGarment = newItem;
          // Add to in-flight list so subsequent garments in the same photo can match against it (prevent same-request duplicate)
          inFlightItems.push(newItem);
          console.log(`[GalleryWardrobe] Created new wardrobe record "${newItem.name}" (ID: ${newItem._id})`);
        } catch (createErr) {
          console.error(`[GalleryWardrobe] Error creating wardrobe item for "${rawDetection.name}":`, createErr);
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
 * Create a new Wardrobe (Closet container, e.g., "Mummy Wardrobe", "My Wardrobe")
 */
const createWardrobe = async (userId, data, file = null) => {
  const { name, type, ownerName, isDefault } = data;
  if (!name) {
    throw new ApiError(400, 'Wardrobe name is required');
  }

  let coverImage = data.coverImage || '';
  let ownerFaceImage = data.ownerFaceImage || '';

  if (file) {
    coverImage = `/uploads/${file.filename}`;
    ownerFaceImage = `/uploads/${file.filename}`;
  }

  let referenceFace = undefined;
  if (ownerFaceImage || coverImage) {
    try {
      const faceAIService = require('../../services/faceAI/faceAI.service');
      const faceRecognitionService = require('../faceRecognition/faceRecognition.service');
      const resolvedPath = faceRecognitionService.resolveImagePath(ownerFaceImage || coverImage);
      if (fs.existsSync(resolvedPath)) {
        const face = await faceAIService.extractReferenceFace(resolvedPath);
        referenceFace = {
          embedding: face.embedding,
          boundingBox: face.boundingBox,
          detectionConfidence: face.confidence,
          lastGeneratedAt: new Date(),
          imagePath: ownerFaceImage || coverImage,
        };
        console.log(`[createWardrobe] Reference face generated successfully for wardrobe "${name}"`);
      }
    } catch (fErr) {
      console.warn(`[createWardrobe] Could not extract face from wardrobe image (${fErr.message})`);
    }
  }

  if (isDefault) {
    await Wardrobe.updateMany({ userId }, { isDefault: false });
  }

  const wardrobe = await Wardrobe.create({
    userId,
    name,
    type: type || 'PERSONAL',
    ownerName: ownerName || '',
    coverImage: coverImage || '',
    ownerFaceImage: ownerFaceImage || '',
    referenceFace,
    isDefault: !!isDefault,
    isActive: true,
  });

  return wardrobe;
};

/**
 * Get all active Wardrobes for user
 */
const getWardrobes = async (userId) => {
  return await Wardrobe.find({ userId, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
};

/**
 * Create a new Collection inside a Wardrobe
 */
const createCollection = async (userId, data) => {
  const { wardrobeId, name, type, colorTheme, description, season, occasion, style } = data;
  if (!wardrobeId || !name) {
    throw new ApiError(400, 'Wardrobe ID and Collection name are required');
  }

  const wardrobe = await Wardrobe.findOne({ _id: wardrobeId, userId });
  if (!wardrobe) {
    throw new ApiError(404, 'Target Wardrobe closet not found');
  }

  const collection = await Collection.create({
    userId,
    wardrobeId,
    name,
    type: type || 'CUSTOM',
    colorTheme: colorTheme || {},
    description: description || '',
    season: season || [],
    occasion: occasion || [],
    style: style || [],
    isActive: true,
  });

  return collection;
};

/**
 * Get all Collections for user with optional wardrobeId filter
 */
const getCollections = async (userId, query = {}) => {
  const filter = { userId, isActive: true };
  if (query.wardrobeId) filter.wardrobeId = query.wardrobeId;
  return await Collection.find(filter).sort({ createdAt: -1 });
};

module.exports = {
  createWardrobe,
  getWardrobes,
  createCollection,
  getCollections,
  addItem,
  getAllItems,
  getItemById,
  updateItem,
  updateItemStatus,
  deleteItem,
  analyzePhoto,
  scanGalleryPhoto,
  bulkAddDressPhotos,
  ingestGalleryPhotos,
};
