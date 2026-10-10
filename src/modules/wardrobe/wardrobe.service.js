const fs = require('fs');
const Wardrobe = require('./wardrobe.model');
const WardrobeItem = require('./wardrobeItem.model');
const ApiError = require('../../utils/apiError');
const clothAnalysisService = require('../clothAnalysis/clothAnalysis.service');

/**
 * Create a new Wardrobe (Closet container, e.g., "Mummy Wardrobe", "My Wardrobe")
 */
const createWardrobe = async (userId, data, files = null) => {
  const { name, storeType = 'WARDROBE', type, ownerName, isDefault } = data;
  if (!name) {
    throw new ApiError(400, 'Wardrobe name is required');
  }

  let coverImage = data.coverImage || '';
  let ownerFaceImage = data.ownerFaceImage || '';

  if (files && typeof files === 'object') {
    if (files.ownerFaceImage) {
      ownerFaceImage = `/uploads/${files.ownerFaceImage.filename}`;
    }
    if (files.coverImage) {
      coverImage = `/uploads/${files.coverImage.filename}`;
    }
    if (files.filename) {
      coverImage = `/uploads/${files.filename}`;
      ownerFaceImage = `/uploads/${files.filename}`;
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
          imagePath: targetFaceImg,
        };
        console.log(`[createWardrobe] Reference face generated successfully for wardrobe "${name}"`);
      }
    } catch (fErr) {
      console.warn(`[createWardrobe] Could not extract face from wardrobe image (${fErr.message})`);
    }
  }

  if (isDefault) {
    await Wardrobe.updateMany({ userId, storeType }, { isDefault: false });
  }

  const wardrobe = await Wardrobe.create({
    userId,
    name,
    storeType: storeType || 'WARDROBE',
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
 * Get all active Wardrobes / Stores for user
 */
const getWardrobes = async (userId, query = {}) => {
  const filter = { userId, isActive: true };
  if (query.storeType) {
    filter.storeType = query.storeType;
  }
  return await Wardrobe.find(filter).sort({ isDefault: -1, createdAt: -1 });
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
  let sourcePhotoUrl = itemData.sourcePhotoUrl || (file ? `/uploads/${file.filename}` : '');

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
    const primaryCropUrl = autoFilledFields.croppedImageUrl || `/uploads/${file.filename}`;
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
    page = 1,
    limit = 20,
    sort = '-createdAt',
  } = queryParams;

  const andClauses = [{ userId }];

  if (storeType && storeType !== 'ALL') {
    const matchingStores = await Wardrobe.find({ userId, storeType }).select('_id');
    const storeIds = matchingStores.map((s) => s._id);
    andClauses.push({ wardrobeId: { $in: storeIds } });
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
    'currentStatus',
    'storageLocation',
    'laundryCare',
    'tags',
    'usageStats',
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      if (field === 'attributes' && typeof updateData.attributes === 'object') {
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
    images: detection.croppedImageUrl
      ? [{ url: detection.croppedImageUrl, isPrimary: true, filename: detection.croppedFilename || '' }]
      : (detection.images || []),
    sourcePhotoUrl: extraData.sourcePhotoUrl || detection.originalImageUrl || '',
    sourceImageHash: extraData.sourceImageHash || detection.sourceImageHash || null,
    attributes: attrs,
    tags: extraData.tags || detection.tags || autoFields.tags || [attrs.primaryColor, detection.subCategory, detection.category].filter(Boolean),
  };

  return await addItem(userId, itemPayload);
};

module.exports = {
  createWardrobe,
  getWardrobes,
  addItem,
  addItemFromDetection,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
  // Delegated AI Cloth Analysis & Ingestion functions for full backward compatibility
  analyzePhoto: clothAnalysisService.analyzePhoto,
  scanGalleryPhoto: clothAnalysisService.scanGalleryPhoto,
  bulkAddDressPhotos: clothAnalysisService.bulkAddDressPhotos,
  ingestGalleryPhotos: clothAnalysisService.ingestGalleryPhotos,
};
