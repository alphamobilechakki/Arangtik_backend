const fs = require('fs');
const Wardrobe = require('./wardrobe.model');
const WardrobeItem = require('./wardrobeItem.model');
const ApiError = require('../../utils/apiError');
const clothAnalysisService = require('../clothAnalysis/clothAnalysis.service');

/**
 * Create a new Wardrobe (Closet container, e.g., "Mummy Wardrobe", "My Wardrobe")
 */
const createWardrobe = async (userId, data, file = null) => {
  const { name, storeType = 'WARDROBE', type, ownerName, isDefault } = data;
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

/**
 * Add a new item to the user's Wardrobe / Store
 */
const addItem = async (userId, itemData) => {
  const {
    wardrobeId = null,
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
    tags = [],
  } = itemData;

  if (!name || !category) {
    throw new ApiError(400, 'Item name and category are required');
  }

  let processedImages = images;
  if (Array.isArray(images) && images.length > 0) {
    const hasPrimary = images.some((img) => img.isPrimary);
    processedImages = images.map((img, idx) => ({
      ...img,
      isPrimary: hasPrimary ? !!img.isPrimary : idx === 0,
    }));
  }

  let finalWardrobeId = wardrobeId;
  if (!finalWardrobeId) {
    const defaultW = (await Wardrobe.findOne({ userId, isDefault: true })) || (await Wardrobe.findOne({ userId }));
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

module.exports = {
  createWardrobe,
  getWardrobes,
  addItem,
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
