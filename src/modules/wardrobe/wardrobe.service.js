const fs = require('fs');
const mongoose = require('mongoose');
const Wardrobe = require('./wardrobe.model');
const WardrobeItem = require('./wardrobeItem.model');
const ApiError = require('../../utils/apiError');
const clothAnalysisService = require('../clothAnalysis/clothAnalysis.service');
const tripo3dService = require('../../services/model3D/tripo3d.service');
const { formatUploadUrl } = require('../../utils/url.util');

/**
 * Create a new Wardrobe (Closet container, e.g., "Mummy Wardrobe", "My Wardrobe")
 */
const createWardrobe = async (userId, data, files = null) => {
  const { name, storeTypeId, storeType, type, ownerName, isDefault } = data;
  if (!name) {
    throw new ApiError(400, 'Wardrobe name is required');
  }

  // Dynamic StoreType resolution -> resolve to storeTypeId
  let finalStoreTypeId = null;
  const rawStore = storeTypeId || storeType;
  try {
    const StoreType = require('../admin/storeType/storeType.model');
    let stDoc = null;
    if (rawStore && mongoose.Types.ObjectId.isValid(rawStore)) {
      stDoc = await StoreType.findById(rawStore);
    }
    if (!stDoc && rawStore) {
      stDoc = await StoreType.findOne({
        $or: [
          { code: String(rawStore).toUpperCase() },
          { name: { $regex: new RegExp(`^${String(rawStore).trim()}$`, 'i') } },
        ],
      });
    }
    if (!stDoc) {
      stDoc =
        (await StoreType.findOne({ code: 'WARDROBE' })) ||
        (await StoreType.findOne({ isActive: true }));
    }
    if (stDoc) {
      finalStoreTypeId = stDoc._id;
    }
  } catch (_) {}

  if (!finalStoreTypeId) {
    throw new ApiError(400, 'Valid storeTypeId is required');
  }

  let coverImage = data.coverImage ? formatUploadUrl(data.coverImage) : '';
  let ownerFaceImage = data.ownerFaceImage ? formatUploadUrl(data.ownerFaceImage) : '';

  if (files && typeof files === 'object') {
    if (files.ownerFaceImage) {
      ownerFaceImage = formatUploadUrl(`/uploads/${files.ownerFaceImage.filename}`);
    }
    if (files.coverImage) {
      coverImage = formatUploadUrl(`/uploads/${files.coverImage.filename}`);
    }
    if (files.filename) {
      coverImage = formatUploadUrl(`/uploads/${files.filename}`);
      ownerFaceImage = formatUploadUrl(`/uploads/${files.filename}`);
    }
  }

  let referenceFace = undefined;
  const targetFaceImg = ownerFaceImage || coverImage;
  if (targetFaceImg) {
    try {
      const faceAIService = require('../../services/faceAI/faceAI.service');
      const faceRecognitionService = require('../faceRecognition/faceRecognition.service');
      const resolvedPath = faceRecognitionService.resolveImagePath(targetFaceImg);
      if (fs.existsSync(resolvedPath)) {
        const face = await faceAIService.extractReferenceFace(resolvedPath);
        referenceFace = {
          embedding: face.embedding,
          boundingBox: face.boundingBox,
          detectionConfidence: face.confidence,
          lastGeneratedAt: new Date(),
          imagePath: formatUploadUrl(targetFaceImg),
        };
        console.log(`[createWardrobe] Reference face generated successfully for wardrobe "${name}"`);
      }
    } catch (fErr) {
      console.warn(`[createWardrobe] Could not extract face from wardrobe image (${fErr.message})`);
    }
  }

  if (isDefault) {
    await Wardrobe.updateMany(
      {
        userId,
        storeTypeId: finalStoreTypeId,
      },
      { isDefault: false }
    );
  }

  const wardrobe = await Wardrobe.create({
    userId,
    name,
    storeTypeId: finalStoreTypeId,
    type: type || 'PERSONAL',
    ownerName: ownerName || '',
    coverImage: coverImage || '',
    ownerFaceImage: ownerFaceImage || '',
    referenceFace,
    isDefault: !!isDefault,
    isActive: true,
    isDeleted: false,
    deletedAt: null,
  });

  await wardrobe.populate('storeTypeId', 'name code image');

  const createdObj = wardrobe.toObject ? wardrobe.toObject() : { ...wardrobe };
  createdObj.itemCount = 0;
  createdObj.coverImage = createdObj.coverImage ? formatUploadUrl(createdObj.coverImage) : '';
  createdObj.ownerFaceImage = createdObj.ownerFaceImage ? formatUploadUrl(createdObj.ownerFaceImage) : '';
  return createdObj;
};

/**
 * Get all active Wardrobes / Stores for user
 * Supports multi-store filtering:
 *  - query.storeTypeId: filters by StoreType ObjectId
 *  - query.storeType: filters by code or name
 *  - query.includeDeleted: optional flag to include soft-deleted records
 * Automatically populates storeTypeId reference, computed itemCount, and formats asset URLs.
 */
const getWardrobes = async (userId, query = {}) => {
  const filter = { userId, isActive: true };
  const rawStore = query.storeTypeId || query.storeType || 'WARDROBE';

  if (rawStore && rawStore !== 'ALL') {
    let resolvedStoreTypeId = null;
    if (mongoose.Types.ObjectId.isValid(rawStore)) {
      resolvedStoreTypeId = new mongoose.Types.ObjectId(rawStore);
    } else {
      try {
        const StoreType = require('../admin/storeType/storeType.model');
        const upper = String(rawStore).trim().toUpperCase();
        const stDoc = await StoreType.findOne({
          $or: [
            { code: upper },
            { name: new RegExp(`^${String(rawStore).trim()}$`, 'i') },
          ],
        });
        if (stDoc) {
          resolvedStoreTypeId = stDoc._id;
        }
      } catch (_) {}
    }

    if (resolvedStoreTypeId) {
      filter.storeTypeId = resolvedStoreTypeId;
    }
  }

  let queryBuilder = Wardrobe.find(filter)
    .populate('storeTypeId', 'name code image')
    .sort({ isDefault: -1, createdAt: -1 });

  if (query.includeDeleted === 'true' || query.includeDeleted === true) {
    queryBuilder = queryBuilder.withDeleted();
  }

  const wardrobes = await queryBuilder;

  // Calculate itemCount per container dynamically
  let itemCounts = [];
  try {
    itemCounts = await WardrobeItem.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$wardrobeId', count: { $sum: 1 } } },
    ]);
  } catch (aggErr) {
    console.warn(`[getWardrobes] item count aggregation fallback: ${aggErr.message}`);
  }

  const countsMap = {};
  let unassignedCount = 0;
  for (const row of itemCounts) {
    if (row._id) {
      countsMap[row._id.toString()] = row.count;
    } else {
      unassignedCount += row.count;
    }
  }

  return wardrobes.map((w) => {
    const obj = w.toObject ? w.toObject() : { ...w };
    let count = countsMap[obj._id.toString()] || 0;
    if (obj.isDefault) {
      count += unassignedCount;
    }
    obj.itemCount = count;
    obj.coverImage = obj.coverImage ? formatUploadUrl(obj.coverImage) : '';
    obj.ownerFaceImage = obj.ownerFaceImage ? formatUploadUrl(obj.ownerFaceImage) : '';
    return obj;
  });
};

/**
 * Get single Wardrobe by ID
 */
const getWardrobeById = async (userId, wardrobeId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(wardrobeId)) {
    throw new ApiError(400, 'Invalid wardrobe container ID');
  }

  let q = Wardrobe.findOne({ _id: wardrobeId, userId }).populate('storeTypeId', 'name code image');
  if (options.includeDeleted) {
    q = q.withDeleted();
  }

  const wardrobe = await q;
  if (!wardrobe) {
    throw new ApiError(404, 'Wardrobe container not found');
  }

  const obj = wardrobe.toObject ? wardrobe.toObject() : { ...wardrobe };
  obj.itemCount = await WardrobeItem.countDocuments({ wardrobeId: wardrobe._id, userId });
  obj.coverImage = obj.coverImage ? formatUploadUrl(obj.coverImage) : '';
  obj.ownerFaceImage = obj.ownerFaceImage ? formatUploadUrl(obj.ownerFaceImage) : '';
  return obj;
};

/**
 * Update Wardrobe container attributes
 */
const updateWardrobe = async (userId, wardrobeId, updateData = {}, files = null) => {
  if (!mongoose.Types.ObjectId.isValid(wardrobeId)) {
    throw new ApiError(400, 'Invalid wardrobe container ID');
  }

  const wardrobe = await Wardrobe.findOne({ _id: wardrobeId, userId });
  if (!wardrobe) {
    throw new ApiError(404, 'Wardrobe container not found');
  }

  const { name, storeTypeId, storeType, type, ownerName, isDefault, isActive } = updateData;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw new ApiError(400, 'Wardrobe name cannot be empty');
    wardrobe.name = trimmed;
  }

  if (storeTypeId !== undefined || storeType !== undefined) {
    const rawStore = storeTypeId || storeType;
    try {
      const StoreType = require('../admin/storeType/storeType.model');
      let stDoc = null;
      if (rawStore && mongoose.Types.ObjectId.isValid(rawStore)) {
        stDoc = await StoreType.findById(rawStore);
      }
      if (!stDoc && rawStore) {
        stDoc = await StoreType.findOne({
          $or: [
            { code: String(rawStore).toUpperCase() },
            { name: { $regex: new RegExp(`^${String(rawStore).trim()}$`, 'i') } },
          ],
        });
      }
      if (stDoc) {
        wardrobe.storeTypeId = stDoc._id;
      }
    } catch (_) {}
  }

  if (type !== undefined) wardrobe.type = type;
  if (ownerName !== undefined) wardrobe.ownerName = String(ownerName).trim();
  if (isActive !== undefined) wardrobe.isActive = Boolean(isActive);

  if (files && typeof files === 'object') {
    if (files.ownerFaceImage) {
      wardrobe.ownerFaceImage = formatUploadUrl(`/uploads/${files.ownerFaceImage.filename}`);
    }
    if (files.coverImage) {
      wardrobe.coverImage = formatUploadUrl(`/uploads/${files.coverImage.filename}`);
    }
    if (files.filename) {
      wardrobe.coverImage = formatUploadUrl(`/uploads/${files.filename}`);
    }
  } else {
    if (updateData.coverImage) wardrobe.coverImage = formatUploadUrl(updateData.coverImage);
    if (updateData.ownerFaceImage) wardrobe.ownerFaceImage = formatUploadUrl(updateData.ownerFaceImage);
  }

  if (isDefault) {
    await Wardrobe.updateMany(
      {
        _id: { $ne: wardrobe._id },
        userId,
        storeTypeId: wardrobe.storeTypeId,
      },
      { isDefault: false }
    );
    wardrobe.isDefault = true;
  } else if (isDefault === false && wardrobe.isDefault) {
    wardrobe.isDefault = false;
  }

  await wardrobe.save();
  await wardrobe.populate('storeTypeId', 'name code image');

  const updatedObj = wardrobe.toObject ? wardrobe.toObject() : { ...wardrobe };
  updatedObj.itemCount = await WardrobeItem.countDocuments({ wardrobeId: wardrobe._id, userId });
  updatedObj.coverImage = updatedObj.coverImage ? formatUploadUrl(updatedObj.coverImage) : '';
  updatedObj.ownerFaceImage = updatedObj.ownerFaceImage ? formatUploadUrl(updatedObj.ownerFaceImage) : '';
  return updatedObj;
};

/**
 * Delete a user's Wardrobe / Almari container (Soft deletion by default)
 */
const deleteWardrobe = async (userId, wardrobeId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(wardrobeId)) {
    throw new ApiError(400, 'Invalid wardrobe container ID');
  }

  const hard = options.hard === true || options.hard === 'true';
  let q = Wardrobe.findOne({ _id: wardrobeId, userId });
  if (hard) {
    q = q.withDeleted();
  }
  const wardrobe = await q;
  if (!wardrobe) {
    throw new ApiError(404, 'Wardrobe container not found');
  }
  if (wardrobe.isDefault) {
    throw new ApiError(400, 'Cannot delete your default Almari');
  }

  if (hard) {
    await Wardrobe.findByIdAndDelete(wardrobe._id);
  } else {
    await wardrobe.softDelete();
  }

  // Find user's default wardrobe to migrate any orphan items
  const defaultW = await Wardrobe.findOne({ userId, isDefault: true, isActive: true });
  const fallbackId = defaultW ? defaultW._id : null;
  await WardrobeItem.updateMany({ wardrobeId: wardrobe._id }, { wardrobeId: fallbackId });

  return {
    message: `Wardrobe container "${wardrobe.name}" ${hard ? 'permanently' : 'soft'} deleted successfully`,
  };
};

/**
 * Restore a soft-deleted Wardrobe container
 */
const restoreWardrobe = async (userId, wardrobeId) => {
  if (!mongoose.Types.ObjectId.isValid(wardrobeId)) {
    throw new ApiError(400, 'Invalid wardrobe container ID');
  }

  const wardrobe = await Wardrobe.findOne({ _id: wardrobeId, userId }).withDeleted();
  if (!wardrobe) {
    throw new ApiError(404, 'Wardrobe container not found');
  }

  if (wardrobe.isDeleted) {
    await wardrobe.restore();
  }

  await wardrobe.populate('storeTypeId', 'name code image');

  const restoredObj = wardrobe.toObject ? wardrobe.toObject() : { ...wardrobe };
  restoredObj.itemCount = await WardrobeItem.countDocuments({ wardrobeId: wardrobe._id, userId });
  restoredObj.coverImage = restoredObj.coverImage ? formatUploadUrl(restoredObj.coverImage) : '';
  restoredObj.ownerFaceImage = restoredObj.ownerFaceImage ? formatUploadUrl(restoredObj.ownerFaceImage) : '';
  return restoredObj;
};

const parseArrayField = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return val.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [val];
  }
  return [];
};

const parseObjectField = (val) => {
  if (!val) return {};
  if (typeof val === 'object' && !Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (e) {
      return {};
    }
  }
  return {};
};

/**
 * Add a new item to the user's Wardrobe / Store
 * Supports both JSON body and multipart photo upload (with automatic AI dress analysis & auto-filling)
 */
const addItem = async (userId, itemData, file = null) => {
  let autoFilledFields = {};
  let detectedItem = null;
  let sourceImageHash = itemData.sourceImageHash || null;
  let sourcePhotoUrl = itemData.sourcePhotoUrl
    ? formatUploadUrl(itemData.sourcePhotoUrl)
    : (file ? formatUploadUrl(`/uploads/${file.filename}`) : '');

  // If a dress photo is uploaded (e.g. from camera click or gallery upload), run AI dress analysis
  if (file) {
    try {
      const analysisResult = await clothAnalysisService.analyzePhoto(userId, file, {
        wardrobeId: itemData.wardrobeId,
      });
      autoFilledFields = analysisResult.autoFilledFields || {};
      sourceImageHash = analysisResult.sourceImageHash || sourceImageHash;
      if (analysisResult.analysis && analysisResult.analysis.length > 0) {
        detectedItem = analysisResult.analysis[0];
      }
    } catch (analysisErr) {
      console.warn(`[wardrobeService.addItem] AI dress analysis fallback: ${analysisErr.message}`);
    }
  }

  const {
    wardrobeId = null,
    type,
    texture,
    silhouette,
    sleeveStyle,
    length,
    gender,
    brand,
    size,
    isFavorite,
    wearCount,
    lastWornAt,
    sourceImageIndex = 0,
  } = itemData;

  const rawAttributes = parseObjectField(itemData.attributes);

  // Auto-fill core required fields if missing
  const name = itemData.name || autoFilledFields.name || (file ? 'Dress Item' : '');
  const category = itemData.category || autoFilledFields.category || (file ? 'UPPER_WEAR' : '');

  if (!name || !category) {
    throw new ApiError(
      400,
      'Item name and category are required. Upload a clear dress photo to auto-fill or enter manually.'
    );
  }

  const subCategory = itemData.subCategory || autoFilledFields.subCategory || '';
  const color = itemData.color || rawAttributes.primaryColor || autoFilledFields.color || '';
  const pattern = itemData.pattern || rawAttributes.pattern || autoFilledFields.pattern || '';
  const fabric = itemData.fabric || rawAttributes.fabric || autoFilledFields.fabric || '';
  const fit = itemData.fit || rawAttributes.fit || autoFilledFields.fit || '';
  const neckline = itemData.neckline || rawAttributes.neckline || autoFilledFields.neckline || '';
  const sleeveLength =
    itemData.sleeveLength || rawAttributes.sleeveLength || autoFilledFields.sleeveLength || '';

  const parsedOccasion = parseArrayField(itemData.occasion);
  const occasion =
    parsedOccasion.length > 0 ? parsedOccasion : autoFilledFields.occasion || [];

  const parsedSeason = parseArrayField(itemData.season);
  const season =
    parsedSeason.length > 0 ? parsedSeason : autoFilledFields.season || [];

  const style = itemData.style || autoFilledFields.style || '';

  const parsedTags = parseArrayField(itemData.tags);
  const tags =
    parsedTags.length > 0 ? parsedTags : autoFilledFields.tags || [];

  // Handle Images: Client-provided images OR AI cropped dress image OR uploaded photo
  let processedImages = [];
  let rawImages = itemData.images;
  if (typeof rawImages === 'string') {
    try {
      rawImages = JSON.parse(rawImages);
    } catch (e) {
      rawImages = [];
    }
  }

  if (Array.isArray(rawImages) && rawImages.length > 0) {
    const hasPrimary = rawImages.some((img) => img.isPrimary);
    processedImages = rawImages.map((img, idx) => ({
      ...img,
      isPrimary: hasPrimary ? !!img.isPrimary : idx === 0,
    }));
  } else if (file) {
    const primaryCropUrl = formatUploadUrl(autoFilledFields.croppedImageUrl || `/uploads/${file.filename}`);
    processedImages = [
      {
        url: primaryCropUrl,
        filename: detectedItem?.croppedFilename || file.filename,
        isPrimary: true,
      },
    ];
  }

  const attributes = {
    ...(autoFilledFields.attributes || {}),
    ...rawAttributes,
  };

  const sourceType =
    itemData.sourceType || (file ? 'CAMERA_CAPTURE' : 'MANUAL_UPLOAD');

  const aiAnalysis =
    itemData.aiAnalysis ||
    (detectedItem
      ? {
          model: 'Gemini-Vision',
          detectedAt: new Date(),
          raw: detectedItem,
        }
      : null);

  let finalWardrobeId = wardrobeId;
  if (!finalWardrobeId) {
    const defaultW =
      (await Wardrobe.findOne({ userId, isDefault: true })) ||
      (await Wardrobe.findOne({ userId }));
    if (defaultW) {
      finalWardrobeId = defaultW._id;
    }
  }

  // --- AUTOMATIC DUPLICATE DRESS PREVENTION ---
  // Explicit override: allowDuplicate or forceAdd (set intentionally by user for a specific item)
  const isExplicitDuplicateAllowed =
    itemData.forceAdd === true ||
    itemData.forceAdd === 'true' ||
    itemData.allowDuplicate === true ||
    itemData.allowDuplicate === 'true';

  const isAutoAddAll =
    itemData.autoAddAll === true ||
    itemData.autoAddAll === 'true';

  // Calculate perceptual hash on file if present
  let currentPerceptualHash = null;
  if (file?.path) {
    const aiVisionService = require('../clothAnalysis/aiVision.service');
    try {
      currentPerceptualHash = await aiVisionService.calculatePerceptualHash(file.path);
    } catch (e) {
      // ignore
    }
  }

  // LEVEL 1: Exact Source Image Duplicate Check (File Hash & Perceptual Hash)
  // Must ALWAYS run unless user explicitly specified allowDuplicate=true or forceAdd=true!
  // autoAddAll does NOT allow exact duplicate photos to be added multiple times!
  if (!isExplicitDuplicateAllowed) {
    if (sourceImageHash) {
      const existingExact = await WardrobeItem.findOne({
        userId,
        sourceImageHash,
      });
      if (existingExact) {
        console.log(`[wardrobeService.addItem] Exact photo duplicate detected for user ${userId}: "${existingExact.name}" (hash: ${sourceImageHash.slice(0, 10)}). Skipping duplicate item addition.`);
        const doc = existingExact.toObject ? existingExact.toObject() : existingExact;
        doc.isDuplicate = true;
        doc.isExistingItem = true;
        doc.duplicateReason = 'EXACT_IMAGE_HASH';
        doc.similarityScore = 1.0;
        doc.uploadedPhotoUrl = sourcePhotoUrl;
        doc.uploadedDetectedGarment = detectedItem || autoFilledFields;
        return doc;
      }
    }

    if (currentPerceptualHash) {
      const aiVisionService = require('../clothAnalysis/aiVision.service');
      const recentCandidates = await WardrobeItem.find({
        userId,
        perceptualHash: { $exists: true, $ne: null },
      }).limit(50);
      for (const cand of recentCandidates) {
        const sim = aiVisionService.calculateHashSimilarity(currentPerceptualHash, cand.perceptualHash);
        if (sim >= 0.92) {
          console.log(`[wardrobeService.addItem] Exact perceptual image duplicate detected for user ${userId}: "${cand.name}" (${Math.round(sim * 100)}% visual match). Skipping duplicate item addition.`);
          const doc = cand.toObject ? cand.toObject() : cand;
          doc.isDuplicate = true;
          doc.isExistingItem = true;
          doc.duplicateReason = 'PERCEPTUAL_HASH';
          doc.similarityScore = sim;
          doc.uploadedPhotoUrl = sourcePhotoUrl;
          doc.uploadedDetectedGarment = detectedItem || autoFilledFields;
          return doc;
        }
      }
    }
  }

  // LEVEL 2: AI Vision / Attribute Duplicate Match against user's existing wardrobe
  // Runs ONLY when neither explicit override nor bulk autoAddAll is active
  if (!isExplicitDuplicateAllowed && !isAutoAddAll) {
    const existingCandidates = await WardrobeItem.find({
      userId,
      category,
    });

    if (existingCandidates.length > 0) {
      const aiVisionService = require('../clothAnalysis/aiVision.service');
      const itemToMatch = {
        name,
        category,
        subCategory,
        color,
        pattern,
        fabric,
        fit,
        neckline,
        attributes,
      };

      const matchResults = aiVisionService.matchAgainstWardrobe([itemToMatch], existingCandidates);
      if (matchResults.length > 0 && matchResults[0].matchResult?.status === 'EXACT_MATCH') {
        const matchedItemDoc = existingCandidates.find(
          (cand) => String(cand._id) === String(matchResults[0].matchedItem?._id)
        );
        if (matchedItemDoc) {
          console.log(`[wardrobeService.addItem] Exact wardrobe duplicate detected for user ${userId}: "${matchedItemDoc.name}" (${matchResults[0].matchResult.confidenceScore * 100}% match). Returning existing item.`);
          const doc = matchedItemDoc.toObject ? matchedItemDoc.toObject() : matchedItemDoc;
          doc.isDuplicate = true;
          doc.isExistingItem = true;
          doc.duplicateReason = 'AI_ATTRIBUTE_MATCH';
          doc.similarityScore = matchResults[0].matchResult.confidenceScore;
          doc.uploadedPhotoUrl = sourcePhotoUrl;
          doc.uploadedDetectedGarment = detectedItem || autoFilledFields;
          return doc;
        }
      }
    }
  }

  const newItem = await WardrobeItem.create({
    userId,
    wardrobeId: finalWardrobeId || null,
    name,
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
    sleeveStyle: sleeveStyle || autoFilledFields.sleeveStyle || '',
    sleeveLength,
    length,
    occasion,
    season,
    style,
    gender: gender || autoFilledFields.gender || '',
    brand: brand || '',
    size: size || '',
    isFavorite: isFavorite !== undefined ? isFavorite : false,
    wearCount: wearCount || 0,
    lastWornAt: lastWornAt || null,
    aiAnalysis,
    sourceType,
    sourcePhotoUrl,
    sourceImageHash,
    perceptualHash: currentPerceptualHash,
    sourceImageIndex,
    images: processedImages,
    attributes,
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
    storeType,
    category,
    subCategory,
    color,
    occasion,
    season,
    favorite,
    search,
    status,
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = queryParams;

  const andClauses = [{ userId }];

  if (status) {
    const normStatus = String(status).toUpperCase();
    if (normStatus === 'ACTIVE' || normStatus === 'INACTIVE') {
      andClauses.push({ status: normStatus });
    }
  }

  const targetStore = queryParams.storeTypeId || storeType;
  if (targetStore && targetStore !== 'ALL') {
    let resolvedStoreTypeId = null;
    if (mongoose.Types.ObjectId.isValid(targetStore)) {
      resolvedStoreTypeId = new mongoose.Types.ObjectId(targetStore);
    } else {
      try {
        const StoreType = require('../admin/storeType/storeType.model');
        const upper = String(targetStore).trim().toUpperCase();
        const stDoc = await StoreType.findOne({
          $or: [
            { code: upper },
            { name: new RegExp(`^${String(targetStore).trim()}$`, 'i') },
          ],
        });
        if (stDoc) resolvedStoreTypeId = stDoc._id;
      } catch (_) {}
    }

    if (resolvedStoreTypeId) {
      const matchingStores = await Wardrobe.find({
        userId,
        storeTypeId: resolvedStoreTypeId,
        isActive: true,
      }).select('_id isDefault');
      const storeIds = matchingStores.map((s) => s._id);
      const hasDefault = matchingStores.some((s) => s.isDefault);
      if (hasDefault) {
        andClauses.push({
          $or: [
            { wardrobeId: { $in: storeIds } },
            { wardrobeId: null },
            { wardrobeId: { $exists: false } },
          ],
        });
      } else {
        andClauses.push({ wardrobeId: { $in: storeIds } });
      }
    }
  }

  if (wardrobeId) {
    const targetWardrobe = await Wardrobe.findOne({ _id: wardrobeId, userId });
    if (targetWardrobe?.isDefault) {
      andClauses.push({
        $or: [
          { wardrobeId },
          { wardrobeId: null },
          { wardrobeId: { $exists: false } },
        ],
      });
    } else {
      andClauses.push({ wardrobeId });
    }
  }
  if (category) andClauses.push({ category });
  if (subCategory) andClauses.push({ subCategory: new RegExp(`^${subCategory}$`, 'i') });
  if (favorite !== undefined) {
    const isFav = favorite === 'true' || favorite === true;
    andClauses.push({ isFavorite: isFav });
  }

  if (color) {
    andClauses.push({
      $or: [
        { color: new RegExp(color, 'i') },
        { 'attributes.primaryColor': new RegExp(color, 'i') },
      ],
    });
  }
  if (occasion) {
    andClauses.push({
      $or: [
        { occasion: { $in: [new RegExp(occasion, 'i')] } },
        { 'attributes.occasions': { $in: [new RegExp(occasion, 'i')] } },
      ],
    });
  }
  if (season) {
    andClauses.push({
      $or: [
        { season: { $in: [new RegExp(season, 'i')] } },
        { 'attributes.seasons': { $in: [new RegExp(season, 'i')] } },
      ],
    });
  }

  if (search) {
    andClauses.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { subCategory: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { 'attributes.brand': { $regex: search, $options: 'i' } },
      ],
    });
  }

  const filter = andClauses.length === 1 ? andClauses[0] : { $and: andClauses };

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

  const allowedFields = [
    'name',
    'category',
    'subCategory',
    'images',
    'attributes',
    'status',
    'currentStatus',
    'storageLocation',
    'laundryCare',
    'tags',
    'usageStats',
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'status') {
        const normalized = String(updateData.status).toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(normalized)) {
          throw new ApiError(400, "Garment status must be either 'ACTIVE' or 'INACTIVE'");
        }
        item.status = normalized;
      } else if (field === 'attributes' && typeof updateData.attributes === 'object') {
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
 * Delete item from wardrobe store
 */
const deleteItem = async (userId, itemId) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });

  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  await WardrobeItem.deleteOne({ _id: itemId, userId });
  return { deleted: true, itemId };
};

/**
 * Add a wardrobe item directly from a detected item object
 */
const addItemFromDetection = async (userId, detection, extraData = {}) => {
  const attrs = detection.attributes || {};
  const autoFields = detection.autoFilledFields || {};

  const itemPayload = {
    wardrobeId: extraData.wardrobeId || detection.wardrobeId || null,
    name: extraData.name || detection.name || autoFields.name || 'Dress Item',
    category: extraData.category || detection.category || autoFields.category || 'UPPER_WEAR',
    subCategory: extraData.subCategory || detection.subCategory || autoFields.subCategory || '',
    color: extraData.color || attrs.primaryColor || autoFields.color || '',
    fabric: extraData.fabric || attrs.fabric || autoFields.fabric || '',
    pattern: extraData.pattern || attrs.pattern || autoFields.pattern || '',
    fit: extraData.fit || attrs.fit || autoFields.fit || '',
    neckline: extraData.neckline || attrs.neckline || autoFields.neckline || '',
    sleeveLength: extraData.sleeveLength || attrs.sleeveStyle || attrs.sleeveLength || autoFields.sleeveLength || '',
    occasion: extraData.occasion || attrs.occasions || autoFields.occasion || [],
    season: extraData.season || attrs.seasons || autoFields.season || [],
    style: extraData.style || attrs.styleAesthetic || autoFields.style || '',
    brand: extraData.brand || detection.brand || '',
    size: extraData.size || detection.size || '',
    isFavorite: extraData.isFavorite !== undefined ? extraData.isFavorite : (detection.isFavorite || false),
    images: (detection.croppedImageUrl || autoFields.croppedImageUrl || detection.imageUrl)
      ? [{ url: detection.croppedImageUrl || autoFields.croppedImageUrl || detection.imageUrl, isPrimary: true, filename: detection.croppedFilename || autoFields.croppedFilename || '' }]
      : (detection.images || []),
    sourcePhotoUrl: extraData.sourcePhotoUrl || detection.originalImageUrl || '',
    sourceImageHash: extraData.sourceImageHash || detection.sourceImageHash || null,
    attributes: attrs,
    tags: extraData.tags || detection.tags || autoFields.tags || [attrs.primaryColor, detection.subCategory, detection.category].filter(Boolean),
    forceAdd: extraData.forceAdd,
    allowDuplicate: extraData.allowDuplicate,
  };

  return await addItem(userId, itemPayload);
};

/**
 * Generate 3D Model for a wardrobe item using Hugging Face TripoSR
 */
const generateItem3DModel = async (userId, itemId) => {
  const item = await WardrobeItem.findOne({ _id: itemId, userId });
  if (!item) {
    throw new ApiError(404, 'Wardrobe item not found');
  }

  // Find best image to reconstruct (prefer cropped/segmented image, else primary image)
  const primaryImg =
    item.images?.find((img) => img.type === 'CROPPED' || img.type === 'SEGMENTED')?.url ||
    item.images?.find((img) => img.isPrimary)?.url ||
    item.images?.[0]?.url ||
    item.sourcePhotoUrl;

  if (!primaryImg) {
    throw new ApiError(400, 'This item does not have a valid photo to convert to 3D');
  }

  // Set status to PROCESSING
  item.model3d = {
    url: item.model3d?.url || null,
    filename: item.model3d?.filename || null,
    status: 'PROCESSING',
    engine: 'TripoSR',
    generatedAt: null,
    error: null,
  };
  await item.save();

  try {
    const result = await tripo3dService.generate3DFromImage(primaryImg, {
      resolution: 128,
      foregroundRatio: 0.85,
    });

    item.model3d = {
      url: result.url,
      filename: result.filename,
      status: 'COMPLETED',
      engine: result.engine || 'TripoSR',
      generatedAt: new Date(),
      error: null,
    };
    await item.save();

    // Dispatch FCM Notification
    try {
      const notificationService = require('../notification/notification.service');
      notificationService
        .sendToUser(userId, {
          title: '3D Garment Ready ✨',
          body: `Your 3D model for "${item.name}" has been generated and is ready to view!`,
          data: {
            type: 'GARMENT_3D_COMPLETED',
            itemId: item._id.toString(),
            modelUrl: result.url || '',
          },
          type: 'GARMENT_3D_COMPLETED',
        })
        .catch((err) => console.warn('[FCM 3D Notification Warning]:', err.message));
    } catch (fcmErr) {
      console.warn('[FCM 3D Notification Warning]:', fcmErr.message);
    }

    return item;
  } catch (err) {
    console.error(`[generateItem3DModel] Failed for item ${itemId}:`, err.message);
    item.model3d = {
      url: item.model3d?.url || null,
      filename: item.model3d?.filename || null,
      status: 'FAILED',
      engine: 'TripoSR',
      generatedAt: null,
      error: err.message,
    };
    await item.save();

    try {
      const notificationService = require('../notification/notification.service');
      notificationService
        .sendToUser(userId, {
          title: '3D Generation Failed',
          body: `Could not generate 3D model for "${item.name}". Please try again.`,
          data: {
            type: 'GARMENT_3D_FAILED',
            itemId: item._id.toString(),
          },
          type: 'GARMENT_3D_FAILED',
        })
        .catch(() => {});
    } catch (fcmErr) {}

    throw new ApiError(500, `3D Model generation failed: ${err.message}`);
  }
};

module.exports = {
  createWardrobe,
  getWardrobes,
  getWardrobeById,
  updateWardrobe,
  deleteWardrobe,
  restoreWardrobe,
  addItem,
  addItemFromDetection,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  generateItem3DModel,
  // Delegated AI Cloth Analysis & Ingestion functions for full backward compatibility
  analyzePhoto: clothAnalysisService.analyzePhoto,
  scanGalleryPhoto: clothAnalysisService.scanGalleryPhoto,
  bulkAddDressPhotos: clothAnalysisService.bulkAddDressPhotos,
  ingestGalleryPhotos: clothAnalysisService.ingestGalleryPhotos,
};
